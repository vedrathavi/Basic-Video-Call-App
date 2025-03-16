

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import path, { dirname, join } from "path";
import cors from "cors";

// Setup __dirname
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Change this if needed
    methods: ["GET", "POST"],
  },
});

const allUsers = {};

// ✅ FIX: Call cors() correctly
app.use(cors());

// ✅ FIX: Serve frontend files properly
app.use(express.static(join(__dirname, "public")));

app.get("/", (req, res) => {
  console.log("Hello World");
  res.sendFile(join(__dirname, "/app/index.html"));
});

const PORT = process.env.PORT || 2000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on port ${PORT}`);
});

// Handle WebSocket connection
io.on("connection", (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on("join-user", (username) => {
    console.log(`User ${username} joined`);
    allUsers[username] = { username, id: socket.id };

    // Inform everyone about the new user
    io.emit("joined", allUsers);
  });

  socket.on("offer", ({ from, to, offer }) => {
    if (allUsers[to]) {
      // ✅ FIX: Check if `to` exists before emitting
      console.log({ from, to, offer });
      io.to(allUsers[to].id).emit("offer", { from, to, offer });
    }
  });

  socket.on("answer", ({ from, to, answer }) => {
    if (allUsers[from]) {
      // ✅ FIX: Check if `from` exists before emitting
      console.log({ from, to, answer });
      io.to(allUsers[from].id).emit("answer", { from, to, answer });
    }
  });

  socket.on("icecandidate", (icecandidate) => {
    console.log(icecandidate);
    socket.broadcast.emit("icecandidate", icecandidate);
  });

  socket.on("end-call", ({ from, to }) => {
    if (allUsers[to]) {
      io.to(allUsers[to].id).emit("end-call", { from, to });
    }
  });

  socket.on("call-ended", (caller) => {
    const [from, to] = caller;
    if (allUsers[from]) io.to(allUsers[from].id).emit("call-ended", caller);
    if (allUsers[to]) io.to(allUsers[to].id).emit("call-ended", caller);
  });

  socket.on("disconnect", () => {
    // Remove user from `allUsers` on disconnect
    for (let username in allUsers) {
      if (allUsers[username].id === socket.id) {
        console.log(`${username} disconnected`);
        delete allUsers[username];
        io.emit("joined", allUsers);
        break;
      }
    }
  });
});
