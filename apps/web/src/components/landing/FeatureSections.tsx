
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InfinityCircleIcon,
  ShieldKeyIcon,
  EarthIcon,
  Globe02Icon,
} from "@hugeicons/core-free-icons";
import { useTranslation } from "react-i18next";

export function FeatureSections() {
  const { t } = useTranslation();
  return (
    <>
      {/* ── Feature: Built for humans ── */}
      <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-24 relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-inner">
            <HugeiconsIcon icon={EarthIcon} size={32} />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
            {t('features.built_for_humans.title')}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl text-balance">
            {t('features.built_for_humans.desc')}
          </p>
        </div>
      </section>

      {/* ── Feature: Ephemeral  ── */}
      <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-24 relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="flex flex-col gap-6 order-2 lg:order-1 text-center lg:text-left items-center lg:items-start">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <HugeiconsIcon icon={Globe02Icon} size={24} />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              {t('features.ephemeral.title')}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('features.ephemeral.desc')}
            </p>
          </div>

          {/* Visual Illustration */}
          <div className="order-1 lg:order-2 h-[300px] sm:h-[400px] rounded-[2.5rem] border border-border bg-card/40 backdrop-blur flex items-center justify-center overflow-hidden relative shadow-sm">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0,transparent_100%)] opacity-[0.05]" />

            <div className="flex items-center justify-center gap-4 sm:gap-8 w-full max-w-[80%]">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-background border border-border flex items-center justify-center shadow-md relative z-10">
                <HugeiconsIcon
                  icon={EarthIcon}
                  size={32}
                  className="text-foreground/80"
                />
              </div>

              {/* Connection Line & Particle */}
              <div className="flex-1 h-0.5 bg-border relative">
                <div className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_var(--color-primary)] animate-[pulse_2s_infinite]" />
              </div>

              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-background border border-border flex items-center justify-center shadow-md relative z-10">
                <HugeiconsIcon
                  icon={Globe02Icon}
                  size={32}
                  className="text-foreground/80"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature: No Limits & Security ── */}
      <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-24 relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="h-[300px] sm:h-[400px] rounded-[2.5rem] border border-border bg-card/40 backdrop-blur flex flex-col items-center justify-center gap-8 overflow-hidden relative shadow-sm">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto relative group">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150 opacity-40 group-hover:scale-125 transition-transform duration-500" />
              <HugeiconsIcon
                icon={InfinityCircleIcon}
                size={48}
                className="relative z-10"
              />
            </div>
            <div className="text-center relative z-10">
              <p className="text-xl sm:text-2xl font-medium text-muted-foreground">
                {t('features.no_limits.title')}
              </p>
              <p className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/70 mt-2">
                {t('features.no_limits.value')}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6 text-center lg:text-left items-center lg:items-start">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <HugeiconsIcon icon={ShieldKeyIcon} size={24} />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              {t('features.e2ee.title')}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('features.e2ee.desc1')}
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('features.e2ee.desc2')}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
