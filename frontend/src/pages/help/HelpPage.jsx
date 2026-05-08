import { useState, useMemo } from 'react';
import {
  ChevronDownIcon, ChevronUpIcon, QuestionMarkCircleIcon,
  BookOpenIcon, PencilSquareIcon, ChartBarSquareIcon,
  DocumentArrowDownIcon, LockClosedIcon, EnvelopeIcon,
  PhoneIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// ── Accordion item ────────────────────────────────────────────────────────────
function AccordionItem({ title, icon: Icon, accentColor = 'text-blue-600', children, isOpen, onToggle, searchQuery }) {
  // Highlight matches in text
  function highlight(text) {
    if (!searchQuery || !text) return text;
    const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((p, i) =>
      p.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{p}</mark>
        : p
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className={`w-5 h-5 flex-shrink-0 ${accentColor}`} />}
          <span className="font-semibold text-gray-900 text-base">{title}</span>
        </div>
        {isOpen
          ? <ChevronUpIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          : <ChevronDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
        }
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 text-sm text-gray-700 leading-relaxed space-y-4">
          {typeof children === 'function' ? children(highlight) : children}
        </div>
      )}
    </div>
  );
}

// ── FAQ item ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a, searchQuery }) {
  const [open, setOpen] = useState(false);

  function highlight(text) {
    if (!searchQuery || !text) return text;
    const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((p, i) =>
      p.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{p}</mark>
        : p
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
      >
        <span>{highlight(q)}</span>
        {open
          ? <ChevronUpIcon className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
          : <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
        }
      </button>
      {open && (
        <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-600 leading-relaxed bg-gray-50">
          {highlight(a)}
        </div>
      )}
    </div>
  );
}

// ── Role table ────────────────────────────────────────────────────────────────
const ROLES = [
  {
    role: 'Super Admin',
    badge: 'bg-red-100 text-red-800',
    access: 'Full system access',
    capabilities: 'Manage all users, institutions, framework, approve versions, view all data',
  },
  {
    role: 'Admin',
    badge: 'bg-blue-100 text-blue-800',
    access: 'Institution-level admin',
    capabilities: 'Manage institution users, view institution data, manage budget plans',
  },
  {
    role: 'M&E Officer',
    badge: 'bg-indigo-100 text-indigo-800',
    access: 'M&E Unit staff',
    capabilities: 'Approve/reject submissions, manage indicators, capture framework snapshots, run analytics',
  },
  {
    role: 'Data Collector',
    badge: 'bg-yellow-100 text-yellow-800',
    access: 'Department/institution reporter',
    capabilities: 'Submit performance actuals, view own submissions, upload supporting documents',
  },
  {
    role: 'Viewer',
    badge: 'bg-gray-100 text-gray-700',
    access: 'Read-only',
    capabilities: 'View dashboards, reports, and framework. Cannot submit or modify any data',
  },
];

// ── Indicator types ───────────────────────────────────────────────────────────
const INDICATOR_TYPES = [
  {
    type: 'achievement_pct',
    label: 'Achievement Percentage',
    description: 'Measures the percentage of a target achieved. Example: "80% of inspections completed out of 100 planned."',
  },
  {
    type: 'cumulative_total',
    label: 'Cumulative Total',
    description: 'Running total that accumulates across periods. Each quarter adds to the previous. Example: total licenses issued to date.',
  },
  {
    type: 'count',
    label: 'Count',
    description: 'Simple count for a specific period. Does not accumulate. Example: number of meetings held this quarter.',
  },
  {
    type: 'rate',
    label: 'Rate / Ratio',
    description: 'A calculated rate or ratio expressed as a number or percentage. Example: complaint resolution rate.',
  },
  {
    type: 'yes_no',
    label: 'Yes / No (Binary)',
    description: 'A milestone that is either achieved (Yes) or not achieved (No). Example: "Policy reviewed and approved."',
  },
];

