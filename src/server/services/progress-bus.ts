import { EventEmitter } from "events";
import type { ProgressMessage } from "../types.js";

// Singleton bus carrying scaffolding progress to all WebSocket clients.
class ProgressBus extends EventEmitter {
  private buffer: ProgressMessage[] = [];

  emitProgress(msg: ProgressMessage) {
    // Reset history at the start of a new scan
    if (msg.type === "scan_start") this.buffer = [];
    this.buffer.push(msg);
    this.emit("progress", msg);
  }

  getBuffer(): ProgressMessage[] {
    return this.buffer;
  }

  onProgress(fn: (msg: ProgressMessage) => void): () => void {
    this.on("progress", fn);
    return () => this.off("progress", fn);
  }
}

export const progressBus = new ProgressBus();
