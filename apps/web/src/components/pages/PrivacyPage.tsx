import { motion, type Variants } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShieldKeyIcon } from "@hugeicons/core-free-icons";

export function PrivacyPage() {
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
            <HugeiconsIcon icon={ShieldKeyIcon} size={40} />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-6">
            Your files stay yours.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
            nerdShare never stores your files. All transfers happen directly
            between your devices, keeping your data private and secure.
          </p>
        </motion.section>

        {/* PRIVACY BY DESIGN */}
        <motion.section
          variants={fadeInUp}
          className="mb-24 p-8 sm:p-12 rounded-[2.5rem] bg-muted/20 border border-border/50"
        >
          <div className="items-center">
            <div className="order-1 md:order-2 space-y-6">
              <h2 className="text-3xl font-bold tracking-tight">
                Privacy by design
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                nerdShare is built with a simple idea:{" "}
                <span className="text-foreground italic">
                  "The server should help devices connect — but never see the
                  files."
                </span>
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Files are transferred through peer-to-peer connections and
                encrypted in transit using industry-standard protocols. Even the
                infrastructure helping devices connect cannot see the actual
                content of your files.
              </p>
            </div>
          </div>
        </motion.section>

        {/* RESPONSIBILITY */}
        <motion.section
          variants={fadeInUp}
          className="mb-24 border-l-4 border-primary/20 pl-8 py-4"
        >
          <h2 className="text-2xl font-bold mb-4">A small reminder</h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            While nerdShare focuses on privacy, security is still partly{" "}
            <span className="text-foreground font-medium">
              your responsibility
            </span>
            . If you share a session link or room ID with someone, treat it like
            a private message. Anyone with access to that session could
            potentially receive the file. Keep your sharing sessions{" "}
            <span className="text-foreground font-medium">
              private and intentional
            </span>
            .
          </p>
        </motion.section>

        {/* FOOTER NOTE */}
        <motion.section
          variants={fadeInUp}
          className="text-center pt-16 border-t border-border/40"
        >
          <h2 className="text-2xl font-bold mb-4">Questions?</h2>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto">
            nerdShare is a solo-built project, and transparency about how it
            works matters a lot. If you ever have questions or concerns about
            privacy, feel free to reach out.
          </p>
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm">
            Built by a developer who cares about your data 🤙
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
