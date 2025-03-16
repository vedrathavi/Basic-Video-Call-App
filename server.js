import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import path, { dirname, join } from "path";

const app = express();
const server = createServer(app);
const io = new Server(server);
const allUsers = {};

// get the current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// exposing public directory to the web
app.use(express.static("public"));

//handle incoming http requests
app.get("/", (req, res) => {
  console.log("Hello World");
  res.sendFile(join(__dirname, "/app/index.html"));
});

const PORT = process.env.PORT || 2000;


server.listen(PORT,"0.0.0.0", () => {
  console.log("server started");
});

// handle socket.io connection
io.on("connection", (socket) => {
  console.log(`a user connected to socket and socketID is ${socket.id}`);
  socket.on("join-user", (username) => {
    console.log(`user ${username} joined`);
    allUsers[username] = { username, id: socket.id };
    //inform everyone that a new user has joined
    io.emit("joined", allUsers);
  });

  socket.on("offer", ({ from, to, offer }) => {
    console.log({ from, to, offer });
    io.to(allUsers[to].id).emit("offer", { from, to, offer });
  });

  socket.on("answer", ({ from, to, answer }) => {
    console.log({ from, to, answer });
    io.to(allUsers[from].id).emit("answer", { from, to, answer });
  });

  socket.on("icecandidate", (icecandidate) => {
    console.log(icecandidate);
    socket.broadcast.emit("icecandidate", icecandidate);
  });

  socket.on("end-call", ({ from, to }) => {
    io.to(allUsers[to].id).emit("end-call", { from, to });
  });

  socket.on("call-ended", (caller) => {
    const [from, to] = caller;
    io.to(allUsers[from].id).emit("call-ended", caller);
    io.to(allUsers[to].id).emit("call-ended", caller);
  });
});
