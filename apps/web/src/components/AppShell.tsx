import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { MorphicNavbar } from "@/components/kokonutui/morphic-navbar";
import { HomeIcon } from "@/components/ui/home";
import { WifiIcon } from "@/components/ui/wifi";
import { SendIcon } from "@/components/ui/send";
import { LockKeyholeIcon } from "@/components/ui/lock-keyhole";
import { LanguagesIcon } from "@/components/ui/languages";
import { MoonIcon } from "@/components/ui/moon";
import { SunIcon } from "@/components/ui/sun";
import { CircleHelpIcon } from "@/components/ui/circle-help";
import { useViteTheme } from "@space-man/react-theme-animation";

export type NavPage = "home" | "nearby" | "about" | "contact" | "privacy";

interface AppShellProps {
  children: React.ReactNode;
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
}

const NAV_ITEMS: {
  path: string;
  page: NavPage | "lang";
  name: string;
  icon: React.ReactNode;
}[] = [
  { path: "/", page: "home", name: "home", icon: <HomeIcon size={16} /> },
  {
    path: "/nearby",
    page: "nearby",
    name: "nearby devices",
    icon: <WifiIcon size={16} />,
  },
  {
    path: "/contact",
    page: "contact",
    name: "contact",
    icon: <SendIcon size={16} />,
  },
  {
    path: "/about",
    page: "about",
    name: "about us",
    icon: <CircleHelpIcon size={16} />,
  },
  {
    path: "/privacy",
    page: "privacy",
    name: "privacy",
    icon: <LockKeyholeIcon size={16} />,
  },
  {
    path: "/lang",
    page: "lang",
    name: "eng",
    icon: <LanguagesIcon size={16} />,
  },
];

export function AppShell({ children, activePage, onNavigate }: AppShellProps) {
  const { resolvedTheme, toggleTheme, ref } = useViteTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageToPath: Record<NavPage, string> = {
    home: "/",
    nearby: "/nearby",
    contact: "/contact",
    about: "/about",
    privacy: "/privacy",
  };

  const handleNavigate = (page: NavPage) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  const ThemeButton = () => (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={() => toggleTheme()}
      className="p-2 rounded-full bg-card/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
      aria-label="Toggle theme"
    >
      <span key={resolvedTheme} className="animate-theme-icon flex">
        {resolvedTheme === "dark" ? (
          <SunIcon size={16} />
        ) : (
          <MoonIcon size={16} />
        )}
      </span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Fixed top header ── */}
      <header className="fixed top-0 inset-x-0 z-50 w-full flex items-center justify-between px-4 sm:px-6 py-1.5 bg-transparent backdrop-blur-xl border-b border-border/10">
        {/* LEFT: Logo (always) + hamburger on mobile/tablet */}
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile & tablet only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <HugeiconsIcon icon={Menu01Icon} size={20} />
          </button>

          {/* Logo */}
          <button
            onClick={() => handleNavigate("home")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <img
              src="/logo-source.png"
              alt="nerdShare"
              className="w-7 h-7 object-contain"
            />
            <span className="font-semibold text-base tracking-tight text-foreground">
              nerdShare
            </span>
          </button>
        </div>

        {/* RIGHT: MorphicNavbar (desktop) + theme toggle */}
        <div className="flex items-center gap-2">
          {/* MorphicNavbar — desktop only */}
          <div className="hidden lg:flex items-center">
            <MorphicNavbar
              activePath={pageToPath[activePage]}
              items={NAV_ITEMS.map((item) => ({
                path: item.path,
                name: item.name,
                icon: item.icon,
                onClick:
                  item.page !== "lang"
                    ? () => handleNavigate(item.page as NavPage)
                    : undefined,
              }))}
            />
          </div>

          <ThemeButton />
        </div>
      </header>

      {/* ── Sidebar overlay — mobile & tablet ── */}
      {/* Dim backdrop */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden
          ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-[80vw] max-w-[320px] bg-background/95 backdrop-blur-xl
          border-r border-border/40 flex flex-col
          transition-transform duration-300 ease-out lg:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <button
            onClick={() => handleNavigate("home")}
            className="flex items-center gap-2"
          >
            <img
              src="/logo-source.png"
              alt="nerdShare"
              className="w-6 h-6 object-contain"
            />
            <span className="font-semibold text-sm tracking-tight text-foreground">
              nerdShare
            </span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label="Close menu"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Sidebar nav items */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.page !== "lang" && activePage === item.page;
            return (
              <button
                key={item.path}
                onClick={() => {
                  if (item.page !== "lang")
                    handleNavigate(item.page as NavPage);
                  else setSidebarOpen(false);
                }}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-150 text-left w-full
                  ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }
                `}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="capitalize">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer — theme toggle */}
        <div className="px-4 py-4 border-t border-border/30">
          <button
            onClick={() => toggleTheme()}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors w-full"
          >
            <span
              key={resolvedTheme}
              className="animate-theme-icon flex shrink-0"
            >
              {resolvedTheme === "dark" ? (
                <SunIcon size={16} />
              ) : (
                <MoonIcon size={16} />
              )}
            </span>
            <span>{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 pt-[49px]">{children}</main>
    </div>
  );
}
