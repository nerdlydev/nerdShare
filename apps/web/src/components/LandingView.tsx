import { useRef, useCallback, useState, useMemo } from "react";
import { useClientName } from "@/lib/use-client-name";
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
import { useTranslation } from "react-i18next";

import { HeroSection } from "./landing/HeroSection";
import { DropZone } from "./landing/DropZone";
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
  const { t } = useTranslation();
  const displayName = useClientName();
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

  const handleCTAButtonClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Slight delay avoids opening the picker while the page is fast-scrolling playfully
    setTimeout(() => fileInputRef.current?.click(), 400);
  }, []);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const dropZoneChild = useMemo(() => (
    <DropZone
      isDragOver={isDragOver}
      zipping={zipping}
      zipProgress={zipProgress}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleBrowseClick}
      onFolderClick={handleFolderClick}
    />
  ), [
    isDragOver, zipping, zipProgress, handleDrop, handleDragOver, handleDragLeave, handleBrowseClick, handleFolderClick
  ]);

  return (
    <>
      {/* Firefox fallback: themed confirmation dialog */}
      <AlertDialog open={pendingFiles !== null}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('landing.upload_folder_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('landing.upload_folder_desc', { count: pendingFiles?.length ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelUpload}>
              {t('landing.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpload}>
              {t('landing.zip_send')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full-page layout */}
      <div className="min-h-screen flex flex-col bg-background relative overflow-x-hidden selection:bg-primary/20 selection:text-primary pb-20">
        {/* We use a specific less-dark tone for the rest of the page */}
        <HeroSection
          displayName={displayName}
          onNavigate={onNavigate}
          onBrowseClick={handleBrowseClick}
          onFolderClick={handleFolderClick}
          dropZoneChild={dropZoneChild}
        />

        <main className="relative z-10 bg-[var(--content-bg)]">
          <FeatureSections />

          <CTASection
            onCTAButtonClick={handleCTAButtonClick}
          />
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

