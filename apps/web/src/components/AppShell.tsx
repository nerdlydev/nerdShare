import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { HomeIcon } from "@/components/ui/home";
import { WifiIcon } from "@/components/ui/wifi";
import { SendIcon } from "@/components/ui/send";
import { LockKeyholeIcon } from "@/components/ui/lock-keyhole";
import { LanguagesIcon } from "@/components/ui/languages";
import { GithubIcon } from "@/components/ui/github";
import { MoonIcon } from "@/components/ui/moon";
import { SunIcon } from "@/components/ui/sun";
import { CircleHelpIcon } from "@/components/ui/circle-help";
import { MenuIcon, type MenuIconHandle } from "@/components/ui/menu";
import { useViteTheme } from "@space-man/react-theme-animation";
import { cn } from "@/lib/utils";

export type NavPage = "home" | "nearby" | "about" | "contact" | "privacy";


const NAV_ITEMS: {
  path: string;
  page: NavPage | "lang";
  i18nKey: string;
  icon: any;
}[] = [
  { path: "/", page: "home", i18nKey: "nav.home", icon: HomeIcon },
  { path: "/nearby", page: "nearby", i18nKey: "nav.nearby", icon: WifiIcon },
  { path: "/contact", page: "contact", i18nKey: "nav.contact", icon: SendIcon },
  { path: "/about", page: "about", i18nKey: "nav.about", icon: CircleHelpIcon },
  { path: "/privacy", page: "privacy", i18nKey: "nav.privacy", icon: LockKeyholeIcon },
  { path: "/lang", page: "lang", i18nKey: "nav.lang", icon: LanguagesIcon },
];

