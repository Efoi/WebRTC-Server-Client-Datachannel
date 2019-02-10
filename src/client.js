import { game } from "./client/phaser/game";
import { RtcpcClient } from "./rtcpc/RTCClient";
import { onOpen } from "./server/socket";



//const g = game(); // Do after login. Before on testing.
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