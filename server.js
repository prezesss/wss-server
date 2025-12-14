const WebSocket = require("ws");
const cbor = require("cbor");

const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

console.log("✅ WSS server is running...");

wss.on("connection", (ws) => {
  console.log("🔌 New client connected");

  ws.on("message", async (message) => {
    try {
      const decoded = await cbor.decodeFirst(message);
      console.log("📩 Received CBOR message:", decoded);

      if (!decoded || !decoded.action) return;

      switch (decoded.action) {
        case "handshake":
          console.log("🤝 Handshake received:", decoded.data);

          // Send config
          ws.send(cbor.encode({
            action: "config",
            data: {
              autoHeal: true,
              antiAfk: false
            }
          }));

          // Send license
          ws.send(cbor.encode({
            action: "license",
            data: {
              status: "active",
              expiry: "2099-12-31"
            }
          }));

          // Optional: Send pong after handshake
          ws.send(cbor.encode({
            action: "pong",
            data: { timestamp: Date.now() }
          }));
          break;

        case "ping":
          ws.send(cbor.encode({
            action: "pong",
            data: { timestamp: Date.now() }
          }));
          break;

        case "request-config":
          ws.send(cbor.encode({
            action: "config",
            data: {
              autoHeal: true,
              antiAfk: false
            }
          }));
          break;

        case "toggle-feature":
          console.log(`🛠️ Toggle: ${decoded.data.feature} -> ${decoded.data.enabled}`);
          break;

        default:
          console.warn("⚠️ Unknown action:", decoded.action);
      }

    } catch (err) {
      console.error("❌ Failed to parse CBOR message:", err);
    }
  });

  ws.on("close", () => {
    console.log("❌ Client disconnected");
  });

  ws.on("error", (err) => {
    console.error("❗ WebSocket error:", err);
  });
});
