import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { progressBus } from "../services/progress-bus.js";

// Mirrors runny's log-stream pattern: broadcast progress to all clients,
// replay the buffer on connect.
export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  progressBus.onProgress((msg) => {
    const payload = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  });

  wss.on("connection", (ws) => {
    // Replay current buffer so a fresh client catches up
    ws.send(
      JSON.stringify({ type: "history", messages: progressBus.getBuffer() })
    );
  });
}
