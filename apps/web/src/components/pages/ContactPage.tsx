import { motion, type Variants } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Comment01Icon,
  Coffee01Icon,
  UserIcon,
  DiscordIcon,
} from "@hugeicons/core-free-icons";

export function ContactPage() {
  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden selection:bg-primary/20 selection:text-primary pb-32">
      {/* Background Decorative Pattern (Subtle) */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in srgb, var(--border), transparent 95%) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--border), transparent 95%) 1px, transparent 1px),
            radial-gradient(circle, color-mix(in srgb, var(--primary), transparent 90%) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px, 40px 40px, 40px 40px",
          backgroundPosition: "0 0, 0 0, 0 0",
        }}
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="max-w-4xl mx-auto px-6 pt-32 relative z-10"
      >
        {/* HERO SECTION */}
        <motion.section variants={fadeInUp} className="text-center mb-24">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-8 shadow-inner">
            <HugeiconsIcon icon={Comment01Icon} size={40} />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-6">
            Got a question or idea?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance border-t border-border/40 pt-8 mt-8">
            nerdShare is built by a solo developer — feel free to reach out. I’m
            always listening for ways to make the web feel a little simpler.
          </p>
        </motion.section>

        {/* SOLO DEV NOTE */}
        <motion.section
          variants={fadeInUp}
          className="mb-24 p-8 sm:p-12 rounded-[2.5rem] bg-muted/20 border border-border/50"
        >
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-bold tracking-tight">
                Built by one developer
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  nerdShare isn't a company or a big team. It's just someone who
                  enjoys building things and exploring how real-time
                  technologies work.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  {[
                    "Questions & Bugs",
                    "Feature Ideas",
                    "General Feedback",
                    "Just saying hi!",
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
        <motion.section variants={fadeInUp} className="mb-24">
          <div className="rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-xl p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-right from-transparent via-primary/40 to-transparent" />
             <h2 className="text-3xl font-bold mb-6">The best way to reach out</h2>
             <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
               Instead of a traditional contact form, the easiest way to get in touch is through <span className="text-foreground font-semibold">Discord</span>. It's faster and makes it possible to discuss tech without the usual email back-and-forth.
             </p>
             <a
               href="#" // Replace with actual Discord link if known
               className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-lg active:scale-95 group"
             >
               <HugeiconsIcon icon={DiscordIcon} size={24} className="group-hover:rotate-12 transition-transform" />
               Join the nerdShare Discord
             </a>
             <p className="mt-8 text-sm text-muted-foreground italic">
               * Since this is a side project, replies might not be instant, but I read everything.
             </p>
          </div>
        </motion.section>

        {/* SUPPORT SECTION */}
        <motion.section variants={fadeInUp} className="mb-24">
          <div className="flex flex-col md:flex-row items-center gap-12 bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8 sm:p-12">
             <div className="flex-1 space-y-4">
                <h2 className="text-2xl font-bold">Enjoying nerdShare?</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  If you found nerdShare useful, you can support the project by buying me a coffee. It helps keep the servers running and gives me more excuses to keep building.
                </p>
             </div>
             <a
               href="#" // Replace with actual support link if known
               className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-background border border-border hover:bg-muted transition-colors font-medium shadow-sm group whitespace-nowrap"
             >
                <HugeiconsIcon icon={Coffee01Icon} size={24} className="text-primary group-hover:scale-110 transition-transform" />
                Buy me a coffee ☕
             </a>
          </div>
        </motion.section>

        {/* PHILOSOPHY FOOTER LINE */}
        <motion.section
          variants={fadeInUp}
          className="text-center pt-16 border-t border-border/40"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-5xl font-bold tracking-tight text-foreground mb-8">
            Built for people, not for profiles.
          </h2>
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-muted/30 border border-border/40 text-muted-foreground text-sm">
            Still evolving 🤙
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
