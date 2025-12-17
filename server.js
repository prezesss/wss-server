const WebSocket = require('ws');
const cbor = require('cbor');

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

console.log('Mirror WSS server starting... (clean mode - no noise)');

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    console.log(`[NEW CLIENT] Connected from ${clientIp}`);

    ws.on('message', (data, isBinary) => {
        if (!isBinary) {
            console.log('[TEXT]', data.toString());
            return;
        }

        let decoded;
        try {
            decoded = cbor.decode(data);
        } catch (e) {
            const hex = data.toString('hex').slice(0, 200) + (data.length > 100 ? '...' : '');
            console.log('[RAW BINARY]', hex);
            return;
        }

        // Ignore noisy / frequent messages - silent, no logging
        if (decoded.type === 'engine' || 
            decoded.type === 'ack' || 
            decoded.type === 'online' || 
            decoded.type === 'move') {
            return;  // Completely silent
        }

        // Show everything else clearly
        console.log('\n📩 IMPORTANT MESSAGE:');
        console.log(JSON.stringify(decoded, null, 2));

        const hex = data.toString('hex').slice(0, 200) + (data.length > 100 ? '...' : '');
        console.log('Hex (partial):', hex);
        console.log('---');
    });

    ws.on('close', (code) => {
        console.log(`[CLIENT DISCONNECTED] Code: ${code}`);
    });

    ws.on('error', (err) => {
        console.error('[SERVER ERROR]', err.message);
    });
});

console.log('Mirror server ready! Only important messages will appear.');
