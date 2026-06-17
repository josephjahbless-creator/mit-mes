import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import {
  BuildingOfficeIcon, ChartBarIcon, CurrencyDollarIcon, CheckCircleIcon,
  ClockIcon, ExclamationTriangleIcon, PlayCircleIcon, StopCircleIcon,
  BuildingStorefrontIcon, ArrowTrendingUpIcon,
  ArrowTrendingDownIcon, MinusCircleIcon, SparklesIcon, BriefcaseIcon,
} from '@heroicons/react/24/outline';
import { dashboardApi, projectsApi } from '../../api';
import StatCard from '../../components/ui/StatCard';
import ProgressBar from '../../components/ui/ProgressBar';
import InsightPanel from '../../components/InsightPanel';
import { getCurrentFiscalYear, formatFiscalYearShort } from '../../utils/fiscalYear';

const FISCAL_YEAR = getCurrentFiscalYear();
const FISCAL_YEAR_SHORT = formatFiscalYearShort(FISCAL_YEAR);

// Institution logo map (code → public path)
const LOGO_MAP = {
  CAMARTEC: '/logos/camartec.png',
  BRELA:    '/logos/brela.png',
  CBE:      '/logos/cbe.png',
  FCC:      '/logos/fcc.jpeg',
  NDC:      '/logos/ndc.png',
  TEMDO:    '/logos/temdo.jpeg',
  TIRDO:    '/logos/tirdo.png',
  SIDO:     '/logos/sido.jpeg',
  TBS:      '/logos/tbs.png',
  TANTRADE: '/logos/tantrade.png',
  WRRB:     '/logos/wrrb.png',
};
const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

const DEPT_ICON = {
  DAHRM: '🏛️', DID: '🏭', DPP: '📋', DTD: '🤝',
  DSME: '🏪', DTI: '🌐', FAU: '💰', PMU: '📦',
  LSU: '⚖️',  ICTU: '💻', GCU: '📢', IAU: '🔍', MEU: '📊',
};
const fmt = (n) => n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : (n?.toLocaleString() ?? '0');

// ── Tanzania national flag background ────────────────────────────────────────
const flagStyle = {
  background: `
    linear-gradient(160deg,
      rgba(30,130,76,0.08) 0%,
      rgba(255,255,255,0.95) 30%,
      rgba(255,255,255,0.95) 70%,
      rgba(0,102,153,0.08) 100%)
  `,
};

// ── Reusable components ──────────────────────────────────────────────────────
function SectionTitle({ children, icon: Icon, accent }) {
  const colors = { red: 'text-red-500', green: 'text-green-600', blue: 'text-blue-600', amber: 'text-amber-500', purple: 'text-purple-600', teal: 'text-teal-600' };
  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon className={`w-5 h-5 ${colors[accent] ?? 'text-gray-500'}`} />}
      <h2 className="text-base font-semibold text-gray-900">{children}</h2>
    </div>
  );
}

function FlagHeader() {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-6"
      style={{
        background: 'linear-gradient(135deg, #1e7e34 0%, #1e7e34 35%, #000000 40%, #f5c518 43%, #000000 46%, #006699 51%, #006699 100%)',
        minHeight: 110,
      }}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between px-6 py-5 gap-3">
        <div>
          <div className="text-white/90 text-sm font-semibold tracking-wide uppercase drop-shadow">United Republic of Tanzania</div>
          <div className="text-white text-xl font-bold tracking-wide drop-shadow mt-0.5">Ministry of Industry and Trade</div>
          <div className="text-white/80 text-sm mt-1">M&amp;E Dashboard · FY {FISCAL_YEAR_SHORT}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30 backdrop-blur">
            VOTE 44
          </span>
        </div>
      </div>
    </div>
  );
}

