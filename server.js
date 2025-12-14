const http = require("http");
const WebSocket = require("ws");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

/**
 * In-memory client store
 * (Imperium works session-based, this matches that behavior)
 */
const clients = new Map();

/**
 * Change this if you want real license logic later
 */
function validateLicense(client) {
  // ✅ For now: ALWAYS VALID
  return {
    valid: true,
    key: "IMPERIUM-DEMO-LICENSE",
    reason: null
  };
}

wss.on("connection", (socket) => {
  const clientId = Math.random().toString(36).slice(2);

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

  console.log(`🔌 Client connected [${clientId}]`);

  /**
   * Imperium sends config immediately on connect
   */
  socket.send(JSON.stringify({
    action: "config",
    data: {
      version: "2.1.9",
      theme: "default",
      features: client.features
    }
  }));

  socket.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.error("❌ Invalid JSON:", raw);
      return;
    }

    const { action, data } = msg;

    switch (action) {
      /**
       * =========================
       * HANDSHAKE
       * =========================
       */
      case "handshake":
        client.version = data?.version ?? "unknown";
        client.domain = data?.domain ?? "unknown";
        client.tabId = data?.tabId ?? null;

        console.log(
          `🤝 Handshake | domain=${client.domain} version=${client.version}`
        );

        /**
         * LICENSE CHECK (CRITICAL)
         */
        const license = validateLicense(client);
        client.licensed = license.valid;

        socket.send(JSON.stringify({
          action: "license",
          data: license
        }));

        /**
         * If license is invalid, Imperium disables itself
         */
        if (!license.valid) {
          socket.send(JSON.stringify({ action: "shutdown" }));
        }

        break;

      /**
       * =========================
       * HEARTBEAT
       * =========================
       */
      case "ping":
        socket.send(JSON.stringify({
          action: "pong",
          data: { time: Date.now() }
        }));
        break;

      /**
       * =========================
       * FEATURE TOGGLES
       * =========================
       */
      case "toggle-feature":
        if (!client.licensed) return;

        if (data?.feature !== undefined) {
          client.features[data.feature] = !!data.enabled;
          console.log(
            `🛠 Feature ${data.feature} => ${data.enabled}`
          );

          /**
           * Imperium often re-sends config after changes
           */
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
       * =========================
       * CONFIG REQUEST
       * =========================
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
       * =========================
       * GENERIC MESSAGES
       * =========================
       */
      case "message":
        console.log("💬 Message:", data);
        break;

      /**
       * =========================
       * UNKNOWN ACTIONS
       * =========================
       */
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
  console.log(`🚀 Imperium‑compatible WebSocket running on port ${PORT}`);
});
