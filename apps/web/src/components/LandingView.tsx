import { useRef, useCallback, useState } from "react";
import { useClientName } from "@/lib/use-client-name";
import { useScroll, useSpring, useTransform } from "framer-motion";
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

import { HeroSection } from "./landing/HeroSection";
import { DropZone } from "./landing/DropZone";
import { WaveDivider } from "./landing/WaveDivider";
import { FeatureSections } from "./landing/FeatureSections";
import { CTASection } from "./landing/CTASection";

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

  const variants = { fadeInUp, staggerContainer };

  const handleCTAButtonClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Slight delay avoids opening the picker while the page is fast-scrolling playfully
    setTimeout(() => fileInputRef.current?.click(), 400);
  }, []);

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
        <HeroSection
          displayName={displayName}
          onNavigate={onNavigate}
          onBrowseClick={() => fileInputRef.current?.click()}
          onFolderClick={handleFolderClick}
          variants={variants}
          pathLength={pathLength}
          dropZoneChild={
            <DropZone
              isDragOver={isDragOver}
              zipping={zipping}
              zipProgress={zipProgress}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              onFolderClick={handleFolderClick}
              variants={variants.fadeInUp}
            />
          }
        />

        <main className="relative z-10">
          <FeatureSections variants={variants} />

          <CTASection
            onCTAButtonClick={handleCTAButtonClick}
            variants={variants}
          />

          <WaveDivider pathLength={pathLength} isBottom />
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

