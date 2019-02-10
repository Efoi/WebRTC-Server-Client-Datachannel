import { getAnswer, onCandidate, Rtcpc } from "./common";
import { RTCPeerConnection } from 'wrtc';

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
class RtcpcServer extends Rtcpc {
    /**
     * Constructor. Adds Datachannels.
     * @param {WebSocket} ws 
     * @param {RTCConfiguration} config
     * @param {[{"label":String, config: { ordered: Boolean, maxRetransmits: Uint32Array, binaryType: "blob || arraybuffer"}}]} datachannels
     * 
     * @example
     * let aTextDatachannel = {label:"TextReliable",config:{ordered:true,maxRetransmits:10,binaryType:"blob"}};
     * let aPositionDataChannel = {label:"PosUnreliable",config:{ordered:false, maxRetransmits:0, binaryType:"arraybuffer"}};
     * let aConnection = new RtcpcServer(aWebsocket, [aTextDatachannel, aPositionDataChannel]);
     * await aConnection.create();
     * aConnection.TextReliable.send("Hi, channels are open!");
     * aConnection.PosUnreliable.send(arraybufferPosUpdate);
     */
    constructor(ws, config, datachannels) {
        super(ws, config);
        this.datachannels=datachannels;
        this.openPromises=[];
        this.datachannels.forEach(element => {
            element.onOpenResolve=()=>{};
            element.onOpenReject=()=>{};
            element.onOpenPromise=new Promise((resolve,reject)=>{
                element.onOpenResolve = resolve;
                element.onOpenReject = reject;
            });
            this.openPromises.push(element.onOpenPromise);
            this[element.label]=this.pc.createDataChannel(element.label, element.config);
            this[element.label].onopen = element.onOpenResolve;
        });
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
            await pc.addIceCandidate(candidate);
        }));
        await Promise.all(this.openPromises);
    }
}


export { RtcpcServer };