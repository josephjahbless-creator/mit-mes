import { useState, useRef, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  ArrowDownTrayIcon, ArrowUpTrayIcon, CheckCircleIcon, ExclamationTriangleIcon,
  XCircleIcon, BuildingOffice2Icon, DocumentCheckIcon, InformationCircleIcon,
} from '@heroicons/react/24/outline';

const BUDGET_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'Annual'];

/** Current Tanzanian fiscal year (Jul–Jun), e.g. "2025-2026". */
function currentFiscalYear() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

const STATUS_STYLES = {
  ready: { row: 'bg-green-50', chip: 'bg-green-100 text-green-800', label: 'Ready' },
  error: { row: 'bg-red-50', chip: 'bg-red-100 text-red-800', label: 'Error' },
  empty: { row: 'bg-gray-50', chip: 'bg-gray-100 text-gray-600', label: 'Skipped' },
};

/**
 * Departmental data collection: download a template pre-filled with the
 * department's own indicators, fill in the shaded columns offline, then upload
 * it back. The file is validated (columns first, then every cell) and nothing
 * is written until the user confirms.
 */
export default function DeptCollectionPage() {
  const [departments, setDepartments] = useState([]);
  const [deptCode, setDeptCode] = useState('');
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const [budgetPeriod, setBudgetPeriod] = useState('Annual');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [columnError, setColumnError] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    api.get('/departments')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.departments ?? []);
        setDepartments(list);
        if (list.length && !deptCode) setDeptCode(list[0].code);
      })
      .catch(() => toast.error('Could not load departments'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetUpload = () => { setPreview(null); setColumnError(null); setResult(null); };

  const onPickFile = (f) => { setFile(f); resetUpload(); };

  const downloadTemplate = async () => {
    if (!deptCode) return toast.error('Select a department first');
    try {
      const res = await api.get('/data-entry/import/dept-collection/template', {
        params: { departmentCode: deptCode, fiscalYear },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `MIT_Data_Collection_${deptCode}_${fiscalYear}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch {
      toast.error('Could not download the template');
    }
  };

  const buildForm = () => {
    const f = new FormData();
    f.append('file', file);
    f.append('departmentCode', deptCode);
    f.append('fiscalYear', fiscalYear);
    f.append('budgetPeriod', budgetPeriod);
    return f;
  };
  const cfg = { headers: { 'Content-Type': undefined } };

  const doPreview = async () => {
    if (!file) return toast.error('Choose the completed Excel file first');
    setLoading(true); resetUpload();
    try {
      const res = await api.post('/data-entry/import/dept-collection/preview', buildForm(), cfg);
      setPreview(res.data);
      if (res.data.valid) toast.success('File is valid — review, then import');
      else toast.error(`${res.data.summary.errors} row(s) need fixing`);
    } catch (e) {
      // A 422 here is a whole-file problem (bad columns, unreadable file).
      setColumnError(e.response?.data?.error || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const doImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await api.post('/data-entry/import/dept-collection', buildForm(), cfg);
      setResult(res.data);
      setPreview(null);
      toast.success(res.data.message || 'Imported');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const summary = preview?.summary;
  const canImport = preview && preview.valid && summary?.ready > 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <DocumentCheckIcon className="h-8 w-8 text-teal-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departmental Data Collection</h1>
          <p className="text-sm text-gray-500">
            Download your department&apos;s template, fill in the shaded columns, then upload it back for validation.
          </p>
        </div>
      </div>

      {/* Step 1 — download */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">1</span>
          Download the template
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Department</span>
            <select
              value={deptCode}
              onChange={(e) => { setDeptCode(e.target.value); resetUpload(); }}
              className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500"
            >
              {departments.length === 0 && <option value="">Loading…</option>}
              {departments.map((d) => (
                <option key={d.id ?? d.code} value={d.code}>{d.code} — {d.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-600">Fiscal year</span>
            <input
              value={fiscalYear}
              onChange={(e) => { setFiscalYear(e.target.value); resetUpload(); }}
              placeholder="2025-2026"
              className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-600">Budget period</span>
            <select
              value={budgetPeriod}
              onChange={(e) => setBudgetPeriod(e.target.value)}
              className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500"
            >
              {BUDGET_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-800">
          <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Budget and expenditure are recorded under the selected budget period. To see them on the
            Departments dashboard, choose the same period tab there.
          </span>
        </div>

        <button
          onClick={downloadTemplate}
          disabled={!deptCode}
          className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Download template
        </button>
      </section>

      {/* Step 2 — upload */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">2</span>
          Upload the completed file
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            className="block text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-gray-200"
          />
          <button
            onClick={doPreview}
            disabled={!file || loading}
            className="inline-flex items-center gap-2 rounded-md border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {loading ? 'Checking…' : 'Validate file'}
          </button>
        </div>

        {/* Whole-file failure (bad columns / unreadable) */}
        {columnError && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <XCircleIcon className="h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">The file could not be accepted</p>
                <p className="mt-1 text-sm text-red-700">{columnError}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Step 3 — review + commit */}
      {preview && (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">3</span>
            Review and import
          </h2>

          {summary?.department && (
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <BuildingOffice2Icon className="h-4 w-4" />
              {summary.department.name} ({summary.department.code}) · FY {summary.fiscalYear}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Rows" value={summary.totalRows} />
            <Stat label="Ready" value={summary.ready} tone="green" />
            <Stat label="Errors" value={summary.errors} tone={summary.errors ? 'red' : 'gray'} />
            <Stat label="Skipped" value={summary.empty} />
            <Stat label="Values" value={summary.valuesToImport} tone="teal" />
          </div>

          {summary.errors > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              <span>
                {summary.errors} row(s) contain errors and will not be imported. Fix them in the
                Excel file and validate again.
              </span>
            </div>
          )}

          <div className="max-h-96 overflow-auto rounded-md border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Indicator</th>
                  <th className="px-3 py-2">Q1</th>
                  <th className="px-3 py-2">Q2</th>
                  <th className="px-3 py-2">Q3</th>
                  <th className="px-3 py-2">Q4</th>
                  <th className="px-3 py-2">Budget</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Messages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.rows.map((r) => {
                  const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.empty;
                  return (
                    <tr key={r.rowNum} className={s.row}>
                      <td className="px-3 py-2 text-gray-500">{r.rowNum}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-800">{r.indicatorCode}</div>
                        <div className="max-w-xs truncate text-xs text-gray-500">{r.matchedName || r.indicatorName}</div>
                      </td>
                      {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                        <td key={q} className="px-3 py-2 tabular-nums text-gray-700">{r.values?.[q] ?? '—'}</td>
                      ))}
                      <td className="px-3 py-2 tabular-nums text-gray-700">
                        {r.budget != null ? Number(r.budget).toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.chip}`}>{s.label}</span>
                      </td>
                      <td className="px-3 py-2">
                        {r.errors?.map((e, i) => (
                          <div key={`e${i}`} className="text-xs text-red-700">• {e}</div>
                        ))}
                        {r.warnings?.map((w, i) => (
                          <div key={`w${i}`} className="text-xs text-amber-700">• {w}</div>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={doImport}
            disabled={!canImport || loading}
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircleIcon className="h-4 w-4" />
            {loading ? 'Importing…' : `Import ${summary.valuesToImport} value(s)`}
          </button>
          {!canImport && (
            <span className="ml-3 text-xs text-gray-500">
              {summary.errors > 0
                ? 'Import is disabled until all errors are fixed.'
                : 'Nothing to import — no actuals, budget or expenditure were entered in the file.'}
            </span>
          )}
        </section>
      )}

      {/* Result */}
      {result && (
        <section className="rounded-lg border border-green-300 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-green-600" />
            <div className="text-sm">
              <p className="font-semibold text-green-900">Import complete</p>
              <p className="mt-1 text-green-800">{result.message}</p>
              <ul className="mt-2 space-y-0.5 text-green-800">
                <li>New values: {result.created}</li>
                <li>Updated values: {result.updated}</li>
                <li>Budget lines: {result.budgetLinesCreated} created, {result.budgetLinesUpdated} updated ({result.budgetPeriod})</li>
                {result.skippedRows > 0 && <li>Rows skipped: {result.skippedRows}</li>}
              </ul>
              {result.failures?.length > 0 && (
                <p className="mt-2 text-red-700">{result.failures.length} row(s) failed to save.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'gray' }) {
  const tones = {
    gray: 'text-gray-900', green: 'text-green-700', red: 'text-red-700', teal: 'text-teal-700',
  };
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  );
}
