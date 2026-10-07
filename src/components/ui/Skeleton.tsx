import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', width, height }) => {
  return (
    <div
      className={`animate-pulse bg-[#e8e8ed] rounded-[6px] ${className}`}
      style={{
        width,
        height,
      }}
    />
  );
};

export const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="p-5 sm:p-6 bg-white border border-[#e0e0e0] rounded-[18px] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32 my-1" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
};

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-[#f0f0f0] bg-white">
      <div className="w-9 h-9 rounded-full bg-[#e8e8ed] animate-pulse shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
      {Array.from({ length: columns - 2 }).map((_, i) => (
        <Skeleton key={i} className="hidden sm:block h-3.5 w-20 shrink-0" />
      ))}
      <Skeleton className="h-7 w-16 rounded-full shrink-0" />
    </div>
  );
};

export const MemberCardSkeleton: React.FC = () => {
  return (
    <div className="p-5 bg-white border border-[#e0e0e0] rounded-[18px] flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#f0f0f0]">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-20" />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Skeleton className="h-8 flex-1 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </div>
  );
};

