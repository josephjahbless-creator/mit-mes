import { useState, useRef } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  ArrowUpTrayIcon, ArrowDownTrayIcon, CheckCircleIcon, ExclamationCircleIcon,
  DocumentArrowUpIcon, TableCellsIcon, Squares2X2Icon, EyeIcon, PresentationChartLineIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

// mode -> endpoints + template name + flow type
const MODES = {
  matrix: {
    label: 'Strategic Matrix (auto-map)', icon: SparklesIcon, flow: 'preview', noTemplate: true,
    preview: '/data-entry/import/matrix/preview', commit: '/data-entry/import/matrix',
  },
  performance: {
    label: 'Performance Template', icon: PresentationChartLineIcon, flow: 'preview',
    template: '/data-entry/import/performance/template', templateName: 'MIT_Performance_ME_Template.xlsx',
    preview: '/data-entry/import/performance/preview', commit: '/data-entry/import/performance',
  },
  framework: {
    label: 'Result Framework', icon: Squares2X2Icon, flow: 'preview',
    template: '/data-entry/import/framework/template', templateName: 'MIT_Result_Framework_Template.xlsx',
    preview: '/data-entry/import/framework/preview', commit: '/data-entry/import/framework',
  },
  values: {
    label: 'Indicator Values', icon: TableCellsIcon, flow: 'direct',
    template: '/data-entry/import/template', templateName: 'MIT_MES_Import_Template.xlsx',
    commit: '/data-entry/import/bulk',
  },
};

