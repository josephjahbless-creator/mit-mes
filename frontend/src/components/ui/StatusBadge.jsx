const configs = {
  draft:     { cls: 'badge-gray',   label: 'Draft' },
  submitted: { cls: 'badge-yellow', label: 'Submitted' },
  approved:  { cls: 'badge-green',  label: 'Approved' },
  rejected:  { cls: 'badge-red',    label: 'Rejected' },
  achieved:  { cls: 'badge-green',  label: 'Achieved' },
  on_track:  { cls: 'badge-blue',   label: 'On Track' },
  at_risk:   { cls: 'badge-yellow', label: 'At Risk' },
  off_track: { cls: 'badge-red',    label: 'Off Track' },
};

export default function StatusBadge({ status }) {
  const cfg = configs[status] || { cls: 'badge-gray', label: status };
  return <span className={cfg.cls}>{cfg.label}</span>;
}
