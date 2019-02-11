const { getAnswer, onCandidate, Rtcpc } =require('./common');
const { RTCPeerConnection } = require('wrtc');

/**
 * Creates an RTCPeerConnection Offer.
 * Sends the offer to websocket connection, and awaits answer.
 * @param {RTCPeerConnection} pc 
 * @param {WebSocket} ws 
 */
async function ServerCreateOffer(pc, ws) {
    try {
        var offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await ws.send(JSON.stringify(offer));
        var answer = await getAnswer(ws);
        await pc.setRemoteDescription(answer);
    } catch (error) {
        console.error(error.stack || error.message || error);
        ws.close();
    }
}

/**
 * Creates Server Side RTCPeerConnection.
 */
module.exports.RTCServer = class RtcpcServer extends Rtcpc {
    /**
     * Constructor. Adds Datachannels.
     * @param {WebSocket} ws 
     * @param {RTCConfiguration} config
     * @param {[{"label":String, config: { ordered: Boolean, maxRetransmits: Uint32Array, binaryType: "blob || arraybuffer"}}]} datachannels
     */
    constructor(ws, config, datachannels) {
        super(ws, config, datachannels);
    }
    /**
     * Handles handshaking and awaits all the datachannels to open.
     */
    async create () {
        onCandidate(this.ws, async candidate => {
            console.log("got a candidate");
            if (!this.pc.remoteDescription) {
                this.queuedCandidates.push(candidate);
                return;
            }
            await this.pc.addIceCandidate(candidate);
        }
        );
        console.log("initiating handshake");
        await ServerCreateOffer(this.pc, this.ws);
        await Promise.all(this.queuedCandidates.splice(0).map(async candidate => {
            console.log("resolving candidates");
            await this.pc.addIceCandidate(candidate);
        }));
        await Promise.all(this.openPromises);
    }
}