import { motion } from "framer-motion";

interface LoaderSpinnerProps {
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fullScreen?: boolean;
}

export function LoaderSpinner({
  label = "Loading...",
  size = "md",
  className = "",
  fullScreen = false,
}: LoaderSpinnerProps) {
  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const containerClasses = fullScreen
    ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
    : `flex flex-col items-center justify-center p-4 ${className}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={containerClasses}
    >
      <div className={`relative flex items-center justify-center ${sizeMap[size]}`}>
        {/* Outer glowing track */}
        <div className={`absolute ${sizeMap[size]} rounded-full border-4 border-primary/20 bg-primary/5`} />
        
        {/* Inner spinning rim */}
        <div
          className={`absolute ${sizeMap[size]} rounded-full border-4 border-transparent border-t-primary border-l-primary/60 animate-[spin_1s_cubic-bezier(0.55,0.085,0.68,0.53)_infinite] shadow-[0_0_15px_var(--color-primary)]`}
        />
        
        {/* Central pulsing core */}
        <motion.div
          animate={{ scale: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-6 h-6'} bg-primary rounded-full absolute`}
        />
      </div>

      {label && (
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`font-medium tracking-wide mt-6 text-foreground/80 ${size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"}`}
        >
          {label}
        </motion.p>
      )}
    </motion.div>
  );
}
