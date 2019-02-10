'use strict';

const {
  RTCIceCandidate,
  RTCSessionDescription,
  RTCPeerConnection
} = require('wrtc');

/**
 * Creates a new RTCPeerConnection, negotiates tcp and udp channels.
 * make = new Rtcpc(ws); await make.create();"
 */
module.exports.Rtcpc = class Rtcpc {
  /**
   * Creates a new instance and initializes the RTCPeerConnection.
   * @param {WebSocket} ws 
   */
  constructor(ws, config) {
      this.isReady = false;
      /**
       * @type {RTCPeerConnection}
       */
      this.pc = new RTCPeerConnection(config);
      this.ws = ws;
      this.queuedCandidates = [];
      this.pc.onicecandidate = ({ candidate }) => {
          if (candidate) {
            ws.send(JSON.stringify({
              type: 'candidate',
              candidate
            }));
          }
      };
  }


}

function getMessage(ws, type) {
  return new Promise((resolve, reject) => {
    function onMessage({ data }) {
      try {
        const message = JSON.parse(data);
        if (message.type === type) {
          resolve(message);
        }
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    }

    function onClose() {
      reject(new Error('WebSocket closed'));
      cleanup();
    }

    function cleanup() {
      ws.removeEventListener('message', onMessage);
      ws.removeEventListener('close', onClose);
    }

    ws.addEventListener('message', onMessage);
    ws.addEventListener('close', onClose);
  });
}

module.exports.getOffer = async function getOffer(ws) {
  const offer = await getMessage(ws, 'offer');
  return new RTCSessionDescription(offer);
}

module.exports.getAnswer = async function getAnswer(ws) {
  const answer = await getMessage(ws, 'answer');
  return new RTCSessionDescription(answer);
}

module.exports.onCandidate = function onCandidate(ws, callback) {
  ws.addEventListener('message', ({ data }) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'candidate') {
        const candidate = new RTCIceCandidate(message.candidate);
        callback(candidate);
        return;
      }
    } catch (error) {
      // Do nothing.
    }
  });
}