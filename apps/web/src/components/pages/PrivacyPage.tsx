import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { LockKeyholeIcon, type LockKeyholeIconHandle } from "@/components/ui/lock-keyhole";
import { useTranslation, Trans } from "react-i18next";

export function PrivacyPage() {
  const { t } = useTranslation();
  const iconRef = useRef<LockKeyholeIconHandle>(null);

  useEffect(() => {
    // Small delay to ensure smooth entry
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
        <motion.section className="text-center mb-28">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter text-balance mb-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner overflow-hidden shrink-0">
              <LockKeyholeIcon ref={iconRef} size={32} className="scale-75 sm:scale-90 lg:scale-100" />
            </div>
            <span>{t('privacy.hero.title')}</span>
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance font-normal">
            {t('privacy.hero.subtitle')}
          </p>
        </motion.section>

        {/* PRIVACY BY DESIGN */}
        <motion.section
          className="mb-24 p-8 sm:p-12 rounded-[2.5rem] bg-muted/20 border border-border/50"
        >
            <div className="space-y-8">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
                {t('privacy.section1.title')}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                <Trans
                  i18nKey="privacy.section1.desc1"
                  components={{ highlight: <span className="text-foreground italic" /> }}
                />
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.section1.desc2')}
              </p>
            </div>
        </motion.section>

        {/* RESPONSIBILITY */}
        <motion.section
          className="mb-28 border-l-4 border-primary/20 pl-10 py-4"
        >
          <h2 className="text-3xl font-bold tracking-tight mb-6">{t('privacy.section2.title')}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            <Trans
              i18nKey="privacy.section2.desc"
              components={{
                highlight1: <span className="text-foreground font-medium" />,
                highlight2: <span className="text-foreground font-medium" />
              }}
            />
          </p>
        </motion.section>

        {/* FOOTER NOTE */}
        <motion.section
          className="text-center pt-24 border-t border-border/40"
        >
          <h2 className="text-3xl font-bold tracking-tight text-balance mb-6">{t('privacy.section3.title')}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
            {t('privacy.section3.desc')}
          </p>
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm">
            {t('privacy.section3.tag')}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
