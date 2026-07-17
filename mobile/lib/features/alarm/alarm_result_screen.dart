import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/alarms/alarm_sync_service.dart';
import '../../core/api/api_providers.dart';
import '../dashboard/dashboard_provider.dart';
import '../focus/focus_controller.dart';
import '../timetable/timetable_provider.dart';

/// Landing screen after a native alarm interaction. The native side has
/// ALREADY stopped the alarm and queued its analytics event; this screen
/// makes the authoritative API call (block state + focus auto-start) and
/// routes onward. Offline: the action is queued and the user still gets a
/// local focus timer — stopping the alarm never depends on network.
class AlarmResultScreen extends ConsumerStatefulWidget {
  const AlarmResultScreen({
    super.key,
    required this.blockId,
    required this.date,
    required this.action,
  });

  final String blockId;
  final String date;
  final String action;

  @override
  ConsumerState<AlarmResultScreen> createState() => _AlarmResultScreenState();
}

class _AlarmResultScreenState extends ConsumerState<AlarmResultScreen> {
  String _status = 'Syncing…';

  @override
  void initState() {
    super.initState();
    _run();
  }

  Future<void> _run() async {
    final api = ref.read(apiClientProvider);
    final sync = ref.read(alarmSyncServiceProvider);

    // Flush any queued native events first so ordering is sensible.
    try {
      await sync.flushEvents();
    } catch (_) {/* offline — events stay queued */}

    if (widget.action != 'confirm') {
      // Skip/snooze already recorded natively; just refresh and land home.
      ref.invalidate(timetableProvider);
      if (mounted) context.go('/timetable');
      return;
    }

    try {
      final res = await api.post('/v1/alarms/${widget.blockId}/confirm', body: {
        'date': widget.date,
      });
      ref.invalidate(timetableProvider);
      ref.invalidate(dashboardProvider);

      final sessionId = res['focusSessionId']?.toString();
      final category = res['focusCategory']?.toString();
      final planned = (res['plannedMinutes'] as num?)?.toInt();
      if (sessionId != null && category != null && planned != null) {
        ref.read(focusControllerProvider.notifier).adopt(
              sessionId: sessionId,
              category: category,
              plannedMinutes: planned,
            );
        if (mounted) context.go('/focus');
        return;
      }
      if (mounted) context.go('/timetable');
    } catch (e) {
      // Offline: queue the confirm for later, run a local-only timer so the
      // user's session still counts perceptually.
      await sync.queuePendingAction({
        'blockId': widget.blockId,
        'endpoint': 'confirm',
        'date': widget.date,
      });
      setState(() => _status = 'Offline — confirm queued. Starting local timer.');
      ref.read(focusControllerProvider.notifier).adopt(
            sessionId: 'pending-${widget.blockId}',
            category: 'GATE',
            plannedMinutes: 60,
          );
      await Future<void>.delayed(const Duration(seconds: 2));
      if (mounted) context.go('/focus');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 24),
            Text(_status, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ),
      ),
    );
  }
}
