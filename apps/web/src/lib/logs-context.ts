import { createContext, useContext } from "react";

/** Shared log context — only DebugLog subscribes, not parent views. */
export const LogsContext = createContext<string[]>([]);

export function useLogs() {
  return useContext(LogsContext);
}
