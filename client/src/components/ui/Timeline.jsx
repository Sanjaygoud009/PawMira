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
        return <ShieldCheck className="w-5 h-5 text-warning" />;
      case 'safe':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'escalated':
        return <AlertTriangle className="w-5 h-5 text-error" />;
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
    <div className="relative pl-4 border-l-2 border-neutral-dark space-y-6 my-4">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const Icon = getIcon(event.event_type);
        return (
          <div key={index} className="relative">
            {/* Timeline dot/icon */}
            <div className="absolute -left-[26px] top-0.5 bg-white p-1 rounded-full border border-neutral-dark z-10">
              {Icon}
            </div>
            
            {/* Content */}
            <div className="ml-4 flex flex-col">
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
            
            {/* Connecting line overrides */}
            {!isLast && (
              <div 
                className={`absolute -left-[17px] top-8 bottom-[-24px] w-0.5 ${getLineColor(event.event_type)}`} 
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
