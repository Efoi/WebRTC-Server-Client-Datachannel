'use strict';

const { RtcpcServer } = require("./server/RTCServer");
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

function sendping() {
  if (pc.tcp && pc.tcp.readyState=="open") {
    console.log("Sending hello over tcp.")
    pc.tcp.send("Hello1");
  }
  if (pc.udp && pc.udp.readyState=="open") {
    console.log("Sending hello over udp.")
    pc.udp.send("Hello2");
  }
}

setInterval(sendping, 1000);