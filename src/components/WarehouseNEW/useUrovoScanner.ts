// FILE: src/components/WarehouseNEW/useUrovoScanner.ts
// Verbatim copy of legacy components/components/Warehouse/components/useUrovoScanner.ts
// (Urovo hardware scan engine bridge: NativeModules.UrovoScanner + "UrovoScan" events).
// No-op on iOS / web / devices without the native module, so it is web-safe.
import { useEffect, useRef, useState } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { UrovoScanner } = NativeModules;

export interface UrovoStatus {
    /** 'active'   — Urovo scan service configured, intent mode set
     *  'listening'— receiver registered but ScanManager unavailable
     *               (works if Scanner Settings output = intent)
     *  'none'     — not Android / module missing */
    state: 'active' | 'listening' | 'none';
}

/**
 * Subscribes to the Urovo hardware scan engine while mounted.
 * Returns a live status so the screen can show what's going on —
 * critical when someone else is holding the device.
 */
export function useUrovoScanner(onScan: (value: string) => void): UrovoStatus {
    const cbRef = useRef(onScan);
    cbRef.current = onScan;

    const [state, setState] = useState<UrovoStatus['state']>('none');

    useEffect(() => {
        if (Platform.OS !== 'android' || !UrovoScanner) return;

        let sub: { remove: () => void } | undefined;
        let mounted = true;

        (async () => {
            try {
                const emitter = new NativeEventEmitter(UrovoScanner);
                sub = emitter.addListener('UrovoScan', (e: { value?: string }) => {
                    if (e?.value) cbRef.current(e.value);
                });

                const res = await UrovoScanner.start();
                if (!mounted) return;

                if (res?.managerAvailable && res?.intentModeSet) setState('active');
                else if (res?.receiverRegistered) setState('listening');
                else setState('none');
            } catch {
                if (mounted) setState('none');
            }
        })();

        return () => {
            mounted = false;
            sub?.remove();
            UrovoScanner.stop().catch(() => {});
        };
    }, []);

    return { state };
}

/** Fire the laser from an on-screen button. */
export function triggerUrovoScan() {
    try { UrovoScanner?.triggerScan?.(); } catch { /* noop */ }
}

/** For remote debugging: ask the client to read this object to you. */
export async function getUrovoDiagnostics(): Promise<Record<string, unknown> | null> {
    try { return await UrovoScanner?.getDiagnostics?.(); } catch { return null; }
}
