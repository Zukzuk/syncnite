import { EventEmitter } from "node:events";

export type BusEvent = { type: string; data: any };

export const SyncBus = createEventBus(200);

function createEventBus(bufferMax = 200) {
    const ee = new EventEmitter();
    const buffer: BusEvent[] = [];
    const publish = (ev: BusEvent) => {
        buffer.push(ev);
        if (buffer.length > bufferMax) buffer.shift();
        ee.emit("event", ev);
    };
    const subscribe = (onEv: (e: BusEvent) => void) => {
        buffer.forEach(onEv);
        ee.on("event", onEv);
        return () => ee.off("event", onEv);
    };
    return { publish, subscribe };
}
