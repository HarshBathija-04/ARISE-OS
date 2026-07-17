import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/realtime/realtime_invalidator.dart';
import '../features/achievements/achievements_screen.dart';
import '../features/alarm/alarm_result_screen.dart';
import '../features/analytics/analytics_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/signup_screen.dart';
import '../features/bosses/bosses_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/focus/focus_screen.dart';
import '../features/habits/habits_screen.dart';
import '../features/quests/quests_screen.dart';
import '../features/rewards/rewards_screen.dart';
import '../features/settings/alarm_settings_screen.dart';
import '../features/timetable/timetable_screen.dart';

/// Bridges a Stream into a Listenable for go_router's refreshListenable.
class _StreamListenable extends ChangeNotifier {
  _StreamListenable(Stream<dynamic> stream) {
    _sub = stream.listen((_) => notifyListeners());
  }
  late final StreamSubscription<dynamic> _sub;

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final auth = Supabase.instance.client.auth;
  final refresh = _StreamListenable(auth.onAuthStateChange);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: refresh,
    redirect: (context, state) {
      final signedIn = auth.currentSession != null;
      final onAuthPage = state.matchedLocation == '/login' ||
          state.matchedLocation == '/signup';
      if (!signedIn && !onAuthPage) return '/login';
      if (signedIn && onAuthPage) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, __) => const SignupScreen()),
      // Phase-2 screens: pushed full-screen over the shell, reached from the
      // dashboard "MORE SYSTEMS" menu.
      GoRoute(path: '/bosses', builder: (_, __) => const BossesScreen()),
      GoRoute(
          path: '/achievements',
          builder: (_, __) => const AchievementsScreen()),
      GoRoute(path: '/rewards', builder: (_, __) => const RewardsScreen()),
      GoRoute(path: '/analytics', builder: (_, __) => const AnalyticsScreen()),
      GoRoute(
          path: '/settings', builder: (_, __) => const AlarmSettingsScreen()),
      // Landing route after a native alarm interaction (confirm/skip/snooze).
      GoRoute(
        path: '/alarm-result',
        builder: (_, state) => AlarmResultScreen(
          blockId: state.uri.queryParameters['blockId'] ?? '',
          date: state.uri.queryParameters['date'] ?? '',
          action: state.uri.queryParameters['action'] ?? 'confirm',
        ),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => _AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/dashboard',
                builder: (_, __) => const DashboardScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/quests', builder: (_, __) => const QuestsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/focus', builder: (_, __) => const FocusScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/timetable',
                builder: (_, __) => const TimetableScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/habits', builder: (_, __) => const HabitsScreen()),
          ]),
        ],
      ),
    ],
  );
});

class _AppShell extends ConsumerWidget {
  const _AppShell({required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Keep the realtime → provider-invalidation pipeline alive while the
    // signed-in shell is mounted.
    ref.watch(realtimeInvalidatorProvider);

    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (i) => shell.goBranch(
          i,
          initialLocation: i == shell.currentIndex,
        ),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.dashboard_outlined), label: 'STATUS'),
          NavigationDestination(
              icon: Icon(Icons.check_circle_outline), label: 'QUESTS'),
          NavigationDestination(
              icon: Icon(Icons.timer_outlined), label: 'FOCUS'),
          NavigationDestination(
              icon: Icon(Icons.calendar_today_outlined), label: 'SCHEDULE'),
          NavigationDestination(
              icon: Icon(Icons.loop_outlined), label: 'HABITS'),
        ],
      ),
    );
  }
}
