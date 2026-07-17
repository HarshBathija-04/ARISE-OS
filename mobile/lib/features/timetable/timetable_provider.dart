import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_providers.dart';
import '../../core/models/models.dart';
import '../dashboard/dashboard_provider.dart';

/// Day-type variants the user can switch between. 'ALL' blocks are always
/// included by the API, so only the concrete variants are selectable.
const timetableDayTypes = ['OFFICE', 'WFH', 'WEEKEND'];

const timetableCategories = [
  'STUDY',
  'EXERCISE',
  'MORNING_ROUTINE',
  'BATH',
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'GAMING',
  'BREAK',
  'SLEEP',
  'WORK',
  'COMMUTE',
  'NETWORKING',
];

/// Selected schedule variant. Defaults to WEEKEND on Sat/Sun, OFFICE
/// otherwise.
final timetableDayTypeProvider = StateProvider<String>((ref) {
  final weekday = DateTime.now().weekday;
  final isWeekend =
      weekday == DateTime.saturday || weekday == DateTime.sunday;
  return isWeekend ? 'WEEKEND' : 'OFFICE';
});

class TimetableData {
  TimetableData({
    required this.blocks,
    required this.states,
    required this.excuses,
  });

  final List<TimetableBlock> blocks;
  final Map<String, String> states; // blockId → state
  final Map<String, String> excuses; // blockId → reason (EXCUSED today)

  String stateFor(String blockId) => states[blockId] ?? 'UPCOMING';

  String? excuseFor(String blockId) => excuses[blockId];
}

Map<String, String> _stringMap(Object? raw) {
  final out = <String, String>{};
  if (raw is Map<String, dynamic>) {
    for (final entry in raw.entries) {
      out[entry.key] = entry.value.toString();
    }
  }
  return out;
}

/// GET /v1/timetable?dayType=X → {blocks, states, excuses}
final timetableProvider = FutureProvider<TimetableData>((ref) async {
  final api = ref.watch(apiClientProvider);
  final dayType = ref.watch(timetableDayTypeProvider);
  final json = await api.get('/v1/timetable', query: {'dayType': dayType});
  final blocks = (json['blocks'] as List? ?? const [])
      .whereType<Map<String, dynamic>>()
      .map(TimetableBlock.fromJson)
      .toList()
    ..sort((a, b) => a.startMinutes.compareTo(b.startMinutes));
  final states = _stringMap(json['states']);
  final rawStates = json['states'];
  if (rawStates is List) {
    for (final row in rawStates) {
      if (row is Map<String, dynamic>) {
        final s = BlockState.fromJson(row);
        states[s.blockId] = s.state;
      }
    }
  }
  return TimetableData(
    blocks: blocks,
    states: states,
    excuses: _stringMap(json['excuses']),
  );
});

/// GET /v1/settings → raw settings map (reused from alarm_settings_screen).
final userSettingsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final json = await api.get('/v1/settings');
  return (json['settings'] as Map<String, dynamic>?) ?? const {};
});

class TimetableActions {
  TimetableActions(this._ref);
  final Ref _ref;

  /// POST /v1/timetable/blocks/:id/state {state, reason?} — `reason` is only
  /// meaningful with state EXCUSED (exception raised for a valid reason).
  Future<void> setState(String blockId, String state, {String? reason}) async {
    await _ref
        .read(apiClientProvider)
        .post('/v1/timetable/blocks/$blockId/state', body: {
      'state': state,
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
    });
    _invalidate();
  }

  Future<void> logStudy({
    required String blockId,
    required String subject,
    required int durationMinutes,
    int? deepWorkScore,
    int? distractions,
    String? notes,
  }) async {
    await _ref.read(apiClientProvider).post('/v1/timetable/study', body: {
      'blockId': blockId,
      'subject': subject,
      'durationMinutes': durationMinutes,
      if (deepWorkScore != null) 'deepWorkScore': deepWorkScore,
      if (distractions != null) 'distractions': distractions,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
    _invalidate();
  }

  /// POST /v1/timetable/blocks — add a new block.
  Future<void> addBlock({
    required int startHour,
    required int startMin,
    required int endHour,
    required int endMin,
    required String activity,
    required String category,
    String? dayType,
  }) async {
    await _ref.read(apiClientProvider).post('/v1/timetable/blocks', body: {
      'startHour': startHour,
      'startMin': startMin,
      'endHour': endHour,
      'endMin': endMin,
      'activity': activity,
      'category': category,
      if (dayType != null) 'dayType': dayType,
    });
    _invalidate();
  }

  /// PATCH /v1/timetable/blocks/:id — edit an existing block.
  Future<void> editBlock(String blockId, {
    int? startHour,
    int? startMin,
    int? endHour,
    int? endMin,
    String? activity,
    String? category,
    String? dayType,
  }) async {
    await _ref.read(apiClientProvider).patch('/v1/timetable/blocks/$blockId', body: {
      if (startHour != null) 'startHour': startHour,
      if (startMin != null) 'startMin': startMin,
      if (endHour != null) 'endHour': endHour,
      if (endMin != null) 'endMin': endMin,
      if (activity != null) 'activity': activity,
      if (category != null) 'category': category,
      if (dayType != null) 'dayType': dayType,
    });
    _invalidate();
  }

  /// DELETE /v1/timetable/blocks/:id — remove a block.
  Future<void> deleteBlock(String blockId) async {
    await _ref.read(apiClientProvider).delete('/v1/timetable/blocks/$blockId');
    _invalidate();
  }

  /// PATCH /v1/settings — toggle timetable alarms on/off.
  Future<void> toggleAlarms(bool enabled) async {
    await _ref.read(apiClientProvider).patch('/v1/settings', body: {
      'timetableAlarmsEnabled': enabled,
    });
    _ref.invalidate(userSettingsProvider);
  }

  void _invalidate() {
    _ref.invalidate(timetableProvider);
    _ref.invalidate(dashboardProvider);
  }
}

final timetableActionsProvider =
    Provider<TimetableActions>(TimetableActions.new);
