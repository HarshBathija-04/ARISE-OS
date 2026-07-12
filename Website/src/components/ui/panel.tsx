import { cn } from "@/lib/utils";

export function Panel({
  className,
  glow,
  children,
}: {
  className?: string;
  glow?: boolean;
  children: React.ReactNode;
}) {
  return <div className={cn(glow ? "panel-glow" : "panel", className)}>{children}</div>;
}

export function PanelHeader({
  label,
  title,
  right,
  className,
}: {
  label?: string;
  title?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-4", className)}>
      <div>
        {label && <div className="sys-label mb-1">{label}</div>}
        {title && <h3 className="font-display text-lg font-semibold text-slate-100">{title}</h3>}
      </div>
      {right}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="text-slate-600">{icon}</div>}
      <p className="font-display text-slate-300">{title}</p>
      {hint && <p className="max-w-xs text-sm text-slate-500">{hint}</p>}
    </div>
  );
}
