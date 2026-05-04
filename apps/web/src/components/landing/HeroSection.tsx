import { memo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InfinityCircleIcon,
  Wifi01Icon,
  ShieldKeyIcon,
  FlashIcon,
} from "@hugeicons/core-free-icons";
import { PlusIcon } from "@/components/ui/plus-icon";
import type { NavPage } from "@/components/AppShell";
import { TextEffect } from "@/components/ui/text-effect";

import { useTranslation, Trans } from "react-i18next";

interface HeroSectionProps {
  displayName: string;
  onNavigate: (page: NavPage) => void;
  onBrowseClick: () => void;
  onFolderClick: (e: React.MouseEvent) => void;
  dropZoneChild: React.ReactNode;
}

export const HeroSection = memo(function HeroSection({
  displayName,
  onNavigate,
  onBrowseClick,
  onFolderClick,
  dropZoneChild,
}: HeroSectionProps) {
  const { t } = useTranslation();
  const [animationDone, setAnimationDone] = useState(false);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-8 lg:px-24 pt-32 pb-20 relative z-10">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center text-center gap-12 sm:gap-16 relative">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-x-24 lg:items-center items-start">
          {/* Greeting */}
          <div
            className={`lg:col-span-12 text-center text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] w-full text-foreground min-h-[1.2em] mb-12 lg:mb-16 ${animationDone ? "greeting-ready" : ""}`}
          >
            <AnimatePresence mode="wait">
              {displayName ? (
                <TextEffect
                  key="greeting"
                  preset="fade-in-blur"
                  per="word"
                  as="h1"
                  onAnimationComplete={() => setAnimationDone(true)}
                >
                  {t("hero.greeting", { name: displayName })}
                </TextEffect>
              ) : (
                <div key="placeholder" className="invisible">
                  {t("hero.greeting", { name: "Placeholder" })}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Dropzone (desktop) */}
          <div className="hidden lg:block w-full relative lg:col-span-4 lg:col-start-1 lg:row-start-2 lg:-ml-8 xl:-ml-16">
            {dropZoneChild}
          </div>

          {/* Hero text */}
          <div className="flex flex-col items-start text-left gap-6 lg:col-span-6 lg:col-start-6 lg:row-start-2 lg:ml-8 xl:ml-16">
            <h2 className="text-3xl sm:text-5xl lg:text-[2.6rem] font-black tracking-tight leading-[1.1] sm:leading-[1.05] text-foreground">
              <Trans
                i18nKey="hero.headline"
                components={{
                  highlight1: <span className="text-primary" />,
                  br: <br className="hidden lg:block" />,
                  highlight2: <span className="text-primary" />,
                }}
              />
            </h2>

            <p className="text-foreground text-base sm:text-lg lg:text-lg leading-relaxed max-w-2xl text-balance font-medium">
              {t("hero.subtitle")}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-2">
              <FeatureTag
                icon={InfinityCircleIcon}
                label={t("hero.features.noLimit")}
              />
              <FeatureTag icon={FlashIcon} label={t("hero.features.fast")} />
              <FeatureTag icon={Wifi01Icon} label={t("hero.features.p2p")} />
              <FeatureTag
                icon={ShieldKeyIcon}
                label={t("hero.features.e2ee")}
              />
            </div>
          </div>

          {/* File selector button (mobile) */}
          <div className="lg:hidden w-full relative">
            <button
              type="button"
              onClick={onBrowseClick}
              className="w-full flex items-center justify-center gap-2 rounded-full border-2 border-dashed border-border bg-background hover:bg-muted/50 py-4 px-6 text-lg font-medium text-foreground transition-all"
            >
              <PlusIcon size={22} className="text-primary" />
              {t("hero.selectFiles")}
            </button>
            <p className="mt-3 text-sm text-muted-foreground text-center">
              <Trans
                i18nKey="hero.selectFolder"
                components={{
                  action: (
                    <span
                      onClick={onFolderClick}
                      className="text-primary hover:underline cursor-pointer font-medium relative top-[-1px]"
                    />
                  ),
                }}
              />
            </p>
          </div>
        </div>

        {/* Nearby Devices button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => onNavigate("nearby")}
            className="lg:hidden flex items-center gap-2 rounded-full border-2 border-dashed border-border bg-background hover:bg-muted/50 px-8 py-3 text-base font-medium transition-all"
          >
            <HugeiconsIcon
              icon={Wifi01Icon}
              size={16}
              className="shrink-0 text-primary"
            />
            {t("hero.findNearby")}
          </button>
        </div>
      </div>
    </section>
  );
});

function FeatureTag({ icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
      <HugeiconsIcon icon={icon} size={18} className="text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
