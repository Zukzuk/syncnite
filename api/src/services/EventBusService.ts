// src/utils/eventBus.ts
import { EventEmitter } from "node:events";

export type BusEvent = { type: string; data: any };

export function createEventBus(bufferMax = 200) {
    const ee = new EventEmitter();
    const buffer: BusEvent[] = [];

    function push(ev: BusEvent) {
        buffer.push(ev);
        if (buffer.length > bufferMax) buffer.shift();
        ee.emit("event", ev);
    }

    return {
        publish: push,
        subscribe: (onEv: (e: BusEvent) => void) => {
            // replay
            buffer.forEach(onEv);
            ee.on("event", onEv);
            return () => ee.off("event", onEv);
        },
    };
}
