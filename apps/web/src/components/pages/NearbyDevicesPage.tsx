import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SearchIcon, type SearchIconHandle } from "@/components/ui/search";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SmartPhone01Icon,
  LaptopProgrammingIcon,
  Folder01Icon,
} from "@hugeicons/core-free-icons";
import { CircleCheckIcon } from "@/components/ui/circle-check";
import { AttachFileIcon } from "@/components/ui/attach-file";
import { XIcon } from "@/components/ui/x";
import { type NearbyPeer } from "@nerdshare/shared";
import {
  folderToZip,
  fileListToZip,
  dirHandleToZip,
} from "@/lib/folder-to-zip";
import { useTranslation } from "react-i18next";

interface NearbyDevicesPageProps {
  userId: string;
  peers: NearbyPeer[];
  onConnect: (peerId: string, roomId: string, file: File) => void;
}

export function NearbyDevicesPage({
  userId,
  peers,
  onConnect,
}: NearbyDevicesPageProps) {
  const { t } = useTranslation();
  const iconRef = useRef<SearchIconHandle>(null);

  const [selectedPeer, setSelectedPeer] = useState<NearbyPeer | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      iconRef.current?.startAnimation();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<{
    filesProcessed: number;
    totalFiles: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const getDeviceIcon = (type?: string) => {
    if (type === "mobile" || type === "tablet") return SmartPhone01Icon;
    return LaptopProgrammingIcon;
  };

  const handleConnect = useCallback(
    (targetUserId: string, file: File) => {
      const roomId = crypto.randomUUID().split("-")[0];
      const socket = new WebSocket("ws://localhost:8080");

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: "NEARBY_CONNECT",
            fromUserId: userId,
            toUserId: targetUserId,
            roomId,
          }),
        );
        setTimeout(() => socket.close(), 500);
      };

      onConnect(targetUserId, roomId, file);
      setSelectedPeer(null);
    },
    [userId, onConnect],
  );

  const runZip = useCallback(
    async (
      source:
        | FileSystemDirectoryHandle
        | FileSystemDirectoryEntry
        | File[]
        | File,
    ) => {
      if (!selectedPeer) return;

      setZipping(true);
      setZipProgress({ filesProcessed: 0, totalFiles: 0 });
      try {
        let zipFile: File;

        if (source instanceof File) {
          handleConnect(selectedPeer.userId, source);
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

        handleConnect(selectedPeer.userId, zipFile);
      } catch (err) {
        console.error("[nearby-transfer] failed:", err);
      } finally {
        setZipping(false);
        setZipProgress(null);
      }
    },
    [selectedPeer, handleConnect],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) runZip(file);
      e.target.value = "";
    },
    [runZip],
  );

  const handleFolderClick = useCallback(async () => {
    try {
      if ("showDirectoryPicker" in window) {
        // @ts-expect-error - Browsers API
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
  }, [runZip]);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden selection:bg-primary/20 selection:text-primary pb-32">
      <motion.div className="max-w-6xl mx-auto px-6 pt-32 relative z-10">
        {/* HERO SECTION */}
        <motion.section className="text-center mb-8 px-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <div className="relative inline-block shrink-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl bg-primary/10 flex items-center justify-center text-primary relative z-10 shadow-inner overflow-hidden shrink-0">
                <SearchIcon
                  ref={iconRef}
                  size={32}
                  className="scale-75 sm:scale-90 lg:scale-100"
                />
              </div>
            </div>
            <span>{t("nearby.title")}</span>
          </h1>
          <TextShimmer
            className="text-xl max-w-2xl mx-auto leading-relaxed text-balance mb-8"
            duration={2}
          >
            {t("nearby.subtitle")}
          </TextShimmer>
        </motion.section>

        {/* DEVICE LIST */}
        <motion.section className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
                {peers.map((peer: NearbyPeer) => (
                  <motion.button
                    key={peer.userId}
                    layout
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                    onClick={() => setSelectedPeer(peer)}
                    className="flex flex-col items-center gap-4 p-8 rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-xl hover:bg-card hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 text-center group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-primary mb-2">
                      <HugeiconsIcon
                        icon={getDeviceIcon(peer.deviceType)}
                        size={32}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1 leading-tight">
                        {peer.displayName}
                      </h3>
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary px-3 py-1 rounded-full uppercase tracking-wider">
                        <CircleCheckIcon size={14} />
                        {t("nearby.ready")}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
        </motion.section>
      </motion.div>

      {/* SELECTION MODAL */}
      <AnimatePresence>
        {selectedPeer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPeer(null)}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-card border border-border rounded-[3rem] shadow-2xl overflow-hidden px-8 py-10 sm:p-12"
            >
              <button
                onClick={() => setSelectedPeer(null)}
                className="absolute top-6 right-8 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                aria-label="Close modal"
              >
                <XIcon size={24} />
              </button>

              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6">
                  <HugeiconsIcon
                    icon={getDeviceIcon(selectedPeer.deviceType)}
                    size={32}
                  />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                  {t("nearby.send_to", { name: selectedPeer.displayName })}
                </h2>
                <p className="text-muted-foreground text-sm uppercase tracking-widest font-semibold opacity-60">
                  {t("nearby.choose")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  disabled={zipping}
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center gap-4 p-8 rounded-[2rem] border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                >
                  <div className="text-primary group-hover:text-primary transition-colors">
                    <AttachFileIcon size={32} />
                  </div>
                  <span className="font-bold text-lg">
                    {t("nearby.select_files")}
                  </span>
                </button>

                <button
                  disabled={zipping}
                  onClick={handleFolderClick}
                  className="group flex flex-col items-center justify-center gap-4 p-8 rounded-[2rem] border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                >
                  <div className="text-primary group-hover:text-primary transition-colors">
                    <HugeiconsIcon icon={Folder01Icon} size={32} />
                  </div>
                  <span className="font-bold text-lg">
                    {t("nearby.select_folder")}
                  </span>
                </button>
              </div>

              {zipping && (
                <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {zipProgress && zipProgress.totalFiles > 0
                      ? t("nearby.preparing_files", {
                          processed: zipProgress.filesProcessed,
                          total: zipProgress.totalFiles,
                        })
                      : t("nearby.preparing_folder")}
                  </p>
                </div>
              )}

              <button
                onClick={() => setSelectedPeer(null)}
                className="mt-10 w-full py-4 text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                {t("nearby.cancel")}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error - Browsers API
        webkitdirectory=""
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files) runZip(Array.from(files));
          e.target.value = "";
        }}
      />
    </div>
  );
}
