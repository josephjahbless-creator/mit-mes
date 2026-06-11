import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  SparklesIcon, ChatBubbleLeftRightIcon, DocumentTextIcon, ExclamationTriangleIcon,
  PaperAirplaneIcon, ArrowPathIcon, CpuChipIcon, CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { aiApi, indicatorsApi } from '../../api';
import { getCurrentFiscalYear, getFiscalYearOptions } from '../../utils/fiscalYear';

const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];

// ── Tiny markdown renderer (bold, headings, bullets, numbers) ──────────────────
function renderInline(text) {
  // split on **bold**
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} className="font-semibold text-gray-900 dark:text-gray-100">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}
function MiniMarkdown({ text }) {
  if (!text) return null;
  const lines = String(text).split('\n');
  const out = [];
  lines.forEach((ln, i) => {
    const t = ln.trim();
    if (!t) { out.push(<div key={i} className="h-2" />); return; }
    if (/^#{1,3}\s/.test(t)) {
      out.push(<h3 key={i} className="text-base font-bold text-gray-900 dark:text-gray-100 mt-3 mb-1">{renderInline(t.replace(/^#{1,3}\s/, ''))}</h3>);
    } else if (/^[-*]\s/.test(t)) {
      out.push(<div key={i} className="flex gap-2 ml-1 my-0.5"><span className="text-blue-500 mt-0.5">•</span><span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{renderInline(t.replace(/^[-*]\s/, ''))}</span></div>);
    } else if (/^\d+\.\s/.test(t)) {
      const num = t.match(/^(\d+)\./)[1];
      out.push(<div key={i} className="flex gap-2 ml-1 my-0.5"><span className="text-blue-600 font-semibold text-sm">{num}.</span><span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{renderInline(t.replace(/^\d+\.\s/, ''))}</span></div>);
    } else {
      out.push(<p key={i} className="text-sm text-gray-700 dark:text-gray-300 my-1 leading-relaxed">{renderInline(t)}</p>);
    }
  });
  return <div>{out}</div>;
}

function Spinner({ label }) {
  return (
    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 py-8 justify-center">
      <ArrowPathIcon className="w-5 h-5 animate-spin" />
      <span className="text-sm">{label || 'The local AI is thinking… (this can take a moment on CPU)'}</span>
    </div>
  );
}

// ── Status pill ────────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  if (!status) return null;
  const ok = status.reachable && status.modelReady;
  const warn = status.reachable && !status.modelReady;
  const cfg = ok
    ? { c: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', Icon: CheckCircleIcon, t: `AI online · ${status.model}` }
    : warn
    ? { c: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', Icon: ExclamationTriangleIcon, t: `Ollama up · model "${status.model}" not pulled` }
    : { c: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', Icon: XCircleIcon, t: 'AI offline (Ollama not reachable)' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.c}`}>
      <cfg.Icon className="w-4 h-4" /> {cfg.t}
    </span>
  );
}

const TABS = [
  { id: 'analyze', label: 'Analyze', icon: SparklesIcon },
  { id: 'chat', label: 'Ask AI', icon: ChatBubbleLeftRightIcon },
  { id: 'summary', label: 'Exec Summary', icon: DocumentTextIcon },
  { id: 'anomaly', label: 'Anomaly', icon: ExclamationTriangleIcon },
];

export default function AiAssistantPage() {
  const [tab, setTab] = useState('analyze');
  const [fy, setFy] = useState(getCurrentFiscalYear());
  const [period, setPeriod] = useState('Q2');
  const fyOptions = getFiscalYearOptions();

  const { data: status, refetch: refetchStatus, isFetching: stFetching } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => aiApi.status().then(r => r.data),
    refetchInterval: 30000,
  });
  const offline = status && !status.reachable;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CpuChipIcon className="w-7 h-7 text-mit-blue dark:text-blue-400" />
            AI Analysis Assistant
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Local, private AI (Ollama) — analyses your live M&E data on-premise. No data leaves the Ministry's servers.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill status={status} />
          <button onClick={() => refetchStatus()} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700" title="Refresh status">
            <ArrowPathIcon className={`w-4 h-4 ${stFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {offline && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-200">
          <b>AI is offline.</b> The local Ollama service isn't reachable. Run <code className="px-1 bg-amber-100 dark:bg-amber-900/40 rounded">D:\MIT\Setup-AI-Ollama.bat</code> to install it and pull a model.
          The rest of the system (rule-based insights) continues to work.
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-5">
        <nav className="flex gap-1 -mb-px">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Period controls (analyze + summary) */}
      {(tab === 'analyze' || tab === 'summary') && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select value={fy} onChange={e => setFy(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            {fyOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}

      {tab === 'analyze' && <AnalyzePanel fy={fy} period={period} disabled={offline} />}
      {tab === 'chat' && <ChatPanel fy={fy} period={period} disabled={offline} />}
      {tab === 'summary' && <SummaryPanel fy={fy} period={period} disabled={offline} />}
      {tab === 'anomaly' && <AnomalyPanel disabled={offline} />}
    </div>
  );
}

// ── Output card ────────────────────────────────────────────────────────────────
function OutputCard({ children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm min-h-[120px]">
      {children}
    </div>
  );
}

function AnalyzePanel({ fy, period, disabled }) {
  const m = useMutation({ mutationFn: () => aiApi.analyze({ scope: 'national', fiscalYear: fy, period }).then(r => r.data),
    onError: (e) => toast.error(e.response?.data?.error || 'Analysis failed') });
  return (
    <div className="space-y-3">
      <button disabled={disabled || m.isPending} onClick={() => m.mutate()}
        className="flex items-center gap-2 bg-mit-blue text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-blue-800">
        <SparklesIcon className="w-4 h-4" /> {m.isPending ? 'Analysing…' : `Analyse ${period} ${fy}`}
      </button>
      <OutputCard>
        {m.isPending ? <Spinner /> : m.data?.content ? <MiniMarkdown text={m.data.content} /> :
          <p className="text-sm text-gray-400 italic">Click “Analyse” to get AI-generated findings, concerns and recommended actions for the selected period.</p>}
      </OutputCard>
    </div>
  );
}

function SummaryPanel({ fy, period, disabled }) {
  const m = useMutation({ mutationFn: () => aiApi.reportSummary({ fiscalYear: fy, period }).then(r => r.data),
    onError: (e) => toast.error(e.response?.data?.error || 'Summary failed') });
  return (
    <div className="space-y-3">
      <button disabled={disabled || m.isPending} onClick={() => m.mutate()}
        className="flex items-center gap-2 bg-mit-blue text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-blue-800">
        <DocumentTextIcon className="w-4 h-4" /> {m.isPending ? 'Writing…' : 'Generate Executive Summary'}
      </button>
      <OutputCard>
        {m.isPending ? <Spinner label="Drafting the executive summary…" /> : m.data?.content ? <MiniMarkdown text={m.data.content} /> :
          <p className="text-sm text-gray-400 italic">Generate a leadership-ready summary of national performance for {period} {fy}.</p>}
      </OutputCard>
    </div>
  );
}

function ChatPanel({ fy, period, disabled }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const m = useMutation({
    mutationFn: (q) => aiApi.chat({ question: q, scope: 'national', fiscalYear: fy, period, history: msgs }).then(r => r.data),
    onSuccess: (d) => setMsgs(prev => [...prev, { role: 'assistant', content: d.content }]),
    onError: (e) => { toast.error(e.response?.data?.error || 'Chat failed'); setMsgs(prev => prev.slice(0, -1)); },
  });
  function send() {
    const q = input.trim(); if (!q || m.isPending) return;
    setMsgs(prev => [...prev, { role: 'user', content: q }]); setInput(''); m.mutate(q);
  }
  const samples = ['Which institutions are lagging this period?', 'Summarise overall performance.', 'What needs urgent attention?'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col" style={{ height: '60vh' }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.length === 0 && (
          <div className="text-center text-gray-400 mt-6">
            <ChatBubbleLeftRightIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm mb-3">Ask anything about your {period} {fy} performance data.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {samples.map(s => <button key={s} onClick={() => { setInput(s); }} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-700">{s}</button>)}
            </div>
          </div>
        )}
        {msgs.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-mit-blue text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
              {msg.role === 'user' ? <p className="text-sm">{msg.content}</p> : <MiniMarkdown text={msg.content} />}
            </div>
          </div>
        ))}
        {m.isPending && <div className="flex justify-start"><div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3"><ArrowPathIcon className="w-4 h-4 animate-spin text-gray-400" /></div></div>}
        <div ref={endRef} />
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex items-center gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          disabled={disabled} placeholder={disabled ? 'AI offline…' : 'Ask about your data…'}
          className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50" />
        <button onClick={send} disabled={disabled || m.isPending || !input.trim()} className="p-2.5 rounded-lg bg-mit-blue text-white disabled:opacity-40 hover:bg-blue-800">
          <PaperAirplaneIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AnomalyPanel({ disabled }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { data: indicators = [] } = useQuery({ queryKey: ['indicators-ai'], queryFn: () => indicatorsApi.list().then(r => (Array.isArray(r.data) ? r.data : r.data.data || [])) });
  const filtered = indicators.filter(i => `${i.name} ${i.code}`.toLowerCase().includes(search.toLowerCase())).slice(0, 30);
  const m = useMutation({ mutationFn: (id) => aiApi.explainAnomaly(id, {}).then(r => r.data),
    onError: (e) => toast.error(e.response?.data?.error || 'Failed') });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search indicator…"
          className="w-full px-3 py-2 mb-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        <div className="max-h-[50vh] overflow-y-auto space-y-1">
          {filtered.map(ind => (
            <button key={ind.id} onClick={() => { setSelected(ind); m.mutate(ind.id); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selected?.id === ind.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}>
              <span className="text-[10px] font-mono text-blue-600 block">{ind.code}</span>
              <span className="line-clamp-1">{ind.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="md:col-span-2">
        <OutputCard>
          {m.isPending ? <Spinner label="Investigating the indicator…" /> : m.data?.content ? (
            <>
              {selected && <p className="text-xs font-mono text-blue-600 mb-2">{selected.code} · {selected.name}</p>}
              <MiniMarkdown text={m.data.content} />
            </>
          ) : <p className="text-sm text-gray-400 italic">{disabled ? 'AI is offline.' : 'Select an indicator to have the AI explain likely causes of any spike or drop.'}</p>}
        </OutputCard>
      </div>
    </div>
  );
}
