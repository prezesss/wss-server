const WebSocket = require('ws');
const cbor = require('cbor');

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('Mirror WSS server starting...');

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[NEW CLIENT] Connected from ${clientIp}`);

    ws.on('message', (data, isBinary) => {
        if (!isBinary) {
            console.log('[TEXT]', data.toString());
            return;
        }

        const hex = data.toString('hex').slice(0, 200) + (data.length > 100 ? '...' : '');
        console.log('[BINARY] Hex (partial):', hex);

        try {
            const decoded = cbor.decode(data);
            console.log('[DECODED]', JSON.stringify(decoded, null, 2));
        } catch (e) {
            console.log('[DECODE ERROR]', e.message);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[CLIENT DISCONNECTED] Code: ${code}, Reason: ${reason || 'none'}`);
    });

    ws.on('error', (err) => {
        console.error('[ERROR]', err.message);
    });
});

console.log('Mirror server ready. Listening for Imperium traffic...');
