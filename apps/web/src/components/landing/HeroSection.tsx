import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InfinityCircleIcon,
  Wifi01Icon,
  ShieldKeyIcon,
  FlashIcon,
} from "@hugeicons/core-free-icons";
import { PlusIcon } from "@/components/ui/plus-icon";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import type { NavPage } from "@/components/AppShell";

import { useTranslation, Trans } from "react-i18next";

interface HeroSectionProps {
  displayName: string;
  onNavigate: (page: NavPage) => void;
  onBrowseClick: () => void;
  onFolderClick: (e: React.MouseEvent) => void;
  dropZoneChild: React.ReactNode;
}

const StableBackground = memo(function StableBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background z-10" />
      <FlickeringGrid
        className="relative inset-0 z-0 h-full w-full"
        squareSize={4}
        gridGap={6}
        color="var(--primary)"
        maxOpacity={0.5}
        flickerChance={0.05}
      />
    </div>
  );
});

export const HeroSection = memo(function HeroSection({
  displayName,
  onNavigate,
  onBrowseClick,
  onFolderClick,
  dropZoneChild,
}: HeroSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-8 lg:px-24 pt-32 pb-20 relative group/hero">
      {/* Dynamic Flickering Grid Background */}
      <StableBackground />
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center text-center gap-12 sm:gap-16 relative z-20">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-x-24 items-start">
          {/* Greeting (top-left) */}
          <h1 className="lg:col-span-12 text-center text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] w-full text-foreground drop-shadow-sm">
            {displayName
              ? t('hero.greeting', { name: displayName })
              : <span className="invisible">{t('hero.greeting', { name: 'Placeholder' })}</span>
            }
          </h1>

          {/* Dropzone (desktop) */}
          <div className="hidden lg:block w-full relative lg:col-span-4 lg:col-start-1 lg:row-start-2 lg:-ml-8 xl:-ml-16 lg:mt-8 xl:mt-12">
            {dropZoneChild}
          </div>

          {/* Hero text (below greeting on mobile, right of dropzone on desktop) */}
          <div className="flex flex-col items-start text-left gap-6 lg:col-span-6 lg:col-start-6 lg:row-start-2 lg:ml-8 xl:ml-16 lg:mt-8 xl:mt-12">
            <h2 className="text-3xl sm:text-5xl lg:text-[2.6rem] font-black tracking-tight leading-[1.1] sm:leading-[1.05] text-foreground">
              <Trans
                i18nKey="hero.headline"
                components={{
                  highlight1: <span className="text-primary" />,
                  br: <br className="hidden lg:block" />,
                  highlight2: <span className="text-primary" />
                }}
              />
            </h2>
            <p className="text-foreground text-base sm:text-lg lg:text-lg leading-relaxed max-w-2xl text-balance font-medium">
              {t('hero.subtitle')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-2">
              <FeatureTag icon={InfinityCircleIcon} label={t('hero.features.noLimit')} />
              <FeatureTag icon={FlashIcon} label={t('hero.features.fast')} />
              <FeatureTag icon={Wifi01Icon} label={t('hero.features.p2p')} />
              <FeatureTag icon={ShieldKeyIcon} label={t('hero.features.e2ee')} />
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
              {t('hero.selectFiles')}
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
                  )
                }}
              />
            </p>
          </div>
        </div>

        {/* Nearby Devices button (moved below hero for flow) */}
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
            {t('hero.findNearby')}
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
