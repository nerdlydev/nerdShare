import { useRef, useCallback, useState } from "react";
import { useClientName } from "@/lib/use-client-name";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InfinityCircleIcon,
  FlashIcon,
  DistributeVerticalCenterIcon,
  SquareLock02Icon,
  Wifi01Icon,
  ShieldKeyIcon,
  EarthIcon,
  Globe02Icon,
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
      <div className="min-h-[calc(100vh-49px)] flex flex-col bg-background relative overflow-x-hidden">
        {/* Masked grid + dot background */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px),
              radial-gradient(circle, rgba(59,147,173,0.4) 1px, transparent 1px)
            `,
            backgroundSize: "30px 30px, 30px 30px, 30px 30px",
            backgroundPosition: "0 0, 0 0, 0 0",
            WebkitMaskImage:
              "linear-gradient(to left, #000 0%, #000 50%, transparent 80%, transparent 100%)",
            maskImage:
              "linear-gradient(to left, #000 0%, #000 50%, transparent 80%, transparent 100%)",
          }}
        />

        {/* ── Hero Section ── */}
        <main className="flex-1 flex items-center px-4 sm:px-8 lg:pl-32 lg:pr-10 py-8 lg:py-0 lg:pb-16">
          <div className="w-full grid grid-cols-1 lg:grid-cols-[400px_2fr_4fr] gap-8 lg:gap-0 items-center">
            {/* Left: Drop zone + upload buttons */}
            <div className="flex flex-col gap-3 w-full max-w-md mx-auto lg:max-w-none lg:mx-0">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative w-full border-2 border-dashed rounded-3xl
                  flex flex-col items-center justify-center gap-4 py-10 px-6
                  transition-all duration-200 bg-card/40 cursor-pointer
                  h-[200px] sm:h-[240px] lg:h-[280px]
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
                    <div className="w-9 h-9 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      {zipProgress && zipProgress.totalFiles > 0
                        ? `Zipping… ${zipProgress.filesProcessed} / ${zipProgress.totalFiles} files`
                        : "Preparing zip…"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <PlusIcon size={24} />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed text-center max-w-[220px]">
                      <span className="hidden sm:inline">
                        Click to browse or drag files here to start sharing
                      </span>
                      <span className="sm:hidden">
                        Drag & drop files here or tap to browse
                      </span>
                    </p>

                    {/* Animated folder — bottom-right corner */}
                    {/* <div
                      className="absolute bottom-3 right-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFolderClick();
                      }}
                    >
                      <AnimatedFolder color="#3b93ad" size={0.55} />
                    </div> */}
                  </>
                )}
              </div>

              {/* Upload buttons — visible on mobile & tablet, hidden on desktop where drag-drop is primary */}
              <div className="flex gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-card/60 hover:bg-muted/30 px-4 py-3 text-sm text-foreground font-medium transition-all"
                >
                  <PlusIcon size={15} />
                  Upload File
                </button>
                {/* <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFolderClick();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-card/60 hover:bg-muted/30 px-4 py-3 text-sm text-foreground font-medium transition-all"
                >
                  <AnimatedFolder color="currentColor" size={0.38} />
                  Upload Folder
                </button> */}
              </div>
            </div>

            {/* Middle spacer */}
            <div className="hidden lg:block" />

            {/* Right: Hero text */}
            <div className="flex flex-col gap-5 text-center lg:text-left">
              <p className="text-sm text-muted-foreground/60">
                Hey, {displayName} 👋
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
                Share files <span className="text-primary">directly</span> from
                your device
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
                Send files of any size peer-to-peer, without ever storing
                anything online. Instant. Private. Free.
              </p>

              {/* Feature pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {features.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-2 justify-center lg:justify-start"
                  >
                    <HugeiconsIcon
                      icon={f.icon}
                      size={14}
                      className="text-primary shrink-0"
                    />
                    <span className="text-sm text-muted-foreground">
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Nearby Devices button — hidden on desktop (in navbar) */}
              <button
                type="button"
                onClick={() => onNavigate("nearby")}
                className="lg:hidden self-center flex items-center gap-2 rounded-xl border border-border bg-primary/5 hover:bg-primary/10 px-5 py-3 text-sm text-primary transition-all font-medium"
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

        {/* ── Features / About Section ── */}
        <section className="relative z-10 px-4 sm:px-8 lg:px-24 pt-2 pb-12 lg:pb-24">
          {/* Section label */}
          <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-8">
            Why nerdShare?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1 */}
            <div className="group rounded-2xl border border-border bg-card/40 backdrop-blur p-6 flex flex-col gap-3 hover:border-primary/30 hover:bg-card/60 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                <HugeiconsIcon icon={EarthIcon} size={18} />
              </div>
              <h3 className="font-semibold text-sm text-foreground">
                Built for humans, not corporations
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                nerdShare is free, independent, and has zero trackers. No
                accounts, no ads, no BS — just you and whoever you're sending
                files to.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group rounded-2xl border border-border bg-card/40 backdrop-blur p-6 flex flex-col gap-3 hover:border-primary/30 hover:bg-card/60 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                <HugeiconsIcon icon={Globe02Icon} size={18} />
              </div>
              <h3 className="font-semibold text-sm text-foreground">
                Closes when you close
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your files live on your device, not our servers. Shut the tab
                and poof — they're gone. No lingering uploads, no accidental
                oversharing.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group rounded-2xl border border-border bg-card/40 backdrop-blur p-6 flex flex-col gap-3 hover:border-primary/30 hover:bg-card/60 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                <HugeiconsIcon icon={InfinityCircleIcon} size={18} />
              </div>
              <h3 className="font-semibold text-sm text-foreground">
                No limits. Seriously.
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Since we never store your data, we have no reason to cap file
                sizes. Send a 4K movie. Send an entire project folder. We don't
                mind.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group rounded-2xl border border-border bg-card/40 backdrop-blur p-6 flex flex-col gap-3 hover:border-primary/30 hover:bg-card/60 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                <HugeiconsIcon icon={ShieldKeyIcon} size={18} />
              </div>
              <h3 className="font-semibold text-sm text-foreground">
                End-to-end, just for you two
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                WebRTC + DTLS means your data is encrypted in transit and only
                your receiver can decrypt it. Not even we can peek. Pinky
                promise. 🤙
              </p>
            </div>
          </div>
        </section>
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
