const http = require("http");
const WebSocket = require("ws");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Map();

wss.on("connection", (socket, req) => {
  const clientId = Math.random().toString(36).slice(2);
  clients.set(socket, { id: clientId, features: {} });

  console.log(`🔌 Client connected [${clientId}]`);

  // Initial config message (just like Imperium likely does)
  socket.send(JSON.stringify({
    action: "config",
    data: {
      theme: "default",
      features: {
        quickLoot: true,
        autoHeal: false,
        tooltipHints: true
      },
      version: "2.1.9"
    }
  }));

  socket.on("message", (rawMessage) => {
    let msg;

    try {
      msg = JSON.parse(rawMessage);
    } catch {
      console.error("❌ Received non-JSON message:", rawMessage);
      return;
    }

    const { action, data } = msg;
    const client = clients.get(socket);

    console.log(`📨 [${client.id}] Action: ${action}`, data);

    switch (action) {
      case "handshake":
        // Store handshake info
        client.version = data.version;
        client.domain = data.domain;
        client.tabId = data.tabId;
        console.log(`🤝 Handshake from [${client.domain}], version ${client.version}`);
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
        break;

      case "request-config":
        socket.send(JSON.stringify({
          action: "config",
          data: {
            theme: "dark",
            features: client.features,
            version: "2.1.9"
          }
        }));
        break;

      case "message":
        console.log(`💬 Custom message from client:`, data);
        break;

      default:
        console.warn(`⚠️ Unhandled action: ${action}`);
    }
  });

  socket.on("close", () => {
    console.log(`❌ Client disconnected [${clients.get(socket).id}]`);
    clients.delete(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Imperium-style WebSocket server running on port ${PORT}`);
});
