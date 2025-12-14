const http = require("http");
const WebSocket = require("ws");
const cbor = require("cbor");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Map();

function validateLicense() {
  return {
    valid: true,
    key: "IMPERIUM-VALID-LICENSE",
    reason: null
  };
}

function buildConfig(client) {
  return {
    version: client.version || "2.1.9",
    theme: "default",
    features: {
      autoHeal: client.features.autoHeal ?? false,
      quickLoot: client.features.quickLoot ?? true,
      tooltipHints: client.features.tooltipHints ?? true
    },
    ui: {
      toolbar: {
        visible: true,
        locked: false
      },
      layout: "default",
      panels: {
        main: true,
        stats: true,
        inventory: true,
        settings: true
      }
    }
  };
}

wss.on("connection", (socket) => {
  const clientId = Math.random().toString(36).slice(2);

  const client = {
    id: clientId,
    domain: "unknown",
    version: "2.1.9",
    tabId: null,
    licensed: false,
    features: {}
  };

  clients.set(socket, client);
  console.log(`🔌 Client connected [${clientId}]`);

  socket.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.error("❌ Invalid JSON");
      return;
    }

    const { action, data } = msg;

    switch (action) {
      case "handshake":
        client.version = data?.version || client.version;
        client.domain = data?.domain || client.domain;
        client.tabId = data?.tabId || null;

        console.log(`🤝 Handshake from ${client.domain} (v${client.version})`);

        // ✅ Send license after handshake
        const license = validateLicense();
        client.licensed = license.valid;

        socket.send(cbor.encode({
          action: "license",
          data: license
        }));

        // ✅ Send config after handshake
        socket.send(cbor.encode({
          action: "config",
          data: buildConfig(client)
        }));
        break;

      case "ping":
        socket.send(cbor.encode({
          action: "pong",
          data: { time: Date.now() }
        }));
        break;

      case "toggle-feature":
        if (data?.feature) {
          client.features[data.feature] = !!data.enabled;

          socket.send(cbor.encode({
            action: "config",
            data: buildConfig(client)
          }));
        }
        break;

      case "request-config":
        socket.send(cbor.encode({
          action: "config",
          data: buildConfig(client)
        }));
        break;

      case "message":
        console.log("💬", data);
        break;

      default:
        console.warn("⚠️ Unknown action:", action);
    }
  });

  socket.on("close", () => {
    console.log(`❌ Disconnected [${clientId}]`);
    clients.delete(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Imperium WSS ready on port ${PORT}`);
});
