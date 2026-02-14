import type { ReactNode } from "react";

interface PageLayoutProps {
  /** Interactive card panel (left on desktop, top on mobile) */
  panel: ReactNode;
  /** Descriptive hero content (right on desktop, bottom on mobile) */
  hero: ReactNode;
}

export function PageLayout({ panel, hero }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[minmax(340px,420px)_1fr]">
      {/* Left panel */}
      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm">{panel}</div>
      </div>

      {/* Right hero */}
      <div className="flex items-center justify-center p-8 lg:p-16 bg-muted/20">
        <div className="max-w-lg">{hero}</div>
      </div>
    </div>
  );
}
