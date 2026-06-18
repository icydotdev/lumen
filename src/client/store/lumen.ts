import { create } from "zustand";
import type {
  ProjectConfig,
  ScanResult,
  ComponentInfo,
  DesignTokens,
  Inconsistency,
} from "../lib/api";

export interface ScanSummary {
  componentCount: number;
  tokenCount: number;
  inconsistencyCount: number;
}

export type TokenKind = keyof DesignTokens;

export type ProgressMessage =
  | { type: "scan_start" }
  | { type: "component"; component: ComponentInfo }
  | { type: "token"; kind: TokenKind; name: string; value: string }
  | { type: "inconsistency"; inconsistency: Inconsistency }
  | { type: "generating"; name: string }
  | { type: "generated"; name: string }
  | { type: "complete"; summary: ScanSummary }
  | { type: "log"; stream: "stdout" | "stderr"; data: string };

function emptyTokens(): DesignTokens {
  return { colors: {}, spacing: {}, typography: {}, borderRadius: {}, shadows: {} };
}

interface LumenStore {
  config: ProjectConfig | null;
  components: ComponentInfo[];
  tokens: DesignTokens;
  inconsistencies: Inconsistency[];
  progress: ProgressMessage[];
  generating: Set<string>;
  completed: Set<string>;
  started: boolean; // a scan has begun (leave the loading screen)
  isScanning: boolean;
  summary: ScanSummary | null;
  selectedComponent: ComponentInfo | null;

  setConfig: (config: ProjectConfig | null) => void;
  hydrate: (result: ScanResult & { scanning?: boolean }) => void;
  addProgress: (msg: ProgressMessage) => void;
  selectComponent: (component: ComponentInfo | null) => void;
}

export const useStore = create<LumenStore>((set) => ({
  config: null,
  components: [],
  tokens: emptyTokens(),
  inconsistencies: [],
  progress: [],
  generating: new Set(),
  completed: new Set(),
  started: false,
  isScanning: false,
  summary: null,
  selectedComponent: null,

  setConfig: (config) => set({ config }),

  // Seed from the REST snapshot (late-joining clients / dashboard mode).
  hydrate: (result) =>
    set({
      components: result.components ?? [],
      tokens: result.tokens ?? emptyTokens(),
      inconsistencies: result.inconsistencies ?? [],
      started: (result.components?.length ?? 0) > 0 || !!result.scanning,
      isScanning: !!result.scanning,
    }),

  addProgress: (msg) =>
    set((state) => {
      const next: Partial<LumenStore> = { progress: [...state.progress, msg] };

      switch (msg.type) {
        case "scan_start":
          next.started = true;
          next.isScanning = true;
          next.components = [];
          next.tokens = emptyTokens();
          next.inconsistencies = [];
          next.generating = new Set();
          next.completed = new Set();
          next.summary = null;
          break;
        case "component": {
          next.started = true;
          const idx = state.components.findIndex(
            (c) => c.name === msg.component.name
          );
          const components = [...state.components];
          if (idx >= 0) components[idx] = msg.component;
          else components.push(msg.component);
          next.components = components;
          break;
        }
        case "token":
          next.tokens = {
            ...state.tokens,
            [msg.kind]: { ...state.tokens[msg.kind], [msg.name]: msg.value },
          };
          break;
        case "inconsistency":
          next.inconsistencies = [...state.inconsistencies, msg.inconsistency];
          break;
        case "generating": {
          const gen = new Set(state.generating);
          gen.add(msg.name);
          next.generating = gen;
          break;
        }
        case "generated": {
          const gen = new Set(state.generating);
          gen.delete(msg.name);
          const done = new Set(state.completed);
          done.add(msg.name);
          next.generating = gen;
          next.completed = done;
          break;
        }
        case "complete":
          next.isScanning = false;
          next.summary = msg.summary;
          break;
      }

      return next;
    }),

  selectComponent: (component) => set({ selectedComponent: component }),
}));