// ── FAQs ──────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'Why can\'t I submit data for an indicator?',
    a: 'Data submission may be restricted for several reasons: (1) the reporting period may be locked by the M&E Unit, (2) you may not have the Data Collector role, or (3) you may not be assigned to that indicator\'s institution. Contact your institution admin or M&E Officer if you believe access is incorrect.',
  },
  {
    q: 'What does "At Risk" status mean?',
    a: '"At Risk" means the current achievement level is below the expected trajectory to meet the annual target, but there is still time to recover. It typically triggers between 50–74% of the expected cumulative achievement. "Off Track" (below 50%) requires immediate escalation.',
  },
  {
    q: 'How is "achievement %" calculated?',
    a: 'Achievement % = (Actual Value ÷ Target Value) × 100. For cumulative indicators, the actual is the running total across reported periods. The system handles aggregation automatically based on the indicator type.',
  },
  {
    q: 'Can I edit a submission after it has been approved?',
    a: 'No. Once a submission is approved by M&E, it is locked. If a correction is needed, contact the M&E Officer who can reject the record and allow resubmission. This preserves audit trail integrity.',
  },
  {
    q: 'How do I know which fiscal year to use?',
    a: 'Tanzania\'s fiscal year runs from 1 July to 30 June. The current fiscal year will be pre-selected by default in most forms. For example, FY 2025-2026 runs from July 2025 to June 2026.',
  },
  {
    q: 'What file types can I upload as supporting documents?',
    a: 'The system accepts PDF, Word (.doc/.docx), Excel (.xls/.xlsx), and common image formats (JPG, PNG). Maximum file size is 10MB per upload.',
  },
  {
    q: 'Why is my account locked?',
    a: 'Accounts are locked after 5 consecutive failed login attempts as a security measure. Contact your institution admin or M&E Unit to unlock your account. Accounts may also be manually deactivated by admins.',
  },
  {
    q: 'How do I export data to Excel or PDF?',
    a: 'Go to the Reports page, configure your filters (fiscal year, period, institution), then click "Export to Excel" or use the print/PDF option in your browser for the on-screen report. The Excel export includes raw data suitable for further analysis.',
  },
];

