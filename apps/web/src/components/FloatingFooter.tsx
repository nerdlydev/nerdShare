import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const NAV_ITEMS = ["NEARBY DEVICES", "CONTACT", "ABOUT US", "PRIVACY"];

export function FloatingFooter() {
  const [activeTab, setActiveTab] = useState("NEARBY DEVICES");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  return (
    <div className="fixed bottom-6 w-full px-4 left-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="flex items-stretch gap-2 pointer-events-auto shadow-2xl drop-shadow-2xl font-sans">
        {/* Logo button */}
        <button className="flex items-center justify-center bg-[#8b8e00] hover:bg-[#a1a500] transition-colors w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] shrink-0 outline-none shadow-sm">
          <img
            src="/logo-source.png"
            alt="nerdShare Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-md"
          />
        </button>

        {/* Navigation Pill */}
        <div
          className="flex items-center bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-[14px] h-12 sm:h-14 shadow-sm p-1"
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
                className="relative h-full px-4 sm:px-6 text-[10px] sm:text-[11px] font-semibold tracking-[0.08em] transition-colors outline-none rounded-xl"
              >
                {/* Sliding Glass Background Pill */}
                {isHighlighted && (
                  <motion.div
                    layoutId="footer-highlight-pill"
                    className="absolute inset-0 bg-black/10 dark:bg-white/10 backdrop-blur-md rounded-xl shadow-sm border border-black/5 dark:border-white/10"
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

        {/* Language Button */}
        <button className="flex items-center justify-center bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-colors h-12 sm:h-14 px-4 sm:px-6 rounded-[14px] shrink-0 text-[11px] font-semibold tracking-widest text-muted-foreground hover:text-foreground outline-none shadow-sm space-x-1">
          <span>ENG</span>
        </button>
      </div>
    </div>
  );
}
