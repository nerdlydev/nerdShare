import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShieldKeyIcon } from "@hugeicons/core-free-icons";

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden selection:bg-primary/20 selection:text-primary pb-32">

      <motion.div
        className="max-w-4xl mx-auto px-6 pt-32 relative z-10"
      >
        {/* HERO SECTION */}
        <motion.section className="text-center mb-28">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-10 shadow-inner">
            <HugeiconsIcon icon={ShieldKeyIcon} size={40} />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter text-balance mb-8">
            Your files stay yours.
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance font-normal">
            nerdShare never stores your files. All transfers happen directly
            between your devices, keeping your data private and secure.
          </p>
        </motion.section>

        {/* PRIVACY BY DESIGN */}
        <motion.section
          className="mb-24 p-8 sm:p-12 rounded-[2.5rem] bg-muted/20 border border-border/50"
        >
            <div className="space-y-8">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
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
        </motion.section>

        {/* RESPONSIBILITY */}
        <motion.section
          className="mb-28 border-l-4 border-primary/20 pl-10 py-4"
        >
          <h2 className="text-3xl font-bold tracking-tight mb-6">A small reminder</h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
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
          className="text-center pt-24 border-t border-border/40"
        >
          <h2 className="text-3xl font-bold tracking-tight text-balance mb-6">Questions?</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
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
