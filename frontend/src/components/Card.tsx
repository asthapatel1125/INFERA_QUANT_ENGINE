import type { ReactNode } from "react";

export function Card({ title, eyebrow, action, children, className = "" }: {
  title?: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || eyebrow || action) && (
        <header className="card-header">
          <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}{title && <h3>{title}</h3>}</div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

