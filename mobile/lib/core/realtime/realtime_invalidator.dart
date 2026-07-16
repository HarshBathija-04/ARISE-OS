import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/achievements/achievements_provider.dart';
import '../../features/analytics/analytics_provider.dart';
import '../../features/bosses/bosses_provider.dart';
import '../../features/dashboard/dashboard_provider.dart';
import '../../features/focus/focus_controller.dart';
import '../../features/habits/habits_provider.dart';
import '../../features/quests/quests_provider.dart';
import '../../features/timetable/timetable_provider.dart';
import 'realtime_service.dart';

/// Listens to realtime table-change events and invalidates the feature
/// providers that depend on each table. Debounced 500ms per table so a burst
/// of writes triggers a single refetch.
final realtimeInvalidatorProvider = Provider<void>((ref) {
  final service = ref.watch(realtimeServiceProvider);
  service.start();

  final pending = <String>{};
  Timer? debounce;

  void flush() {
    final tables = Set<String>.from(pending);
    pending.clear();
    for (final table in tables) {
      switch (table) {
        case 'player_profiles':
        case 'notifications':
          ref.invalidate(dashboardProvider);
        case 'quests':
          ref.invalidate(dashboardProvider);
          ref.invalidate(questsProvider);
          // boss damage, achievement progress and analytics metrics are all
          // side-effects of quest completion; their own tables
          // (boss_battles, user_achievements, activity_logs) are not in the
          // realtime publication, so piggyback on the quests event.
          ref.invalidate(bossesProvider);
          ref.invalidate(achievementsProvider);
          ref.invalidate(performanceProvider);
          ref.invalidate(heatmapProvider);
        case 'streaks':
          ref.invalidate(dashboardProvider);
          ref.invalidate(habitsProvider);
        case 'timetable_block_logs':
          ref.invalidate(timetableProvider);
        case 'habit_logs':
          ref.invalidate(habitsProvider);
          ref.invalidate(recoveryProvider);
          ref.invalidate(dashboardProvider);
          ref.invalidate(performanceProvider);
      }
    }
    // Focus sessions have no realtime table here, but focus/today is cheap
    // to refresh whenever a quest/profile change lands.
    ref.invalidate(focusTodayProvider);
  }

  final sub = service.tableChanges.listen((table) {
    pending.add(table);
    debounce?.cancel();
    debounce = Timer(const Duration(milliseconds: 500), flush);
  });

  ref.onDispose(() {
    debounce?.cancel();
    sub.cancel();
    service.stop();
  });
});
