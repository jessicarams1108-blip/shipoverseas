type ProgressBarProps = {
  progress: number;
};

export function ProgressBar({ progress }: ProgressBarProps) {
  const safe = Math.min(100, Math.max(0, progress));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Shipment Progress</span>
        <span>{safe}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-ocean-700 transition-all duration-700 ease-out dark:bg-ocean-500"
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}
