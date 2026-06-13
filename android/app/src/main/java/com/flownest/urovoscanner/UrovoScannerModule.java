package com.anonymous.FlowNest.urovoscanner;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.device.ScanManager;            // from Urovo platform_sdk jar

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/**
 * Urovo hardware scanner bridge — hardened for blind deployment.
 *
 * Design rules:
 *  1. The broadcast receiver is ALWAYS registered, even if every
 *     ScanManager call fails. If the device's Scanner Settings app is
 *     set to intent output manually, scans still arrive.
 *  2. Every ScanManager call is isolated in its own try/catch, so one
 *     missing method on a given firmware can't break the rest.
 *  3. getDiagnostics() reports exactly what worked, for remote debugging.
 */
public class UrovoScannerModule extends ReactContextBaseJavaModule {

    public static final String EVENT_NAME = "UrovoScan";

    // Standard Urovo broadcast contract + known variants
    private static final String[] DECODE_ACTIONS = {
            "android.intent.ACTION_DECODE_DATA",   // factory default
            "android.intent.action.DECODE_DATA",   // seen on some firmware
            "com.android.server.scannerservice.broadcast" // legacy variant
    };
    private static final String[] STRING_TAGS = {
            "barcode_string", "scannerdata", "data", "barcode"
    };
    private static final String DECODE_DATA_TAG = "barcode";   // byte[]
    private static final String BARCODE_LENGTH_TAG = "length";
    private static final String BARCODE_TYPE_TAG = "barcodeType";

    private final ReactApplicationContext reactContext;
    private ScanManager scanManager;
    private boolean receiverRegistered = false;

    // diagnostics
    private String diagManagerInit = "not_tried";
    private String diagOpen = "not_tried";
    private String diagOutputMode = "not_tried";
    private String diagTrigger = "not_tried";
    private int diagScansReceived = 0;

    private final BroadcastReceiver scanReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            try {
                String value = null;

                for (String tag : STRING_TAGS) {
                    Object extra = intent.getExtras() != null ? intent.getExtras().get(tag) : null;
                    if (extra instanceof String && !((String) extra).isEmpty()) {
                        value = (String) extra;
                        break;
                    }
                }

                if (value == null || value.isEmpty()) {
                    byte[] data = intent.getByteArrayExtra(DECODE_DATA_TAG);
                    int len = intent.getIntExtra(BARCODE_LENGTH_TAG, data != null ? data.length : 0);
                    if (data != null && len > 0) {
                        value = new String(data, 0, Math.min(len, data.length), "UTF-8");
                    }
                }

                if (value == null || value.isEmpty()) return;

                diagScansReceived++;

                WritableMap map = Arguments.createMap();
                map.putString("value", value);
                map.putInt("type", intent.getIntExtra(BARCODE_TYPE_TAG, -1));

                reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit(EVENT_NAME, map);
            } catch (Exception ignored) { }
        }
    };

    public UrovoScannerModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return "UrovoScanner";
    }

    private void registerReceiverIfNeeded() {
        if (receiverRegistered) return;
        try {
            IntentFilter filter = new IntentFilter();
            for (String action : DECODE_ACTIONS) filter.addAction(action);

            if (android.os.Build.VERSION.SDK_INT >= 33) {
                reactContext.registerReceiver(scanReceiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                reactContext.registerReceiver(scanReceiver, filter);
            }
            receiverRegistered = true;
        } catch (Exception ignored) { }
    }

    @ReactMethod
    public void isAvailable(Promise promise) {
        try {
            if (scanManager == null) scanManager = new ScanManager();
            promise.resolve(true);
        } catch (Throwable t) {
            promise.resolve(false);
        }
    }

    /**
     * Best-effort start. Each step is independent; the receiver is
     * registered no matter what. Resolves a map describing what worked
     * so JS can show an accurate status pill.
     */
    @ReactMethod
    public void start(Promise promise) {
        // Step 0 — always listen for broadcasts
        registerReceiverIfNeeded();

        // Step 1 — construct manager (fails on non-Urovo)
        try {
            if (scanManager == null) scanManager = new ScanManager();
            diagManagerInit = "ok";
        } catch (Throwable t) {
            diagManagerInit = "fail: " + t.getClass().getSimpleName();
        }

        // Step 2..4 — each isolated so one miss doesn't kill the rest
        if (scanManager != null) {
            try { scanManager.openScanner(); diagOpen = "ok"; }
            catch (Throwable t) { diagOpen = "fail: " + t.getClass().getSimpleName(); }

            try { scanManager.switchOutputMode(0); diagOutputMode = "ok"; }
            catch (Throwable t) { diagOutputMode = "fail: " + t.getClass().getSimpleName(); }

            try { scanManager.unlockTriggler(); diagTrigger = "ok"; }
            catch (Throwable t) { diagTrigger = "fail: " + t.getClass().getSimpleName(); }
        }

        WritableMap result = Arguments.createMap();
        result.putBoolean("receiverRegistered", receiverRegistered);
        result.putBoolean("managerAvailable", "ok".equals(diagManagerInit));
        result.putBoolean("intentModeSet", "ok".equals(diagOutputMode));
        promise.resolve(result);
    }

    @ReactMethod
    public void stop(Promise promise) {
        try {
            if (receiverRegistered) {
                reactContext.unregisterReceiver(scanReceiver);
                receiverRegistered = false;
            }
        } catch (Exception ignored) { }

        if (scanManager != null) {
            try { scanManager.switchOutputMode(1); } catch (Throwable ignored) { }
        }
        promise.resolve(true);
    }

    /** Fire the laser from an on-screen button (same as trigger pull). */
    @ReactMethod
    public void triggerScan() {
        if (scanManager == null) return;
        try { scanManager.startDecode(); } catch (Throwable ignored) { }
    }

    /** Remote-debugging helper: exactly which steps worked. */
    @ReactMethod
    public void getDiagnostics(Promise promise) {
        WritableMap m = Arguments.createMap();
        m.putString("managerInit", diagManagerInit);
        m.putString("openScanner", diagOpen);
        m.putString("switchOutputMode", diagOutputMode);
        m.putString("unlockTrigger", diagTrigger);
        m.putBoolean("receiverRegistered", receiverRegistered);
        m.putInt("scansReceived", diagScansReceived);
        m.putString("model", android.os.Build.MODEL);
        m.putString("manufacturer", android.os.Build.MANUFACTURER);
        promise.resolve(m);
    }

    @ReactMethod
    public void addListener(String eventName) { }

    @ReactMethod
    public void removeListeners(double count) { }

    @Override
    public void onCatalystInstanceDestroy() {
        try {
            if (receiverRegistered) {
                reactContext.unregisterReceiver(scanReceiver);
                receiverRegistered = false;
            }
        } catch (Exception ignored) { }
        super.onCatalystInstanceDestroy();
    }
}
