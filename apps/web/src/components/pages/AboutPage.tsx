import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CircleHelpIcon, type CircleHelpIconHandle } from "@/components/ui/circle-help";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FlashIcon,
  Globe02Icon,
  InfinityCircleIcon,
  ShieldKeyIcon,
} from "@hugeicons/core-free-icons";
import { useTranslation } from "react-i18next";

export function AboutPage() {
  const { t } = useTranslation();
  const iconRef = useRef<CircleHelpIconHandle>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      iconRef.current?.startAnimation();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden selection:bg-primary/20 selection:text-primary pb-32">

      <motion.div
        className="max-w-4xl mx-auto px-6 pt-32 relative z-10"
      >
        {/* HERO SECTION */}
        <motion.section className="text-center mb-32">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter text-balance mb-8 flex items-center justify-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner overflow-hidden shrink-0">
              <CircleHelpIcon ref={iconRef} size={32} className="scale-75 sm:scale-90 lg:scale-100" />
            </div>
            <span>{t('about.hero.title')}</span>
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance border-t border-border/40 pt-10 mt-10">
            {t('about.hero.subtitle')}
          </p>
        </motion.section>

        {/* THE OFFICE MOMENT */}
        <motion.section
          className="mb-24 p-8 sm:p-12 rounded-[2.5rem] bg-muted/20 border border-border/50"
        >
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
            <div className="flex-1 space-y-8">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
                {t('about.section1.title')}
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  {t('about.section1.p1')}
                </p>
                <p>
                  {t('about.section1.p2')}
                </p>
                <p className="text-foreground italic font-medium">
                  {t('about.section1.quote')}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* DISCOVERING AN IDEA */}
        <motion.section className="mb-32">
          <div className="p-8 sm:p-12 rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-xl shadow-sm relative overflow-hidden">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-10">
              {t('about.section2.title')}
            </h2>
            <div className="max-w-2xl space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                {t('about.section2.p1')}
              </p>
              <p className="text-foreground font-medium">
                {t('about.section2.p2_highlight')}
              </p>
              <p>
                {t('about.section2.p3')}
              </p>
            </div>
          </div>
        </motion.section>

        {/* CURIOSITY SPIRAL */}
        <motion.section className="mb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
                {t('about.section3.title')}
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  {t('about.section3.p1')}
                </p>
                <p>
                  {t('about.section3.p2')}
                </p>
                <p>
                  {t('about.section3.p3')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: t('about.grid.direct'), icon: Globe02Icon },
                { label: t('about.grid.no_acc'), icon: InfinityCircleIcon },
                { label: t('about.grid.direct'), icon: FlashIcon },
                { label: t('about.grid.secure'), icon: ShieldKeyIcon },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-muted/30 border border-border/50 flex flex-col items-center gap-3 text-center"
                >
                  <HugeiconsIcon
                    icon={item.icon}
                    size={24}
                    className="text-primary/60"
                  />
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* BUILDING NERDSHARE */}
        <motion.section
          className="mb-32 p-8 sm:p-12 rounded-[2.5rem] bg-primary/5 border border-primary/20 text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-8">
            {t('about.section4.title')}
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-12">
            {t('about.section4.subtitle')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">{t('about.grid.direct')}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">
                {t('about.grid.direct_desc')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">{t('about.grid.no_acc')}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">
                {t('about.grid.no_acc_desc')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">{t('about.grid.no_storage')}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">
                {t('about.grid.no_storage_desc')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">{t('about.grid.privacy')}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">
                {t('about.grid.privacy_desc')}
              </div>
            </div>
          </div>
        </motion.section>

        {/* PHILOSOPHY & FOOTER */}
        <motion.section className="text-center pt-16">
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-12 uppercase tracking-widest shadow-sm">
            {t('about.footer.tag')}
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter text-foreground text-balance mb-12">
            {t('about.footer.title')}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto border-t border-border/40 pt-12">
            {t('about.footer.desc')}
          </p>
          <div className="mt-12 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-muted/30 border border-border/40 text-muted-foreground text-sm">
            {t('about.footer.evolving')}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
