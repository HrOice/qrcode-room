/* eslint-disable @typescript-eslint/no-explicit-any */

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
    private response: any;

    constructor(socket: Socket | ClientSocket.Socket, event: string, data: any, maxRetry: number, respTimeout: number, onDisconnected: () => void) {
        this.socket = socket;
        this.event = event;
        this.data = data;
        this.maxRetry = maxRetry || 3;
        this.respTimeout = respTimeout || 5000;
        this.retries = 0;
        this.onDisconnected = onDisconnected
    }



    async emit(cb?: (param: any)=>void) {
        while(this.retries < this.maxRetry) {
            this.retries ++;
            console.log(`Retrying (${this.event}:${JSON.stringify(this.data)}) (${this.retries}/${this.maxRetry})...`, this.socket.id);
            try {
                const p = await this.promise();
                cb?.(p)
                return p;
            } catch (e) {
                console.log('error', e);
            }
        }

        console.log('Max retries reached, disconnecting...', this.event, this.data);
        this.socket.disconnect();
        this.onDisconnected()
    }

    promise() {
        return Promise.race([
            // Socket 事件响应
            new Promise((resolve) => {
                this.socket.emit(this.event, this.data, (response: any) => {
                    this.response = response;
                    this.ackReceived = true;
                    resolve(response);
                });
            }),
            // 超时控制
            new Promise((_, reject) => 
                setTimeout(() => {
                    reject(new Error(`Event ${this.event} timeout after ${this.respTimeout}ms`));
                }, this.respTimeout)
            )
        ]);
    }

    static getInstance(socket: Socket | ClientSocket.Socket, event: string, data: any, maxRetry: number, respTimeout: number, onDisconnected: () => void) {
        return new SocketEmitter(socket, event, data, maxRetry, respTimeout, onDisconnected);
    }
}

