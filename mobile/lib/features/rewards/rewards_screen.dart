import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../core/models/models.dart';
import '../../core/widgets/award_feedback.dart';
import '../../core/widgets/widgets.dart';
import '../dashboard/dashboard_provider.dart';
import 'rewards_provider.dart';

IconData _rewardIcon(String icon) {
  switch (icon) {
    case 'game':
    case 'gamepad':
      return Icons.sports_esports_outlined;
    case 'movie':
    case 'film':
      return Icons.movie_outlined;
    case 'food':
    case 'pizza':
      return Icons.fastfood_outlined;
    case 'coffee':
      return Icons.coffee_outlined;
    case 'music':
      return Icons.music_note_outlined;
    case 'book':
      return Icons.menu_book_outlined;
    case 'shopping':
    case 'cart':
      return Icons.shopping_bag_outlined;
    case 'sleep':
      return Icons.bedtime_outlined;
    default:
      return Icons.card_giftcard;
  }
}

class RewardsScreen extends ConsumerWidget {
  const RewardsScreen({super.key});

  Future<void> _purchase(
      BuildContext context, WidgetRef ref, RewardItem reward) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('CONFIRM PURCHASE',
            style: Theme.of(context).textTheme.titleSmall),
        content: Text('Spend ${reward.cost} coins on "${reward.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('CANCEL'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('PURCHASE'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    try {
      final balance = await ref.read(rewardsActionsProvider).purchase(reward.id);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(
            'PURCHASED  ·  $balance COINS LEFT',
            style: const TextStyle(
              color: AriseColors.gold,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
            ),
          ),
        ));
      }
    } catch (e) {
      if (context.mounted) showErrorSnack(context, e);
    }
  }

  void _showCreateSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AriseColors.panel,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
        ),
        child: const _CreateRewardSheet(),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rewards = ref.watch(rewardsProvider);
    final coins = ref.watch(dashboardProvider
        .select((v) => v.valueOrNull?.profile.coins));

    return Scaffold(
      appBar: AppBar(title: const Text('REWARDS SHOP')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AriseColors.blue,
        foregroundColor: AriseColors.bg,
        tooltip: 'Create reward',
        onPressed: () => _showCreateSheet(context),
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        color: AriseColors.blue,
        onRefresh: () async {
          ref.invalidate(rewardsProvider);
          ref.invalidate(dashboardProvider);
        },
        child: AsyncValueView<RewardsData>(
          value: rewards,
          onRetry: () => ref.invalidate(rewardsProvider),
          data: (data) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(vertical: 8),
            children: [
              SystemPanel(
                glowColor: AriseColors.gold,
                child: Row(
                  children: [
                    const Icon(Icons.toll, color: AriseColors.gold, size: 28),
                    const SizedBox(width: 12),
                    Text(
                      coins != null ? '$coins COINS' : 'BALANCE —',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(color: AriseColors.gold),
                    ),
                  ],
                ),
              ),
              if (data.rewards.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 60),
                  child: Center(
                    child: Text(
                      'NO REWARDS YET.\nCREATE ONE WITH THE + BUTTON.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: AriseColors.textDim, letterSpacing: 2),
                    ),
                  ),
                )
              else
                for (final reward in data.rewards)
                  _RewardCard(
                    reward: reward,
                    affordable: coins == null || coins >= reward.cost,
                    onBuy: () => _purchase(context, ref, reward),
                  ),
              if (data.purchases.isNotEmpty)
                SystemPanel(
                  title: 'PURCHASE HISTORY',
                  glowColor: AriseColors.textDim,
                  child: Column(
                    children: [
                      for (final p in data.purchases.take(15))
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              Icon(_rewardIcon(p.rewardIcon),
                                  size: 16, color: AriseColors.textDim),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  p.rewardTitle,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style:
                                      Theme.of(context).textTheme.bodyMedium,
                                ),
                              ),
                              Text(
                                '-${p.cost}',
                                style: const TextStyle(
                                  color: AriseColors.gold,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              if (p.createdAt != null) ...[
                                const SizedBox(width: 10),
                                Text(
                                  '${p.createdAt!.toLocal().day.toString().padLeft(2, '0')}/'
                                  '${p.createdAt!.toLocal().month.toString().padLeft(2, '0')}',
                                  style:
                                      Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }
}

class _RewardCard extends StatelessWidget {
  const _RewardCard({
    required this.reward,
    required this.affordable,
    required this.onBuy,
  });

  final RewardItem reward;
  final bool affordable;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    return SystemPanel(
      glowColor: AriseColors.gold,
      child: Row(
        children: [
          Icon(_rewardIcon(reward.icon), size: 26, color: AriseColors.gold),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  reward.title,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                if (reward.description.isNotEmpty)
                  Text(
                    reward.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              StatChip(
                icon: Icons.toll,
                label: '${reward.cost}',
                color: AriseColors.gold,
              ),
              const SizedBox(height: 6),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AriseColors.gold,
                  foregroundColor: AriseColors.bg,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                ),
                onPressed: affordable ? onBuy : null,
                child: const Text('BUY', style: TextStyle(fontSize: 11)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CreateRewardSheet extends ConsumerStatefulWidget {
  const _CreateRewardSheet();

  @override
  ConsumerState<_CreateRewardSheet> createState() =>
      _CreateRewardSheetState();
}

class _CreateRewardSheetState extends ConsumerState<_CreateRewardSheet> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _cost = TextEditingController(text: '50');
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _cost.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ref.read(rewardsActionsProvider).create(
            title: _title.text.trim(),
            cost: int.parse(_cost.text.trim()),
            description: _description.text.trim(),
          );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('CREATE REWARD',
                style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 16),
            TextFormField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'TITLE'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _description,
              decoration:
                  const InputDecoration(labelText: 'DESCRIPTION (OPTIONAL)'),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _cost,
              decoration: const InputDecoration(labelText: 'COST (COINS)'),
              keyboardType: TextInputType.number,
              validator: (v) {
                final n = int.tryParse(v ?? '');
                if (n == null || n < 1 || n > 100000) return '1–100000 coins';
                return null;
              },
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('ADD TO SHOP'),
            ),
          ],
        ),
      ),
    );
  }
}
