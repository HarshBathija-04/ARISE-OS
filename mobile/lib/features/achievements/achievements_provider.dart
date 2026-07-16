import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_providers.dart';
import '../../core/models/models.dart';

/// GET /v1/achievements → {achievements} — raw user_achievements rows with
/// an `achievement:achievements(*)` embed. Unlocked first, then by progress.
final achievementsProvider =
    FutureProvider<List<AchievementEntry>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final json = await api.get('/v1/achievements');
  return (json['achievements'] as List? ?? const [])
      .whereType<Map<String, dynamic>>()
      .map(AchievementEntry.fromJson)
      .toList()
    ..sort((a, b) {
      if (a.unlocked != b.unlocked) return a.unlocked ? -1 : 1;
      return b.progressFraction.compareTo(a.progressFraction);
    });
});
