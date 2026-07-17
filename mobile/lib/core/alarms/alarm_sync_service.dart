import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../api/api_providers.dart';
import 'alarm_channel.dart';

/// Orchestrates alarm synchronization between the backend and the native
/// Android alarm stack:
///  - on login / app resume / realtime timetable change / FCM resync signal:
///    GET /v1/alarms/plan → AlarmChannel.syncAlarms (skipped when the stored
///    native version already matches)
///  - drains the native alarm-event queue → POST /v1/alarms/events
class AlarmSyncService {
  AlarmSyncService(this._api);

  final ApiClient _api;
  bool _syncing = false;

  bool get _isAndroid => !kIsWeb && Platform.isAndroid;

  /// Full sync: plan → native, then flush queued events.
  Future<void> sync({bool force = false}) async {
    if (!_isAndroid || _syncing) return;
    _syncing = true;
    try {
      await _syncPlan(force: force);
      await flushEvents();
    } catch (e) {
      debugPrint('alarm sync failed: $e');
    } finally {
      _syncing = false;
    }
  }

  Future<void> _syncPlan({required bool force}) async {
    final plan = await _api.get('/v1/alarms/plan');
    final serverVersion = (plan['version'] as num?)?.toInt() ?? 0;
    if (!force) {
      final native = await AlarmChannel.getNativeState();
      final nativeVersion = (native['version'] as num?)?.toInt() ?? -1;
      final dirty = native['dirty'] == true;
      if (nativeVersion == serverVersion && !dirty) return; // up to date
    }
    final scheduled = await AlarmChannel.syncAlarms(plan);
    debugPrint('alarm sync: v$serverVersion, $scheduled alarms scheduled');
  }

  /// Upload natively-queued alarm events (confirm/skip/snooze/missed/fired).
  Future<void> flushEvents() async {
    if (!_isAndroid) return;
    final events = await AlarmChannel.drainEventQueue();
    if (events.isEmpty) return;
    try {
      await _api.post('/v1/alarms/events', body: {'events': events});
    } catch (_) {
      await AlarmChannel.requeueEvents(events); // retry next flush
      rethrow;
    }
  }

  /// Queue a locally-made resolution while offline (alarm-result screen).
  static const _pendingKey = 'arise-pending-alarm-actions';

  Future<void> queuePendingAction(Map<String, dynamic> action) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_pendingKey) ?? [];
    list.add(Uri(queryParameters: action.map((k, v) => MapEntry(k, '$v'))).query);
    await prefs.setStringList(_pendingKey, list);
  }

  Future<void> flushPendingActions() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_pendingKey) ?? [];
    if (list.isEmpty) return;
    final remaining = <String>[];
    for (final encoded in list) {
      final params = Uri.splitQueryString(encoded);
      try {
        final blockId = params['blockId'];
        final endpoint = params['endpoint'];
        if (blockId == null || endpoint == null) continue;
        await _api.post('/v1/alarms/$blockId/$endpoint', body: {
          if (params['date'] != null) 'date': params['date'],
          if (params['reason'] != null) 'reason': params['reason'],
          if (params['minutes'] != null) 'minutes': int.tryParse(params['minutes']!),
        });
      } catch (_) {
        remaining.add(encoded);
      }
    }
    await prefs.setStringList(_pendingKey, remaining);
  }
}

final alarmSyncServiceProvider = Provider<AlarmSyncService>(
  (ref) => AlarmSyncService(ref.watch(apiClientProvider)),
);
