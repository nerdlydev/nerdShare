import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InfinityCircleIcon,
  Wifi01Icon,
  ShieldKeyIcon,
  FlashIcon,
} from "@hugeicons/core-free-icons";
import { PlusIcon } from "@/components/ui/plus-icon";
import type { NavPage } from "@/components/AppShell";

import { WaveDivider } from "./WaveDivider";

interface HeroSectionProps {
  displayName: string;
  onNavigate: (page: NavPage) => void;
  onBrowseClick: () => void;
  onFolderClick: (e: React.MouseEvent) => void;
  dropZoneChild: React.ReactNode;
  variants: {
    fadeInUp: any;
    staggerContainer: any;
  };
  pathLength: any;
}

export function HeroSection({
  displayName,
  onNavigate,
  onBrowseClick,
  onFolderClick,
  dropZoneChild,
  variants,
  pathLength,
}: HeroSectionProps) {
  return (
    <section className="min-h-[92vh] flex flex-col items-center justify-center px-4 sm:px-8 lg:px-24 pt-32 pb-20 relative group/hero">
      {/* Background grid + dot background only for Hero */}
      <div
        className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in srgb, var(--border), transparent 95%) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--border), transparent 95%) 1px, transparent 1px),
            radial-gradient(circle, color-mix(in srgb, var(--primary), transparent 85%) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px, 40px 40px, 40px 40px",
          backgroundPosition: "0 0, 0 0, 0 0",
          WebkitMaskImage:
            "linear-gradient(to bottom, #000 0%, #000 80%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, #000 0%, #000 80%, transparent 100%)",
        }}
      />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={variants.staggerContainer}
        className="w-full max-w-7xl mx-auto flex flex-col items-center text-center gap-12 sm:gap-16"
      >
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-x-24 items-start">
          {/* Greeting (top-left) */}
          <motion.h1
            variants={variants.fadeInUp}
            className="lg:col-span-12 text-center text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] w-full"
          >
            Hey, 👋 {displayName}
          </motion.h1>

          {/* Hero text (below greeting on mobile, right of dropzone on desktop) */}
          <div className="flex flex-col items-start text-left gap-6 lg:col-span-6 lg:col-start-6 lg:row-start-2 lg:ml-8 xl:ml-16 lg:mt-8 xl:mt-12">
            <motion.h2
              variants={variants.fadeInUp}
              className="text-3xl sm:text-5xl lg:text-[2.6rem] font-bold tracking-tight leading-[1.1] sm:leading-[1.05]"
            >
              Share files <span className="text-primary">directly</span>{" "}
              from
              <br className="hidden lg:block" /> your device{" "}
              <span className="text-primary">to anywhere</span>.
            </motion.h2>
            <motion.p
              variants={variants.fadeInUp}
              className="text-muted-foreground text-base sm:text-lg lg:text-lg leading-relaxed max-w-2xl text-balance"
            >
              Send files of any size directly from your device without ever
              storing anything online.
            </motion.p>

            <motion.div
              variants={variants.fadeInUp}
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-2"
            >
              <FeatureTag icon={InfinityCircleIcon} label="No file size limit" />
              <FeatureTag icon={FlashIcon} label="Blazingly fast" />
              <FeatureTag icon={Wifi01Icon} label="Peer-to-peer" />
              <FeatureTag icon={ShieldKeyIcon} label="End-to-end encrypted" />
            </motion.div>
          </div>

          {/* Dropzone (desktop) */}
          <div className="hidden lg:block w-full relative lg:col-span-4 lg:col-start-1 lg:row-start-2 lg:-ml-8 xl:-ml-16 lg:mt-8 xl:mt-12">
            {dropZoneChild}
          </div>

          {/* File selector button (mobile) */}
          <motion.div
            variants={variants.fadeInUp}
            className="lg:hidden w-full relative"
          >
            <button
              type="button"
              onClick={onBrowseClick}
              className="w-full flex items-center justify-center gap-2 rounded-full border-2 border-dashed border-border bg-background hover:bg-muted/50 py-4 px-6 text-lg font-medium text-foreground transition-all"
            >
              <PlusIcon size={22} className="text-primary" />
              Select files
            </button>
            <p className="mt-3 text-sm text-muted-foreground text-center">
              or{" "}
              <span
                onClick={onFolderClick}
                className="text-primary hover:underline cursor-pointer font-medium relative top-[-1px]"
              >
                click here
              </span>{" "}
              to select a folder
            </p>
          </motion.div>
        </div>

        {/* Nearby Devices button (moved below hero for flow) */}
        <motion.div variants={variants.fadeInUp} className="mt-4">
          <button
            type="button"
            onClick={() => onNavigate("nearby")}
            className="lg:hidden flex items-center gap-2 rounded-full border-2 border-dashed border-border bg-background hover:bg-muted/50 px-8 py-3 text-base font-medium transition-all"
          >
            <HugeiconsIcon
              icon={Wifi01Icon}
              size={16}
              className="shrink-0 text-primary"
            />
            Find Nearby Devices
          </button>
        </motion.div>
      </motion.div>

      <WaveDivider pathLength={pathLength} />
    </section>
  );
}

function FeatureTag({ icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
      <HugeiconsIcon icon={icon} size={18} className="text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
