// ─────────────────────────────────────────────────────────────
// FILE: src/core/crash/ScreenErrorBoundary.tsx
//
// Crash protection for Android / iOS / web.
//
//   ScreenErrorBoundary   catches an error thrown while a screen (or one
//                         block of a screen) is drawn and shows a small
//                         "Try again" card instead of closing the app.
//   SafeBlock             same thing for one part of a screen (a chart, a
//                         card): only that part is replaced, the rest of the
//                         screen keeps working.
//   screenGuard           ready-made `screenLayout` for Stack / Tabs.
//   RouteErrorFallback    expo-router `ErrorBoundary` export for a route file.
//   installCrashGuard()   last line of defence: an error thrown outside
//                         drawing (a button handler, a timer, a promise) is
//                         logged and the app keeps running. In a release
//                         build React Native would otherwise close the app.
//
// Nothing here changes what a screen does — it only decides what is shown
// when a screen fails.
// ─────────────────────────────────────────────────────────────
import { T } from '@/src/theme';
import type { ErrorBoundaryProps } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type BoundaryProps = {
  children: React.ReactNode;
  /** shown in the card title: "Unable to show <name>" */
  name?: string;
  /** small inline note (for one block of a screen) instead of a full card */
  compact?: boolean;
};

type BoundaryState = { error: Error | null; attempt: number };

function messageOf(error: unknown): string {
  try {
    if (error instanceof Error && error.message) return String(error.message).slice(0, 300);
    if (typeof error === 'string') return error.slice(0, 300);
  } catch {
    // fall through
  }
  return 'An unexpected error occurred.';
}

export class ScreenErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> {
    return { error: error instanceof Error ? error : new Error(messageOf(error)) };
  }

  componentDidCatch(error: unknown, info: unknown) {
    try {
      console.error('[ScreenErrorBoundary]', this.props.name || 'screen', error, info);
    } catch {
      // logging must never throw
    }
  }

  retry = () => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }));

  render() {
    const { error, attempt } = this.state;
    if (!error) {
      // keyed on the attempt so "Try again" rebuilds the failed part cleanly
      return <React.Fragment key={attempt}>{this.props.children}</React.Fragment>;
    }

    if (this.props.compact) {
      return (
        <View style={st.inline}>
          <Text style={st.inlineText} numberOfLines={2}>
            {this.props.name ? `${this.props.name} could not be shown.` : 'This section could not be shown.'}
          </Text>
          <TouchableOpacity onPress={this.retry} activeOpacity={0.8} style={st.inlineBtn} accessibilityRole="button">
            <Text style={st.inlineBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return <ErrorCard title={this.props.name ? `Unable to show ${this.props.name}` : 'Something went wrong on this screen'} message={messageOf(error)} onRetry={this.retry} />;
  }
}

/** One part of a screen: a failure here never takes the screen down. */
export function SafeBlock({ children, name }: { children: React.ReactNode; name?: string }) {
  return (
    <ScreenErrorBoundary compact name={name}>
      {children}
    </ScreenErrorBoundary>
  );
}

/** `screenLayout` for <Stack> / <Tabs>: every screen gets its own boundary. */
export function screenGuard({ children }: { children: React.ReactNode }) {
  return <ScreenErrorBoundary>{children}</ScreenErrorBoundary>;
}

/** expo-router: `export { RouteErrorFallback as ErrorBoundary }` in a route file. */
export function RouteErrorFallback({ error, retry }: ErrorBoundaryProps) {
  return <ErrorCard title="Something went wrong" message={messageOf(error)} onRetry={retry} />;
}

function ErrorCard({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <View style={st.page}>
      <View style={st.card}>
        <View style={st.icon}>
          <Text style={st.iconText}>!</Text>
        </View>
        <Text style={st.title}>{title}</Text>
        <Text style={st.message}>The app is still running. Tap “Try again”, or open another screen from the menu.</Text>
        <Text style={st.detail} numberOfLines={4}>
          {message}
        </Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Try again" activeOpacity={0.82} onPress={onRetry} style={st.button}>
          <Text style={st.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

let installed = false;

/**
 * Keeps the app open when JavaScript throws outside of drawing.
 * Development builds keep the normal red error screen.
 */
export function installCrashGuard() {
  if (installed) return;
  installed = true;
  try {
    const g: any = globalThis as any;
    const utils = g?.ErrorUtils;
    if (!utils || typeof utils.setGlobalHandler !== 'function') return; // web
    const previous = typeof utils.getGlobalHandler === 'function' ? utils.getGlobalHandler() : null;
    utils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      try {
        console.error('[CrashGuard]', isFatal ? 'fatal' : 'error', error);
      } catch {
        // ignore
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__ && typeof previous === 'function') {
        previous(error, isFatal);
      }
      // release build: do not pass a fatal error on — that is what closes the app
    });
  } catch {
    // never let the guard itself break start-up
  }
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg, justifyContent: 'center', padding: 22 },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  icon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FDECEC', alignItems: 'center', justifyContent: 'center' },
  iconText: { color: T.red, fontWeight: '900', fontSize: 22 },
  title: { marginTop: 14, color: T.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  message: { marginTop: 8, color: T.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  detail: { marginTop: 10, color: T.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  button: {
    marginTop: 18,
    minWidth: 132,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: T.nav,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  inlineText: { flex: 1, minWidth: 0, color: T.muted, fontSize: 12, fontWeight: '600' },
  inlineBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: T.nav },
  inlineBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