export default function BulkImportPage() {
  const [mode, setMode]       = useState('performance');
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult]   = useState(null);
  const fileRef               = useRef();
  const m = MODES[mode];

  const reset = () => { setFile(null); setPreview(null); setResult(null); };
  const switchMode = (k) => { setMode(k); reset(); };

  const cfg = { headers: { 'Content-Type': undefined } };
  const formData = () => { const f = new FormData(); f.append('file', file); return f; };

  const downloadTemplate = async () => {
    try {
      const res = await api.get(m.template, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = m.templateName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch { toast.error('Download failed'); }
  };

  const doPreview = async () => {
    if (!file) return; setLoading(true); setPreview(null); setResult(null);
    try { const res = await api.post(m.preview, formData(), cfg); setPreview(res.data); toast.success('Preview ready — review, then import'); }
    catch (e) { toast.error(e.response?.data?.error || 'Preview failed'); }
    finally { setLoading(false); }
  };
  const doImport = async () => {
    if (!file) return; setLoading(true);
    try {
      const res = await api.post(m.commit, formData(), cfg);
      setResult(res.data);
      if (mode === 'values') {
        if (res.data.imported > 0) toast.success(`${res.data.imported} records imported`);
        if (res.data.skipped > 0)  toast.error(`${res.data.skipped} skipped`);
      } else toast.success('Imported successfully');
    } catch (e) { toast.error(e.response?.data?.error || 'Import failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg"><DocumentArrowUpIcon className="w-6 h-6 text-blue-600" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Data Import</h1>
          <p className="text-sm text-gray-500">Upload performance data from Excel — one standardized template for all quarters & institutions</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="inline-flex flex-wrap rounded-xl border border-gray-200 bg-gray-50 p-1">
        {Object.entries(MODES).map(([k, x]) => (
          <button key={k} onClick={() => switchMode(k)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === k ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <x.icon className="w-4 h-4" /> {x.label}
          </button>
        ))}
      </div>

      {/* Instructions */}
      {mode === 'matrix' && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
          <h3 className="font-semibold text-violet-800 mb-2 flex items-center gap-2"><SparklesIcon className="w-5 h-5" /> Auto-mapping — upload any matrix, no setup</h3>
          <p className="text-sm text-violet-700 mb-2">Drop in <strong>any</strong> result-framework or strategic-plan matrix (any column arrangement). The system auto-detects the structure and maps it into the framework — <strong>no manual configuration</strong>.</p>
          <ul className="list-disc list-inside text-sm text-violet-700 space-y-1">
            <li>Finds the header row automatically and recognises Objective, Strategy/Outcome, Indicator, Baseline, Means of Verification & Responsible columns</li>
            <li>Detects <strong>any number of year columns</strong> (e.g. 2026/27 … 2030/31) and sets a target per year</li>
            <li>Resolves the responsible Department/Unit/Institution by code or name; creates anything missing</li>
            <li><strong>Preview</strong> shows exactly what it detected before anything is saved · re-upload is idempotent</li>
          </ul>
        </div>
      )}
      {mode === 'performance' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-blue-800 mb-2">Standardized Performance Template — works for Q1–Q4</h3>
          <p className="text-sm text-blue-700 mb-2">One template for all Departments, Units & Institutions. The system auto-maps each row by <strong>code</strong> to its Objective, Outcome, Indicator, Activity, Department/Unit & Institution, then computes achievement %, traffic-light status and the dashboards.</p>
          <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
            <li>Set <strong>Financial Year</strong> (2025/26) and <strong>Quarter</strong> (Q1–Q4) on every row</li>
            <li>Use the <strong>Reference Codes</strong> sheet for Department, Unit & Institution codes</li>
            <li>Leave <em>Achievement %</em> and <em>Status</em> blank — auto-generated (Green ≥90 · Amber 60–89 · Red &lt;60)</li>
            <li><strong>Preview</strong> first, then import. Re-uploading matches by code (no duplicates)</li>
          </ul>
          <button onClick={downloadTemplate} className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <ArrowDownTrayIcon className="w-4 h-4" /> Download Performance Template
          </button>
        </div>
      )}
      {mode === 'framework' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <h3 className="font-semibold text-indigo-800 mb-2">Result Framework (free-text departmental file)</h3>
          <p className="text-sm text-indigo-700">For existing Ministry result-framework files (Objective · Target · Activity · Output Indicator · Baseline · Target Qn · Qn actual) with the department in row 2. Creates the framework by name and records the period actuals.</p>
          <button onClick={downloadTemplate} className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <ArrowDownTrayIcon className="w-4 h-4" /> Download Result Framework Template
          </button>
        </div>
      )}
      {mode === 'values' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-2">Indicator Values (simple)</h3>
          <p className="text-sm text-gray-600">Quick value entry for indicators that already exist: <code className="bg-gray-100 rounded px-1">indicatorCode · institutionCode · fiscalYear · period · value</code>.</p>
          <button onClick={downloadTemplate} className="mt-3 flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
            <ArrowDownTrayIcon className="w-4 h-4" /> Download Values Template
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'}`}
        onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setPreview(null); setResult(null); } }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => { setFile(e.target.files[0]); setPreview(null); setResult(null); e.target.value = ''; }} />
        {file ? (
          <div className="flex items-center justify-center gap-4">
            <CheckCircleIcon className="w-8 h-8 text-green-500 shrink-0" />
            <div className="text-left"><div className="font-semibold text-green-700">{file.name}</div><div className="text-xs text-green-500">{(file.size / 1024).toFixed(1)} KB · Ready</div></div>
            <button onClick={e => { e.stopPropagation(); reset(); }} className="ml-4 text-xs text-red-500 hover:text-red-700 underline">Remove</button>
          </div>
        ) : (
          <><ArrowUpTrayIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="font-medium text-gray-600">Drop your Excel / CSV file here, or click to browse</p><p className="text-xs text-gray-400 mt-1">.xlsx · .xls · .csv · 5 MB</p></>
        )}
      </div>

      {/* Actions */}
      {file && m.flow === 'direct' && (
        <button onClick={doImport} disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 text-sm">
          <ArrowUpTrayIcon className="w-5 h-5" />{loading ? 'Importing…' : `Import "${file.name}"`}
        </button>
      )}
      {file && m.flow === 'preview' && (
        <div className="flex gap-3">
          <button onClick={doPreview} disabled={loading} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 text-sm">
            <EyeIcon className="w-5 h-5" />{loading && !preview ? 'Analyzing…' : 'Preview'}
          </button>
          {preview && !result && (
            <button onClick={doImport} disabled={loading} className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 text-sm">
              <ArrowUpTrayIcon className="w-5 h-5" />{loading ? 'Importing…' : 'Create & import'}
            </button>
          )}
        </div>
      )}

      {/* Preview (framework + performance) */}
      {preview && !result && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="font-semibold text-blue-800 mb-2">Preview — nothing saved yet{preview.totalRows ? ` · ${preview.totalRows} rows` : ''}</p>
          {preview.sheets && (
            <div className="mb-3 text-sm">
              <p className="text-blue-700 font-medium mb-1">Auto-detected:</p>
              {preview.sheets.map((s, i) => (
                <div key={i} className="bg-white rounded-lg border border-blue-100 px-3 py-2 mb-1">
                  <span className="text-gray-500">Sheet</span> <b>{s.sheet}</b> · <span className="text-gray-500">columns:</span> {s.mappedColumns.join(', ')}
                  {s.years?.length > 0 && <> · <span className="text-gray-500">years:</span> {s.years.join(', ')}</>}
                </div>
              ))}
            </div>
          )}
          {preview.meta && (
            <div className="grid grid-cols-3 gap-3 text-sm mb-3">
              <Meta label="Department" value={`${preview.meta.department}${preview.meta.departmentMatched ? ' ✓' : ''}`} />
              <Meta label="Period" value={preview.meta.period} />
              <Meta label="Fiscal Year" value={preview.meta.fiscalYear} />
            </div>
          )}
          {preview.willCreateApprox && (
            <>
              <p className="text-sm font-medium text-blue-700 mb-1">Will create / update:</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                {Object.entries(preview.willCreateApprox).map(([l, v]) => (
                  <div key={l} className="bg-white rounded-lg border border-blue-100 py-2"><div className="text-lg font-bold text-blue-700">{v}</div><div className="text-[11px] text-gray-500 capitalize">{l}</div></div>
                ))}
              </div>
            </>
          )}
          {preview.sample?.length > 0 && preview.sample[0].achievement !== undefined && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-gray-500 text-left"><th className="py-1 pr-2">Indicator</th><th className="pr-2">Qtr</th><th className="pr-2">Target</th><th className="pr-2">Actual</th><th className="pr-2">Ach.%</th><th>Status</th></tr></thead>
                <tbody>{preview.sample.slice(0, 6).map((s, i) => (
                  <tr key={i} className="border-t border-blue-100"><td className="py-1 pr-2 text-gray-700">{String(s.indicator).slice(0, 40)}</td><td className="pr-2">{s.quarter}</td><td className="pr-2">{s.target ?? '—'}</td><td className="pr-2">{s.actual ?? '—'}</td><td className="pr-2">{s.achievement ?? '—'}</td><td><StatusChip s={s.status} /></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {preview.sample?.length > 0 && preview.sample[0].years !== undefined && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-gray-500 text-left"><th className="py-1 pr-2">Objective</th><th className="pr-2">Indicator</th><th className="pr-2">Base</th><th className="pr-2">Yearly targets</th><th>Resp.</th></tr></thead>
                <tbody>{preview.sample.slice(0, 6).map((s, i) => (
                  <tr key={i} className="border-t border-blue-100"><td className="py-1 pr-2 text-gray-600">{String(s.objective).slice(0, 22)}</td><td className="pr-2 text-gray-700">{String(s.indicator).slice(0, 32)}</td><td className="pr-2">{s.baseline ?? '—'}</td><td className="pr-2 text-gray-600">{s.years || '—'}</td><td className="text-gray-600">{s.responsible || '—'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {preview.warnings?.length > 0 && <ul className="mt-3 text-xs text-amber-700 list-disc list-inside">{preview.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
        </div>
      )}

      {/* Result */}
      {result && mode !== 'values' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-start gap-3 mb-3"><CheckCircleIcon className="w-6 h-6 text-green-500 shrink-0 mt-0.5" /><div className="font-semibold text-gray-800">{result.message}</div></div>
          {result.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {Object.entries(result.stats).filter(([k]) => ['objectives','outcomes','indicators','activities'].includes(k)).map(([k, v]) => (
                <div key={k} className="bg-white rounded-lg border border-green-100 px-3 py-2"><span className="capitalize text-gray-600">{k}: </span><span className="font-semibold text-green-700">{v.created} new</span><span className="text-gray-400"> · {v.matched} existing</span></div>
              ))}
              <div className="bg-white rounded-lg border border-green-100 px-3 py-2"><span className="text-gray-600">Targets: </span><span className="font-semibold text-green-700">{result.stats.targets}</span></div>
              <div className="bg-white rounded-lg border border-green-100 px-3 py-2"><span className="text-gray-600">Actuals: </span><span className="font-semibold text-green-700">{result.stats.actuals}</span></div>
              {result.stats.budgets != null && <div className="bg-white rounded-lg border border-green-100 px-3 py-2"><span className="text-gray-600">Budgets: </span><span className="font-semibold text-green-700">{result.stats.budgets}</span></div>}
            </div>
          )}
          {result.skips?.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold text-amber-800 mb-1">Skipped rows ({result.skips.length}):</p>
              <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-amber-200 bg-white p-2">{result.skips.map((s, i) => <div key={i} className="text-xs text-gray-600">Row {s.row}: {s.indicator} — {s.error}</div>)}</div>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3">Imported actuals are submitted for approval. View the framework under Results Framework, approve in the Approval Queue, then see results on the Dashboards.</p>
        </div>
      )}

      {/* Values result */}
      {result && mode === 'values' && (
        <div className={`rounded-xl border p-5 ${result.errors?.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
          <div className="flex items-start gap-3 mb-4">{result.errors?.length > 0 ? <ExclamationCircleIcon className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" /> : <CheckCircleIcon className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />}<div><div className="font-semibold text-gray-800">{result.message}</div><div className="text-xs text-gray-500 mt-0.5">{result.imported} imported · {result.skipped} skipped</div></div></div>
          {result.errors?.length > 0 && (
            <div className="space-y-1 max-h-52 overflow-y-auto rounded-lg border border-amber-200 bg-white p-2">{result.errors.map((e, i) => <div key={i} className="flex gap-3 text-xs py-1"><span className="font-mono text-amber-600 w-14 shrink-0">Row {e.row}</span><span className="text-gray-600">{e.error}</span></div>)}</div>
          )}
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }) {
  return <div className="bg-white rounded-lg border border-blue-100 px-3 py-2"><div className="text-[11px] text-gray-500">{label}</div><div className="font-semibold text-gray-800">{value}</div></div>;
}
function StatusChip({ s }) {
  const c = s === 'Green' ? 'bg-green-100 text-green-700' : s === 'Amber' ? 'bg-amber-100 text-amber-700' : s === 'Red' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c}`}>{s}</span>;
}
