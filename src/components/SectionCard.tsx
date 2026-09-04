import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, children, className = "" }: SectionCardProps) {
  return (
    <section className={`section-card ${className}`.trim()}>
      <header className="section-card-header">
        <h2>{title}</h2>
      </header>
      <div className="section-card-body">{children}</div>
    </section>
  );
}
