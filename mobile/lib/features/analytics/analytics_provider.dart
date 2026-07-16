import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_providers.dart';
import '../../core/models/models.dart';

/// GET /v1/analytics/performance → {performance: {discipline, knowledge,
/// physical, focus, recovery, life}} (0–100 rolling scores).
final performanceProvider = FutureProvider<PerformanceScores>((ref) async {
  final api = ref.watch(apiClientProvider);
  final json = await api.get('/v1/analytics/performance');
  return PerformanceScores.fromJson(
      (json['performance'] as Map<String, dynamic>?) ?? const {});
});

/// GET /v1/analytics/heatmap → {heatmap: [{date, intensity 0–4}]},
/// oldest → newest.
final heatmapProvider = FutureProvider<List<HeatmapCell>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final json = await api.get('/v1/analytics/heatmap');
  return (json['heatmap'] as List? ?? const [])
      .whereType<Map<String, dynamic>>()
      .map(HeatmapCell.fromJson)
      .toList();
});
