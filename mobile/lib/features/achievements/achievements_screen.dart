import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../core/models/models.dart';
import '../../core/widgets/widgets.dart';
import 'achievements_provider.dart';

class AchievementsScreen extends ConsumerWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final achievements = ref.watch(achievementsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('ACHIEVEMENTS')),
      body: RefreshIndicator(
        color: AriseColors.blue,
        onRefresh: () async => ref.invalidate(achievementsProvider),
        child: AsyncValueView<List<AchievementEntry>>(
          value: achievements,
          onRetry: () => ref.invalidate(achievementsProvider),
          data: (items) {
            if (items.isEmpty) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  Center(
                    child: Text(
                      'NO ACHIEVEMENTS TRACKED YET.',
                      style: TextStyle(
                          color: AriseColors.textDim, letterSpacing: 2),
                    ),
                  ),
                ],
              );
            }

            // Group by category, preserving the provider's sort inside each.
            final byCategory = <String, List<AchievementEntry>>{};
            for (final entry in items) {
              byCategory
                  .putIfAbsent(entry.achievement.category, () => [])
                  .add(entry);
            }
            final categories = byCategory.keys.toList()..sort();
            final unlockedCount = items.where((e) => e.unlocked).length;

            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
                  child: Text(
                    'UNLOCKED $unlockedCount / ${items.length}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
                for (final category in categories)
                  SystemPanel(
                    title: category,
                    glowColor: AriseColors.violetBright,
                    child: Column(
                      children: [
                        for (final entry in byCategory[category]!)
                          _AchievementRow(entry: entry),
                      ],
                    ),
                  ),
                const SizedBox(height: 24),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _AchievementRow extends StatelessWidget {
  const _AchievementRow({required this.entry});

  final AchievementEntry entry;

  @override
  Widget build(BuildContext context) {
    final def = entry.achievement;
    final color = rarityColor(def.rarity);
    final secret = def.hidden && !entry.unlocked;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Opacity(
        opacity: entry.unlocked ? 1.0 : 0.6,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              entry.unlocked
                  ? Icons.emoji_events
                  : secret
                      ? Icons.help_outline
                      : Icons.lock_outline,
              size: 22,
              color: entry.unlocked ? color : AriseColors.textDim,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          secret ? '???' : def.title,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                      ),
                      Text(
                        def.rarity,
                        style: TextStyle(
                          color: color,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1,
                        ),
                      ),
                    ],
                  ),
                  if (!secret && def.description.isNotEmpty)
                    Text(
                      def.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(3),
                    child: LinearProgressIndicator(
                      value: entry.unlocked ? 1 : entry.progressFraction,
                      minHeight: 5,
                      color: entry.unlocked ? color : AriseColors.blue,
                      backgroundColor: AriseColors.surface,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    entry.unlocked
                        ? 'UNLOCKED'
                            '${def.xpReward > 0 ? '  ·  +${def.xpReward} XP' : ''}'
                        : '${entry.progress} / ${def.targetValue}'
                            '${def.xpReward > 0 ? '  ·  +${def.xpReward} XP' : ''}',
                    style: TextStyle(
                      fontSize: 10,
                      letterSpacing: 0.5,
                      color: entry.unlocked ? color : AriseColors.textDim,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
