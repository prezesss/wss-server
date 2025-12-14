const http = require("http");
const WebSocket = require("ws");
const cbor = require("cbor");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Map();

function validateLicense(client) {
  return {
    valid: true,
    key: "IMPERIUM-DEMO-LICENSE",
    reason: null
  };
}

wss.on("connection", (socket) => {
  const clientId = Math.random().toString(36).substring(2);

  const client = {
    id: clientId,
    version: "unknown",
    domain: "unknown",
    tabId: null,
    licensed: false,
    features: {
      quickLoot: true,
      autoHeal: false,
      tooltipHints: true
    }
  };

  clients.set(socket, client);
  console.log(`🔌 Connected: ${clientId}`);

  // Send config immediately (CBOR)
  socket.send(cbor.encode({
    action: "config",
    data: {
      version: "2.1.9",
      theme: "default",
      features: client.features
    }
  }));

  socket.on("message", (rawMessage) => {
    let msg;
    try {
      msg = JSON.parse(rawMessage);
    } catch {
      console.error("❌ Invalid JSON:", rawMessage);
      return;
    }

    const { action, data } = msg;

    switch (action) {
      case "handshake":
        client.version = data?.version || "unknown";
        client.domain = data?.domain || "unknown";
        client.tabId = data?.tabId || null;

        console.log(`🤝 Handshake from ${client.domain}, v${client.version}`);

        const license = validateLicense(client);
        client.licensed = license.valid;

        // Send license (CBOR)
        socket.send(cbor.encode({
          action: "license",
          data: license
        }));

        if (!license.valid) {
          socket.send(cbor.encode({ action: "shutdown" }));
        }
        break;

      case "ping":
        socket.send(cbor.encode({
          action: "pong",
          data: { time: Date.now() }
        }));
        break;

      case "toggle-feature":
        const { feature, enabled } = data || {};
        if (feature) {
          client.features[feature] = !!enabled;
          console.log(`🛠️ ${feature} set to ${enabled}`);

          socket.send(cbor.encode({
            action: "config",
            data: {
              version: client.version,
              theme: "default",
              features: client.features
            }
          }));
        }
        break;

      case "request-config":
        socket.send(cbor.encode({
          action: "config",
          data: {
            version: client.version,
            theme: "default",
            features: client.features
          }
        }));
        break;

      case "message":
        console.log("💬 Message:", data);
        break;

      default:
        console.warn("⚠️ Unknown action:", action);
    }
  });

  socket.on("close", () => {
    console.log(`❌ Disconnected: ${clientId}`);
    clients.delete(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 WSS server with CBOR active on port ${PORT}`);
});
