const { getOffer, onCandidate, Rtcpc } = require("./common");

async function ClientRecieveOffer(pc, ws) {
    try {
        console.log("waiting for offer");
        const offer = await getOffer(ws);
        console.log("recieved offer");
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await ws.send(JSON.stringify(answer));
        console.log("sendt reply");
    } catch (error) {
        console.error(error.stack || error.message || error);
        ws.close();
    }
}

/**
 * Creates the client side.
 */
module.exports.RTCClient = class RtcpcClient extends Rtcpc {
    /**
     * Creates the client side.
     * @param {WebSocket} ws 
     * @param {RTCConfiguration} config
     * @param {[config]} datachannels
     */
    constructor(ws, config, datachannels) {
        super(ws, config, datachannels);
    }

    /**
     * Waits for server to send candidate, handshakes, and awaits all datachannels to become active.
     */
    async create() {
        onCandidate(this.ws, async candidate => {
            console.log("got a candidate");
            if (!this.pc.remoteDescription) {
                this.queuedCandidates.push(candidate);
                return;
            }
            await this.pc.addIceCandidate(candidate);
        }
        );
        await ClientRecieveOffer(this.pc, this.ws);
        await Promise.all(this.queuedCandidates.splice(0).map(async candidate => {
            console.log("resolving candidates");
            await this.pc.addIceCandidate(candidate);
        }));
        await Promise.all(this.openPromises);
        console.log("Datachannels opened");
    }
}