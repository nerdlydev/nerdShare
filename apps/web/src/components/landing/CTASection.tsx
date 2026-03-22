import { motion } from "framer-motion";
import { PlusIcon } from "@/components/ui/plus-icon";

interface CTASectionProps {
  onCTAButtonClick: () => void;
  variants: {
    fadeInUp: any;
    staggerContainer: any;
  };
}

export function CTASection({ onCTAButtonClick, variants }: CTASectionProps) {
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
          Experience the magic yourself.
        </motion.h2>
        <motion.p
          variants={variants.fadeInUp}
          className="text-xl text-muted-foreground text-balance"
        >
          Just drop a file into the zone, or browse to start a direct share.
        </motion.p>
        <motion.div variants={variants.fadeInUp} className="pt-4">
          <button
            type="button"
            onClick={onCTAButtonClick}
            className="flex items-center gap-3 rounded-full bg-foreground text-background hover:bg-foreground/90 px-8 py-4 text-lg font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            <PlusIcon size={20} />
            Choose File Now
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
