# WebRTC-Server-Client-Datachannel
This library is a first attempt at making the RTCDataChannel a bit easier to implement in a server-client communication model.  

# Usage
```bash
git clone https://github.com/Efoi/WebRTC-Server-Client-Datachannel.git  
cp -r WebRTC-Server-Client-Datachannel/src/rtcpc <Your own project path>
```
Here is a server sided example, using express.
```javascript
const { RtcpcServer } = require("./rtcpc/RTCServer");
const { createServer } = require('http');
const { Server } = require('ws');
const express = require('express');

const app = express();
const server = createServer(app);

/**
 * @type {RtcpcServer}
 */
let pc = {};

/**
 * @type {RTCConfiguration}
 */
const pcConf = { required: {
    "video": false,
    "audio": false
  },
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  "optional": [{ DtlsSrtpKeyAgreement: true }]
}; 

const dataChannelTCPLike = {
  label: "tcp",
  config: {
    ordered: true,
    maxRetransmits: 10,
    binaryType: "blob"
  }
};

const dataChannelUDPLike = {
  label: "udp",
  config: {
    ordered: false,
    maxRetransmits: 0,
    binaryType: "blob"
  }
};

server.listen(8080, () => {
  const address = server.address();
  console.log(`Server running at ${address.port}`);
});

new Server({ server }).on('connection', async ws => {

  pc = new RtcpcServer(ws, pcConf, [dataChannelTCPLike, dataChannelUDPLike]);
  await pc.create();

  pc.tcp.onmessage = (event) => {
    console.log(`got 'tcp'. ${event.data}`);
  };
  pc.udp.onmessage = (event) => {
    console.log(`got 'udp'. ${event.data}`);
  };
});
```

Your client can then have code like this to accept and send some strings to the RTCDatachannels:
```javascript
import { RtcpcClient } from "./rtcpc/RTCClient";

/**
 * @type {RtcpcClient}
 */
let pc = {};

/**
 * @type {RTCConfiguration}
 */
const pcConf = { 
  required: {
    "video": false,
    "audio": false
  },
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  "optional": [{ DtlsSrtpKeyAgreement: true }]
}; 

const dataChannelTCPLike = {label: "tcp"};
const dataChannelUDPLike = {label: "udp"};

async function main() {
  try {
    console.log("opening websocket");
    const ws = new WebSocket('ws://' + "localhost" + ':8080');
    await onOpen(ws);

    pc = new RtcpcClient(ws, pcConf,[dataChannelTCPLike, dataChannelUDPLike]);
    await pc.create();

    pc.tcp.send("AllreadyFromTCP");
    pc.udp.send("AllreadyFromUDP");

    pc.tcp.onmessage = (event)=>{
      console.log("got 'tcp'.", event.data);
    };

    pc.udp.onmessage = (event)=>{
      console.log("got 'udp'.", event.data);
    };

    setInterval(() => {
        console.log("trying to send hello from tcp");
        pc.tcp.send("Hello from client TCP");

        console.log("trying to send hello from UDP");
        pc.udp.send("Hello from client UDP");

    }, 5000);
  } catch (error) {
    console.log(error);
  }
}

async function onOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onclose = () => reject(new Error('WebSocket closed'));
  });
}

main();
```
