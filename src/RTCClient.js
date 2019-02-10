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
        console.log("creating rtcpc");
        super(ws, config);
        this.datachannels = datachannels;
        this.openDcPromises = [];
        this.datachannels.forEach(element => {
            element.openResolve = ()=>{};
            element.openReject = ()=>{};
            element.openPromise = new Promise((resolve, reject)=>{
                element.openResolve = resolve;
                element.openReject = reject;
            });
            this.openDcPromises.push(element.openPromise);
        });
        this.pc.ondatachannel = (ev)=>{
            this.datachannels.forEach(element => {
                if (element.label==ev.channel.label){
                    element.openResolve();
                    this[element.label]=ev.channel;
                }
            });
        };
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
        console.log("initiating handshake");
        await ClientRecieveOffer(this.pc, this.ws);
        await Promise.all(this.queuedCandidates.splice(0).map(async candidate => {
            console.log("resolving candidates");
            await pc.addIceCandidate(candidate);
        }));
        console.log("waiting for datachannels");
        await Promise.all(this.openDcPromises);
        console.log("Datachannels opened");
    }
}