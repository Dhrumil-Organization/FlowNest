import { useEffect, useState } from 'react';

/**
 * Tiny pub/sub that carries "chees typed in the entry form" to the progress bar in the carton card.
 * Only the subscribed component (CartonProgress) re-renders when the number changes;
 * the screen itself does NOT re-render on every keystroke.
 */
export type EntryBus = { value: number; listeners: Set<() => void>; set: (n: number) => void };

export const createEntryBus = (): EntryBus => {
    const bus: EntryBus = {
        value: 0,
        listeners: new Set(),
        set(n: number) {
            if (n === bus.value) return;
            bus.value = n;
            bus.listeners.forEach(l => l());
        },
    };
    return bus;
};

export const useEntryBus = (bus: EntryBus): number => {
    const [v, setV] = useState(bus.value);
    useEffect(() => {
        const l = () => setV(bus.value);
        bus.listeners.add(l);
        l();
        return () => { bus.listeners.delete(l); };
    }, [bus]);
    return v;
};
