import type { ReactNode } from "react";
import { useViteTheme } from "@space-man/react-theme-animation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun02Icon, Moon02Icon } from "@hugeicons/core-free-icons";
import { FloatingFooter } from "@/components/FloatingFooter";

interface PageLayoutProps {
  /** Interactive card panel (left on desktop, top on mobile) */
  panel: ReactNode;
  /** Descriptive hero content (right on desktop, bottom on mobile) */
  hero: ReactNode;
}

export function PageLayout({ panel, hero }: PageLayoutProps) {
  const { resolvedTheme, toggleTheme, ref } = useViteTheme();

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[minmax(340px,420px)_1fr] relative">
      {/* Left panel */}
      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm">{panel}</div>
      </div>

      {/* Right hero */}
      <div className="flex items-center justify-center p-8 lg:p-16 bg-muted/20 pb-24 lg:pb-32">
        <div className="max-w-lg">{hero}</div>
      </div>

      {/* Theme toggle — top right corner */}
      <button
        ref={ref as React.RefObject<HTMLButtonElement>}
        onClick={() => toggleTheme()}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-card/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label="Toggle theme"
      >
        <HugeiconsIcon
          icon={resolvedTheme === "dark" ? Sun02Icon : Moon02Icon}
          size={18}
        />
      </button>

      <FloatingFooter />
    </div>
  );
}
