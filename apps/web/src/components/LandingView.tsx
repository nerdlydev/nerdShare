import { useRef, useCallback, useState } from "react";
import { useClientName } from "@/lib/use-client-name";
import { PageLayout } from "@/components/PageLayout";
import { NearbyView } from "@/components/NearbyView";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InfinityCircleIcon,
  FlashIcon,
  DistributeVerticalCenterIcon,
  SquareLock02Icon,
  Folder01Icon,
  File01Icon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons";
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

interface LandingViewProps {
  userId: string;
  onFileSelected: (file: File, toUserId?: string) => void;
}

export function LandingView({ userId, onFileSelected }: LandingViewProps) {
  const displayName = useClientName();
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
          // Plain file — pass through untouched
          onFileSelected(source);
          return;
        } else if (Array.isArray(source)) {
          zipFile = await fileListToZip(source, (p) => setZipProgress(p));
        } else if (source instanceof FileSystemDirectoryHandle) {
          // FileSystemDirectoryHandle (showDirectoryPicker)
          zipFile = await dirHandleToZip(
            source as FileSystemDirectoryHandle,
            (p) => setZipProgress(p),
          );
        } else {
          // FileSystemDirectoryEntry (legacy drag-and-drop)
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
    // Modern API — no "Upload X files?" confirm dialog
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
        // User cancelled the picker
        if ((err as Error).name !== "AbortError") {
          console.error("[folder-picker] failed:", err);
        }
      }
      return;
    }

    // Firefox fallback — trigger the old input, then show our themed confirm
    folderInputRef.current?.click();
  }, [runZip]);

  // ── Folder picker — Firefox fallback ──

  const handleFolderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawFiles = e.target.files;
      if (!rawFiles || rawFiles.length === 0) return;
      // Snapshot BEFORE resetting the input — FileList is a live DOM object
      const fileArray = Array.from(rawFiles);
      e.target.value = "";
      // Show themed confirmation dialog instead of the browser's native one
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

  // ─────────────────────────────────────────────

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
        onBack={() => setShowNearby(false)}
        onConnect={(targetUserId) => {
          // Trigger file picker, then send to specific user
          const input = document.createElement("input");
          input.type = "file";
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              onFileSelected(file, targetUserId);
            }
          };
          input.click();
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

      <PageLayout
        panel={
          <div className="space-y-3">
            <h2 className="text-xl font-medium text-foreground text-center mb-2">
              Hey, {displayName} 👋
            </h2>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200
                bg-card/50
                ${
                  zipping
                    ? "border-primary/50 cursor-wait"
                    : isDragOver
                      ? "border-primary bg-primary/10 animate-pulse-glow cursor-copy"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                }
              `}
            >
              {zipping ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    {zipProgress && zipProgress.totalFiles > 0
                      ? `Zipping… ${zipProgress.filesProcessed} / ${zipProgress.totalFiles} files`
                      : "Preparing zip…"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-lg">+</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Drop a <strong>file</strong> or <strong>folder</strong> here
                  </p>
                </>
              )}
            </div>

            {/* Action buttons */}
            {!zipping && (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all duration-150"
                  >
                    <HugeiconsIcon
                      icon={File01Icon}
                      size={16}
                      className="shrink-0"
                    />
                    Select file
                  </button>
                  <button
                    type="button"
                    onClick={handleFolderClick}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all duration-150"
                  >
                    <HugeiconsIcon
                      icon={Folder01Icon}
                      size={16}
                      className="shrink-0"
                    />
                    Select folder
                  </button>
                </div>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-border"></div>
                  <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground uppercase tracking-wider">
                    Or
                  </span>
                  <div className="flex-grow border-t border-border"></div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNearby(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-primary/5 hover:bg-primary/10 px-4 py-3 text-sm text-primary transition-all duration-150 font-medium"
                >
                  <HugeiconsIcon
                    icon={Wifi01Icon}
                    size={16}
                    className="shrink-0"
                  />
                  Nearby Devices
                </button>
              </div>
            )}

            {/* Hidden inputs */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            {/* Firefox fallback only — hidden when showDirectoryPicker is available */}
            <input
              ref={folderInputRef}
              type="file"
              className="hidden"
              // @ts-expect-error — non-standard but widely supported
              webkitdirectory=""
              onChange={handleFolderChange}
            />
          </div>
        }
        hero={
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-4">
              Share files directly from your device to anywhere
            </h1>
            <p className="text-muted-foreground text-base mb-8 leading-relaxed">
              Send files of any size directly from your device without ever
              storing anything online.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {features.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5">
                  <HugeiconsIcon
                    icon={f.icon}
                    size={18}
                    className="text-primary shrink-0"
                  />
                  <span className="text-sm text-muted-foreground">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        }
      />
    </>
  );
}
