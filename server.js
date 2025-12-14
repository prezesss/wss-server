const http = require("http");
const WebSocket = require("ws");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Map();

wss.on("connection", (socket, req) => {
  const clientId = Math.random().toString(36).slice(2);
  const defaultFeatures = {
    quickLoot: true,
    autoHeal: false,
    tooltipHints: true
  };

  const clientState = {
    id: clientId,
    features: { ...defaultFeatures },
    version: "unknown",
    domain: "unknown"
  };

  clients.set(socket, clientState);

  console.log(`🔌 Client connected [${clientId}]`);

  // Immediately send config on connect
  socket.send(JSON.stringify({
    action: "config",
    data: {
      theme: "default",
      features: clientState.features,
      version: "2.1.9"
    }
  }));

  socket.on("message", (rawMessage) => {
    let msg;

    try {
      msg = JSON.parse(rawMessage);
    } catch {
      console.error("❌ Non-JSON message:", rawMessage);
      return;
    }

    const { action, data } = msg;
    const client = clients.get(socket);

    switch (action) {
      case "handshake":
        client.version = data.version || "unknown";
        client.domain = data.domain || "unknown";
        client.tabId = data.tabId || "unknown";
        console.log(`🤝 Handshake from ${client.domain} (v${client.version})`);
        break;

      case "ping":
        socket.send(JSON.stringify({
          action: "pong",
          data: { time: Date.now() }
        }));
        break;

      case "toggle-feature":
        const { feature, enabled } = data;
        client.features[feature] = enabled;
        console.log(`🛠️ Feature toggled: ${feature} = ${enabled}`);

        // Optional: immediately send config update back
        socket.send(JSON.stringify({
          action: "config",
          data: {
            features: client.features,
            version: client.version,
            theme: "default"
          }
        }));
        break;

      case "request-config":
        socket.send(JSON.stringify({
          action: "config",
          data: {
            features: client.features,
            version: client.version,
            theme: "default"
          }
        }));
        break;

      case "message":
        console.log(`💬 Custom message:`, data);
        break;

      default:
        console.warn(`⚠️ Unhandled action: ${action}`);
    }
  });

  socket.on("close", () => {
    console.log(`❌ Client disconnected [${clientId}]`);
    clients.delete(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Imperium-compatible WebSocket server running on port ${PORT}`);
});
