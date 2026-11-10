/**
 * Adaptive controls: Apple Liquid Glass controls from glisse (github.com/0kzh/glisse) when the Liquid Glass skin is on,
 * and the app's existing controls in Classic and Royal (D-12: those skins stay as they are). Pages use these instead of
 * raw buttons/inputs so the switch happens in one place.
 */
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Button, Glass, Menu, SearchField, SegmentedControl, Switch } from 'glisse';
import { useThemeStore } from '../../store/themeStore';

// eslint-disable-next-line react-refresh/only-export-components
export const useLiquid = () => useThemeStore((s) => s.skin === 'liquid');

/** Layout classes (width, margins, flex) carried over to glisse buttons; colours and shape come from glisse. */
const layoutOnly = (className?: string) =>
  className?.split(/\s+/).filter((c) => /^(?:(?:sm|md|lg):)?(?:w-|min-w-|max-w-|flex-1|grow|shrink-0|m[trblxy]?-|self-|col-span|whitespace-nowrap|hidden|inline-flex)/.test(c)).join(' ') || undefined;

/** Buttons that were small in the original design (toolbars: CSV, PDF, small Save) stay compact as glisse buttons. */
const compact = (className?: string) => /(^|\s)(text-xs|text-\[1[01]px\]|py-1|py-1\.5)(\s|$)/.test(className ?? '');
const glisseClass = (className?: string) => [layoutOnly(className), compact(className) ? 'fn-compact' : ''].filter(Boolean).join(' ') || undefined;

/** The page's main action ("Add account", "Save"): glisse filled button in Liquid. */
export function PrimaryAction({ icon, children, className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode }) {
  const liquid = useLiquid();
  if (liquid) {
    return <Button variant="filled" icon={icon} type={type} className={glisseClass(className)} {...props}>{children}</Button>;
  }
  return (
    <button type={type} className={className} {...props}>
      {icon}{icon && children ? ' ' : null}{children}
    </button>
  );
}

/** A secondary action (Cancel, CSV, PDF): clear glisse glass button in Liquid. */
export function SecondaryAction({ icon, children, className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode }) {
  const liquid = useLiquid();
  if (liquid) {
    return <Button variant="glass" icon={icon} type={type} className={glisseClass(className)} {...props}>{children}</Button>;
  }
  return (
    <button type={type} className={className} {...props}>
      {icon}{icon && children ? ' ' : null}{children}
    </button>
  );
}

export interface ViewOption<T extends string> { value: T; title: string; icon: ReactNode }

/** List / card / detailed view switch: glisse segmented control in Liquid. */
export function ViewToggle<T extends string>({ value, onChange, options, label = 'View', classic }: {
  value: T; onChange: (v: T) => void; options: ViewOption<T>[]; label?: string;
  /** A page's own toggle markup to keep in Classic/Royal, when it differs from the standard one. */
  classic?: ReactNode;
}) {
  const liquid = useLiquid();
  if (!liquid && classic) return <>{classic}</>;
  if (liquid) {
    return (
      <SegmentedControl
        aria-label={label}
        value={value}
        onValueChange={(v) => onChange(v as T)}
        items={options.map((o) => ({
          value: o.value,
          label: <span className="inline-flex items-center justify-center" title={o.title}>{o.icon}<span className="sr-only">{o.title}</span></span>,
        }))}
      />
    );
  }
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          aria-label={o.title}
          title={o.title}
          className={`p-1.5 rounded-md transition-all ${value === o.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

/** Search box: glisse search field (magnifier + clear button) in Liquid. */
export function SearchBox({ classic, value, onChange, placeholder, ariaLabel, className = 'relative', inputClassName = 'w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm', iconClassName = 'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; ariaLabel?: string;
  className?: string; inputClassName?: string; iconClassName?: string;
  /** A page's own search bar to keep in Classic/Royal, when it differs from the standard one. */
  classic?: ReactNode;
}) {
  const liquid = useLiquid();
  if (!liquid && classic) return <>{classic}</>;
  const label = ariaLabel ?? placeholder ?? 'Search';
  if (liquid) {
    // keep the wrapper's grid/flex placement and the input's width; glisse draws the field itself
    const width = inputClassName.split(/\s+/).filter((c) => /^(?:(?:sm|md|lg):)?(?:w-|min-w-|max-w-|flex-1)/.test(c));
    const place = className.split(/\s+/).filter((c) => c && c !== 'relative');
    return <SearchField className={[...place, ...width].join(' ') || undefined} value={value} onValueChange={onChange} placeholder={placeholder} aria-label={label} />;
  }
  return (
    <div className={className}>
      <Search className={iconClassName} />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} className={inputClassName} />
    </div>
  );
}

export interface RowAction { label: string; ariaLabel: string; icon?: ReactNode; onSelect: () => void; destructive?: boolean; className?: string }

/** A row's actions: inline icon buttons in Classic/Royal, one glisse "…" menu in Liquid (Apple puts row actions in a menu). */
export function RowActions({ name, actions }: { name: string; actions: RowAction[] }) {
  const liquid = useLiquid();
  if (liquid) {
    const items = actions.flatMap((a, i) => {
      const item = { label: a.label, icon: a.icon, onSelect: a.onSelect, destructive: a.destructive };
      return a.destructive && i > 0 ? (['separator', item] as const) : [item];
    });
    return (
      <span onClick={(e) => e.stopPropagation()} className="inline-flex">
        <Menu aria-label={`Actions for ${name}`} items={items as never} align="end" />
      </span>
    );
  }
  return (
    <div className="flex justify-end gap-1">
      {actions.map((a) => (
        <button
          key={a.ariaLabel}
          type="button"
          onClick={(e) => { e.stopPropagation(); a.onSelect(); }}
          aria-label={a.ariaLabel}
          title={a.label}
          className={a.className ?? `text-muted-foreground ${a.destructive ? 'hover:text-red-500' : 'hover:text-foreground'} hover:bg-muted rounded-md p-1.5`}
        >
          {a.icon}
        </button>
      ))}
    </div>
  );
}

/** A yes/no setting: glisse switch in Liquid, a checkbox elsewhere. */
export function ToggleField({ id, label, checked, onChange, className = 'flex items-center gap-2 text-sm', inputClassName = 'rounded border-border' }: {
  id: string; label: ReactNode; checked: boolean; onChange: (v: boolean) => void; className?: string; inputClassName?: string;
}) {
  const liquid = useLiquid();
  if (liquid) {
    return (
      <div className={className}>
        <Switch id={id} checked={checked} onCheckedChange={onChange} aria-labelledby={`${id}-label`} />
        <span id={`${id}-label`}>{label}</span>
      </div>
    );
  }
  return (
    <label htmlFor={id} className={className}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className={inputClassName} />
      <span>{label}</span>
    </label>
  );
}

/** A bare on/off control for a settings row whose label sits beside it: glisse switch in Liquid, the checkbox elsewhere. */
export function Toggle({ checked, onChange, ariaLabel, className }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel: string; className?: string }) {
  const liquid = useLiquid();
  if (liquid) return <Switch checked={checked} onCheckedChange={onChange} aria-label={ariaLabel} />;
  return <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={ariaLabel} className={className} />;
}

/** Floating chrome (sidebar, toolbar): real refracting glisse glass in Liquid, a plain panel elsewhere. */
export function GlassPanel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const liquid = useLiquid();
  if (liquid) return <Glass className={className} {...props}>{children}</Glass>;
  return <div className={className} {...props}>{children}</div>;
}
