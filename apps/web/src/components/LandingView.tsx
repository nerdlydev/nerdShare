import { useRef, useCallback, useState } from "react";
import { useClientName } from "@/lib/use-client-name";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InfinityCircleIcon,
  Wifi01Icon,
  ShieldKeyIcon,
  EarthIcon,
  Globe02Icon,
  FlashIcon,
} from "@hugeicons/core-free-icons";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { PlusIcon } from "@/components/ui/plus-icon";
import {
  folderToZip,
  fileListToZip,
  dirHandleToZip,
  extractDroppedItem,
} from "@/lib/folder-to-zip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { type NearbyPeer } from "@nerdshare/shared";
import type { NavPage } from "@/components/AppShell";

interface LandingViewProps {
  peers: NearbyPeer[];
  onFileSelected: (
    file: File,
    providedRoomId?: string,
    isNearbyTransfer?: boolean,
  ) => void;
  onNavigate: (page: NavPage) => void;
}

export function LandingView({
  peers: _peers,
  onFileSelected,
  onNavigate,
}: LandingViewProps) {
  const displayName = useClientName();
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  const pathLength = useTransform(smoothProgress, [0, 0.4], [1, 0]); // Starts full, disappears by 40% scroll

  const [isDragOver, setIsDragOver] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<{
    filesProcessed: number;
    totalFiles: number;
  } | null>(null);

  // Firefox fallback state — holds the snapshotted files awaiting confirmation
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // ── Shared zip runner ──

  const runZip = useCallback(
    async (
      source:
        | FileSystemDirectoryHandle
        | FileSystemDirectoryEntry
        | File[]
        | File,
    ) => {
      setZipping(true);
      setZipProgress({ filesProcessed: 0, totalFiles: 0 });
      try {
        let zipFile: File;

        if (source instanceof File) {
          onFileSelected(source);
          return;
        } else if (Array.isArray(source)) {
          zipFile = await fileListToZip(source, (p) => setZipProgress(p));
        } else if (source instanceof FileSystemDirectoryHandle) {
          zipFile = await dirHandleToZip(
            source as FileSystemDirectoryHandle,
            (p) => setZipProgress(p),
          );
        } else {
          zipFile = await folderToZip(source as FileSystemDirectoryEntry, (p) =>
            setZipProgress(p),
          );
        }

        onFileSelected(zipFile);
      } catch (err) {
        console.error("[folder-to-zip] failed:", err);
      } finally {
        setZipping(false);
        setZipProgress(null);
      }
    },
    [onFileSelected],
  );

  // ── Drop zone ──

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const item = extractDroppedItem(e.dataTransfer);
      if (item) await runZip(item);
    },
    [runZip],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  // ── Single file picker ──

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
      e.target.value = "";
    },
    [onFileSelected],
  );

  // ── Folder picker — modern path (Chrome/Edge) ──
  const handleFolderClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation(); // prevent triggering the main file picker
      try {
        if ("showDirectoryPicker" in window) {
          // @ts-expect-error - TS doesn't know about showDirectoryPicker yet
          const dirHandle = await window.showDirectoryPicker();
          await runZip(dirHandle);
        } else {
          folderInputRef.current?.click();
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to pick folder:", err);
        }
      }
    },
    [runZip],
  );

  // ── Folder picker — Firefox fallback ──

  const handleFolderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawFiles = e.target.files;
      if (!rawFiles || rawFiles.length === 0) return;
      const fileArray = Array.from(rawFiles);
      e.target.value = "";
      setPendingFiles(fileArray);
    },
    [],
  );

  const handleConfirmUpload = useCallback(async () => {
    if (!pendingFiles) return;
    const files = pendingFiles;
    setPendingFiles(null);
    await runZip(files);
  }, [pendingFiles, runZip]);

  const handleCancelUpload = useCallback(() => {
    setPendingFiles(null);
  }, []);

  const fadeInUp: any = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" as const },
    },
  };

  const staggerContainer: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  return (
    <>
      {/* Firefox fallback: themed confirmation dialog */}
      <AlertDialog open={pendingFiles !== null}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Upload folder?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingFiles?.length ?? 0} file
              {(pendingFiles?.length ?? 0) !== 1 ? "s" : ""} will be zipped and
              sent to the receiver.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelUpload}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpload}>
              Zip & Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full-page layout */}
      <div className="min-h-screen flex flex-col bg-background relative overflow-x-hidden selection:bg-primary/20 selection:text-primary pb-20">
        {/* ── Hero Section with dynamic background ── */}
        <section className="min-h-[92vh] flex flex-col items-center justify-center px-4 sm:px-8 lg:px-24 pt-20 pb-20 relative group/hero">
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
            variants={staggerContainer}
            className="w-full max-w-7xl mx-auto flex flex-col items-center text-center gap-12 sm:gap-16"
          >
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-x-24 items-start">
              {/* Greeting (top-left) */}
              <motion.h1
                variants={fadeInUp}
                className="lg:col-span-12 text-center text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] w-full lg:-mt-32 xl:-mt-24"
              >
                Hey, 👋 {displayName}
              </motion.h1>

              {/* Hero text (below greeting on mobile, right of dropzone on desktop) */}
              <div className="flex flex-col items-start text-left gap-6 lg:col-span-6 lg:col-start-6 lg:row-start-2 lg:ml-8 xl:ml-16 lg:mt-8 xl:mt-12">
                <motion.h2
                  variants={fadeInUp}
                  className="text-3xl sm:text-5xl lg:text-[2.6rem] font-bold tracking-tight leading-[1.1] sm:leading-[1.05]"
                >
                  Share files <span className="text-primary">directly</span>{" "}
                  from
                  <br className="hidden lg:block" /> your device{" "}
                  <span className="text-primary">to anywhere</span>.
                </motion.h2>
                <motion.p
                  variants={fadeInUp}
                  className="text-muted-foreground text-base sm:text-lg lg:text-lg leading-relaxed max-w-2xl text-balance"
                >
                  Send files of any size directly from your device without ever
                  storing anything online.
                </motion.p>

                <motion.div
                  variants={fadeInUp}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-2"
                >
                  <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                    <HugeiconsIcon
                      icon={InfinityCircleIcon}
                      size={18}
                      className="text-primary"
                    />
                    <span className="text-sm font-medium">
                      No file size limit
                    </span>
                  </div>
                  <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                    <HugeiconsIcon
                      icon={FlashIcon}
                      size={18}
                      className="text-primary"
                    />
                    <span className="text-sm font-medium">Blazingly fast</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                    <HugeiconsIcon
                      icon={Wifi01Icon}
                      size={18}
                      className="text-primary"
                    />
                    <span className="text-sm font-medium">Peer-to-peer</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                    <HugeiconsIcon
                      icon={ShieldKeyIcon}
                      size={18}
                      className="text-primary"
                    />
                    <span className="text-sm font-medium">
                      End-to-end encrypted
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Dropzone (desktop) */}
              <motion.div
                variants={fadeInUp}
                className="hidden lg:block w-full relative lg:col-span-4 lg:col-start-1 lg:row-start-2 lg:-ml-8 xl:-ml-16 lg:mt-8 xl:mt-12"
              >
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                      relative w-full border-2 border-dashed rounded-[2.5rem]
                      flex flex-col items-center justify-center gap-5 py-16 px-6
                      transition-all duration-300 bg-card/60 backdrop-blur-md cursor-pointer shadow-sm hover:shadow-md
                      h-70 sm:h-80 group
                      ${
                        zipping
                          ? "border-primary/50 cursor-wait"
                          : isDragOver
                            ? "border-primary bg-primary/10 cursor-copy scale-[1.02]"
                            : "border-border hover:border-primary/50 hover:bg-card/80"
                      }
                    `}
                >
                  {zipping ? (
                    <div className="flex flex-col items-center gap-5">
                      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-base text-muted-foreground font-medium">
                        {zipProgress && zipProgress.totalFiles > 0
                          ? `Zipping… ${zipProgress.filesProcessed} / ${zipProgress.totalFiles} files`
                          : "Preparing zip…"}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-all shadow-sm">
                        <PlusIcon size={32} />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-lg font-medium text-foreground">
                          Click to browse or drag & drop files
                        </p>
                        <p className="text-base text-muted-foreground mt-1">
                          or{" "}
                          <span
                            onClick={handleFolderClick}
                            className="text-primary hover:underline cursor-pointer font-medium relative top-[-1px]"
                          >
                            click here
                          </span>{" "}
                          to select a folder
                        </p>
                        <p className="text-sm text-muted-foreground/70 pt-2 font-medium">
                          Any file. Any size.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>

              {/* File selector button (mobile) */}
              <motion.div
                variants={fadeInUp}
                className="lg:hidden w-full relative"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 rounded-full border-2 border-dashed border-border bg-background hover:bg-muted/50 py-4 px-6 text-lg font-medium text-foreground transition-all"
                >
                  <PlusIcon size={22} className="text-primary" />
                  Select files
                </button>
                <p className="mt-3 text-sm text-muted-foreground text-center">
                  or{" "}
                  <span
                    onClick={handleFolderClick}
                    className="text-primary hover:underline cursor-pointer font-medium relative top-[-1px]"
                  >
                    click here
                  </span>{" "}
                  to select a folder
                </p>
              </motion.div>
            </div>

            {/* Nearby Devices button (moved below hero for flow) */}
            <motion.div variants={fadeInUp} className="mt-4">
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

          {/* Wave Divider with scroll-linked animation */}
          <div className="absolute bottom-[-1px] left-0 w-full leading-none z-10 overflow-visible">
            <svg
              className="relative block w-full h-[60px] sm:h-[100px] lg:h-[150px] overflow-visible"
              viewBox="0 0 1440 200"
              preserveAspectRatio="xMidYMin slice"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background Path (Dotted) */}
              <path
                d="M0,0 C240,110 480,110 720,55 C960,0 1200,0 1440,55"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="4 8"
                className="text-border opacity-80 dark:opacity-40"
              />
              
              {/* Foreground Path (Filling line) */}
              <motion.path
                d="M0,0 C240,110 480,110 720,55 C960,0 1200,0 1440,55"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray="4 8"
                style={{
                  pathLength,
                  filter: "drop-shadow(0 2px 6px rgba(var(--color-primary-rgb, 0,0,0), 0.3))"
                }}
                className="text-border opacity-100"
              />

              {/* Wave fill background */}
              <path
                d="M0,0 C240,110 480,110 720,55 C960,0 1200,0 1440,55 L1440,150 L0,150 Z"
                fill="var(--background)"
              />
            </svg>
          </div>
        </section>

        {/* ── Glassmorphic Page Content ── */}
        <main className="relative z-10 bg-background/50 backdrop-blur-3xl">
          {/* ── Feature: Built for humans ── */}
          <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-24 relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="max-w-4xl mx-auto flex flex-col items-center text-center gap-6"
            >
              <motion.div
                variants={fadeInUp}
                className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-inner"
              >
                <HugeiconsIcon icon={EarthIcon} size={32} />
              </motion.div>
              <motion.h2
                variants={fadeInUp}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance"
              >
                Built for humans, not corporations.
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl text-balance"
              >
                nerdShare is free, independent, and has zero trackers. No
                accounts, no ads, no paywalls — just you and whoever you're
                sending files to. The internet the way it was meant to be.
              </motion.p>
            </motion.div>
          </section>

          {/* ── Feature: Ephemeral  ── */}
          <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-24 relative z-10">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={staggerContainer}
                className="flex flex-col gap-6 order-2 lg:order-1 text-center lg:text-left items-center lg:items-start"
              >
                <motion.div
                  variants={fadeInUp}
                  className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"
                >
                  <HugeiconsIcon icon={Globe02Icon} size={24} />
                </motion.div>
                <motion.h2
                  variants={fadeInUp}
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
                >
                  Closes when you close.
                </motion.h2>
                <motion.p
                  variants={fadeInUp}
                  className="text-lg text-muted-foreground leading-relaxed"
                >
                  Your files live strictly on your device. Once a connection is
                  established, data flows directly to your peer. Shut the tab
                  and poof — the connection drops. No lingering uploads on
                  third-party servers, no accidental oversharing.
                </motion.p>
              </motion.div>

              {/* Visual Illustration */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="order-1 lg:order-2 h-[300px] sm:h-[400px] rounded-[2.5rem] border border-border bg-card/40 backdrop-blur flex items-center justify-center overflow-hidden relative shadow-sm"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0,transparent_100%)] opacity-[0.05]" />

                <div className="flex items-center justify-center gap-4 sm:gap-8 w-full max-w-[80%]">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-background border border-border flex items-center justify-center shadow-md relative z-10">
                    <HugeiconsIcon
                      icon={EarthIcon}
                      size={32}
                      className="text-foreground/80"
                    />
                  </div>

                  {/* Connection Line & Particle */}
                  <div className="flex-1 h-0.5 bg-border relative">
                    <motion.div
                      animate={{ x: ["0%", "100%"] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_var(--color-primary)]"
                    />
                  </div>

                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-background border border-border flex items-center justify-center shadow-md relative z-10">
                    <HugeiconsIcon
                      icon={Globe02Icon}
                      size={32}
                      className="text-foreground/80"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ── Feature: No Limits & Security ── */}
          <section className="py-24 sm:py-32 px-4 sm:px-8 lg:px-24 relative z-10">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: -20 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-[300px] sm:h-[400px] rounded-[2.5rem] border border-border bg-card/40 backdrop-blur flex flex-col items-center justify-center gap-8 overflow-hidden relative shadow-sm"
              >
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto relative group">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150 opacity-40 group-hover:scale-125 transition-transform duration-500" />
                  <HugeiconsIcon
                    icon={InfinityCircleIcon}
                    size={48}
                    className="relative z-10"
                  />
                </div>
                <div className="text-center relative z-10">
                  <p className="text-xl sm:text-2xl font-medium text-muted-foreground">
                    File size limit:
                  </p>
                  <p className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/70 mt-2">
                    None.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={staggerContainer}
                className="flex flex-col gap-6 text-center lg:text-left items-center lg:items-start"
              >
                <motion.div
                  variants={fadeInUp}
                  className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"
                >
                  <HugeiconsIcon icon={ShieldKeyIcon} size={24} />
                </motion.div>
                <motion.h2
                  variants={fadeInUp}
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
                >
                  End-to-end encrypted.
                </motion.h2>
                <motion.p
                  variants={fadeInUp}
                  className="text-lg text-muted-foreground leading-relaxed"
                >
                  Using industry-standard WebRTC + DTLS routing means your data
                  is encrypted in transit. Only your receiver can decrypt the
                  file. We can't see your data, and we don't want to. Pinky
                  promise. 🤙
                </motion.p>
                <motion.p
                  variants={fadeInUp}
                  className="text-lg text-muted-foreground leading-relaxed"
                >
                  And because we don't host your files, we have zero infra costs
                  for storage. Feel like sending a completely uncompressed 4K
                  movie? Or perhaps an entire project folder? Please do. We
                  genuinely don't mind.
                </motion.p>
              </motion.div>
            </div>
          </section>

          {/* ── Call to Action ── */}
          <section className="py-32 px-4 sm:px-8 text-center relative overflow-hidden z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="max-w-2xl mx-auto flex flex-col items-center gap-8 relative z-10"
            >
              <motion.h2
                variants={fadeInUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance"
              >
                Experience the magic yourself.
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="text-xl text-muted-foreground text-balance"
              >
                Just drop a file into the zone, or browse to start a direct
                share.
              </motion.p>
              <motion.div variants={fadeInUp} className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    // Slight delay avoids opening the picker while the page is fast-scrolling playfully
                    setTimeout(() => fileInputRef.current?.click(), 400);
                  }}
                  className="flex items-center gap-3 rounded-full bg-foreground text-background hover:bg-foreground/90 px-8 py-4 text-lg font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  <PlusIcon size={20} />
                  Choose File Now
                </button>
              </motion.div>
            </motion.div>
          </section>

          {/* Bottom Wave Divider (Static) */}
          <div className="relative w-full leading-none z-10 rotate-180 translate-y-[1px] overflow-visible">
            <svg
              className="relative block w-full h-[60px] sm:h-[100px] lg:h-[150px] overflow-visible"
              viewBox="0 0 1440 200"
              preserveAspectRatio="xMidYMin slice"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background Path (Solid) */}
              <path
                d="M0,0 C240,110 480,110 720,55 C960,0 1200,0 1440,55"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                className="text-border opacity-100 dark:opacity-60"
                style={{
                  filter: "drop-shadow(0 2px 6px rgba(var(--color-primary-rgb, 0,0,0), 0.2))"
                }}
              />
              {/* Wave fill background */}
              <path
                d="M0,0 C240,110 480,110 720,55 C960,0 1200,0 1440,55 L1440,150 L0,150 Z"
                fill="var(--background)"
              />
            </svg>
          </div>
        </main>
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        // @ts-expect-error — non-standard but widely supported
        webkitdirectory=""
        onChange={handleFolderChange}
      />
    </>
  );
}
