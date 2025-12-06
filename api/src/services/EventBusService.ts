import { EventEmitter } from "node:events";
import { BusEvent } from "../types/types";

export const SyncBus = createEventBus(200);

function createEventBus(bufferMax = 200) {
    const ee = new EventEmitter();
    const buffer: BusEvent[] = [];

    /**
     * Publishes an event to the bus.
     * @param ev - event to publish
     */
    const publish = (ev: BusEvent) => {
        buffer.push(ev);
        if (buffer.length > bufferMax) buffer.shift();
        ee.emit("event", ev);
    };

    /**
     * Subscribes to events from the bus.
     * @param onEv - callback to invoke on each event
     * @returns unsubscribe function
     */
    const subscribe = (onEv: (e: BusEvent) => void) => {
        buffer.forEach(onEv);
        ee.on("event", onEv);
        return () => ee.off("event", onEv);
    };

    return { publish, subscribe };
}