// ── Section content ───────────────────────────────────────────────────────────
const SECTIONS = [
  {
    key: 'getting-started',
    title: 'Getting Started',
    icon: BookOpenIcon,
    accentColor: 'text-blue-600',
    keywords: ['login', 'overview', 'role', 'admin', 'access', 'system', 'getting started', 'account'],
  },
  {
    key: 'data-entry',
    title: 'Data Entry Guide',
    icon: PencilSquareIcon,
    accentColor: 'text-green-600',
    keywords: ['submit', 'entry', 'actual', 'value', 'approval', 'quarter', 'data entry', 'indicator', 'fiscal'],
  },
  {
    key: 'indicators',
    title: 'Indicators & Framework',
    icon: ChartBarSquareIcon,
    accentColor: 'text-indigo-600',
    keywords: ['indicator', 'framework', 'objective', 'outcome', 'output', 'activity', 'cumulative', 'achievement'],
  },
  {
    key: 'reports',
    title: 'Reports & Exports',
    icon: DocumentArrowDownIcon,
    accentColor: 'text-amber-600',
    keywords: ['report', 'export', 'excel', 'pdf', 'download', 'print', 'consolidated'],
  },
  {
    key: 'account',
    title: 'Account & Security',
    icon: LockClosedIcon,
    accentColor: 'text-red-600',
    keywords: ['password', 'lock', 'security', 'account', 'change password', 'locked', 'access'],
  },
  {
    key: 'faqs',
    title: 'Frequently Asked Questions',
    icon: QuestionMarkCircleIcon,
    accentColor: 'text-purple-600',
    keywords: FAQS.map(f => f.q.toLowerCase()).join(' ').split(' '),
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function HelpPage() {
  const [openSection, setOpenSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase().trim();
    return SECTIONS.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.keywords.some(k => typeof k === 'string' && k.includes(q)) ||
      (s.key === 'faqs' && FAQS.some(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)))
    );
  }, [searchQuery]);

  const toggle = (key) => setOpenSection(prev => prev === key ? null : key);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <QuestionMarkCircleIcon className="w-7 h-7 text-blue-600" />
          Help & Training
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Guidance for using the MIT Monitoring & Evaluation System
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search help topics..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input w-full pl-9 py-2.5"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2" />
          <p>No help topics match your search.</p>
        </div>
      )}

      {/* Accordion sections */}
      <div className="space-y-3">
        {filteredSections.map(section => (
          <AccordionItem
            key={section.key}
            title={section.title}
            icon={section.icon}
            accentColor={section.accentColor}
            isOpen={openSection === section.key}
            onToggle={() => toggle(section.key)}
            searchQuery={searchQuery}
          >
            {(highlight) => {
              // ── 1. Getting Started ───────────────────────────────────────
              if (section.key === 'getting-started') return (
                <>
                  <p>
                    The <strong>MIT M&E System</strong> is used by the Ministry of Industry &amp; Trade (MIT) and its
                    13 affiliated institutions to monitor and evaluate performance against the MIT Strategic Plan
                    2026/27–2030/31. It tracks indicators across all levels of the results chain: from
                    Strategic Objectives down to Activities.
                  </p>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Logging In</h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
                      <li>Go to the system URL provided by your ICT Unit.</li>
                      <li>Enter your email address and password.</li>
                      <li>Click <strong>Sign In</strong>. You will be directed to your Dashboard.</li>
                      <li>If you have forgotten your password, click <strong>Forgot password?</strong> on the login page.</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">User Roles</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-gray-600 border-b border-gray-200">Role</th>
                            <th className="text-left px-3 py-2 font-semibold text-gray-600 border-b border-gray-200">Access Level</th>
                            <th className="text-left px-3 py-2 font-semibold text-gray-600 border-b border-gray-200">Capabilities</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {ROLES.map(r => (
                            <tr key={r.role} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.badge}`}>{r.role}</span>
                              </td>
                              <td className="px-3 py-2 text-gray-600">{highlight(r.access)}</td>
                              <td className="px-3 py-2 text-gray-500">{highlight(r.capabilities)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );

              // ── 2. Data Entry Guide ───────────────────────────────────────
              if (section.key === 'data-entry') return (
                <>
                  <p>Data entry is done quarterly (Q1–Q4) and annually. Only users with the <strong>Data Collector</strong> role can submit actuals.</p>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Step-by-Step Submission</h4>
                    <div className="space-y-2">
                      {[
                        { step: 1, text: 'Navigate to Data Entry → Submit Data.' },
                        { step: 2, text: 'Select the Fiscal Year (e.g. 2025-2026) and Reporting Period (Q1, Q2, Q3, Q4, or Annual).' },
                        { step: 3, text: 'Choose the Indicator you are reporting on. Only indicators assigned to your institution will appear.' },
                        { step: 4, text: 'Enter the actual value achieved. Check the target and indicator description to understand the expected unit of measure.' },
                        { step: 5, text: 'Add a narrative comment explaining the result (required for M&E review).' },
                        { step: 6, text: 'Optionally upload supporting documents (reports, photos, meeting minutes).' },
                        { step: 7, text: 'Click Submit. The record is sent to your supervisor for first-level review.' },
                      ].map(({ step, text }) => (
                        <div key={step} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{step}</span>
                          <p className="text-gray-700 pt-0.5">{highlight(text)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Approval Process</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-0 flex-wrap justify-center">
                        {[
                          { label: 'You Submit', sub: 'Data Collector', color: 'bg-blue-500' },
                          { label: 'Supervisor', sub: '1st Review', color: 'bg-indigo-500' },
                          { label: 'M&E Unit', sub: 'Verification', color: 'bg-purple-600' },
                          { label: 'Approved', sub: 'Final', color: 'bg-green-600' },
                        ].map((step, i, arr) => (
                          <div key={step.label} className="flex items-center">
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full ${step.color} text-white flex items-center justify-center`}>
                                <span className="text-xs font-bold">{i + 1}</span>
                              </div>
                              <span className="text-xs font-semibold text-gray-700 mt-1 text-center">{step.label}</span>
                              <span className="text-xs text-gray-400 text-center">{step.sub}</span>
                            </div>
                            {i < arr.length - 1 && (
                              <div className="w-8 h-0.5 bg-gray-300 mx-1 mb-4 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 text-center mt-3">
                        At any stage, the reviewer can reject and send back for correction with comments.
                      </p>
                    </div>
                  </div>
                </>
              );

              // ── 3. Indicators & Framework ─────────────────────────────────
              if (section.key === 'indicators') return (
                <>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Results Chain</h4>
                    <p>The results framework is organised as a hierarchy:</p>
                    <div className="mt-2 space-y-1 text-sm">
                      {[
                        { level: 'Strategic Objective', color: 'bg-blue-600', desc: 'Highest-level goal (e.g. "Industrial Performance Improved")' },
                        { level: 'Outcome', color: 'bg-teal-600', desc: 'Medium-term change resulting from outputs' },
                        { level: 'Output', color: 'bg-indigo-500', desc: 'Tangible products or services delivered' },
                        { level: 'Activity', color: 'bg-purple-500', desc: 'Specific tasks done to produce outputs' },
                      ].map(({ level, color, desc }) => (
                        <div key={level} className="flex items-start gap-2">
                          <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold text-white ${color} whitespace-nowrap`}>{level}</span>
                          <span className="text-gray-600">{highlight(desc)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-gray-500 text-xs">
                      Indicators can be attached at the Outcome or Output level and measure how well each level is being achieved.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Indicator Types</h4>
                    <div className="space-y-3">
                      {INDICATOR_TYPES.map(({ type, label, description }) => (
                        <div key={type} className="bg-gray-50 rounded-lg p-3">
                          <p className="font-medium text-gray-800 text-sm">
                            {label}
                            <span className="ml-2 font-mono text-xs text-gray-400">{type}</span>
                          </p>
                          <p className="text-gray-600 mt-0.5">{highlight(description)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );

              // ── 4. Reports & Exports ──────────────────────────────────────
              if (section.key === 'reports') return (
                <>
                  <p>The Reports section allows you to generate consolidated performance reports across any combination of fiscal year, period, institution, and indicator.</p>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Generating a Report</h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
                      <li>Go to <strong>Reports</strong> from the sidebar.</li>
                      <li>Select <strong>Fiscal Year</strong> and <strong>Period</strong>.</li>
                      <li>Optionally filter by Institution or Department.</li>
                      <li>Click <strong>Generate Report</strong>. The report renders on screen with charts and tables.</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Exporting to Excel</h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
                      <li>Configure your report filters as above.</li>
                      <li>Click <strong>Export to Excel</strong>. The file will download automatically.</li>
                      <li>The export includes all indicators, targets, actuals, and achievement percentages in tabular form.</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Exporting to PDF</h4>
                    <p className="text-gray-600">
                      Use your browser's print function (<kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl+P</kbd> or <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Cmd+P</kbd>) while viewing the on-screen report. Select <strong>Save as PDF</strong> as the destination for a formatted printable version.
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
                    <strong>Note:</strong> Reports only include approved submissions. Pending and rejected actuals are excluded to ensure data quality.
                  </div>
                </>
              );

              // ── 5. Account & Security ─────────────────────────────────────
              if (section.key === 'account') return (
                <>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Changing Your Password</h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
                      <li>Click your name/avatar in the top-right corner.</li>
                      <li>Select <strong>Change Password</strong>.</li>
                      <li>Enter your current password, then your new password twice.</li>
                      <li>Passwords must be at least 8 characters with at least one uppercase letter, one number, and one special character.</li>
                      <li>Click <strong>Update Password</strong>.</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Locked Accounts</h4>
                    <p className="text-gray-600">
                      Your account will be <strong>temporarily locked</strong> after 5 consecutive failed login attempts.
                      To unlock your account:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2">
                      <li>Contact your institution's Admin or Super Admin.</li>
                      <li>They can reactivate your account from the Users management page.</li>
                      <li>Alternatively, use <strong>Forgot Password</strong> on the login page to reset via email.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Requesting Access</h4>
                    <p className="text-gray-600">
                      New user accounts can only be created by institution Admins or Super Admins. If you need access:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2">
                      <li>Contact your institution's focal person for M&E or ICT.</li>
                      <li>They will create your account and assign the appropriate role.</li>
                      <li>You will receive login credentials via email.</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-xs">
                    <strong>Security tip:</strong> Never share your password with colleagues. Each user should have their own account for proper audit trail and accountability.
                  </div>
                </>
              );

              // ── 6. FAQs ───────────────────────────────────────────────────
              if (section.key === 'faqs') {
                const filteredFaqs = searchQuery
                  ? FAQS.filter(f =>
                      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      f.a.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : FAQS;

                return (
                  <div className="space-y-2">
                    {filteredFaqs.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">No FAQs match your search.</p>
                    ) : (
                      filteredFaqs.map((faq, i) => (
                        <FaqItem key={i} q={faq.q} a={faq.a} searchQuery={searchQuery} />
                      ))
                    )}
                  </div>
                );
              }

              return null;
            }}
          </AccordionItem>
        ))}
      </div>

      {/* Contact card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h3 className="font-semibold text-lg mb-1">Need more help?</h3>
        <p className="text-blue-100 text-sm mb-4">
          The M&E Unit is available to assist with system queries, data issues, and training requests.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="mailto:m&e@mit.go.tz"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg px-4 py-2.5 text-sm font-medium"
          >
            <EnvelopeIcon className="w-4 h-4" />
            m&amp;e@mit.go.tz
          </a>
          <a
            href="tel:+255XXXXXXXXX"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg px-4 py-2.5 text-sm font-medium"
          >
            <PhoneIcon className="w-4 h-4" />
            +255 XXX XXX XXX
          </a>
        </div>
        <p className="text-blue-200 text-xs mt-3">
          Office hours: Monday–Friday, 8:00 AM – 5:00 PM (EAT)
        </p>
      </div>
    </div>
  );
}
