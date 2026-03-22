import { motion } from "framer-motion";
import { PlusIcon } from "@/components/ui/plus-icon";

interface DropZoneProps {
  isDragOver: boolean;
  zipping: boolean;
  zipProgress: {
    filesProcessed: number;
    totalFiles: number;
  } | null;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onClick: () => void;
  onFolderClick: (e: React.MouseEvent) => void;
  variants?: any;
  className?: string;
}

export function DropZone({
  isDragOver,
  zipping,
  zipProgress,
  onDrop,
  onDragOver,
  onDragLeave,
  onClick,
  onFolderClick,
  variants,
  className = "",
}: DropZoneProps) {
  return (
    <motion.div
      variants={variants}
      className={`relative w-full ${className}`}
    >
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onClick}
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
                  onClick={onFolderClick}
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
  );
}
