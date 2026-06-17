import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`${sizes[size]} text-primary animate-spin`} />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <img src="/new_logo.png" alt="PawMira" className="h-16 w-16 rounded-xl animate-pulse" />
      <LoadingSpinner size="lg" />
      <p className="text-text-light text-sm font-medium">Loading...</p>
    </div>
  );
}
