const http = require("http");
const WebSocket = require("ws");

// Create a basic HTTP server
const server = http.createServer();

// Create the WebSocket server on top of the HTTP server
const wss = new WebSocket.Server({ server });

// Handle new WebSocket connections
wss.on("connection", (socket) => {
  console.log("🔌 Client connected");

  // Send a welcome message to the client
  socket.send(JSON.stringify({
    action: "welcome",
    data: "Connected to WebSocket server"
  }));

  // Handle incoming messages
  socket.on("message", (message) => {
    console.log("📨 Received:", message);

    // Echo back the message
    socket.send(JSON.stringify({
      action: "echo",
      data: message
    }));
  });

  // Handle disconnection
  socket.on("close", () => {
    console.log("❌ Client disconnected");
  });
});

// Use the port provided by Render, or 3000 locally
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
