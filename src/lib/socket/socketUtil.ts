
import { Socket } from "socket.io";
import * as ClientSocket from "socket.io-client";

export class SocketEmitter {
    private respTimeout: number;
    private retries: number;
    private event: string;
    private socket: Socket | ClientSocket.Socket;
    private maxRetry: number;
    private data: any;
    private ackReceived = false;
    private onDisconnected: () => void

    constructor(socket: Socket | ClientSocket.Socket, event: string, data: any, maxRetry: number, respTimeout: number, onDisconnected: () => void) {
        this.socket = socket;
        this.event = event;
        this.data = data;
        this.maxRetry = maxRetry || 3;
        this.respTimeout = respTimeout || 5000;
        this.retries = 0;
        this.onDisconnected = onDisconnected
    }

    emitWithRetry() {
        const timeout = setTimeout(() => {
            if (this.ackReceived) return;

            if (this.retries < this.maxRetry) {
                this.retries++;
                console.log(`Retrying (${this.event}:${JSON.stringify(this.data)}) (${this.retries}/${this.maxRetry})...`);
                this.emitWithRetry(); // 重新发送请求
            } else {
                console.log('Max retries reached, disconnecting...', this.event, this.data);
                this.socket.disconnect();
                this.onDisconnected()
            }
        }, this.respTimeout); // 每次等待 5 秒

        this.socket.emit(this.event, this.data, () => {
            this.ackReceived = true;
            clearTimeout(timeout);
        })

    }

    async emit() {
        while(this.retries < this.maxRetry) {
            this.retries ++;
            console.log(`Retrying (${this.event}:${JSON.stringify(this.data)}) (${this.retries}/${this.maxRetry})...`);
            try {
                const p = await this.promise();
                return;
            } catch (e) {
                
            }
        }

        console.log('Max retries reached, disconnecting...', this.event, this.data);
        this.socket.disconnect();
        this.onDisconnected()
    }

    promise() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.log('timeout exec, ', this.ackReceived)
                if (this.ackReceived) resolve(true);
                reject('timeout')
            }, this.respTimeout)
            this.socket.emit(this.event, this.data, () => {
                console.log("cb received")
                this.ackReceived = true;
                clearTimeout(timeout);
                resolve(true)
            })
        })
    }

    static getInstance(socket: Socket | ClientSocket.Socket, event: string, data: any, maxRetry: number, respTimeout: number, onDisconnected: () => void) {
        return new SocketEmitter(socket, event, data, maxRetry, respTimeout, onDisconnected);
    }
}

