import { useRef, useCallback, useEffect } from "react";

// ─── Screen Wake Lock Hook ───
// Prevents the device from sleeping during active file transfers.
// Gracefully no-ops in browsers that don't support the API (Firefox, older Safari).

const isSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;

export function useWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  // Track whether we WANT the lock (independent of whether browser holds it).
  const wantLockRef = useRef(false);

  const acquire = useCallback(async () => {
    if (!isSupported) return;
    wantLockRef.current = true;
    try {
      // If we already hold a live sentinel, nothing to do.
      if (sentinelRef.current && !sentinelRef.current.released) return;
      sentinelRef.current = await (navigator as any).wakeLock.request("screen");
      console.log("[wake-lock] acquired");
    } catch (err) {
      // NotAllowedError happens if the page is hidden.
      // We ignore it because use-wake-lock handles re-acquisition on visibilitychange.
      if ((err as Error).name !== "NotAllowedError") {
        console.warn("[wake-lock] failed to acquire:", err);
      }
    }
  }, []);

  const release = useCallback(async () => {
    wantLockRef.current = false;
    if (sentinelRef.current && !sentinelRef.current.released) {
      await sentinelRef.current.release();
      console.log("[wake-lock] released");
    }
    sentinelRef.current = null;
  }, []);

  // The browser automatically releases the sentinel when the tab goes to
  // the background. Re-acquire it when the tab becomes visible again.
  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState === "visible" && wantLockRef.current) {
        await acquire();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      // Release on unmount if still held.
      sentinelRef.current?.release().catch(() => {});
    };
  }, [acquire]);

  return { acquire, release, isSupported };
}
