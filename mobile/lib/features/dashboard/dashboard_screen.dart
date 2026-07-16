import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';
import '../../core/models/models.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import 'dashboard_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('ARISE//OS'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.apps, color: AriseColors.blue),
            tooltip: 'More systems',
            color: AriseColors.panel,
            onSelected: (route) => context.push(route),
            itemBuilder: (context) => const [
              PopupMenuItem(value: '/bosses', child: Text('BOSS BATTLES')),
              PopupMenuItem(
                  value: '/achievements', child: Text('ACHIEVEMENTS')),
              PopupMenuItem(value: '/rewards', child: Text('REWARDS SHOP')),
              PopupMenuItem(value: '/analytics', child: Text('ANALYTICS')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AriseColors.textDim),
            tooltip: 'Sign out',
            onPressed: () =>
                ref.read(authControllerProvider.notifier).signOut(),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AriseColors.blue,
        onRefresh: () async => ref.invalidate(dashboardProvider),
        child: AsyncValueView<DashboardData>(
          value: dashboard,
          onRetry: () => ref.invalidate(dashboardProvider),
          data: (data) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(vertical: 8),
            children: [
              _StatusPanel(profile: data.profile),
              if (data.performance != null)
                _PerformancePanel(scores: data.performance!),
              _QuestSummaryPanel(quests: data.quests),
              if (data.streaks.isNotEmpty)
                _StreakStrip(streaks: data.streaks),
              if (data.notifications.isNotEmpty)
                _NotificationsPanel(notifications: data.notifications),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusPanel extends StatelessWidget {
  const _StatusPanel({required this.profile});

  final ProfileView profile;

  @override
  Widget build(BuildContext context) {
    return SystemPanel(
      title: 'STATUS',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Level ring
              SizedBox(
                width: 72,
                height: 72,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CircularProgressIndicator(
                      value: profile.xpProgress,
                      strokeWidth: 5,
                      color: AriseColors.blue,
                      backgroundColor: AriseColors.surface,
                    ),
                    Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('LV',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(fontSize: 9)),
                          Text(
                            '${profile.level}',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: AriseColors.blue,
                            ),
                          ),
                        ],
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
                      profile.displayName.toUpperCase(),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        StatChip(
                          icon: Icons.military_tech,
                          label: profile.rank,
                          color: AriseColors.violetBright,
                        ),
                        StatChip(
                          icon: Icons.toll,
                          label: '${profile.coins}',
                          color: AriseColors.gold,
                        ),
                        StatChip(
                          icon: Icons.local_fire_department,
                          label: '${profile.currentStreak}d',
                          color: AriseColors.warning,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          XpBar(currentXp: profile.currentXp, xpForNext: profile.xpForNext),
        ],
      ),
    );
  }
}

class _PerformancePanel extends StatelessWidget {
  const _PerformancePanel({required this.scores});

  final PerformanceScores scores;

  @override
  Widget build(BuildContext context) {
    final rows = <(String, double)>[
      ('DISCIPLINE', scores.discipline),
      ('KNOWLEDGE', scores.knowledge),
      ('PHYSICAL', scores.physical),
      ('FOCUS', scores.focus),
      ('RECOVERY', scores.recovery),
    ];
    return SystemPanel(
      title: 'LIFE SCORE  ·  ${scores.life.round()}',
      glowColor: AriseColors.violetBright,
      child: Column(
        children: [
          for (final (label, value) in rows)
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
        ],
      ),
    );
  }
}

class _QuestSummaryPanel extends StatelessWidget {
  const _QuestSummaryPanel({required this.quests});

  final List<QuestItem> quests;

  @override
  Widget build(BuildContext context) {
    final done = quests.where((q) => q.status == 'COMPLETED').length;
    return SystemPanel(
      title: 'DAILY QUESTS  ·  $done / ${quests.length}',
      child: quests.isEmpty
          ? Text('No quests assigned yet.',
              style: Theme.of(context).textTheme.bodySmall)
          : Column(
              children: [
                for (final q in quests.take(5))
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Icon(
                          q.status == 'COMPLETED'
                              ? Icons.check_circle
                              : q.status == 'FAILED'
                                  ? Icons.cancel
                                  : Icons.radio_button_unchecked,
                          size: 18,
                          color: q.status == 'COMPLETED'
                              ? AriseColors.success
                              : q.status == 'FAILED'
                                  ? AriseColors.danger
                                  : AriseColors.textDim,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            q.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ),
                        Text(
                          q.difficulty,
                          style: TextStyle(
                            color: difficultyColor(q.difficulty),
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
    );
  }
}

class _StreakStrip extends StatelessWidget {
  const _StreakStrip({required this.streaks});

  final List<StreakItem> streaks;

  @override
  Widget build(BuildContext context) {
    return SystemPanel(
      title: 'STREAKS',
      glowColor: AriseColors.warning,
      child: SizedBox(
        height: 60,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: streaks.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (context, i) {
            final s = streaks[i];
            return Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AriseColors.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                    color: AriseColors.warning.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.local_fire_department,
                          size: 15, color: AriseColors.warning),
                      Text(
                        '${s.current}',
                        style: const TextStyle(
                          color: AriseColors.warning,
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    s.title,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _NotificationsPanel extends StatelessWidget {
  const _NotificationsPanel({required this.notifications});

  final List<NotificationItem> notifications;

  @override
  Widget build(BuildContext context) {
    return SystemPanel(
      title: 'SYSTEM LOG',
      glowColor: AriseColors.textDim,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final n in notifications.take(6))
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('› ',
                      style: TextStyle(color: AriseColors.blue)),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(n.title,
                            style: Theme.of(context).textTheme.bodyMedium),
                        if (n.body.isNotEmpty)
                          Text(n.body,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
