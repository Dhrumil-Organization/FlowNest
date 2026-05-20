import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, fontSize, radius, spacing, tatColors} from '../utils/theme';
import {TatLive, TatLiveState} from '../types';

interface Props {
  tatLive: TatLive;
}

const formatHours = (h: number): string => {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h.toFixed(1)} hrs`;
  const days = Math.floor(h / 24);
  const remH = Math.round(h % 24);
  return remH > 0 ? `${days}d ${remH}h` : `${days} day${days > 1 ? 's' : ''}`;
};

const StepRow: React.FC<{step: TatLiveState; isLast?: boolean}> = ({
  step,
  isLast,
}) => {
  const c = tatColors[step.status];
  const isStarted = step.is_started;
  const isCompleted = step.is_completed;

  if (!isStarted) {
    return (
      <View style={styles.row}>
        <View style={styles.dotCol}>
          <View style={[styles.dot, styles.dotPending]} />
          {!isLast && <View style={styles.line} />}
        </View>
        <View style={styles.contentCol}>
          <Text style={styles.stepName}>{step.step_name}</Text>
          <Text style={styles.notStarted}>Not yet started</Text>
        </View>
      </View>
    );
  }

  const percentClamped = Math.min(step.percent_used, 100);

  return (
    <View style={styles.row}>
      <View style={styles.dotCol}>
        <View
          style={[
            styles.dot,
            {backgroundColor: isCompleted ? c.fg : c.bg, borderColor: c.fg},
          ]}>
          {isCompleted && (
            <Text style={[styles.dotIcon, {color: '#fff'}]}>✓</Text>
          )}
        </View>
        {!isLast && <View style={[styles.line, isCompleted && {backgroundColor: c.fg}]} />}
      </View>
      <View style={styles.contentCol}>
        <View style={styles.headerRow}>
          <Text style={styles.stepName}>{step.step_name}</Text>
          <View style={[styles.badge, {backgroundColor: c.bg}]}>
            <Text style={[styles.badgeText, {color: c.fg}]}>
              {c.icon} {c.label}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            Expected: {formatHours(step.expected_hours)}
          </Text>
          <Text style={styles.meta}>
            {isCompleted ? 'Took: ' : 'Elapsed: '}
            {formatHours(step.elapsed_hours)}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {width: `${percentClamped}%`, backgroundColor: c.fg},
            ]}
          />
        </View>

        <View style={styles.metaRow}>
          {step.variance_hours > 0 ? (
            <Text style={[styles.variance, {color: c.fg}]}>
              {formatHours(step.variance_hours)} over
            </Text>
          ) : step.variance_hours < 0 ? (
            <Text style={[styles.variance, {color: colors.tatOnTime}]}>
              {formatHours(Math.abs(step.variance_hours))} ahead
            </Text>
          ) : (
            <Text style={styles.variance}>On target</Text>
          )}
          <Text style={styles.meta}>{Math.round(step.percent_used)}% used</Text>
        </View>
      </View>
    </View>
  );
};

const TatTimeline: React.FC<Props> = ({tatLive}) => {
  const steps = [
    tatLive.costing,
    tatLive.send_quotation,
    tatLive.party_response,
    tatLive.overall,
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TAT Timeline</Text>
      {steps.map((step, idx) => (
        <StepRow
          key={step.step_code || `step-${idx}`}
          step={step}
          isLast={idx === steps.length - 1}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  row: {flexDirection: 'row'},
  dotCol: {alignItems: 'center', width: 24},
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPending: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.cardBg,
  },
  dotIcon: {fontSize: 8, fontWeight: '700'},
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 2,
    minHeight: 30,
  },
  contentCol: {flex: 1, paddingLeft: spacing.sm, paddingBottom: spacing.md},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepName: {fontSize: fontSize.base, fontWeight: '500', color: colors.textPrimary, flex: 1},
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: {fontSize: fontSize.xs, fontWeight: '500'},
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  meta: {fontSize: fontSize.xs, color: colors.textSecondary},
  progressTrack: {
    height: 5,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  variance: {fontSize: fontSize.xs, fontWeight: '500'},
  notStarted: {fontSize: fontSize.sm, color: colors.textTertiary, fontStyle: 'italic'},
});

export default TatTimeline;