function IndustryStatCard({ label, value, sub, color, icon: Icon }) {
  const palette = {
    green:  { bg: 'from-green-600 to-green-700',  ring: 'ring-green-300' },
    blue:   { bg: 'from-blue-600 to-blue-700',    ring: 'ring-blue-300' },
    red:    { bg: 'from-red-500 to-red-600',      ring: 'ring-red-300' },
    amber:  { bg: 'from-amber-500 to-amber-600',  ring: 'ring-amber-300' },
  };
  const p = palette[color] ?? palette.blue;
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${p.bg} ring-1 ${p.ring} p-5 text-white shadow-md`}>
      <div className="absolute right-3 top-3 opacity-20">
        <Icon className="w-14 h-14" />
      </div>
      <div className="text-3xl font-extrabold tracking-tight">{value?.toLocaleString() ?? '-'}</div>
      <div className="text-sm font-semibold mt-1 opacity-90">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-1">{sub}</div>}
    </div>
  );
}

function ActivityCard({ label, value, color, icon: Icon }) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-500',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`rounded-xl border p-4 flex flex-col items-center gap-1 ${colors[color]}`}>
      <Icon className="w-7 h-7 opacity-80" />
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs font-medium text-center">{label}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    on_track:    { label: 'On Track',    cls: 'bg-green-100 text-green-700' },
    delayed:     { label: 'Delayed',     cls: 'bg-red-100 text-red-700' },
    implemented: { label: 'Implemented', cls: 'bg-blue-100 text-blue-700' },
    not_started: { label: 'Not Started', cls: 'bg-gray-100 text-gray-500' },
  }[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>
  );
}

function AbsBar({ rate, size = 'sm' }) {
  const color = rate >= 75 ? 'bg-green-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-400';
  const h = size === 'lg' ? 'h-3' : 'h-2';
  return (
    <div className={`w-full bg-gray-100 rounded-full ${h} overflow-hidden`}>
      <div className={`${color} ${h} rounded-full transition-all`} style={{ width: `${Math.min(rate, 100)}%` }} />
    </div>
  );
}

function BudgetTable({ data }) {
  const totPlanned = data.reduce((s, r) => s + r.planned, 0);
  const totActual = data.reduce((s, r) => s + r.actual, 0);
  const totBalance = data.reduce((s, r) => s + r.balance, 0);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase border-b">
            <th className="text-left py-2 pr-4">Period</th>
            <th className="text-right py-2 pr-4">Planned (TZS)</th>
            <th className="text-right py-2 pr-4">Actual (TZS)</th>
            <th className="text-right py-2">Balance (TZS)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.period ?? row.month ?? row.week} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-1.5 pr-4 font-medium text-gray-700">{row.period ?? row.month ?? row.week}</td>
              <td className="py-1.5 pr-4 text-right text-gray-600">{fmt(row.planned)}</td>
              <td className="py-1.5 pr-4 text-right text-blue-700 font-medium">{fmt(row.actual)}</td>
              <td className={`py-1.5 text-right font-semibold ${row.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {row.balance >= 0 ? '+' : ''}{fmt(row.balance)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-semibold text-gray-800">
            <td className="py-2 pr-4">Total</td>
            <td className="py-2 pr-4 text-right">{fmt(totPlanned)}</td>
            <td className="py-2 pr-4 text-right text-blue-700">{fmt(totActual)}</td>
            <td className={`py-2 text-right ${totBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totBalance >= 0 ? '+' : ''}{fmt(totBalance)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ItemizedTable({ items }) {
  if (!items?.length) return <p className="text-gray-400 text-sm text-center py-6">No itemized data available.</p>;
  const totals = items.reduce((acc, r) => {
    acc.budgetA += r.budgetA || 0;
    acc.fundAllocationB += r.fundAllocationB || 0;
    acc.expenditurePrevMonth += r.expenditurePrevMonth || 0;
    acc.expenditureThisMonth += r.expenditureThisMonth || 0;
    acc.expenditureToDate += r.expenditureToDate || 0;
    acc.commitmentToDate += r.commitmentToDate || 0;
    acc.totalCommitExpendC += r.totalCommitExpendC || 0;
    acc.fundBalanceBC += r.fundBalanceBC || 0;
    acc.budgetBalanceAB += r.budgetBalanceAB || 0;
    return acc;
  }, { budgetA: 0, fundAllocationB: 0, expenditurePrevMonth: 0, expenditureThisMonth: 0, expenditureToDate: 0, commitmentToDate: 0, totalCommitExpendC: 0, fundBalanceBC: 0, budgetBalanceAB: 0 });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs whitespace-nowrap">
        <thead>
          <tr className="text-xs text-gray-500 uppercase border-b bg-gray-50">
            <th className="text-left py-2 px-2 sticky left-0 bg-gray-50">Account Code</th>
            <th className="text-left py-2 px-2 min-w-[180px]">Description</th>
            <th className="text-right py-2 px-2">Budget (A)</th>
            <th className="text-right py-2 px-2">Fund Alloc. (B)</th>
            <th className="text-right py-2 px-2">Exp. Prev Month</th>
            <th className="text-right py-2 px-2">Exp. This Month</th>
            <th className="text-right py-2 px-2">Exp. to Date</th>
            <th className="text-right py-2 px-2">Commitment</th>
            <th className="text-right py-2 px-2">Total C&E (C)</th>
            <th className="text-right py-2 px-2">Fund Bal. (B-C)</th>
            <th className="text-right py-2 px-2">Budget Bal. (A-B)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className={`border-b last:border-0 hover:bg-blue-50 ${r.isOtherCharges ? 'bg-amber-50/40' : ''}`}>
              <td className="py-1.5 px-2 font-mono text-gray-600 sticky left-0 bg-white">{r.accountCode}</td>
              <td className="py-1.5 px-2 text-gray-700 max-w-[220px] truncate">{r.accountDescription}</td>
              <td className="py-1.5 px-2 text-right">{fmt(r.budgetA)}</td>
              <td className="py-1.5 px-2 text-right">{fmt(r.fundAllocationB)}</td>
              <td className="py-1.5 px-2 text-right text-gray-500">{fmt(r.expenditurePrevMonth)}</td>
              <td className="py-1.5 px-2 text-right">{fmt(r.expenditureThisMonth)}</td>
              <td className="py-1.5 px-2 text-right text-blue-700 font-medium">{fmt(r.expenditureToDate)}</td>
              <td className="py-1.5 px-2 text-right text-amber-600">{fmt(r.commitmentToDate)}</td>
              <td className="py-1.5 px-2 text-right text-purple-700 font-medium">{fmt(r.totalCommitExpendC)}</td>
              <td className={`py-1.5 px-2 text-right font-semibold ${r.fundBalanceBC >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(r.fundBalanceBC)}</td>
              <td className={`py-1.5 px-2 text-right font-semibold ${r.budgetBalanceAB >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(r.budgetBalanceAB)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 font-semibold text-gray-800 text-xs border-t-2">
          <tr>
            <td className="py-2 px-2 sticky left-0 bg-gray-50">TOTAL</td>
            <td className="py-2 px-2" />
            <td className="py-2 px-2 text-right">{fmt(totals.budgetA)}</td>
            <td className="py-2 px-2 text-right">{fmt(totals.fundAllocationB)}</td>
            <td className="py-2 px-2 text-right">{fmt(totals.expenditurePrevMonth)}</td>
            <td className="py-2 px-2 text-right">{fmt(totals.expenditureThisMonth)}</td>
            <td className="py-2 px-2 text-right text-blue-700">{fmt(totals.expenditureToDate)}</td>
            <td className="py-2 px-2 text-right text-amber-600">{fmt(totals.commitmentToDate)}</td>
            <td className="py-2 px-2 text-right text-purple-700">{fmt(totals.totalCommitExpendC)}</td>
            <td className={`py-2 px-2 text-right ${totals.fundBalanceBC >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.fundBalanceBC)}</td>
            <td className={`py-2 px-2 text-right ${totals.budgetBalanceAB >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.budgetBalanceAB)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const [budgetView, setBudgetView] = useState('quarterly');
  const [perfPeriod, setPerfPeriod] = useState('Q1');
  const [itemPeriod, setItemPeriod] = useState('Q1');
  const [deptExpanded, setDeptExpanded] = useState({});
  const [selectedDept, setSelectedDept] = useState(null);
  const [opens, setOpens] = useState({});
  const toggle = key => setOpens(o => ({ ...o, [key]: !o[key] }));

  const { data: overviewData, isLoading: l1 } = useQuery({
    queryKey: ['dashboard-overview', FISCAL_YEAR],
    queryFn: () => dashboardApi.overview({ fiscalYear: FISCAL_YEAR, period: 'Q1' }).then(r => r.data),
  });

  const { data: perfData, isLoading: l2 } = useQuery({
    queryKey: ['dashboard-performance', FISCAL_YEAR],
    queryFn: () => dashboardApi.performance({ fiscalYear: FISCAL_YEAR }).then(r => r.data),
  });

  const { data: instPerfData, isLoading: l3 } = useQuery({
    queryKey: ['dashboard-inst-perf', FISCAL_YEAR],
    queryFn: () => dashboardApi.institutionsPerformance({ fiscalYear: FISCAL_YEAR }).then(r => r.data),
    retry: false,
  });

  const { data: deptData, isLoading: l4 } = useQuery({
    queryKey: ['dashboard-dept', FISCAL_YEAR, itemPeriod],
    queryFn: () => dashboardApi.departments({ fiscalYear: FISCAL_YEAR, period: itemPeriod }).then(r => r.data),
    retry: false,
  });

  const { data: industryData, isLoading: l5 } = useQuery({
    queryKey: ['dashboard-industry', FISCAL_YEAR],
    queryFn: () => dashboardApi.industryStatistics({ fiscalYear: FISCAL_YEAR }).then(r => r.data),
    retry: false,
  });

  const { data: itemizedData, isLoading: l6 } = useQuery({
    queryKey: ['dashboard-itemized', FISCAL_YEAR, itemPeriod],
    queryFn: () => dashboardApi.itemizedBudget({ fiscalYear: FISCAL_YEAR, period: itemPeriod }).then(r => r.data),
    retry: false,
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['dashboard-projects'],
    queryFn: () => projectsApi.list({}).then(r => r.data),
    retry: false,
  });

  const isLoading = l1 || l2;
  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-3" />
        Loading dashboard...
      </div>
    </div>
  );

  const s = overviewData?.stats;
  const sub = s?.submissions || {};
  const acts = perfData?.activities || {};
  const budget = perfData?.budget || {};
  const indPerf = perfData?.indicatorPerformance || [];
  const objPerf = perfData?.objectivePerformance || [];

  const submissionData = [
    { name: 'Approved', value: sub.approved || 0 },
    { name: 'Submitted', value: sub.submitted || 0 },
    { name: 'Draft', value: sub.draft || 0 },
    { name: 'Rejected', value: sub.rejected || 0 },
  ].filter(d => d.value > 0);

  const perfChartData = indPerf
    .filter(i => i[`${perfPeriod}Actual`] !== null)
    .slice(0, 15)
    .map(i => ({
      code: i.code,
      Target: i[`${perfPeriod}Target`] ?? 0,
      Actual: i[`${perfPeriod}Actual`] ?? 0,
      Achievement: i[`${perfPeriod}Achievement`] ?? 0,
    }));

  const budgetTableData = budget[budgetView] || [];
  const budgetChartData = (budget.quarterly || []).map(q => ({
    period: q.period,
    Planned: q.planned,
    Actual: q.actual,
    Balance: q.balance,
  }));

  const indStats = industryData?.totals ?? {};

  // Critical breakdown pie

  return (
    <div className="space-y-6 min-h-screen" style={flagStyle}>

      {/* ── Flag Header ──────────────────────────────────────────────── */}
      <FlagHeader />

      {/* ── Automated Insight Panel ──────────────────────────────────── */}
      <InsightPanel
        title="What the data is telling you"
        scope="national"
        fiscalYear={FISCAL_YEAR}
        compact
        limit={10}
      />

      {/* ── Industry Statistics ───────────────────────────────────────── */}
      <div>
        <SectionTitle icon={BuildingStorefrontIcon} accent="green">
          Industry Statistics · Tanzania (FY {FISCAL_YEAR})
        </SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <IndustryStatCard
            label="Total Registered Industries"
            value={indStats.totalRegistered ?? 0}
            sub="Cumulative registered"
            color="blue"
            icon={BuildingStorefrontIcon}
          />
          <IndustryStatCard
            label="Industries Operating"
            value={indStats.operating ?? 0}
            sub="Currently active"
            color="green"
            icon={ArrowTrendingUpIcon}
          />
          <IndustryStatCard
            label="Industries Closed"
            value={indStats.closed ?? 0}
            sub="Ceased operations"
            color="red"
            icon={ArrowTrendingDownIcon}
          />
          <IndustryStatCard
            label="New Industries Registered"
            value={indStats.newRegistered ?? 0}
            sub={`Registered in FY ${FISCAL_YEAR}`}
            color="amber"
            icon={SparklesIcon}
          />
        </div>
      </div>

      {/* ── Top overview stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Institutions" value={s?.institutions ?? '-'} icon={BuildingOfficeIcon} color="blue" />
        <StatCard title="Indicators" value={s?.indicators ?? '-'} icon={ChartBarIcon} color="purple" />
        <StatCard title="Submissions Approved" value={sub.approved ?? 0} icon={CheckCircleIcon} color="green" />
        <StatCard
          title="Budget Absorption"
          value={`${s?.budget?.absorptionRate ?? 0}%`}
          subtitle={`TZS ${fmt(s?.budget?.spent)} of ${fmt(s?.budget?.total)}`}
          icon={CurrencyDollarIcon}
          color="amber"
        />
        <StatCard
          title="Total Projects"
          value={s?.projects?.total ?? allProjects.length}
          subtitle={`${s?.projects?.ongoing ?? allProjects.filter(p => p.status === 'ongoing').length} ongoing · ${s?.projects?.completed ?? allProjects.filter(p => p.status === 'completed').length} done`}
          icon={BriefcaseIcon}
          color="blue"
        />
      </div>

      {/* ── Institution Performance Matrix ──────────────────────────── */}
      {instPerfData?.institutions?.length > 0 && (
        <div className="card">
          <SectionTitle icon={BuildingOfficeIcon} accent="blue">
            Institution Performance · FY {FISCAL_YEAR}
          </SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {instPerfData.institutions.map((inst) => {
              const logo = LOGO_MAP[inst.code];
              const rate = inst.budget.absorptionRate;
              const rateColor = rate >= 75 ? 'text-green-600' : rate >= 40 ? 'text-amber-500' : 'text-red-500';
              const barColor = rate >= 75 ? 'bg-green-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-400';
              return (
                <div
                  key={inst.id}
                  onClick={() => navigate(`/framework?institution=${inst.id}`)}
                  className="border rounded-xl p-3 bg-white hover:shadow-md hover:border-mit-blue/40 transition-all cursor-pointer flex flex-col gap-2"
                  title={`View ${inst.name} framework`}
                >
                  {/* Logo / initials */}
                  <div className="flex items-center gap-2">
                    {logo ? (
                      <img src={logo} alt={inst.code} className="w-10 h-10 object-contain rounded-lg border border-gray-100 bg-white p-0.5 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-mit-blue flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">{inst.code?.slice(0, 3)}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 text-xs leading-tight truncate">{inst.code}</div>
                      {inst.region && <div className="text-gray-400 text-[10px] truncate">{inst.region}</div>}
                    </div>
                  </div>
                  {/* Absorption bar */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-gray-400">Budget absorption</span>
                      <span className={`text-xs font-bold ${rateColor}`}>{rate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${Math.min(rate, 100)}%` }} />
                    </div>
                  </div>
                  {/* Submission badges */}
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      {inst.actuals.approved} approved
                    </span>
                    <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      {inst.actuals.submitted} submitted
                    </span>
                  </div>
                  {/* Budget figures */}
                  <div className="text-[10px] text-gray-400 border-t pt-1.5 space-y-0.5">
                    <div>Budget: <span className="text-gray-600 font-medium">{fmt(inst.budget.totalBudget)}</span></div>
                    <div>Spent: <span className="text-blue-700 font-semibold">{fmt(inst.budget.totalSpent)}</span></div>
                  </div>
                  {/* Project summary */}
                  {inst.projects?.total > 0 && (
                    <div className="text-[10px] border-t pt-1.5 space-y-0.5">
                      <div className="flex items-center gap-1 text-gray-400 font-semibold mb-0.5">
                        <BriefcaseIcon className="w-3 h-3" /> Projects
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">{inst.projects.total} total</span>
                        {inst.projects.ongoing   > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">{inst.projects.ongoing} ongoing</span>}
                        {inst.projects.completed > 0 && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">{inst.projects.completed} done</span>}
                        {inst.projects.delayed   > 0 && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">{inst.projects.delayed} delayed</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Projects Overview ─────────────────────────────────────────── */}
      {instPerfData?.institutions?.some(i => i.projects?.total > 0) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle icon={BriefcaseIcon} accent="blue">
              Projects by Institution · FY {FISCAL_YEAR}
            </SectionTitle>
            <Link to="/projects" className="text-xs font-semibold text-blue-600 hover:underline">View All Projects →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Institution', 'Total', 'Ongoing', 'Completed', 'Delayed', 'Project Budget', 'Spent'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wide text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {instPerfData.institutions.filter(i => i.projects?.total > 0).map(inst => (
                  <tr key={inst.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-gray-800">{inst.code}</div>
                      <div className="text-gray-400 text-[10px] truncate max-w-[140px]">{inst.name}</div>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-gray-700">{inst.projects.total}</td>
                    <td className="px-3 py-2.5"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{inst.projects.ongoing}</span></td>
                    <td className="px-3 py-2.5"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{inst.projects.completed}</span></td>
                    <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full font-semibold ${inst.projects.delayed > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>{inst.projects.delayed}</span></td>
                    <td className="px-3 py-2.5 font-mono text-gray-700">TZS {fmt(inst.projects.totalBudget)}</td>
                    <td className="px-3 py-2.5 font-mono text-blue-700">TZS {fmt(inst.projects.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Activity Implementation Status ────────────────────────────── */}
      <div className="card">
        <SectionTitle icon={PlayCircleIcon} accent="blue">Activity Implementation Status</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <ActivityCard label="Total Activities" value={acts.total ?? 0} color="blue" icon={PlayCircleIcon} />
          <ActivityCard label="Implemented" value={acts.implemented ?? 0} color="green" icon={CheckCircleIcon} />
          <ActivityCard label="On Track" value={acts.onTrack ?? 0} color="green" icon={CheckCircleIcon} />
          <ActivityCard label="Delayed" value={acts.delayed ?? 0} color="red" icon={ExclamationTriangleIcon} />
          <ActivityCard label="Not Started" value={acts.notStarted ?? 0} color="gray" icon={StopCircleIcon} />
        </div>
        {acts.total > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-center">
            <div>
              <div className="text-green-600 font-semibold text-sm">{acts.total > 0 ? Math.round((acts.implemented / acts.total) * 100) : 0}%</div>
              <div className="text-gray-400">Implementation Rate</div>
            </div>
            <div>
              <div className="text-green-600 font-semibold text-sm">{(acts.onTrack + acts.delayed) > 0 ? Math.round((acts.onTrack / (acts.onTrack + acts.delayed)) * 100) : 0}%</div>
              <div className="text-gray-400">On Track Rate</div>
            </div>
            <div>
              <div className="text-red-500 font-semibold text-sm">{(acts.onTrack + acts.delayed) > 0 ? Math.round((acts.delayed / (acts.onTrack + acts.delayed)) * 100) : 0}%</div>
              <div className="text-gray-400">Delay Rate</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Objective Performance & Activity Contribution ─────────────── */}
      {objPerf.length > 0 && (
        <div className="card">
          <SectionTitle icon={ChartBarIcon} accent="purple">
            Sector Performance · Activity Contribution per Strategic Objective
          </SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {objPerf.map(obj => {
              const implPct = obj.activityContributionPct;
              const avgAch = obj.avgIndicatorAchievement;
              const barColor = implPct >= 75 ? 'bg-green-500' : implPct >= 40 ? 'bg-amber-500' : 'bg-red-400';
              const pctColor = implPct >= 75 ? 'text-green-600' : implPct >= 40 ? 'text-amber-500' : 'text-red-500';
              const ringColor = implPct >= 75 ? 'border-green-200' : implPct >= 40 ? 'border-amber-200' : 'border-red-200';
              return (
                <div key={obj.id} className={`border ${ringColor} rounded-xl p-3 bg-white hover:shadow-md transition-shadow flex flex-col gap-2`}>
                  {/* Objective name */}
                  <div className="font-medium text-gray-800 text-xs leading-snug line-clamp-3 min-h-[2.5rem]">
                    {obj.name}
                  </div>

                  {/* Percentage + bar */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-extrabold ${pctColor}`}>{implPct}%</span>
                    <span className="text-[10px] text-gray-400">impl.</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${Math.min(implPct, 100)}%` }} />
                  </div>

                  {/* Avg achievement */}
                  {avgAch !== null && (
                    <span className="self-start bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      Ach: {avgAch}%
                    </span>
                  )}

                  {/* Activity mini counts */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] border-t pt-1.5 mt-auto">
                    <span className="text-gray-400">Total: <span className="font-semibold text-gray-600">{obj.totalActivities}</span></span>
                    <span className="text-green-600">OK: <span className="font-semibold">{obj.onTrackActivities}</span></span>
                    <span className="text-red-500">Late: <span className="font-semibold">{obj.delayedActivities}</span></span>
                    <span className="text-gray-400">Pending: <span className="font-semibold">{obj.totalActivities - obj.implementedActivities}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Department & Unit Performance / Other Charges ─────────────── */}
      {l4 && (
        <div className="card text-gray-400 text-sm text-center py-6">Loading department data...</div>
      )}
      {!l4 && deptData?.departments?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle icon={BuildingOfficeIcon} accent="teal">
              Department &amp; Unit Performance · Other Charges Utilization
            </SectionTitle>
            <div className="flex gap-1">
              {[
                { key: 'Q1',     label: 'Q1' },
                { key: 'Q2',     label: 'Q2' },
                { key: 'Q3',     label: 'Q3' },
                { key: 'Q4',     label: 'Q4' },
                { key: 'Annual', label: 'Annual' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => { setItemPeriod(key); setSelectedDept(null); }}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${itemPeriod === key ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Icon grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-2 mb-4">
            {deptData.departments.map(dept => {
              const isSelected = selectedDept?.id === dept.id;
              const rate = dept.absorptionRate ?? 0;
              const dotColor = rate >= 75 ? 'bg-green-500' : rate >= 40 ? 'bg-amber-400' : 'bg-red-400';
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDept(d => d?.id === dept.id ? null : dept)}
                  title={dept.name}
                  className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-teal-50 border-teal-400 shadow ring-1 ring-teal-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-teal-50 hover:border-teal-200'
                  }`}
                >
                  <span className="text-2xl leading-none">{DEPT_ICON[dept.code] || '🏢'}</span>
                  <span className="text-[10px] font-bold text-gray-600 tracking-wide">{dept.code}</span>
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} title={`${rate}% absorbed`} />
                </button>
              );
            })}
          </div>

          {/* ── Detail panel for selected dept ────────────────────────── */}
          {selectedDept && (() => {
            const dept = deptData.departments.find(d => d.id === selectedDept.id) ?? selectedDept;
            return (
              <div className="border border-teal-200 rounded-xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-teal-50 border-b border-teal-100">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{DEPT_ICON[dept.code] || '🏢'}</span>
                    <div>
                      <span className="font-semibold text-gray-800 text-sm">{dept.name}</span>
                      <span className="ml-2 text-xs text-teal-600 font-bold">{dept.code}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedDept(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1">✕</button>
                </div>

                {/* Budget row */}
                <div className="px-4 py-3 bg-white flex flex-wrap gap-6 text-xs border-b border-gray-100">
                  <span className="text-gray-500">Budget: <span className="font-semibold text-gray-800">{fmt(dept.budget)}</span></span>
                  <span className="text-blue-600">Spent: <span className="font-semibold">{fmt(dept.spent)}</span></span>
                  <span className="flex items-center gap-1.5">
                    <AbsBar rate={dept.absorptionRate} />
                    <span className={`font-bold ${dept.absorptionRate >= 75 ? 'text-green-600' : dept.absorptionRate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                      {dept.absorptionRate}%
                    </span>
                  </span>
                </div>

                {/* Other Charges row */}
                <div className="px-4 py-2.5 bg-amber-50/60 border-b border-amber-100 flex flex-wrap gap-4 text-xs">
                  <span className="font-semibold text-amber-700">Other Charges</span>
                  <span>Budget: <span className="font-bold">{fmt(dept.otherCharges?.budget)}</span></span>
                  <span>Spent: <span className="font-bold text-blue-700">{fmt(dept.otherCharges?.spent)}</span></span>
                  <span>Balance: <span className={`font-bold ${(dept.otherCharges?.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(dept.otherCharges?.balance)}</span></span>
                  <span className={`font-bold ${(dept.otherCharges?.utilizationRate ?? 0) >= 75 ? 'text-green-600' : 'text-amber-600'}`}>
                    {dept.otherCharges?.utilizationRate ?? 0}% utilized
                  </span>
                </div>

                {/* Units */}
                {dept.units?.length > 0 && (
                  <div className="divide-y">
                    {dept.units.map(unit => (
                      <div key={unit.id} className="px-6 py-3 bg-white">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-medium text-gray-700 text-xs">{unit.name}</span>
                            <span className="ml-2 text-xs text-gray-400">{unit.code}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs">
                            <span className="text-gray-500">Budget: <span className="font-semibold">{fmt(unit.budget)}</span></span>
                            <span className="text-blue-600">Spent: <span className="font-semibold">{fmt(unit.spent)}</span></span>
                            <div className="flex items-center gap-1.5">
                              <AbsBar rate={unit.absorptionRate} />
                              <span className={`font-bold ${unit.absorptionRate >= 75 ? 'text-green-600' : unit.absorptionRate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                {unit.absorptionRate}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                          <span className="font-semibold">Other Charges</span>
                          <span>Budget: {fmt(unit.otherCharges?.budget)}</span>
                          <span>Spent: {fmt(unit.otherCharges?.spent)}</span>
                          <span className={`font-semibold ${(unit.otherCharges?.utilizationRate ?? 0) >= 75 ? 'text-green-600' : ''}`}>
                            {unit.otherCharges?.utilizationRate ?? 0}% utilized
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {!selectedDept && (
            <p className="text-center text-xs text-gray-400 py-2">Click a department or unit icon above to view its budget details</p>
          )}
        </div>
      )}

      {/* ── Actual Performance by Indicator ──────────────────────────── */}
      <div className="card">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <SectionTitle icon={ChartBarIcon} accent="blue">Actual Performance by Indicator</SectionTitle>
          <div className="flex gap-1">
            {['Q1','Q2','Q3','Q4'].map(p => (
              <button key={p} onClick={() => { setPerfPeriod(p); setOpens(o => ({...o, perf: false})); }}
                className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${perfPeriod === p ? 'bg-mit-blue text-white border-mit-blue' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Indicator icon chips */}
        {perfChartData.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {perfChartData.map(ind => {
              const isOn = opens.perf;
              return (
                <button key={ind.code}
                  onClick={() => toggle('perf')}
                  title={ind.code}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                    isOn ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm ring-1 ring-blue-200'
                         : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200'
                  }`}>
                  <ChartBarIcon className="w-4 h-4" />
                  {ind.code}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">No {perfPeriod} actuals available.</p>
        )}

        {/* Chart: shown when any chip clicked */}
        {opens.perf && perfChartData.length > 0 && (
          <div className="mt-2 border-t border-blue-100 pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={perfChartData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="code" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fontSize: 11 }} domain={[0, 200]} />
                <Tooltip formatter={(val, name) => [val.toLocaleString(), name]} />
                <Legend />
                <Bar yAxisId="left" dataKey="Target" fill="#94a3b8" radius={[3,3,0,0]} name="Target" />
                <Bar yAxisId="left" dataKey="Actual" fill="#1B3A6B" radius={[3,3,0,0]} name="Actual" />
                <Bar yAxisId="right" dataKey="Achievement" fill="#f59e0b" radius={[3,3,0,0]} name="Achievement %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {!opens.perf && perfChartData.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-1">Click any indicator above to display the chart</p>
        )}
      </div>

      {/* ── Budget: Planned vs Actual ─────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle icon={CurrencyDollarIcon} accent="amber">Budget: Planned vs Actual Expenditure vs Balance</SectionTitle>
          <div className="flex gap-1">
            {['quarterly','monthly','weekly'].map(v => (
              <button key={v} onClick={() => setBudgetView(v)}
                className={`px-3 py-1 text-xs rounded-full border font-medium capitalize transition-colors ${budgetView === v ? 'bg-mit-blue text-white border-mit-blue' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Two icon cards: Chart + Table */}
        <div className="flex gap-3 mb-3">
          {[
            { key: 'budgetChart', icon: '📊', label: 'Bar Chart',    color: 'bg-amber-50 border-amber-300 text-amber-700' },
            { key: 'budgetTable', icon: '📋', label: 'Data Table',   color: 'bg-blue-50 border-blue-300 text-blue-700' },
          ].map(({ key, icon, label, color }) => (
            <button key={key} onClick={() => toggle(key)}
              className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border font-medium text-xs transition-all ${
                opens[key] ? `${color} shadow-sm ring-1 ring-offset-0` : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}>
              <span className="text-2xl">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {opens.budgetChart && budgetChartData.length > 0 && (
          <div className="mt-2 border-t border-amber-100 pt-4 mb-4">
            <p className="text-xs text-gray-400 mb-3">Quarterly Budget Overview (TZS)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={budgetChartData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => `TZS ${val.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="Planned" fill="#94a3b8" radius={[3,3,0,0]} />
                <Bar dataKey="Actual" fill="#1B3A6B" radius={[3,3,0,0]} />
                <Bar dataKey="Balance" fill="#22c55e" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {opens.budgetTable && (
          <div className="mt-2 border-t border-blue-100 pt-4">
            <p className="text-xs text-gray-400 mb-2 capitalize">{budgetView} Breakdown</p>
            <BudgetTable data={budgetTableData} />
          </div>
        )}

        {!opens.budgetChart && !opens.budgetTable && (
          <p className="text-center text-xs text-gray-400 py-1">Click an icon above to display the chart or table</p>
        )}
      </div>

      {/* ── Itemized Commitment & Expenditure Report ──────────────────── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <SectionTitle icon={CurrencyDollarIcon} accent="purple">
              Itemized Commitment &amp; Expenditure Report
            </SectionTitle>
            <p className="text-xs text-gray-400 -mt-3">VOTE 44 · Ministry of Industry and Trade · TZS</p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {[
              { key: 'Q1', label: 'Q1 (Jul–Sep)' },
              { key: 'Q2', label: 'Q2 (Oct–Dec)' },
              { key: 'Q3', label: 'Q3 (Jan–Mar)' },
              { key: 'Q4', label: 'Q4 (Apr–Jun)' },
              { key: 'Annual', label: 'Annual' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => { setItemPeriod(key); setOpens(o => ({...o, itemized: false})); }}
                className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${itemPeriod === key ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Single icon card to reveal report */}
        <div className="flex gap-3 mb-3">
          <button onClick={() => toggle('itemized')}
            className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border font-medium text-xs transition-all ${
              opens.itemized ? 'bg-purple-50 border-purple-400 text-purple-700 shadow-sm ring-1 ring-purple-200' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}>
            <span className="text-2xl">📑</span>
            View Report
          </button>
        </div>

        {opens.itemized && (
          <div className="border-t border-purple-100 pt-4">
            {l6 ? (
              <div className="text-gray-400 text-sm text-center py-6">Loading itemized data...</div>
            ) : (
              <>
                {itemizedData?.totals && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Total Budget (A)',          value: itemizedData.totals.budgetA,            color: 'text-gray-700' },
                      { label: 'Expenditure to Date',       value: itemizedData.totals.expenditureToDate,  color: 'text-blue-700' },
                      { label: 'Total Commit. & Exp. (C)',  value: itemizedData.totals.totalCommitExpendC, color: 'text-purple-700' },
                      { label: 'Fund Balance (B−C)',        value: itemizedData.totals.fundBalanceBC,      color: itemizedData.totals.fundBalanceBC >= 0 ? 'text-green-600' : 'text-red-600' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-3 border">
                        <div className={`text-lg font-bold ${color}`}>{fmt(value)}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
                {itemizedData?.summary?.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {itemizedData.summary.map(dept => (
                      <details key={dept.id} className="border rounded-lg group">
                        <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-lg group-open:rounded-b-none list-none">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <span>{DEPT_ICON[dept.code] || '🏢'}</span>
                            <span>{dept.name}</span>
                            {dept.code && <span className="text-xs font-normal text-gray-400">{dept.code}</span>}
                          </div>
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>Budget: <span className="font-semibold text-gray-700">{fmt(dept.totals.budgetA)}</span></span>
                            <span>Spent: <span className="font-semibold text-blue-700">{fmt(dept.totals.expenditureToDate)}</span></span>
                            <span>Balance: <span className={`font-semibold ${dept.totals.fundBalanceBC >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(dept.totals.fundBalanceBC)}</span></span>
                          </div>
                        </summary>
                        {dept.units?.map(unit => (
                          <div key={unit.id} className="border-t">
                            <div className="px-6 py-2 bg-white text-xs font-medium text-gray-600 border-b border-gray-100">{unit.name}</div>
                            <ItemizedTable items={unit.items} />
                          </div>
                        ))}
                      </details>
                    ))}
                  </div>
                )}
                {(!itemizedData?.summary?.length && itemizedData?.items?.length > 0) && <ItemizedTable items={itemizedData.items} />}
                {!itemizedData?.items?.length && !l6 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No itemized budget data for this period. Import the itemized XLS to populate this section.
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {!opens.itemized && (
          <p className="text-center text-xs text-gray-400 py-1">Click the icon above to view the itemized report</p>
        )}
      </div>

      {/* ── Submission Status & Budget Absorption ────────────────────── */}
      <div className="card">
        <SectionTitle icon={CheckCircleIcon} accent="green">Submission Status &amp; Budget Absorption</SectionTitle>

        {/* Icon cards */}
        <div className="flex gap-3 mb-3">
          {submissionData.length > 0 && (
            <button onClick={() => toggle('submission')}
              className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border font-medium text-xs transition-all ${
                opens.submission ? 'bg-green-50 border-green-400 text-green-700 shadow-sm ring-1 ring-green-200' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}>
              <span className="text-2xl">🥧</span>
              Submission Status
              <span className="text-[10px] font-bold text-green-600">{sub.approved ?? 0} Approved</span>
            </button>
          )}
          {s?.budget?.total > 0 && (
            <button onClick={() => toggle('absorption')}
              className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border font-medium text-xs transition-all ${
                opens.absorption ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm ring-1 ring-amber-200' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}>
              <span className="text-2xl">💰</span>
              Budget Absorption
              <span className="text-[10px] font-bold text-amber-600">{s.budget.absorptionRate}%</span>
            </button>
          )}
        </div>

        {/* Detail panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {opens.submission && submissionData.length > 0 && (
            <div className="border border-green-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Submission Status</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={submissionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                    {submissionData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {opens.absorption && s?.budget?.total > 0 && (
            <div className="border border-amber-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Budget Absorption</p>
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-mit-blue">{s.budget.absorptionRate}%</span>
                  <span className="text-gray-400 text-sm pb-1">of total budget spent</span>
                </div>
                <ProgressBar value={s.budget.spent} max={s.budget.total} size="lg" />
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <div className="font-semibold text-gray-700">TZS {fmt(s.budget.spent)}</div>
                    <div className="text-xs text-gray-400">Spent</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700">TZS {fmt(s.budget.total - s.budget.spent)}</div>
                    <div className="text-xs text-gray-400">Balance</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700">TZS {fmt(s.budget.total)}</div>
                    <div className="text-xs text-gray-400">Total Budget</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!opens.submission && !opens.absorption && (
          <p className="text-center text-xs text-gray-400 py-1">Click an icon above to display the chart or stats</p>
        )}
      </div>
    </div>
  );
}
