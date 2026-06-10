import React from 'react';

/* ===== Base Skeleton Block ===== */
function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

/* ===== Skeleton: Rescue Card ===== */
export function SkeletonRescueCard() {
  return (
    <div className="card-static overflow-hidden animate-fade-in">
      <SkeletonBlock className="h-48 w-full !rounded-none" />
      <div className="p-5 space-y-4">
        <SkeletonBlock className="h-5 w-3/4" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
        <div className="flex gap-2 pt-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
        <div className="flex gap-2 pt-4 border-t border-neutral">
          <SkeletonBlock className="h-10 flex-1" />
          <SkeletonBlock className="h-10 w-10" />
          <SkeletonBlock className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}

/* ===== Skeleton: Stats Card ===== */
export function SkeletonStatsCard() {
  return (
    <div className="card-static p-4 text-center space-y-2">
      <SkeletonBlock className="h-7 w-7 mx-auto rounded-full" />
      <SkeletonBlock className="h-8 w-16 mx-auto" />
      <SkeletonBlock className="h-3 w-20 mx-auto" />
    </div>
  );
}

/* ===== Skeleton: Leaderboard Row ===== */
export function SkeletonLeaderboardRow() {
  return (
    <div className="card-static p-4 flex items-center gap-4 animate-fade-in">
      <SkeletonBlock className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <SkeletonBlock className="h-5 w-40" />
        <SkeletonBlock className="h-3 w-28" />
      </div>
      <SkeletonBlock className="h-12 w-20 shrink-0" />
    </div>
  );
}

/* ===== Skeleton: Dashboard Report Card ===== */
export function SkeletonDashboardCard() {
  return (
    <div className="card-static overflow-hidden animate-fade-in">
      <SkeletonBlock className="h-40 w-full !rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <SkeletonBlock className="h-5 w-20" />
          <SkeletonBlock className="h-5 w-16" />
        </div>
        <SkeletonBlock className="h-4 w-full" />
        <div className="flex gap-2 pt-1">
          <SkeletonBlock className="h-9 flex-1" />
        </div>
      </div>
    </div>
  );
}

/* ===== Skeleton: Profile Section ===== */
export function SkeletonProfile() {
  return (
    <div className="card-static p-6 sm:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-6">
        <SkeletonBlock className="h-20 w-20 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2 p-4 bg-neutral-light rounded-2xl">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-7 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Skeleton: Table Row ===== */
export function SkeletonTableRow({ cols = 5 }) {
  return (
    <tr className="animate-fade-in">
      {[...Array(cols)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <SkeletonBlock className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/* ===== Skeleton: Lost & Found Card ===== */
export function SkeletonLostFoundCard() {
  return (
    <div className="card-static overflow-hidden animate-fade-in">
      <SkeletonBlock className="h-44 w-full !rounded-none" />
      <div className="p-4 space-y-3">
        <SkeletonBlock className="h-5 w-2/3" />
        <SkeletonBlock className="h-4 w-full" />
        <div className="flex justify-between pt-2">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

/* ===== Skeleton Grid Wrapper ===== */
export function SkeletonGrid({ count = 6, Component = SkeletonRescueCard, cols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <div className={`grid ${cols} gap-6`}>
      {[...Array(count)].map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
}

export default SkeletonBlock;
