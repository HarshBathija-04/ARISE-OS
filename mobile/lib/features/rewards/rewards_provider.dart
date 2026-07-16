import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_providers.dart';
import '../../core/models/models.dart';
import '../dashboard/dashboard_provider.dart';

class RewardsData {
  RewardsData({required this.rewards, required this.purchases});

  final List<RewardItem> rewards;
  final List<RewardPurchase> purchases;
}

/// GET /v1/rewards → {rewards, purchases} — raw snake_case rows; purchases
/// carry a partial `reward:rewards(title, icon)` embed.
final rewardsProvider = FutureProvider<RewardsData>((ref) async {
  final api = ref.watch(apiClientProvider);
  final json = await api.get('/v1/rewards');
  return RewardsData(
    rewards: (json['rewards'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(RewardItem.fromJson)
        .toList(),
    purchases: (json['purchases'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(RewardPurchase.fromJson)
        .toList(),
  );
});

class RewardsActions {
  RewardsActions(this._ref);
  final Ref _ref;

  /// POST /v1/rewards/:id/purchase → {ok, balance} (new coin balance).
  Future<int> purchase(String rewardId) async {
    final json = await _ref
        .read(apiClientProvider)
        .post('/v1/rewards/$rewardId/purchase');
    _invalidate();
    final balance = json['balance'];
    return balance is num ? balance.round() : 0;
  }

  /// POST /v1/rewards {title, description?, cost, icon?} → {reward}
  Future<void> create({
    required String title,
    required int cost,
    String? description,
    String? icon,
  }) async {
    await _ref.read(apiClientProvider).post('/v1/rewards', body: {
      'title': title,
      'cost': cost,
      if (description != null && description.isNotEmpty)
        'description': description,
      if (icon != null && icon.isNotEmpty) 'icon': icon,
    });
    _invalidate();
  }

  void _invalidate() {
    _ref.invalidate(rewardsProvider);
    // Coin balance lives on the dashboard profile.
    _ref.invalidate(dashboardProvider);
  }
}

final rewardsActionsProvider = Provider<RewardsActions>(RewardsActions.new);
