import { useRef, useCallback, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InfinityCircleIcon,
  FlashIcon,
  DistributeVerticalCenterIcon,
  SquareLock02Icon,
} from "@hugeicons/core-free-icons";

interface LandingViewProps {
  onFileSelected: (file: File) => void;
}

export function LandingView({ onFileSelected }: LandingViewProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  const features = [
    { icon: InfinityCircleIcon, label: "No file size limit" },
    { icon: FlashIcon, label: "Blazingly fast" },
    { icon: DistributeVerticalCenterIcon, label: "Peer-to-peer" },
    { icon: SquareLock02Icon, label: "End-to-end encrypted" },
  ];

  return (
    <PageLayout
      panel={
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
            bg-card/50
            ${
              isDragOver
                ? "border-primary bg-primary/10 animate-pulse-glow"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }
          `}
        >
          <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-lg">+</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Click to browse or drag files here to start sharing
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
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
                <span className="text-sm text-muted-foreground">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}
