import 'dart:convert';

import 'package:flutter/services.dart';

/// Typed wrapper over the `com.arise.os/alarms` MethodChannel — the bridge
/// to the native Kotlin alarm stack (AlarmStore/AlarmScheduler/AlarmService).
class AlarmChannel {
  static const MethodChannel _channel = MethodChannel('com.arise.os/alarms');

  /// Hand the full /v1/alarms/plan payload to native storage + reschedule.
  static Future<int> syncAlarms(Map<String, dynamic> plan) async {
    final res = await _channel.invokeMethod<dynamic>(
      'syncAlarms',
      {'plan': jsonEncode(plan)},
    );
    if (res is Map) return (res['scheduled'] as int?) ?? 0;
    return 0;
  }

  static Future<void> cancelAll() => _channel.invokeMethod('cancelAll');

  /// {version, dirty, canExactAlarm, notificationsEnabled, batteryOptimized,
  ///  canFullScreenIntent}
  static Future<Map<String, dynamic>> getNativeState() async {
    final res = await _channel.invokeMethod<dynamic>('getNativeState');
    return res is Map ? Map<String, dynamic>.from(res) : const {};
  }

  /// Drain the native alarm-event queue. Returns the decoded event list.
  static Future<List<Map<String, dynamic>>> drainEventQueue() async {
    final raw = await _channel.invokeMethod<String>('drainEventQueue');
    if (raw == null || raw.isEmpty) return const [];
    final decoded = jsonDecode(raw);
    if (decoded is! List) return const [];
    return decoded.whereType<Map>().map(Map<String, dynamic>.from).toList();
  }

  /// Put events back if the upload failed.
  static Future<void> requeueEvents(List<Map<String, dynamic>> events) =>
      _channel.invokeMethod('requeueEvents', {'events': jsonEncode(events)});

  static Future<void> openExactAlarmSettings() =>
      _channel.invokeMethod('openExactAlarmSettings');
  static Future<void> openBatteryOptimizationSettings() =>
      _channel.invokeMethod('openBatteryOptimizationSettings');
  static Future<void> openFullScreenIntentSettings() =>
      _channel.invokeMethod('openFullScreenIntentSettings');

  /// Fire a test alarm in [seconds] (device verification hook).
  static Future<void> testAlarm({int seconds = 10}) =>
      _channel.invokeMethod('testAlarm', {'seconds': seconds});

  /// Route extra from a cold-start launch intent (alarm confirm → app open).
  static Future<String?> getLaunchRoute() =>
      _channel.invokeMethod<String>('getLaunchRoute');

  /// Warm-start navigation requests from native (onNewIntent).
  static void setNavigationHandler(void Function(String route) onNavigate) {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'navigateTo' && call.arguments is String) {
        onNavigate(call.arguments as String);
      }
      return null;
    });
  }
}
