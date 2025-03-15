const createUserBtn = document.querySelector(".create-user");
const username = document.querySelector("#username");
const userContainer = document.querySelector(".username-input");
const allUsersList = document.querySelector("#allusers");
const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");
const endCallBtn = document.querySelector("#end-call-btn");
const socket = io();

let localStream;

let caller = [];

//singleton method to create peer connection
const PeerConnection = (function () {
  let peerConnection;
  const createPeerConnection = () => {
    const config = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };
    peerConnection = new RTCPeerConnection(config);

    // add local stream to peer connection
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
    // listen to remote stream and add to peer Connection
    peerConnection.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
    };
    // listen for ice candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("icecandidate", event.candidate);
      }
    };
    return peerConnection;
  };

  return {
    getInstance: () => {
      if (!peerConnection) {
        peerConnection = createPeerConnection();
      }
      return peerConnection;
    },
  };
})();

//handle browser events
createUserBtn.addEventListener("click", () => {
  if (username.value !== "") {
    socket.emit("join-user", username.value);
    userContainer.style.display = "none";
  }
});

endCallBtn.addEventListener("click", (e) => {
  socket.emit("call-ended", caller);
});

//handle socket events
socket.on("joined", (allUsers) => {
  console.log({ allUsers });

  const createUserHtml = () => {
    allUsersList.innerHTML = "";
    for (const user in allUsers) {
      const li = document.createElement("li");
      li.classList.add("user");
      li.style.backgroundColor = "#1f1f1f";
      li.style.color = "white";
      li.style.padding = "1rem";
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.borderRadius = "0.3rem";

      li.textContent = `${user} ${user === username.value ? "(You)" : ""}`;
      if (user !== username.value) {
        const button = document.createElement("button");
        button.classList.add("call-btn");
        button.addEventListener("click", (e) => {
          startCall(user);
        });
        const text = document.createTextNode("Call");
        button.appendChild(text);
        button.style.padding = "0.3rem 1.5rem";
        button.style.borderRadius = "0.2rem";
        button.style.backgroundColor = "#4CAF50";
        button.style.color = "white";
        button.style.border = "none";
        button.style.cursor = "pointer";
        button.style.fontSize = "1rem";
        button.style.fontWeight = "medium";
        li.appendChild(button);
      }
      allUsersList.appendChild(li);
    }
  };

  createUserHtml();
});

socket.on("offer", async ({ from, to, offer }) => {
  const pc = PeerConnection.getInstance();
  //set remote description
  await pc.setRemoteDescription(offer);
  //create answer
  const answer = await pc.createAnswer();
  console.log({ answer });
  await pc.setLocalDescription(answer);
  caller = [from, to];
  // send answer to caller
  socket.emit("answer", { from, to, answer: pc.localDescription });
});

socket.on("answer", async ({ from, to, answer }) => {
  const pc = PeerConnection.getInstance();
  await pc.setRemoteDescription(answer);
  // show end call btn
  endCallBtn.style.display = "block";
  socket.emit("end-call", { from, to });
  caller = [from, to];
});

socket.on("icecandidate", async (icecandidate) => {
  const pc = PeerConnection.getInstance();
  await pc.addIceCandidate(new RTCIceCandidate(icecandidate));
});

socket.on("end-call", ({ from, to }) => {
  endCallBtn.style.display = "block";
});

socket.on("call-ended", (caller) => {
  endCall();
});

// start call method

const startCall = async (user) => {
  console.log("calling", user);
  const pc = PeerConnection.getInstance();
  // make an offer he can't refuse ;)
  const offer = await pc.createOffer();
  console.log({ offer });
  await pc.setLocalDescription(offer);
  socket.emit("offer", {
    from: username.value,
    to: user,
    offer: pc.localDescription,
  });
};

//initiate app
const startMyVideo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    console.log({ stream });
    localStream = stream;
    localVideo.srcObject = stream;
  } catch (error) {
    console.log("error in getting video stream", error);
  }
};
const endCall = () => {
  const pc = PeerConnection.getInstance();
  if (pc) {
    pc.close();
    endCallBtn.style.display = "none";
  }
};

startMyVideo();
