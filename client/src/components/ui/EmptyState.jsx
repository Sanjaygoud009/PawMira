import React from 'react';
import { Link } from 'react-router-dom';
import { Search, PawPrint, Trophy, Inbox, ImageOff, FileQuestion } from 'lucide-react';

const PRESETS = {
  rescue: {
    icon: PawPrint,
    title: 'No rescue reports near you yet',
    description: 'Be the first person to help an animal in your area.',
    cta: { label: 'Report Emergency', to: '/report' },
  },
  lostfound: {
    icon: Search,
    title: 'No matching pets found',
    description: 'Try adjusting your filters or report a missing pet.',
    cta: { label: 'Report Lost Pet', to: '/lost-found' },
  },
  heroes: {
    icon: Trophy,
    title: 'No heroes in this area yet',
    description: 'Become the first community hero by helping animals nearby.',
    cta: { label: 'Start Helping', to: '/feed' },
  },
  inbox: {
    icon: Inbox,
    title: 'No messages yet',
    description: 'Messages from the PawMira team will appear here.',
    cta: null,
  },
  gallery: {
    icon: ImageOff,
    title: 'Gallery photos coming soon',
    description: 'We\'re collecting heartwarming rescue stories to share.',
    cta: null,
  },
  generic: {
    icon: FileQuestion,
    title: 'Nothing here yet',
    description: 'Check back later for updates.',
    cta: null,
  },
};

export default function EmptyState({
  preset,
  icon: IconOverride,
  title: titleOverride,
  description: descOverride,
  cta: ctaOverride,
  className = '',
}) {
  const config = PRESETS[preset] || PRESETS.generic;
  const Icon = IconOverride || config.icon;
  const title = titleOverride || config.title;
  const description = descOverride || config.description;
  const cta = ctaOverride !== undefined ? ctaOverride : config.cta;

  return (
    <div className={`col-span-full flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in ${className}`}>
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <Icon size={28} className="text-primary" />
      </div>
      <h3 className="text-lg font-bold text-text-dark mb-2">{title}</h3>
      <p className="text-sm text-text-light max-w-sm leading-relaxed">{description}</p>
      {cta && (
        <Link
          to={cta.to}
          className="btn btn-primary mt-6"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
