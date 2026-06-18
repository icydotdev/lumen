import type {
  ProjectConfig,
  ScanResult,
  ProgressMessage,
  DesignTokens,
  ReplaceRequest,
} from "../types.js";

// Shared in-memory state read by the API routes and built up as Claude
// (or the fallback scanner) pushes progress.
interface LumenState {
  config: ProjectConfig | null;
  scanResult: ScanResult;
  scanning: boolean;
  replaceRequests: ReplaceRequest[];
}

function emptyTokens(): DesignTokens {
  return {
    colors: {},
    spacing: {},
    typography: {},
    borderRadius: {},
    shadows: {},
  };
}

function emptyScan(): ScanResult {
  return {
    components: [],
    tokens: emptyTokens(),
    inconsistencies: [],
    stylingApproach: [],
  };
}

export const state: LumenState = {
  config: null,
  scanResult: emptyScan(),
  scanning: false,
  replaceRequests: [],
};

export function addReplaceRequest(
  componentName: string,
  files: string[]
): ReplaceRequest {
  const req: ReplaceRequest = {
    id: `${componentName}-${Date.now()}`,
    componentName,
    files,
    status: "pending",
    createdAt: Date.now(),
  };
  state.replaceRequests.push(req);
  return req;
}

export function markReplaceDone(id: string) {
  const req = state.replaceRequests.find((r) => r.id === id);
  if (req) req.status = "done";
}

export function resetScan() {
  state.scanResult = emptyScan();
  if (state.config) state.scanResult.stylingApproach = state.config.stylingApproach;
  state.scanning = true;
}

export function setScanResult(result: ScanResult) {
  state.scanResult = result;
}

// Fold a progress message into the accumulated scan result.
export function applyMessage(msg: ProgressMessage) {
  switch (msg.type) {
    case "scan_start":
      resetScan();
      break;
    case "component": {
      const idx = state.scanResult.components.findIndex(
        (c) => c.name === msg.component.name
      );
      if (idx >= 0) state.scanResult.components[idx] = msg.component;
      else state.scanResult.components.push(msg.component);
      break;
    }
    case "token":
      state.scanResult.tokens[msg.kind][msg.name] = msg.value;
      break;
    case "inconsistency":
      state.scanResult.inconsistencies.push(msg.inconsistency);
      break;
    case "complete":
      state.scanning = false;
      break;
  }
}
