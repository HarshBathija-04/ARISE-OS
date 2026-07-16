import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../core/models/models.dart';
import '../../core/widgets/widgets.dart';
import 'analytics_provider.dart';

/// Verdict derived client-side from the overall life score — the API only
/// returns the six 0–100 scores.
(String, Color) _verdict(double life) {
  if (life >= 80) return ('S-RANK FLOW', AriseColors.gold);
  if (life >= 65) return ('STRONG MOMENTUM', AriseColors.success);
  if (life >= 45) return ('HOLDING STEADY', AriseColors.blue);
  if (life >= 25) return ('SYSTEM UNSTABLE', AriseColors.warning);
  return ('CRITICAL — REBUILD', AriseColors.danger);
}

Color _intensityColor(int intensity) {
  switch (intensity) {
    case 1:
      return AriseColors.success.withValues(alpha: 0.25);
    case 2:
      return AriseColors.success.withValues(alpha: 0.45);
    case 3:
      return AriseColors.success.withValues(alpha: 0.7);
    case 4:
      return AriseColors.success;
    default:
      return AriseColors.surface;
  }
}

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final performance = ref.watch(performanceProvider);
    final heatmap = ref.watch(heatmapProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('ANALYTICS')),
      body: RefreshIndicator(
        color: AriseColors.blue,
        onRefresh: () async {
          ref.invalidate(performanceProvider);
          ref.invalidate(heatmapProvider);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(vertical: 8),
          children: [
            AsyncValueView<PerformanceScores>(
              value: performance,
              onRetry: () => ref.invalidate(performanceProvider),
              data: (scores) => _PerformancePanel(scores: scores),
            ),
            AsyncValueView<List<HeatmapCell>>(
              value: heatmap,
              onRetry: () => ref.invalidate(heatmapProvider),
              data: (cells) => _HeatmapPanel(cells: cells),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _PerformancePanel extends StatelessWidget {
  const _PerformancePanel({required this.scores});

  final PerformanceScores scores;

  @override
  Widget build(BuildContext context) {
    final (verdict, verdictColor) = _verdict(scores.life);
    final rows = <(String, double)>[
      ('DISCIPLINE', scores.discipline),
      ('KNOWLEDGE', scores.knowledge),
      ('PHYSICAL', scores.physical),
      ('FOCUS', scores.focus),
      ('RECOVERY', scores.recovery),
    ];
    rows.sort((a, b) => a.$2.compareTo(b.$2));
    final weakest = rows.first;
    final strongest = rows.last;
    // Display order (not the sorted-by-value order).
    final display = <(String, double)>[
      ('DISCIPLINE', scores.discipline),
      ('KNOWLEDGE', scores.knowledge),
      ('PHYSICAL', scores.physical),
      ('FOCUS', scores.focus),
      ('RECOVERY', scores.recovery),
    ];

    return SystemPanel(
      title: 'LIFE PERFORMANCE',
      glowColor: verdictColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(
                width: 72,
                height: 72,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CircularProgressIndicator(
                      value: (scores.life / 100).clamp(0.0, 1.0),
                      strokeWidth: 5,
                      color: verdictColor,
                      backgroundColor: AriseColors.surface,
                    ),
                    Center(
                      child: Text(
                        '${scores.life.round()}',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: verdictColor,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      verdict,
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(color: verdictColor),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Rolling 7/30-day blend of discipline, knowledge, '
                      'physical, focus and recovery.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          for (final (label, value) in display)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  SizedBox(
                    width: 90,
                    child: Text(label,
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(letterSpacing: 1)),
                  ),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(3),
                      child: LinearProgressIndicator(
                        value: (value / 100).clamp(0.0, 1.0),
                        minHeight: 6,
                        color: AriseColors.violetBright,
                        backgroundColor: AriseColors.surface,
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 34,
                    child: Text(
                      '${value.round()}',
                      textAlign: TextAlign.right,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 10),
          Text(
            '› STRONGEST SYSTEM: ${strongest.$1} (${strongest.$2.round()})\n'
            '› NEEDS ATTENTION: ${weakest.$1} (${weakest.$2.round()})',
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(height: 1.6, letterSpacing: 0.5),
          ),
        ],
      ),
    );
  }
}

class _HeatmapPanel extends StatelessWidget {
  const _HeatmapPanel({required this.cells});

  final List<HeatmapCell> cells;

  static const _cellSize = 13.0;
  static const _cellGap = 3.0;

  @override
  Widget build(BuildContext context) {
    if (cells.isEmpty) {
      return SystemPanel(
        title: 'ACTIVITY HEATMAP',
        glowColor: AriseColors.success,
        child: Text('No activity recorded yet.',
            style: Theme.of(context).textTheme.bodySmall),
      );
    }

    // GitHub-style grid: 7 rows (days), one column per week, oldest on the
    // left. Cells arrive oldest → newest.
    const rows = 7;
    final columns = (cells.length / rows).ceil();

    return SystemPanel(
      title: 'ACTIVITY HEATMAP  ·  ${cells.length}D',
      glowColor: AriseColors.success,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            reverse: true, // land on the most recent weeks
            child: SizedBox(
              height: rows * (_cellSize + _cellGap),
              width: columns * (_cellSize + _cellGap),
              child: Column(
                children: [
                  for (var row = 0; row < rows; row++)
                    Row(
                      children: [
                        for (var col = 0; col < columns; col++)
                          _cell(col * rows + row),
                      ],
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Text('LESS', style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(width: 6),
              for (var i = 0; i <= 4; i++)
                Container(
                  width: _cellSize,
                  height: _cellSize,
                  margin: const EdgeInsets.only(right: 3),
                  decoration: BoxDecoration(
                    color: _intensityColor(i),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              const SizedBox(width: 3),
              Text('MORE', style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ],
      ),
    );
  }

  Widget _cell(int index) {
    if (index >= cells.length) {
      return const SizedBox(
          width: _cellSize + _cellGap, height: _cellSize + _cellGap);
    }
    final cell = cells[index];
    return Padding(
      padding: const EdgeInsets.only(right: _cellGap, bottom: _cellGap),
      child: Tooltip(
        message: '${cell.date}  ·  ${cell.intensity}/4',
        child: Container(
          width: _cellSize,
          height: _cellSize,
          decoration: BoxDecoration(
            color: _intensityColor(cell.intensity),
            borderRadius: BorderRadius.circular(3),
          ),
        ),
      ),
    );
  }
}
