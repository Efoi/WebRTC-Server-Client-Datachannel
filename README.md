# WebRTC-Server-Client-Datachannel
This library is a first attempt at making the RTCDataChannel a bit easier to implement in a server-client communication model.  

# Get Started
```bash
npm i webrtc-server-client-datachannel --save
```

# Example
A config file that is loaded to both client and server named rtc.config.js perhaps..
```javascript
module.exports.rtcConfig = {
  RTCPeerConnectionConf: { 
    required: {
      video: false,
      audio: false
    },
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    optional: [
      { DtlsSrtpKeyAgreement: true },
      { RtpDataChannels: true }] //Apparently this may make firefox compatible.
  },
  datachannels:
  [{
    label: "tcp",
    config: {
      ordered: true,
      maxRetransmits: 10,
      binaryType: "blob"
    }
  },{
    label: "udp",
    config: {
      ordered: false,
      maxRetransmits: 0,
      binaryType: "blob"
    }
  }]
}
```

Server side with express
```javascript
const { RTCServer } = require('webrtc-server-client-datachannel');
const { createServer } = require('http');
const { Server } = require('ws');
const express = require('express');

const { rtcConfig } = require('./rtc.config');

const app = express();
const server = createServer(app);


server.listen(8080, () => {
  const address = server.address();
  console.log(`Server running at ${address.port}`);
});

new Server({ server }).on('connection', async ws => {

  let pc = new RTCServer(ws, rtcConfig.RTCPeerConnectionConf, rtcConfig.datachannels);
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
import { RTCClient } from "webrtc-server-client-datachannel";

import { rtcConfig } from './rtc.config';

async function main() {
  try {
    console.log("opening websocket");
    const ws = new WebSocket('ws://' + "localhost" + ':8080');
    await onOpen(ws);

    let pc = new RTCClient(ws, rtcConfig.RTCPeerConnectionConf, rtcConfig.datachannels);
    await pc.create();

    pc.tcp.send("AllReadyFromTCP");
    pc.udp.send("AllReadyFromUDP");

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

# Limitations
The RTCPeerConnection is not working the same way in all browsers, and alot of it is experimental technology!   
Please reply with compatability issues if you find some.  
Tested with Chromium, Electron and Firefox.
  
It is important that the RTCConfiguration is equal, so normally split it into a seperate file and import the same configuration to both client and server. This is due to making the datachannels negotiated beforehand. It seems this was needed for firefox to not destroy the objects after creation.  

# Known bugs
Electron reports an error message in console (not web console, but from electron launch). This is a non issue, described here:  
https://bugs.chromium.org/p/webrtc/issues/detail?id=7381&desc=3  
  

