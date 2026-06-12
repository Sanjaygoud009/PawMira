import React from 'react';
import { Clock, CheckCircle, AlertTriangle, ShieldCheck, UserPlus, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Timeline = ({ events }) => {
  if (!events || events.length === 0) return <div className="text-neutral text-sm italic py-2">No timeline available yet.</div>;

  const getIcon = (type) => {
    switch (type) {
      case 'created':
        return <FileText className="w-5 h-5 text-neutral" />;
      case 'accepted':
        return <UserPlus className="w-5 h-5 text-primary" />;
      case 'treatment':
        return (
          <div className="relative">
            <ShieldCheck className="w-5 h-5 text-warning" />
            <span className="absolute -top-2 -right-2 text-[10px] animate-bounce">❤️</span>
          </div>
        );
      case 'safe':
        return (
          <div className="relative">
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="absolute -top-2 -right-2 text-[12px] animate-bounce" style={{ animationDelay: '0.1s' }}>🐶</span>
            <span className="absolute -top-3 left-0 text-[10px] animate-bounce" style={{ animationDelay: '0.3s' }}>❤️</span>
          </div>
        );
      case 'escalated':
        return <AlertTriangle className="w-5 h-5 text-error animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-neutral" />;
    }
  };

  const getLineColor = (type) => {
    switch (type) {
      case 'safe': return 'bg-success';
      case 'escalated': return 'bg-error';
      case 'accepted': return 'bg-primary';
      case 'treatment': return 'bg-warning';
      default: return 'bg-neutral-dark';
    }
  };

  return (
    <div className="space-y-0 my-2">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const Icon = getIcon(event.event_type);
        return (
          <div key={index} className="relative flex items-start gap-3">
            {/* Icon Column */}
            <div className="flex flex-col items-center">
              <div className="relative z-10 bg-white p-1 rounded-full border border-neutral-dark shrink-0">
                {Icon}
              </div>
              {/* Connecting line */}
              {!isLast && (
                <div className={`w-0.5 h-full min-h-[2rem] my-1 ${getLineColor(event.event_type)}`} />
              )}
            </div>
            
            {/* Content Column */}
            <div className="flex flex-col pb-4 pt-1">
              <span className="text-sm font-semibold text-text-dark capitalize">
                {event.event_type}
              </span>
              <span className="text-sm text-text-light mt-0.5 leading-relaxed">
                {event.description}
              </span>
              <span className="text-xs text-neutral-dark mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {event.created_at ? formatDistanceToNow(new Date(event.created_at), { addSuffix: true }) : 'Unknown time'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
