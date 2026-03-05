import { useRef, useCallback, useState } from "react";
import { useClientName } from "@/lib/use-client-name";
import { NearbyView } from "@/components/NearbyView";
import { FloatingFooter } from "@/components/FloatingFooter";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InfinityCircleIcon,
  FlashIcon,
  DistributeVerticalCenterIcon,
  SquareLock02Icon,
  Wifi01Icon,
  Sun02Icon,
  Moon02Icon,
} from "@hugeicons/core-free-icons";
import AnimatedFolder from "@/components/AnimatedFolder";
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
import { useViteTheme } from "@space-man/react-theme-animation";

import { type NearbyPeer } from "@nerdshare/shared";

interface LandingViewProps {
  userId: string;
  peers: NearbyPeer[];
  onFileSelected: (
    file: File,
    providedRoomId?: string,
    isNearbyTransfer?: boolean,
  ) => void;
}

export function LandingView({
  userId,
  peers,
  onFileSelected,
}: LandingViewProps) {
  const displayName = useClientName();
  const { resolvedTheme, toggleTheme, ref } = useViteTheme();
  const [showNearby, setShowNearby] = useState(false);
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

  const handleFolderClick = useCallback(async () => {
    if ("showDirectoryPicker" in window) {
      try {
        const handle = await (
          window as Window & {
            showDirectoryPicker: (opts?: {
              mode?: "read" | "readwrite";
            }) => Promise<FileSystemDirectoryHandle>;
          }
        ).showDirectoryPicker({ mode: "read" });
        await runZip(handle);
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          console.error("[folder-picker] failed:", err);
        }
      }
      return;
    }
    folderInputRef.current?.click();
  }, [runZip]);

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

  const features = [
    { icon: InfinityCircleIcon, label: "No file size limit" },
    { icon: FlashIcon, label: "Blazingly fast" },
    { icon: DistributeVerticalCenterIcon, label: "Peer-to-peer" },
    { icon: SquareLock02Icon, label: "End-to-end encrypted" },
  ];

  if (showNearby) {
    return (
      <NearbyView
        userId={userId}
        peers={peers}
        onBack={() => setShowNearby(false)}
        onConnect={(_, roomId, file) => {
          onFileSelected(file, roomId, true);
        }}
      />
    );
  }

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
      <div className="min-h-screen flex flex-col bg-background">
        {/* ── Top Navbar ── */}
        <header className="w-full flex items-center justify-between px-6 sm:px-10 py-4 shrink-0">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-source.png"
              alt="nerdShare"
              className="w-7 h-7 object-contain"
            />
            <span className="font-semibold text-base tracking-tight text-foreground">
              nerdShare
            </span>
          </div>

          {/* Nav right side */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowNearby(true)}
              className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <HugeiconsIcon icon={Wifi01Icon} size={16} />
              Nearby Devices
            </button>

            {/* Theme toggle */}
            <button
              ref={ref as React.RefObject<HTMLButtonElement>}
              onClick={() => toggleTheme()}
              className="p-2 rounded-full bg-card/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              <HugeiconsIcon
                icon={resolvedTheme === "dark" ? Sun02Icon : Moon02Icon}
                size={16}
              />
            </button>
          </div>
        </header>

        {/* ── Hero Section ── */}
        <main className="flex-1 flex items-center px-6 sm:px-10 pb-28">
          <div className="w-full grid grid-cols-1 lg:grid-cols-[220px_2fr_4fr] gap-0 items-center">
            {/* Left: Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative w-full border-2 border-dashed rounded-3xl
                flex flex-col items-center justify-center gap-4 py-14 px-6
                transition-all duration-200 bg-card/40 cursor-pointer aspect-square
                ${
                  zipping
                    ? "border-primary/50 cursor-wait"
                    : isDragOver
                      ? "border-primary bg-primary/10 animate-pulse-glow cursor-copy"
                      : "border-border hover:border-primary/40 hover:bg-muted/10"
                }
              `}
            >
              {zipping ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    {zipProgress && zipProgress.totalFiles > 0
                      ? `Zipping… ${zipProgress.filesProcessed} / ${zipProgress.totalFiles} files`
                      : "Preparing zip…"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <PlusIcon size={28} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed text-center max-w-[200px]">
                    Click to browse or drag files here to start sharing
                  </p>

                  {/* Animated folder — bottom-right corner */}
                  <div
                    className="absolute bottom-3 right-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFolderClick();
                    }}
                  >
                    <AnimatedFolder color="#3b93ad" size={0.65} />
                  </div>
                </>
              )}
            </div>

            {/* Middle spacer */}
            <div className="hidden lg:block" />

            {/* Right: Hero text */}
            <div className="flex flex-col gap-6 lg:text-left text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Share files <span className="text-primary">directly</span> from
                your device
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-md">
                Send files of any size peer-to-peer, without ever storing
                anything online. Instant. Private. Free.
              </p>

              {/* Feature pills */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {features.map((f) => (
                  <div key={f.label} className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={f.icon}
                      size={15}
                      className="text-primary shrink-0"
                    />
                    <span className="text-sm text-muted-foreground">
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Mobile nearby button */}
              <button
                type="button"
                onClick={() => setShowNearby(true)}
                className="sm:hidden self-center flex items-center gap-2 rounded-xl border border-border bg-primary/5 hover:bg-primary/10 px-5 py-3 text-sm text-primary transition-all font-medium"
              >
                <HugeiconsIcon
                  icon={Wifi01Icon}
                  size={16}
                  className="shrink-0"
                />
                Nearby Devices
              </button>
            </div>
          </div>
        </main>

        {/* Hey greeting (bottom subtle text) */}
        <div className="text-center pb-6 text-xs text-muted-foreground/50 shrink-0">
          Hey, {displayName} 👋
        </div>
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

      <FloatingFooter />
    </>
  );
}
