const http = require("http");
const WebSocket = require("ws");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Map();

/**
 * Helper: Fake license validation (always valid for now)
 */
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
    domain: "unknown",
    version: "unknown",
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

  // Send config on connect
  socket.send(JSON.stringify({
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
    } catch (e) {
      console.error("❌ Invalid JSON:", rawMessage);
      return;
    }

    const { action, data } = msg;

    switch (action) {
      /**
       * HANDSHAKE → respond with license
       */
      case "handshake":
        client.version = data?.version || "unknown";
        client.domain = data?.domain || "unknown";
        client.tabId = data?.tabId || null;

        console.log(`🤝 Handshake from ${client.domain}, version ${client.version}`);

        // Send license check result
        const license = validateLicense(client);
        client.licensed = license.valid;

        socket.send(JSON.stringify({
          action: "license",
          data: license
        }));

        // Only send shutdown if license is invalid (not in this version)
        if (!license.valid) {
          socket.send(JSON.stringify({ action: "shutdown" }));
        }
        break;

      /**
       * Ping / Heartbeat
       */
      case "ping":
        socket.send(JSON.stringify({
          action: "pong",
          data: { time: Date.now() }
        }));
        break;

      /**
       * Toggle a feature
       */
      case "toggle-feature":
        if (!client.licensed) return;

        const { feature, enabled } = data || {};
        if (feature) {
          client.features[feature] = !!enabled;
          console.log(`🛠️ Feature ${feature} = ${enabled}`);

          // Echo back updated config
          socket.send(JSON.stringify({
            action: "config",
            data: {
              version: client.version,
              theme: "default",
              features: client.features
            }
          }));
        }
        break;

      /**
       * Client requested config
       */
      case "request-config":
        socket.send(JSON.stringify({
          action: "config",
          data: {
            version: client.version,
            theme: "default",
            features: client.features
          }
        }));
        break;

      /**
       * General message logging
       */
      case "message":
        console.log(`💬 Message from ${client.id}:`, data);
        break;

      /**
       * Unknown action
       */
      default:
        console.warn(`⚠️ Unrecognized action: ${action}`);
    }
  });

  socket.on("close", () => {
    console.log(`❌ Disconnected: ${clientId}`);
    clients.delete(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Imperium-style WebSocket running on port ${PORT}`);
});
