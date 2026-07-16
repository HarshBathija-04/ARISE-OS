import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_providers.dart';
import '../../core/models/models.dart';
import '../dashboard/dashboard_provider.dart';

class BossesData {
  BossesData({required this.bosses, required this.battles});

  final List<BossInfo> bosses;
  final List<BossBattle> battles;

  /// The user's battle against this boss, if one was ever started.
  BossBattle? battleFor(String bossId) {
    for (final battle in battles) {
      if (battle.bossId == bossId) return battle;
    }
    return null;
  }
}

/// GET /v1/bosses → {bosses} (raw rows) + GET /v1/bosses/battles → {battles}
/// (raw rows with boss/logs embeds). No battle row = boss not yet engaged.
final bossesProvider = FutureProvider<BossesData>((ref) async {
  final api = ref.watch(apiClientProvider);
  final results = await Future.wait([
    api.get('/v1/bosses'),
    api.get('/v1/bosses/battles'),
  ]);
  final bosses = (results[0]['bosses'] as List? ?? const [])
      .whereType<Map<String, dynamic>>()
      .map(BossInfo.fromJson)
      .toList();
  final battles = (results[1]['battles'] as List? ?? const [])
      .whereType<Map<String, dynamic>>()
      .map(BossBattle.fromJson)
      .toList();
  return BossesData(bosses: bosses, battles: battles);
});

class BossesActions {
  BossesActions(this._ref);
  final Ref _ref;

  /// POST /v1/bosses/:id/start → {battle}
  Future<void> start(String bossId) async {
    await _ref.read(apiClientProvider).post('/v1/bosses/$bossId/start');
    _ref.invalidate(bossesProvider);
    _ref.invalidate(dashboardProvider);
  }
}

final bossesActionsProvider = Provider<BossesActions>(BossesActions.new);
