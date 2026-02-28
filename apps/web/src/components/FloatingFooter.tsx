import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = ["NEARBY DEVICES", "CONTACT", "ABOUT US", "PRIVACY"];

export function FloatingFooter() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  return (
    <div className="fixed bottom-6 w-full px-4 left-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="flex items-stretch gap-2 pointer-events-auto font-sans">
        {/* Logo button */}
        <button className="flex items-center justify-center transition-transform hover:scale-105 w-12 h-12 sm:w-14 sm:h-14 rounded-full shrink-0 outline-none">
          <img
            src="/logo-source.png"
            alt="nerdShare Logo"
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-md"
          />
        </button>

        {/* Navigation Pill */}
        <div
          className="flex items-center bg-background/20 backdrop-blur-3xl border border-white/10 dark:border-white/5 rounded-full h-12 sm:h-14 shadow-glass p-1"
          onMouseLeave={() => setHoveredTab(null)}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item;
            const isHovered = hoveredTab === item;

            // The highlighted pill cleanly follows the cursor, snapping back to active
            const isHighlighted = hoveredTab ? isHovered : isActive;

            return (
              <button
                key={item}
                onClick={() => setActiveTab(item)}
                onMouseEnter={() => setHoveredTab(item)}
                className="relative h-full px-4 sm:px-6 text-[10px] sm:text-[11px] font-semibold tracking-[0.08em] transition-colors outline-none rounded-full"
              >
                {/* Sliding Glass Background Pill */}
                {isHighlighted && (
                  <motion.div
                    layoutId="footer-highlight-pill"
                    className="absolute inset-0 bg-primary/20 backdrop-blur-md rounded-full shadow-sm border border-primary/20"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}

                {/* Text Layer */}
                <span
                  className={cn(
                    "relative z-10 transition-colors duration-300",
                    isHighlighted ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item}
                </span>
              </button>
            );
          })}
        </div>

        {/* Language Button standalone pill */}
        <div
          className="flex items-center bg-background/20 backdrop-blur-3xl border border-white/10 dark:border-white/5 rounded-full h-12 sm:h-14 shadow-glass p-1 shrink-0"
          onMouseLeave={() => setHoveredTab(null)}
        >
          {(() => {
            const item = "ENG";
            const isActive = activeTab === item;
            const isHovered = hoveredTab === item;
            const isHighlighted = hoveredTab ? isHovered : isActive;

            return (
              <button
                onClick={() => setActiveTab(item)}
                onMouseEnter={() => setHoveredTab(item)}
                className="relative h-full px-4 sm:px-6 text-[10px] sm:text-[11px] font-semibold tracking-[0.08em] transition-colors outline-none rounded-full"
              >
                {/* Sliding Glass Background Pill */}
                <AnimatePresence>
                  {isHighlighted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{
                        type: "spring",
                        bounce: 0.15,
                        duration: 0.5,
                      }}
                      className="absolute inset-0 bg-primary/20 backdrop-blur-md rounded-full shadow-sm border border-primary/20"
                    />
                  )}
                </AnimatePresence>

                {/* Text Layer */}
                <span
                  className={cn(
                    "relative z-10 transition-colors duration-300 flex items-center gap-1",
                    isHighlighted ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item}
                </span>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
