const WebSocket = require('ws');
const cbor = require('cbor');

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('Mirror WSS server starting... (filtered mode)');

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[NEW CLIENT] Connected from ${clientIp}`);

    ws.on('message', (data, isBinary) => {
        if (!isBinary) {
            console.log('[TEXT]', data.toString());
            return;
        }

        try {
            const decoded = cbor.decode(data);

            // === FILTER OUT NOISE ===
            if (decoded.type === 'engine' || decoded.type === 'ack' || decoded.type === 'online') {
                return;  // Ignore these – no log
            }

            // Log everything else (move, captcha, queue, init, etc.)
            console.log('[IMPORTANT]', JSON.stringify(decoded, null, 2));

            const hex = data.toString('hex').slice(0, 200) + (data.length > 100 ? '...' : '');
            console.log('[HEX partial]:', hex);
        } catch (e) {
            // If not CBOR or decode fails, still show hex
            const hex = data.toString('hex').slice(0, 200) + '...';
            console.log('[RAW BINARY (non-CBOR?)] Hex:', hex);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[CLIENT DISCONNECTED] Code: ${code}`);
    });
});

console.log('Mirror ready – noise filtered out!');
