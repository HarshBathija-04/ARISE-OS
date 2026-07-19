import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../core/widgets/widgets.dart';
import 'time_log_provider.dart';

String _hrs(num min) {
  final m = min.round();
  final h = m ~/ 60;
  return h > 0 ? '${h}h ${m % 60}m' : '${m}m';
}

/// Planned vs Actual analytics tab — fed by GET /v1/time-logs/analytics.
class TimeLogAnalyticsTab extends ConsumerWidget {
  const TimeLogAnalyticsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analytics = ref.watch(timeLogAnalyticsProvider);

    return RefreshIndicator(
      color: AriseColors.blue,
      onRefresh: () async => ref.invalidate(timeLogAnalyticsProvider),
      child: AsyncValueView<Map<String, dynamic>>(
        value: analytics,
        onRetry: () => ref.invalidate(timeLogAnalyticsProvider),
        data: (data) {
          final totals =
              (data['totals'] as Map<String, dynamic>?) ?? const {};
          final prevWeek =
              (data['previousWeek'] as Map<String, dynamic>?) ?? const {};
          num t(String key) => (totals[key] as num?) ?? 0;

          final categories = <(String, num, Color)>[
            ('CODING', t('codingMin'), AriseColors.violetBright),
            ('STUDY', t('studyMin'), AriseColors.blue),
            ('EXERCISE', t('exerciseMin'), AriseColors.success),
            ('ENTERTAINMENT', t('entertainmentMin'), AriseColors.textDim),
          ];
          final maxCat = categories.fold<num>(
              1, (m, c) => c.$2 > m ? c.$2 : m);

          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(vertical: 8),
            children: [
              SystemPanel(
                title: 'LAST 7 DAYS — PLAN VS REALITY',
                child: Column(
                  children: [
                    _StatRow(
                        label: 'PLANNED',
                        value: _hrs(t('plannedMin')),
                        color: AriseColors.blue),
                    _StatRow(
                        label: 'ACTUALLY LOGGED',
                        value: _hrs(t('actualMin')),
                        color: AriseColors.violetBright),
                    _StatRow(
                        label: 'FOCUS TIME',
                        value: _hrs(t('focusMin')),
                        color: AriseColors.success),
                    _StatRow(
                        label: 'DEEP WORK',
                        value: _hrs(t('deepWorkMin')),
                        color: AriseColors.gold),
                    _StatRow(
                        label: 'MISSED',
                        value: _hrs(t('missedMin')),
                        color: AriseColors.danger),
                    _StatRow(
                        label: 'RECOVERED',
                        value: _hrs(t('recoveredMin')),
                        color: AriseColors.success),
                  ],
                ),
              ),
              SystemPanel(
                title: 'PRODUCTIVITY',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _ScoreBar(
                      label: 'PRODUCTIVITY SCORE',
                      score: t('productivityScore').round(),
                      previous:
                          ((prevWeek['productivityScore'] as num?) ?? 0)
                              .round(),
                    ),
                    const SizedBox(height: 10),
                    _ScoreBar(
                      label: 'TIME UTILIZATION',
                      score: t('timeUtilization').round(),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'XP FROM TIME LOGS: ${t('xpFromLogs').round()}  ·  '
                      '${t('logCount').round()} ACTIVITIES',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              SystemPanel(
                title: 'HOURS BY CATEGORY',
                child: Column(
                  children: [
                    for (final c in categories)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 110,
                              child: Text(c.$1,
                                  style: const TextStyle(
                                      fontSize: 10,
                                      letterSpacing: 1,
                                      color: AriseColors.textDim)),
                            ),
                            Expanded(
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: (c.$2 / maxCat).clamp(0.0, 1.0),
                                  minHeight: 6,
                                  backgroundColor:
                                      Colors.white.withValues(alpha: 0.06),
                                  color: c.$3,
                                ),
                              ),
                            ),
                            SizedBox(
                              width: 60,
                              child: Text(
                                _hrs(c.$2),
                                textAlign: TextAlign.right,
                                style: const TextStyle(
                                  fontFamily: 'monospace',
                                  fontFamilyFallback: ['Courier'],
                                  fontSize: 11,
                                  color: AriseColors.text,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          );
        },
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow(
      {required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Icon(Icons.circle, size: 8, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(label,
                style: const TextStyle(
                    fontSize: 10,
                    letterSpacing: 1,
                    color: AriseColors.textDim)),
          ),
          Text(
            value,
            style: const TextStyle(
              fontFamily: 'monospace',
              fontFamilyFallback: ['Courier'],
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AriseColors.text,
            ),
          ),
        ],
      ),
    );
  }
}

class _ScoreBar extends StatelessWidget {
  const _ScoreBar({required this.label, required this.score, this.previous});

  final String label;
  final int score;
  final int? previous;

  @override
  Widget build(BuildContext context) {
    final delta = previous != null && previous! > 0 ? score - previous! : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(label,
                  style: const TextStyle(
                      fontSize: 10,
                      letterSpacing: 1,
                      color: AriseColors.textDim)),
            ),
            Text('$score/100',
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontFamilyFallback: ['Courier'],
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AriseColors.text,
                )),
            if (delta != null)
              Padding(
                padding: const EdgeInsets.only(left: 6),
                child: Text(
                  '${delta >= 0 ? '+' : ''}$delta vs prev wk',
                  style: TextStyle(
                    fontSize: 10,
                    color: delta >= 0
                        ? AriseColors.success
                        : AriseColors.danger,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: (score / 100).clamp(0.0, 1.0),
            minHeight: 6,
            backgroundColor: Colors.white.withValues(alpha: 0.06),
            color: AriseColors.blue,
          ),
        ),
      ],
    );
  }
}
