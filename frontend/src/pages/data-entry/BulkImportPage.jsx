import { useState, useRef } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { ArrowUpTrayIcon, ArrowDownTrayIcon, CheckCircleIcon, ExclamationCircleIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

export default function BulkImportPage() {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const fileRef               = useRef();

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/data-entry/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'MIT_MES_Import_Template.xlsx';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch { toast.error('Download failed'); }
  };

  const handleImport = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setLoading(true); setResult(null);
    try {
      const res = await api.post('/data-entry/import/bulk', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      if (res.data.imported > 0) toast.success(`${res.data.imported} records imported`);
      if (res.data.skipped > 0)  toast.error(`${res.data.skipped} records skipped`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Import failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg"><DocumentArrowUpIcon className="w-6 h-6 text-blue-600" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Data Import</h1>
          <p className="text-sm text-gray-500">Import up to 500 indicator actuals at once from an Excel or CSV file</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-semibold text-blue-800 mb-3">How to use</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
          <li>Download the Excel template below</li>
          <li>Fill in the required columns:
            <code className="bg-blue-100 rounded px-1 mx-1">indicatorCode</code>
            <code className="bg-blue-100 rounded px-1 mx-1">institutionCode</code>
            <code className="bg-blue-100 rounded px-1 mx-1">fiscalYear</code>
            <code className="bg-blue-100 rounded px-1 mx-1">period</code>
            <code className="bg-blue-100 rounded px-1 mx-1">value</code>
          </li>
          <li>Valid periods: <strong>Q1, Q2, Q3, Q4, Annual</strong></li>
          <li>Fiscal year format: <strong>2025-2026</strong></li>
          <li>Find indicator codes on the <a href="/indicators" className="underline">Indicators Registry</a> page</li>
          <li>Upload the filled file and click Import</li>
        </ol>
        <button onClick={downloadTemplate}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <ArrowDownTrayIcon className="w-4 h-4" /> Download Excel Template
        </button>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setResult(null); } }}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => { setFile(e.target.files[0]); setResult(null); e.target.value = ''; }} />
        {file ? (
          <div className="flex items-center justify-center gap-4">
            <CheckCircleIcon className="w-8 h-8 text-green-500 shrink-0" />
            <div className="text-left">
              <div className="font-semibold text-green-700">{file.name}</div>
              <div className="text-xs text-green-500">{(file.size / 1024).toFixed(1)} KB · Ready to import</div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
              className="ml-4 text-xs text-red-500 hover:text-red-700 underline"
            >Remove</button>
          </div>
        ) : (
          <>
            <ArrowUpTrayIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">Drop your Excel / CSV file here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">Supported: .xlsx · .xls · .csv · Max 500 rows · 5 MB</p>
          </>
        )}
      </div>

      {/* Import button */}
      {file && (
        <button onClick={handleImport} disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 text-sm">
          <ArrowUpTrayIcon className="w-5 h-5" />
          {loading ? 'Importing, please wait…' : `Import "${file.name}"`}
        </button>
      )}

      {/* Results panel */}
      {result && (
        <div className={`rounded-xl border p-5 ${result.errors?.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
          <div className="flex items-start gap-3 mb-4">
            {result.errors?.length > 0
              ? <ExclamationCircleIcon className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              : <CheckCircleIcon className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
            }
            <div>
              <div className="font-semibold text-gray-800">{result.message}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {result.imported} imported · {result.skipped} skipped
              </div>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-2">Rows with errors ({result.errors.length}):</p>
              <div className="space-y-1 max-h-52 overflow-y-auto rounded-lg border border-amber-200 bg-white p-2">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex gap-3 text-xs py-1 border-b border-gray-50 last:border-0">
                    <span className="font-mono text-amber-600 w-14 shrink-0">Row {e.row}</span>
                    <span className="text-gray-600">{e.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
