import 'dart:io' show Platform;
import 'dart:math';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';

/// Dart-side dirty flag: set by the background FCM handler, consumed by
/// AlarmSyncService on the next resume. (The custom alarm MethodChannel is
/// registered on the main activity's engine only, so the background isolate
/// cannot reschedule native alarms directly — it marks work instead. Native
/// alarms remain correct from the last stored plan; only remote edits wait
/// for the next resume / 6-hour WorkManager pass.)
const alarmDirtyKey = 'arise-alarm-plan-dirty';

/// Background FCM handler — its own isolate, cold engine.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (message.data['type'] != 'resync') return;
  try {
    await Firebase.initializeApp();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(alarmDirtyKey, true);
  } catch (e) {
    debugPrint('background resync flag failed: $e');
  }
}

/// Foreground push wiring: permission, token registration, refresh handling,
/// tap-to-deeplink, and resync-message dispatch.
class PushService {
  PushService({
    required this.api,
    required this.onDeeplink,
    required this.onResync,
  });

  final ApiClient api;
  final void Function(String route) onDeeplink;
  final Future<void> Function() onResync;

  static const _deviceIdKey = 'arise-device-id';

  bool get _supported => !kIsWeb && Platform.isAndroid;

  Future<String> deviceId() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(_deviceIdKey);
    if (id == null) {
      final rand = Random.secure();
      id = List.generate(24, (_) => rand.nextInt(36).toRadixString(36)).join();
      await prefs.setString(_deviceIdKey, id);
    }
    return id;
  }

  /// Whether the background handler flagged a pending alarm resync.
  static Future<bool> consumeDirtyFlag() async {
    final prefs = await SharedPreferences.getInstance();
    final dirty = prefs.getBool(alarmDirtyKey) ?? false;
    if (dirty) await prefs.setBool(alarmDirtyKey, false);
    return dirty;
  }

  /// Call after sign-in. Safe to call repeatedly.
  Future<void> init() async {
    if (!_supported) return;
    if (Firebase.apps.isEmpty) return; // no google-services.json yet

    final messaging = FirebaseMessaging.instance;
    final settings = await messaging.requestPermission();
    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    final token = await messaging.getToken();
    if (token != null) await _register(token);
    messaging.onTokenRefresh.listen(_register);

    // Foreground messages: resync signals act immediately; display pushes
    // surface via the in-app notifications panel (realtime already updates it).
    FirebaseMessaging.onMessage.listen((message) {
      if (message.data['type'] == 'resync') onResync();
    });

    // Notification taps (app in background, not killed).
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      final deeplink = message.data['deeplink'];
      if (deeplink is String && deeplink.isNotEmpty) onDeeplink(deeplink);
    });

    // Cold-start from a notification tap.
    final initial = await messaging.getInitialMessage();
    final initialLink = initial?.data['deeplink'];
    if (initialLink is String && initialLink.isNotEmpty) onDeeplink(initialLink);
  }

  Future<void> _register(String token) async {
    try {
      await api.post('/v1/devices', body: {
        'platform': 'ANDROID',
        'fcmToken': token,
        'deviceId': await deviceId(),
        'deviceName': Platform.operatingSystemVersion,
      });
    } catch (e) {
      debugPrint('device registration failed: $e');
    }
  }

  Future<void> unregister() async {
    if (!_supported) return;
    try {
      await api.delete('/v1/devices/${await deviceId()}');
    } catch (_) {/* best-effort on sign-out */}
  }
}
