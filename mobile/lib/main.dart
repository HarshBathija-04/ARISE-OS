import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/router.dart';
import 'app/theme.dart';
import 'core/alarms/alarm_channel.dart';
import 'core/alarms/alarm_sync_service.dart';
import 'core/api/api_providers.dart';
import 'core/notifications/push_service.dart';

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);

  // Firebase is optional until google-services.json is added — the app must
  // run (and native alarms must work) without push.
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (e) {
    debugPrint('Firebase unavailable (no google-services.json?): $e');
  }

  runApp(const ProviderScope(child: AriseApp()));
}

class AriseApp extends ConsumerStatefulWidget {
  const AriseApp({super.key});

  @override
  ConsumerState<AriseApp> createState() => _AriseAppState();
}

class _AriseAppState extends ConsumerState<AriseApp>
    with WidgetsBindingObserver {
  PushService? _push;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final router = ref.read(routerProvider);

    // Native → Dart warm-start navigation (alarm confirm while app alive).
    AlarmChannel.setNavigationHandler(router.go);

    // Cold-start launch route from the alarm activity's intent extra.
    try {
      final route = await AlarmChannel.getLaunchRoute();
      if (route != null && route.isNotEmpty) router.go(route);
    } catch (_) {/* non-Android or channel unavailable */}

    // Push + alarm sync once signed in (and on later sign-ins).
    Supabase.instance.client.auth.onAuthStateChange.listen((state) {
      if (state.event == AuthChangeEvent.signedIn ||
          state.event == AuthChangeEvent.initialSession) {
        if (Supabase.instance.client.auth.currentSession != null) {
          _onSignedIn(router);
        }
      }
    });
    if (Supabase.instance.client.auth.currentSession != null) {
      _onSignedIn(router);
    }
  }

  void _onSignedIn(dynamic router) {
    final sync = ref.read(alarmSyncServiceProvider);
    _push ??= PushService(
      api: ref.read(apiClientProvider),
      onDeeplink: (route) => router.go(route),
      onResync: () => sync.sync(force: true),
    );
    _push!.init();
    sync.sync();
    sync.flushPendingActions();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        Supabase.instance.client.auth.currentSession != null) {
      final sync = ref.read(alarmSyncServiceProvider);
      // Force-resync if the background FCM handler flagged a remote change.
      PushService.consumeDirtyFlag().then((dirty) => sync.sync(force: dirty));
      sync.flushPendingActions();
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'ARISE//OS',
      debugShowCheckedModeBanner: false,
      theme: buildAriseTheme(),
      routerConfig: router,
    );
  }
}
