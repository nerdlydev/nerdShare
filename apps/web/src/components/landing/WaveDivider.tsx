import { motion } from "framer-motion";

interface WaveDividerProps {
  pathLength: any; // MotionValue<number>
  className?: string;
  isBottom?: boolean;
}

export function WaveDivider({ pathLength, className, isBottom }: WaveDividerProps) {
  if (isBottom) {
    return (
      <div className={`relative w-full leading-none z-10 rotate-180 translate-y-[1px] overflow-visible ${className}`}>
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
    );
  }

  return (
    <div className={`absolute bottom-[-1px] left-0 w-full leading-none z-20 overflow-visible ${className}`}>
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
          pathLength={pathLength}
          style={{
            filter: "drop-shadow(0 2px 6px rgba(var(--color-primary-rgb, 0,0,0), 0.3))"
          }}
          className="text-border opacity-100"
        />

        {/* Wave fill background */}
        <path
          d="M0,0 C240,110 480,110 720,55 C960,0 1200,0 1440,55 L1440,200 L0,200 Z"
          fill="var(--background)"
        />
      </svg>
    </div>
  );
}
