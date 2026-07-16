import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../core/models/models.dart';
import '../../core/widgets/award_feedback.dart';
import '../../core/widgets/widgets.dart';
import 'bosses_provider.dart';

class BossesScreen extends ConsumerWidget {
  const BossesScreen({super.key});

  Future<void> _start(
      BuildContext context, WidgetRef ref, BossInfo boss) async {
    try {
      await ref.read(bossesActionsProvider).start(boss.id);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(
            'BOSS ENCOUNTER  ·  ${boss.name.toUpperCase()}',
            style: const TextStyle(
              color: AriseColors.danger,
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

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bosses = ref.watch(bossesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('BOSS BATTLES')),
      body: RefreshIndicator(
        color: AriseColors.blue,
        onRefresh: () async => ref.invalidate(bossesProvider),
        child: AsyncValueView<BossesData>(
          value: bosses,
          onRetry: () => ref.invalidate(bossesProvider),
          data: (data) => data.bosses.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 120),
                    Center(
                      child: Text(
                        'NO BOSSES DETECTED.',
                        style: TextStyle(
                            color: AriseColors.textDim, letterSpacing: 2),
                      ),
                    ),
                  ],
                )
              : ListView.builder(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: data.bosses.length,
                  itemBuilder: (context, i) {
                    final boss = data.bosses[i];
                    return _BossCard(
                      boss: boss,
                      battle: data.battleFor(boss.id),
                      onEngage: () => _start(context, ref, boss),
                    );
                  },
                ),
        ),
      ),
    );
  }
}

class _BossCard extends StatelessWidget {
  const _BossCard({required this.boss, required this.onEngage, this.battle});

  final BossInfo boss;
  final BossBattle? battle;
  final VoidCallback onEngage;

  @override
  Widget build(BuildContext context) {
    final status = battle?.status ?? 'LOCKED';
    final rarity = rarityColor(boss.rarity);
    final statusColor = switch (status) {
      'ACTIVE' => AriseColors.danger,
      'DEFEATED' => AriseColors.success,
      _ => AriseColors.textDim,
    };

    return SystemPanel(
      glowColor: status == 'LOCKED' ? AriseColors.textDim : rarity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                status == 'DEFEATED'
                    ? Icons.military_tech
                    : status == 'ACTIVE'
                        ? Icons.whatshot
                        : Icons.lock_outline,
                size: 20,
                color: statusColor,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      boss.name.toUpperCase(),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color:
                              status == 'LOCKED' ? AriseColors.text : rarity),
                    ),
                    Text(
                      boss.tagline,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(fontStyle: FontStyle.italic),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                  border:
                      Border.all(color: statusColor.withValues(alpha: 0.5)),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          if (boss.description.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(boss.description,
                style: Theme.of(context).textTheme.bodySmall),
          ],
          if (battle != null && status == 'ACTIVE') ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: battle!.hpFraction,
                minHeight: 8,
                color: AriseColors.danger,
                backgroundColor: AriseColors.surface,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'HP ${battle!.currentHp} / ${battle!.maxHp}'
              '${battle!.logs.isNotEmpty ? '  ·  LAST HIT −${battle!.logs.first.damage}'
                  '${battle!.logs.first.critical ? ' CRIT' : ''}' : ''}',
              style: const TextStyle(
                fontFamily: 'monospace',
                fontFamilyFallback: ['Courier'],
                fontSize: 11,
                color: AriseColors.textDim,
              ),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              StatChip(
                icon: Icons.bolt,
                label: '+${boss.rewardXp} XP',
                color: AriseColors.blue,
              ),
              const SizedBox(width: 6),
              if (boss.rewardCoins > 0)
                StatChip(
                  icon: Icons.toll,
                  label: '+${boss.rewardCoins}',
                  color: AriseColors.gold,
                ),
              const SizedBox(width: 6),
              StatChip(
                icon: Icons.diamond_outlined,
                label: boss.rarity,
                color: rarity,
              ),
              const Spacer(),
              if (battle == null)
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AriseColors.danger,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 8),
                  ),
                  onPressed: onEngage,
                  child: const Text('ENGAGE', style: TextStyle(fontSize: 11)),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
