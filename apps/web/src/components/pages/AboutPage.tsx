import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FlashIcon,
  Globe02Icon,
  InfinityCircleIcon,
  ShieldKeyIcon,
} from "@hugeicons/core-free-icons";

export function AboutPage() {

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden selection:bg-primary/20 selection:text-primary pb-32">

      <motion.div
        className="max-w-4xl mx-auto px-6 pt-32 relative z-10"
      >
        {/* HERO SECTION */}
        <motion.section className="text-center mb-32">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter text-balance mb-8">
            Why nerdShare exists
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance border-t border-border/40 pt-10 mt-10">
            It started with a simple frustration: sending a file shouldn’t
            require logging into five different tools.
          </p>
        </motion.section>

        {/* THE OFFICE MOMENT */}
        <motion.section
          className="mb-24 p-8 sm:p-12 rounded-[2.5rem] bg-muted/20 border border-border/50"
        >
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
            <div className="flex-1 space-y-8">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
                The moment that started it
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  One day at the office I needed to send a file to someone
                  sitting not very far from me. Nothing unusual.
                </p>
                <p>
                  But the options were surprisingly annoying: upload to Teams,
                  log in to a sharing site, wait for the upload, send a link,
                  and wait for the download.
                </p>
                <p className="text-foreground italic font-medium">
                  "Why does sending a file still require uploading it to some
                  server first?"
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* DISCOVERING AN IDEA */}
        <motion.section className="mb-32">
          <div className="p-8 sm:p-12 rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-xl shadow-sm relative overflow-hidden">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-10">
              Discovering a simple idea
            </h2>
            <div className="max-w-2xl space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                While searching for alternatives, I came across ToffeeShare. It
                immediately stood out: No accounts. No uploads to cloud storage.
                No waiting for a server.
              </p>
              <p className="text-foreground font-medium">
                Just open a page and send the file directly from one device to
                another.
              </p>
              <p>
                That simplicity made me curious. Not just to use it — but to
                understand how it actually works.
              </p>
            </div>
          </div>
        </motion.section>

        {/* CURIOSITY SPIRAL */}
        <motion.section className="mb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
                The curiosity spiral
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  At the time I was already working a lot with real-time
                  technologies like WebRTC and networking systems.
                </p>
                <p>
                  How do the devices discover each other? How does the
                  connection happen? How does the file move directly between
                  peers?
                </p>
                <p>
                  The more I explored it, the more interesting it became. It
                  kind of tickled my engineer brain.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "WebRTC", icon: Globe02Icon },
                { label: "P2P", icon: InfinityCircleIcon },
                { label: "Direct", icon: FlashIcon },
                { label: "Secure", icon: ShieldKeyIcon },
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
            So I built nerdShare
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-12">
            nerdShare started as a learning experiment. I wanted to understand
            every piece of the system while pushing the core ideas further.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">Direct</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">
                Device to Device
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">No accounts</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">
                Zero friction
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">No storage</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">
                Ephemeral
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">Privacy</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">
                By Design
              </div>
            </div>
          </div>
        </motion.section>

        {/* PHILOSOPHY & FOOTER */}
        <motion.section className="text-center pt-16">
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-12 uppercase tracking-widest shadow-sm">
            The Philosophy
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter text-foreground text-balance mb-12">
            Files should move between people, not servers.
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto border-t border-border/40 pt-12">
            nerdShare is a solo project built in spare time. Part curiosity,
            part engineering experiment, part attempt to make file sharing feel
            simpler.
          </p>
          <div className="mt-12 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-muted/30 border border-border/40 text-muted-foreground text-sm">
            Still evolving 🤙
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
