import { useEffect } from "react";
import { fetchConfig, fetchScan } from "../lib/api";
import { useStore } from "../store/lumen";

// Loads config + the current scan snapshot on mount (covers late-joining
// clients and dashboard mode).
export function useScan() {
  const setConfig = useStore((s) => s.setConfig);
  const hydrate = useStore((s) => s.hydrate);

  useEffect(() => {
    fetchConfig().then(setConfig);
    fetchScan().then((result) => {
      if (result) hydrate(result);
    });
  }, [setConfig, hydrate]);
}

export function useRefresh() {
  const hydrate = useStore((s) => s.hydrate);
  return async () => {
    const result = await fetchScan();
    if (result) hydrate(result);
  };
}
