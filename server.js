const WebSocket = require('ws');
const http = require('http');
const cbor = require('cbor-js');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

function sendCbor(ws, obj) {
  try {
    const encoded = cbor.encode(obj);
    ws.send(encoded);
  } catch (e) {
    console.error("❌ Failed to send CBOR:", e);
  }
}

wss.on('connection', function connection(ws) {
  console.log('✅ New WebSocket connection');

  ws.on('message', function incoming(message) {
    try {
      const json = JSON.parse(message);

      console.log('📩 Message received:', json);

      switch (json.action) {
        case 'handshake':
          console.log('🤝 Handshake received:', json.data);

          // Send config (this can be customized)
          sendCbor(ws, {
            action: "config",
            data: {
              version: "2.1.9",
              theme: "default",
              features: {
                autoHeal: true,
                autoLoot: true,
                autoResp: false
              }
            }
          });

          // Send license
          sendCbor(ws, {
            action: "license",
            data: {
              valid: true,
              tier: "pro",
              expires: "2030-12-31"
            }
          });

          // Send pong
          sendCbor(ws, {
            action: "pong",
            data: {
              timestamp: Date.now()
            }
          });

          break;

        case 'ping':
          sendCbor(ws, {
            action: "pong",
            data: {
              timestamp: Date.now()
            }
          });
          break;

        case 'request-config':
          sendCbor(ws, {
            action: "config",
            data: {
              version: "2.1.9",
              theme: "default",
              features: {
                autoHeal: true,
                autoLoot: true,
                autoResp: false
              }
            }
          });
          break;

        case 'toggle-feature':
          const feature = json.data.feature;
          const enabled = json.data.enabled;
          console.log(`🛠 Feature toggled: ${feature} = ${enabled}`);
          break;

        default:
          console.log("❓ Unknown action:", json.action);
      }
    } catch (e) {
      console.error('❌ Failed to parse message:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
});
