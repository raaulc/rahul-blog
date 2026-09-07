import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function Card({
  children,
  className = '',
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card ${
        accent ? 'border-l-2 border-l-indigo-600 dark:border-l-indigo-400' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[15px] font-semibold tracking-tight">{children}</h2>
      {hint && <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">{hint}</p>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="block text-[12px] text-neutral-400">{hint}</span>}
    </label>
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={`input min-h-[84px] resize-y ${className ?? ''}`} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={`input ${className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return <select {...rest} className={`input appearance-none pr-8 ${className ?? ''}`} />;
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-neutral-400">{sub}</div>}
    </div>
  );
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
      <div
        className="h-full rounded-full bg-indigo-600 transition-[width] duration-500 dark:bg-indigo-400"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, pct)) * 100)}%` }}
      />
    </div>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
      {children}
    </span>
  );
}

export function CheckBox({
  checked,
  onChange,
  label,
  size = 'md',
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'h-4 w-4 text-[10px]' : 'h-5 w-5 text-xs';
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className="inline-flex items-center gap-2 text-left"
    >
      <span
        className={`grid ${box} shrink-0 place-items-center rounded-md border transition-colors ${
          checked
            ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-neutral-900'
            : 'border-neutral-300 dark:border-neutral-600'
        }`}
      >
        {checked ? '✓' : ''}
      </span>
      {label && (
        <span
          className={`text-sm ${
            checked ? 'text-neutral-400 line-through decoration-neutral-300' : ''
          }`}
        >
          {label}
        </span>
      )}
    </button>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-neutral-100 px-3 py-2 text-[13px] leading-relaxed text-neutral-600 dark:bg-neutral-800/70 dark:text-neutral-300">
      {children}
    </p>
  );
}

export function IconX() {
  return <span aria-hidden className="text-base leading-none">×</span>;
}
