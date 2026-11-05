import { DOT_ROWS } from '../lib/dotMatrix';

interface Props {
  /** Column heights, 0..rows, oldest first (see dotLevels). */
  levels: number[];
  color: string;
  /** Colour of the unlit dots; defaults to a faint tint of the current text colour. */
  offColor?: string;
  label: string;
  rows?: number;
}

/** A small chart of dots: one column per period, lit from the bottom up. */
export default function DotMatrix({ levels, color, offColor = 'color-mix(in srgb, currentColor 14%, transparent)', label, rows = DOT_ROWS }: Props) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < levels.length; c++) {
      const on = levels[c] >= rows - r && levels[c] > 0;
      cells.push(
        <span
          key={`${r}-${c}`}
          data-dot
          data-on={on ? 'true' : 'false'}
          style={{ aspectRatio: '1', borderRadius: '50%', background: on ? color : offColor }}
        />
      );
    }
  }
  return (
    <div
      role="img"
      aria-label={label}
      style={{ display: 'grid', gridTemplateColumns: `repeat(${levels.length}, minmax(0, 1fr))`, gap: 4 }}
    >
      {cells}
    </div>
  );
}
