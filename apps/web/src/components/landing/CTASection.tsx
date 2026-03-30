import { motion } from "framer-motion";
import { PlusIcon } from "@/components/ui/plus-icon";
import { useTranslation } from "react-i18next";

interface CTASectionProps {
  onCTAButtonClick: () => void;
  variants: {
    fadeInUp: any;
    staggerContainer: any;
  };
}

export function CTASection({ onCTAButtonClick, variants }: CTASectionProps) {
  const { t } = useTranslation();
  return (
    <section className="py-32 px-4 sm:px-8 text-center relative overflow-hidden z-10">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={variants.staggerContainer}
        className="max-w-2xl mx-auto flex flex-col items-center gap-8 relative z-10"
      >
        <motion.h2
          variants={variants.fadeInUp}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance"
        >
          {t('cta.title')}
        </motion.h2>
        <motion.p
          variants={variants.fadeInUp}
          className="text-xl text-muted-foreground text-balance"
        >
          {t('cta.desc')}
        </motion.p>
        <motion.div variants={variants.fadeInUp} className="pt-4">
          <button
            type="button"
            onClick={onCTAButtonClick}
            className="flex items-center gap-3 rounded-full bg-background/80 backdrop-blur-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-background text-foreground px-8 py-4 text-lg font-medium transition-all shadow-sm hover:shadow-md hover:-translate-y-1 group"
          >
            <PlusIcon
              size={20}
              className="group-hover:rotate-90 transition-transform duration-300"
            />
            {t('cta.button')}
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
