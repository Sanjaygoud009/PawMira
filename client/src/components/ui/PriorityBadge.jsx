const priorityConfig = {
  low: {
    label: 'Low',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
  },
  high: {
    label: 'High',
    bg: 'bg-red-100',
    text: 'text-red-700',
    pulse: true,
  },
};

export default function PriorityBadge({ priority }) {
  const config = priorityConfig[priority] || priorityConfig.medium;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${config.bg} ${config.text} ${config.pulse ? 'animate-pulse' : ''}`}>
      {config.label}
    </span>
  );
}
