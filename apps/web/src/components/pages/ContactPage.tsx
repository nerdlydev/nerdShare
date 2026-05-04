import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SendIcon, type SendIconHandle } from "@/components/ui/send";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Coffee01Icon,
  UserIcon,
  DiscordIcon,
} from "@hugeicons/core-free-icons";
import { useTranslation, Trans } from "react-i18next";

export function ContactPage() {
  const { t } = useTranslation();
  const iconRef = useRef<SendIconHandle>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      iconRef.current?.startAnimation();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden selection:bg-primary/20 selection:text-primary pb-32">
      <motion.div className="max-w-4xl mx-auto px-6 pt-32 relative z-10">
        {/* HERO SECTION */}
        <motion.section className="text-center mb-28">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter text-balance mb-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner overflow-hidden shrink-0">
              <SendIcon
                ref={iconRef}
                size={32}
                className="scale-75 sm:scale-90 lg:scale-100"
              />
            </div>
            <span>{t('contact.hero.title')}</span>
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance border-t border-border/40 pt-10 mt-10">
            {t('contact.hero.subtitle')}
          </p>
        </motion.section>

        {/* SOLO DEV NOTE */}
        <motion.section className="mb-24 p-8 sm:p-12 rounded-[2.5rem] bg-muted/20 border border-border/50">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-8">
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  {t('contact.section1.p1')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  {[
                    t('contact.section1.list1'),
                    t('contact.section1.list2'),
                    t('contact.section1.list3'),
                    t('contact.section1.list4'),
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="w-24 h-24 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <HugeiconsIcon icon={UserIcon} size={40} className="opacity-60" />
            </div>
          </div>
        </motion.section>

        {/* REACH OUT SECTION (DISCORD) */}
        <motion.section className="mb-24">
          <div className="rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-xl p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-right from-transparent via-primary/40 to-transparent" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-6">
              {t('contact.section2.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              <Trans
                i18nKey="contact.section2.desc"
                components={{ highlight: <span className="text-foreground font-semibold" /> }}
              />
            </p>
            <a
              href="#" // Replace with actual Discord link if known
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-lg active:scale-95 group"
            >
              <HugeiconsIcon
                icon={DiscordIcon}
                size={24}
                className="group-hover:rotate-12 transition-transform"
              />
              {t('contact.section2.button')}
            </a>
            <p className="mt-8 text-sm text-muted-foreground italic">
              {t('contact.section2.note')}
            </p>
          </div>
        </motion.section>

        {/* SUPPORT SECTION */}
        <motion.section className="mb-24">
          <div className="flex flex-col md:flex-row items-center gap-12 bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8 sm:p-12">
            <div className="flex-1 space-y-4">
              <h2 className="text-3xl font-bold tracking-tight text-balance">
                {t('contact.section3.title')}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t('contact.section3.desc')}
              </p>
            </div>
            <a
              href="#" // Replace with actual support link if known
              className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-background border border-border hover:bg-muted transition-colors font-medium shadow-sm group whitespace-nowrap"
            >
              <HugeiconsIcon
                icon={Coffee01Icon}
                size={24}
                className="text-primary group-hover:scale-110 transition-transform"
              />
              {t('contact.section3.button')}
            </a>
          </div>
        </motion.section>

        {/* PHILOSOPHY FOOTER LINE */}
        <motion.section className="text-center pt-24 border-t border-border/40">
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter text-foreground text-balance mb-12">
            {t('contact.footer.title')}
          </h2>
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-muted/30 border border-border/40 text-muted-foreground text-sm">
            {t('contact.footer.evolving')}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
