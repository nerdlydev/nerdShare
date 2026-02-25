import { useState } from "react";
import { generateClientName } from "@nerdshare/shared";

export function useClientName() {
  const [displayName] = useState(() => {
    const saved = localStorage.getItem("nerdshare_client_name");
    if (saved) return saved;
    const newName = generateClientName();
    localStorage.setItem("nerdshare_client_name", newName);
    return newName;
  });

  return displayName;
}
