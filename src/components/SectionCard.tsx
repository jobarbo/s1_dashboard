import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  /** Two-digit index shown in the header, OP-XY style. */
  index?: number;
  /** Color slot (0–3) for the header marker. */
  colorIndex?: number;
}

export function SectionCard({ title, children, className = "", index, colorIndex }: SectionCardProps) {
  const color = colorIndex == null ? "" : ` sec-c${colorIndex % 4}`;
  return (
    <section className={`section-card${color} ${className}`.trim()}>
      <header className="section-card-header">
        <span className="section-marker" aria-hidden="true" />
        <h2>{title}</h2>
        {index != null && (
          <span className="section-index" aria-hidden="true">
            {String(index).padStart(2, "0")}
          </span>
        )}
      </header>
      <div className="section-card-body">{children}</div>
    </section>
  );
}
