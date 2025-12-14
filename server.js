const http = require("http");
const WebSocket = require("ws");
const cbor = require("cbor");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Map();

/**
 * Always-valid license (matches Imperium behaviour)
 */
function validateLicense() {
  return {
    valid: true,
    key: "IMPERIUM-DEMO-LICENSE",
    reason: null
  };
}

/**
 * Build a FULL config object
 * (this prevents .update() crashes in interface.js)
 */
function buildConfig(client) {
  return {
    version: client.version || "2.1.9",
    theme: "default",

    features: {
      autoHeal: !!client.features.autoHeal,
      quickLoot: !!client.features.quickLoot,
      tooltipHints: !!client.features.tooltipHints
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

    features: {
      autoHeal: false,
      quickLoot: true,
      tooltipHints: true
    }
  };

  clients.set(socket, client);
  console.log(`🔌 Client connected [${clientId}]`);

  /**
   * Send FULL config immediately (CBOR)
   */
  socket.send(
    cbor.encode({
      action: "config",
      data: buildConfig(client)
    })
  );

  socket.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.error("❌ Invalid JSON from client");
      return;
    }

    const { action, data } = msg;

    switch (action) {
      /**
       * HANDSHAKE
       */
      case "handshake":
        client.version = data?.version || client.version;
        client.domain = data?.domain || client.domain;
        client.tabId = data?.tabId || null;

        console.log(
          `🤝 Handshake | domain=${client.domain} version=${client.version}`
        );

        const license = validateLicense();
        client.licensed = license.valid;

        socket.send(
          cbor.encode({
            action: "license",
            data: license
          })
        );
        break;

      /**
       * HEARTBEAT
       */
      case "ping":
        socket.send(
          cbor.encode({
            action: "pong",
            data: { time: Date.now() }
          })
        );
        break;

      /**
       * FEATURE TOGGLE
       */
      case "toggle-feature":
        if (!client.licensed) return;

        if (data?.feature !== undefined) {
          client.features[data.feature] = !!data.enabled;

          console.log(
            `🛠 Feature ${data.feature} = ${data.enabled}`
          );

          socket.send(
            cbor.encode({
              action: "config",
              data: buildConfig(client)
            })
          );
        }
        break;

      /**
       * CONFIG REQUEST
       */
      case "request-config":
        socket.send(
          cbor.encode({
            action: "config",
            data: buildConfig(client)
          })
        );
        break;

      /**
       * GENERIC MESSAGE
       */
      case "message":
        console.log("💬 Message:", data);
        break;

      default:
        console.warn("⚠️ Unknown action:", action);
    }
  });

  socket.on("close", () => {
    console.log(`❌ Client disconnected [${clientId}]`);
    clients.delete(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Imperium-compatible WSS running on port ${PORT}`);
});
