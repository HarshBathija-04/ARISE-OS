import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_providers.dart';
import '../../core/models/models.dart';
import '../dashboard/dashboard_provider.dart';

/// GET /v1/focus/today — today's completed/started sessions.
final focusTodayProvider = FutureProvider<List<FocusSession>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final json = await api.get('/v1/focus/today');
  return (json['sessions'] as List? ?? const [])
      .whereType<Map<String, dynamic>>()
      .map(FocusSession.fromJson)
      .toList();
});

/// Local ticking-timer state for the active focus session.
class FocusState {
  const FocusState({
    this.sessionId,
    this.category,
    this.plannedMinutes = 25,
    this.elapsed = Duration.zero,
    this.running = false,
  });

  final String? sessionId;
  final String? category;
  final int plannedMinutes;
  final Duration elapsed;
  final bool running;

  bool get active => sessionId != null;
  Duration get planned => Duration(minutes: plannedMinutes);
  Duration get remaining =>
      planned - elapsed < Duration.zero ? Duration.zero : planned - elapsed;
  bool get overtime => elapsed >= planned;

  FocusState copyWith({
    String? sessionId,
    String? category,
    int? plannedMinutes,
    Duration? elapsed,
    bool? running,
  }) =>
      FocusState(
        sessionId: sessionId ?? this.sessionId,
        category: category ?? this.category,
        plannedMinutes: plannedMinutes ?? this.plannedMinutes,
        elapsed: elapsed ?? this.elapsed,
        running: running ?? this.running,
      );

  static const idle = FocusState();
}

/// Drives the focus session lifecycle: start → tick locally → complete/abandon
/// with the actual elapsed minutes.
class FocusController extends StateNotifier<FocusState> {
  FocusController(this._ref) : super(FocusState.idle);

  final Ref _ref;
  Timer? _ticker;
  DateTime? _startedAt;

  Future<void> start({required String category, required int plannedMinutes}) async {
    final api = _ref.read(apiClientProvider);
    final json = await api.post('/v1/focus/start', body: {
      'category': category,
      'plannedMinutes': plannedMinutes,
    });
    _adoptSession(
      sessionId: json['sessionId']?.toString(),
      category: category,
      plannedMinutes: plannedMinutes,
      startedAt: DateTime.now(),
    );
  }

  /// Attach to a focus session created elsewhere (e.g. by the backend when an
  /// alarm Confirm auto-starts one) and begin ticking from [startedAt].
  void adopt({
    required String sessionId,
    required String category,
    required int plannedMinutes,
    DateTime? startedAt,
  }) {
    _adoptSession(
      sessionId: sessionId,
      category: category,
      plannedMinutes: plannedMinutes,
      startedAt: startedAt ?? DateTime.now(),
    );
    _ref.invalidate(focusTodayProvider);
  }

  void _adoptSession({
    required String? sessionId,
    required String category,
    required int plannedMinutes,
    required DateTime startedAt,
  }) {
    _startedAt = startedAt;
    state = FocusState(
      sessionId: sessionId,
      category: category,
      plannedMinutes: plannedMinutes,
      elapsed: DateTime.now().difference(startedAt),
      running: true,
    );
    _ticker?.cancel();
    // Recompute from wall clock each tick so backgrounding doesn't drift.
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      final started = _startedAt;
      if (started == null) return;
      state = state.copyWith(elapsed: DateTime.now().difference(started));
    });
  }

  /// result: COMPLETE | PARTIAL | ABANDONED
  Future<AwardResult> finish(String result) async {
    final id = state.sessionId;
    if (id == null) {
      throw StateError('No active focus session');
    }
    final actualMinutes = state.elapsed.inMinutes.clamp(0, 600);
    final api = _ref.read(apiClientProvider);
    final json = await api.post('/v1/focus/$id/complete', body: {
      'actualMinutes': actualMinutes,
      'result': result,
    });
    _reset();
    _ref.invalidate(focusTodayProvider);
    _ref.invalidate(dashboardProvider);
    return AwardResult.fromJson(
        (json['award'] as Map<String, dynamic>?) ?? const {});
  }

  void _reset() {
    _ticker?.cancel();
    _ticker = null;
    _startedAt = null;
    state = FocusState.idle;
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }
}

final focusControllerProvider =
    StateNotifierProvider<FocusController, FocusState>(FocusController.new);
