// ─────────────────────────────────────────────────────────────
// FILE: src/mill/MillHubFrame.tsx
// Hosts the Mill Hub page (exact Process House ERP artifact) full-screen.
//   native → react-native-webview (messages via window.ReactNativeWebView)
//   web    → <iframe srcDoc>      (messages via window.parent.postMessage)
// Two-way: the page asks for data ({type:'api', id, action, body}); MillShell
// fetches it through apig → Sudamo → Mills and answers with reply(id, result).
// ─────────────────────────────────────────────────────────────
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export type MillPageMessage =
  | { type: 'logout' }
  | { type: 'mill_off' }
  | { type: 'refresh' }
  | { type: 'toast'; text: string }
  | { type: 'share'; text: string }
  | { type: 'api'; id: number; action: string; body?: Record<string, any> };

export type MillHubFrameHandle = { reply: (id: number, result: any) => void };

type Props = { html: string; onMessage: (m: MillPageMessage) => void };

const NAV = '#1e1b4b';

function parse(raw: unknown): MillPageMessage | null {
  try {
    const m = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (m && typeof m === 'object' && typeof (m as any).type === 'string') return m as MillPageMessage;
  } catch {
    /* ignore */
  }
  return null;
}

const WebFrame = forwardRef<MillHubFrameHandle, Props>(function WebFrame({ html, onMessage }, handle) {
  const ref = useRef<any>(null);
  useImperativeHandle(handle, () => ({
    reply: (id, result) => {
      try { ref.current?.contentWindow?.postMessage({ __millReply: 1, payload: { id, result } }, '*'); } catch { /* frame gone */ }
    },
  }));
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      // only our own frame
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      const d: any = e.data;
      if (!d || d.__mill !== 1) return;
      const m = parse(d.msg);
      if (m) onMessage(m);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onMessage]);

  return React.createElement('iframe', {
    ref,
    title: 'Mill Hub',
    srcDoc: html,
    style: { border: 'none', width: '100%', height: '100%', display: 'block', background: NAV },
    sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms allow-downloads',
  });
});

export const MillHubFrame = forwardRef<MillHubFrameHandle, Props>(function MillHubFrame({ html, onMessage }, handle) {
  const webRef = useRef<WebView>(null);
  const frameRef = useRef<MillHubFrameHandle>(null);
  useImperativeHandle(handle, () => ({
    reply: (id, result) => {
      if (Platform.OS === 'web') { frameRef.current?.reply(id, result); return; }
      const js = `window.__millReply && window.__millReply(${JSON.stringify({ id, result }).replace(/</g, '\\u003c')}); true;`;
      webRef.current?.injectJavaScript(js);
    },
  }));

  if (Platform.OS === 'web') {
    return (
      <View style={s.fill}>
        <WebFrame ref={frameRef} html={html} onMessage={onMessage} />
      </View>
    );
  }
  return (
    <WebView
      ref={webRef}
      style={s.fill}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://apig.tms-webapp.com/' }}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      allowsBackForwardNavigationGestures={false}
      startInLoadingState
      renderLoading={() => (
        <View style={[s.fill, s.center]}>
          <ActivityIndicator color="#5eead4" size="large" />
        </View>
      )}
      onMessage={(e) => {
        const m = parse(e.nativeEvent.data);
        if (m) onMessage(m);
      }}
      // links inside the page never navigate the shell away
      onShouldStartLoadWithRequest={(req) => req.url.startsWith('about:') || req.url.startsWith('https://apig.tms-webapp.com') || req.url.startsWith('data:')}
    />
  );
});

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: NAV },
  center: { alignItems: 'center', justifyContent: 'center' },
});