function DesktopNavItem({ item, isActive, layoutId }: any) {
  const { t } = useTranslation();
  const iconRef = useRef<any>(null);
  const Icon = item.icon;
  const path = item.page === "home" ? "/" : `/${item.page}`;

  return (
    <Link
      to={path}
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
      className={`
        relative group lg:px-2.5 xl:px-4 py-2 text-sm font-medium rounded-md
        ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}
      `}
    >
      {isActive && (
        <motion.div
          layoutId={layoutId}
          className="absolute inset-0 bg-background border border-border rounded-md z-0"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10 flex items-center lg:gap-0 xl:gap-2">
        <span className="opacity-70 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Icon ref={iconRef} size={16} />
        </span>
        <span className="capitalize hidden xl:inline-block truncate max-w-[100px]">
          {t(item.i18nKey)}
        </span>
      </span>
    </Link>
  );
}

function MobileNavItem({ item, isActive, onClick }: any) {
  const { t } = useTranslation();
  const iconRef = useRef<any>(null);
  const Icon = item.icon;
  const path = item.page === "home" ? "/" : `/${item.page}`;

  return (
    <Link
      to={path}
      onClick={onClick}
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
      className={`
        group px-4 py-3 mx-1 mt-1 text-sm text-left flex items-center justify-between rounded-lg
        ${isActive ? "text-primary font-medium bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"}
      `}
    >
      <div className="flex items-center gap-3">
        <span className={`shrink-0 flex transition-opacity ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
          <Icon ref={iconRef} size={16} />
        </span>
        <span className="capitalize">{t(item.i18nKey)}</span>
      </div>
    </Link>
  );
}

function DesktopGithubAction() {
  const iconRef = useRef<any>(null);
  return (
    <a
      href="https://github.com/devesh008/nerdShare"
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
      className="flex items-center justify-center w-8 h-8 rounded-md border border-border bg-transparent hover:bg-muted text-muted-foreground group"
      aria-label="GitHub Repository"
    >
      <GithubIcon ref={iconRef} size={14} />
    </a>
  );
}

function MobileGithubItem({ onClick }: any) {
  const { t } = useTranslation();
  const iconRef = useRef<any>(null);
  return (
    <a
      href="https://github.com/devesh008/nerdShare"
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
      className="group px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left flex items-center justify-between"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <span className="shrink-0 flex transition-opacity opacity-70 group-hover:opacity-100">
          <GithubIcon ref={iconRef} size={16} />
        </span>
        <span>{t('nav.github')}</span>
      </div>
    </a>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const { resolvedTheme, toggleTheme, ref } = useViteTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuIconRef = useRef<MenuIconHandle>(null);

  const activePage = useMemo(() => {
    const path = location.pathname;
    if (path === "/") return "home";
    const p = path.slice(1);
    if (["nearby", "about", "contact", "privacy"].includes(p)) return p as NavPage;
    return "home";
  }, [location.pathname]);

  const cycleLanguage = () => {
    const langs = ["en", "es", "fr", "de", "hi", "zh"];
    const currentLang = typeof i18n?.language === "string" ? i18n.language.split('-')[0] : "en";
    const currentIndex = langs.indexOf(currentLang) !== -1 ? langs.indexOf(currentLang) : 0;
    const nextIndex = (currentIndex + 1) % langs.length;
    i18n.changeLanguage(langs[nextIndex]);
  };

  useEffect(() => {
    if (sidebarOpen) {
      menuIconRef.current?.startAnimation();
    } else {
      menuIconRef.current?.stopAnimation();
    }
  }, [sidebarOpen]);


  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* ── Fixed top header (Floating Pill Style) ── */}
      <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <header className="w-full max-w-6xl bg-background/80 backdrop-blur-xl border-2 border-dashed border-border rounded-full pointer-events-auto">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          {/* LEFT: Logo */}
          <div className="flex items-center gap-3 lg:w-[220px]">
            <Link
              to="/"
              className="flex items-center gap-[10px] cursor-pointer"
            >
              <img
                src="/logo-source.png"
                alt="nerdShare"
                className="w-8 h-8 object-contain"
              />
              <span className="hidden sm:inline-block lg:hidden xl:inline-block font-semibold text-[20px] tracking-tight text-foreground">
                nerdShare
              </span>
            </Link>
          </div>

          {/* CENTER: Nav (Desktop) inside light gray rounded pill */}
          <div className="hidden lg:flex flex-1 justify-center">
            <div className="flex items-center rounded-lg bg-muted/60 p-1 border border-border/50">
              {NAV_ITEMS.map((item) => {
                if (item.page === "lang") return null;
                const isActive = activePage === item.page;
                return (
                  <DesktopNavItem
                    key={item.path}
                    item={item}
                    isActive={isActive}
                    layoutId="nav-pill"
                  />
                );
              })}
            </div>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center justify-end gap-2 lg:w-[220px]">
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              <DesktopGithubAction />

              <button
                ref={ref as React.RefObject<HTMLButtonElement>}
                onClick={() => toggleTheme()}
                className="flex items-center justify-center w-8 h-8 rounded-md border border-border bg-transparent hover:bg-muted text-muted-foreground"
                aria-label="Toggle theme"
              >
                <div className="relative w-8 h-8 flex items-center justify-center overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={resolvedTheme}
                      initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="flex items-center justify-center"
                    >
                      {resolvedTheme === "dark" ? (
                        <SunIcon size={14} />
                      ) : (
                        <MoonIcon size={14} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </button>

              <button
                onClick={cycleLanguage}
                title={typeof i18n?.language === "string" ? i18n.language.toUpperCase() : "EN"}
                className="flex items-center justify-center w-8 h-8 rounded-md border border-border bg-transparent hover:bg-muted text-muted-foreground group relative"
                aria-label="Language"
              >
                <LanguagesIcon size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] uppercase font-bold text-muted-foreground/80 pointer-events-none whitespace-nowrap">
                  {typeof i18n?.language === "string" ? i18n.language.substring(0,2) : "en"}
                </span>
              </button>
            </div>



            {/* Hamburger (Mobile/Tablet) */}
            <div className="lg:hidden relative">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors relative z-50"
                aria-label="Toggle menu"
                aria-expanded={sidebarOpen}
              >
                <MenuIcon ref={menuIconRef} size={20} />
              </button>

              {sidebarOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-52 py-2 bg-background border border-border rounded-2xl shadow-xl flex flex-col">
                     {NAV_ITEMS.map((item) => {
                      if (item.page === "lang") return null;
                      const isActive = activePage === item.page;
                      return (
                        <MobileNavItem
                          key={item.path}
                          item={item}
                          isActive={isActive}
                          onClick={() => setSidebarOpen(false)}
                        />
                      );
                    })}
                    
                    <div className="h-px bg-border/40 mx-3 my-2" />

                    <MobileGithubItem onClick={() => setSidebarOpen(false)} />
                    
                    <button
                      onClick={() => {
                        toggleTheme();
                        setSidebarOpen(false);
                      }}
                      className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left flex items-center justify-between"
                    >
                      <span>{resolvedTheme === "dark" ? t('nav.lightMode') : t('nav.darkMode')}</span>
                      {resolvedTheme === "dark" ? <SunIcon size={14} /> : <MoonIcon size={14} />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          </div>
        </header>
      </div>

      {/* Page content */}
      <main className={cn("flex-1", activePage !== "home" && "pt-20")}>
        {children}
      </main>
    </div>
  );
}
