import type { ReactNode } from "react";

interface PageLayoutProps {
  /** Interactive card panel (left on desktop, top on mobile) */
  panel: ReactNode;
  /** Descriptive hero content (right on desktop, bottom on mobile) */
  hero: ReactNode;
}

export function PageLayout({ panel, hero }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[minmax(500px,700px)_1fr] relative">
      {/* Left panel */}
      <div className="flex items-center justify-center pt-16 pb-8 px-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">{panel}</div>
      </div>

      {/* Right hero */}
      <div className="flex items-center justify-center p-8 lg:p-16 pb-24 lg:pb-32">
        <div className="max-w-lg">{hero}</div>
      </div>
    </div>
  );
}
