import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T } from '../../theme';
import type { SubDesign, PatternBand, ColorEntry } from '../../types';

/** Mobile port of the web `Swatch`.
 *  - Yarn-dyed subs render warp bands as vertical stripes and weft bands
 *    as semi-transparent horizontal stripes over them.
 *  - Piece-dyed subs (commercialName set) render a greige placeholder. */

function bandsFrom(pattern?: PatternBand[], colors?: ColorEntry[]): { hex: string; n: number }[] {
    if (pattern && pattern.length) {
        return pattern.map(b => ({ hex: b.hex ?? '#cccccc', n: Math.max(1, b.n) }));
    }
    if (colors && colors.length) {
        return colors.map(c => ({ hex: c.hex ?? '#cccccc', n: 1 }));
    }
    return [];
}

interface Props {
    sub?: SubDesign | null;
    size?: number;
}

export function SwatchView({ sub, size = 58 }: Props) {
    if (!sub) return null;

    // Piece-dyed colourway → fabric is woven greige; show greige placeholder
    if (sub.commercialName !== undefined) {
        return (
            <View style={[styles.box, styles.greige, { width: size, height: size }]}>
                <Text style={styles.greigeText}>GREIGE</Text>
            </View>
        );
    }

    const warp = bandsFrom(sub.warpPattern, sub.warpColors);
    const weft = bandsFrom(sub.weftPattern, sub.weftColors);
    const warpTotal = warp.reduce((s, b) => s + b.n, 0) || 1;
    const weftTotal = weft.reduce((s, b) => s + b.n, 0) || 1;

    return (
        <View style={[styles.box, { width: size, height: size }]}>
            {/* warp — vertical stripes */}
            <View style={styles.warpRow}>
                {warp.map((b, i) => (
                    <View key={i} style={{ flex: b.n / warpTotal, backgroundColor: b.hex }} />
                ))}
            </View>
            {/* weft — translucent horizontal stripes (approximates multiply blend) */}
            <View style={StyleSheet.absoluteFill}>
                {weft.map((b, i) => (
                    <View key={i} style={{ flex: b.n / weftTotal, backgroundColor: b.hex, opacity: 0.35 }} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    box: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: T.border,
        overflow: 'hidden',
        backgroundColor: T.alt,
    },
    warpRow: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
    greige: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDE8DF' },
    greigeText: { fontSize: 8, fontWeight: '700', color: '#9A9085', letterSpacing: 0.5 },
});
