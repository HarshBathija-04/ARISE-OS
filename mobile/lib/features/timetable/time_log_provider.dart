import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_providers.dart';
import '../../core/models/json.dart';
import '../dashboard/dashboard_provider.dart';

/// Time Log — the "reality" layer over the planned timetable. Entries record
/// what the user ACTUALLY did; the backend AI-classifies each one and awards
/// XP / skill progress, overriding the schedule where they overlap.

const timeLogCategories = [
  'STUDY',
  'CODING',
  'AIML',
  'READING',
  'WRITING',
  'FITNESS',
  'HEALTH',
  'FINANCE',
  'BUSINESS',
  'PERSONAL',
  'ENTERTAINMENT',
  'SOCIAL',
  'REST',
];

class TimeLogAnalysis {
  TimeLogAnalysis({
    required this.provider,
    required this.category,
    required this.difficulty,
    required this.productivityScore,
    required this.focusScore,
    required this.suggestedSkill,
    required this.xpMultiplier,
    required this.isProductive,
    required this.isDeepWork,
    required this.insights,
  });

  final String provider;
  final String category;
  final String difficulty;
  final int productivityScore;
  final int focusScore;
  final String suggestedSkill;
  final double xpMultiplier;
  final bool isProductive;
  final bool isDeepWork;
  final String insights;

  factory TimeLogAnalysis.fromJson(Map<String, dynamic> json) =>
      TimeLogAnalysis(
        provider: pickString(json, ['provider'], fallback: 'heuristic'),
        category: pickString(json, ['category'], fallback: 'PERSONAL'),
        difficulty: pickString(json, ['difficulty'], fallback: 'MEDIUM'),
        productivityScore:
            pickInt(json, ['productivityScore', 'productivity_score']),
        focusScore: pickInt(json, ['focusScore', 'focus_score']),
        suggestedSkill:
            pickString(json, ['suggestedSkill', 'suggested_skill']),
        xpMultiplier:
            pickDouble(json, ['xpMultiplier', 'xp_multiplier'], fallback: 1),
        isProductive: pickBool(json, ['isProductive', 'is_productive']),
        isDeepWork: pickBool(json, ['isDeepWork', 'is_deep_work']),
        insights: pickString(json, ['insights']),
      );
}

class TimeLogEntry {
  TimeLogEntry({
    required this.id,
    required this.startHour,
    required this.startMin,
    required this.endHour,
    required this.endMin,
    required this.activity,
    required this.category,
    required this.description,
    required this.notes,
    required this.mood,
    required this.energyLevel,
    required this.location,
    required this.aiSummary,
    required this.xpAwarded,
    required this.skillXp,
    required this.tags,
    required this.analysis,
  });

  final String id;
  final int startHour;
  final int startMin;
  final int endHour;
  final int endMin;
  final String activity;
  final String category;
  final String description;
  final String notes;
  final String mood;
  final int? energyLevel;
  final String location;
  final String aiSummary;
  final int xpAwarded;
  final int skillXp;
  final List<String> tags;
  final TimeLogAnalysis? analysis;

  int get startMinutes => startHour * 60 + startMin;

  int get durationMinutes {
    final start = startMinutes;
    var end = endHour * 60 + endMin;
    if (end <= start) end += 24 * 60;
    return end - start;
  }

  String get timeLabel => '${_fmt(startHour, startMin)} – ${_fmt(endHour, endMin)}';

  static String _fmt(int h, int m) =>
      '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';

  factory TimeLogEntry.fromJson(Map<String, dynamic> json) {
    final rawAnalysis = json['analysis'];
    final analysisMap = rawAnalysis is List
        ? (rawAnalysis.isNotEmpty ? rawAnalysis.first : null)
        : rawAnalysis;
    final energy = pickInt(json, ['energyLevel', 'energy_level'], fallback: -1);
    return TimeLogEntry(
      id: pickString(json, ['id']),
      startHour: pickInt(json, ['startHour', 'start_hour']),
      startMin: pickInt(json, ['startMin', 'start_min']),
      endHour: pickInt(json, ['endHour', 'end_hour']),
      endMin: pickInt(json, ['endMin', 'end_min']),
      activity: pickString(json, ['activity']),
      category: pickString(json, ['category'], fallback: 'PERSONAL'),
      description: pickString(json, ['description']),
      notes: pickString(json, ['notes']),
      mood: pickString(json, ['mood']),
      energyLevel: energy > 0 ? energy : null,
      location: pickString(json, ['location']),
      aiSummary: pickString(json, ['aiSummary', 'ai_summary']),
      xpAwarded: pickInt(json, ['xpAwarded', 'xp_awarded']),
      skillXp: pickInt(json, ['skillXp', 'skill_xp']),
      tags: (json['tags'] as List? ?? const [])
          .map((t) => t is Map<String, dynamic>
              ? pickString(t, ['tag'])
              : t.toString())
          .where((t) => t.isNotEmpty)
          .toList(),
      analysis: analysisMap is Map<String, dynamic>
          ? TimeLogAnalysis.fromJson(analysisMap)
          : null,
    );
  }
}

/// The day the Time Log tab shows, as YYYY-MM-DD.
final timeLogDateProvider = StateProvider<String>((ref) {
  final now = DateTime.now();
  return '${now.year.toString().padLeft(4, '0')}-'
      '${now.month.toString().padLeft(2, '0')}-'
      '${now.day.toString().padLeft(2, '0')}';
});

/// GET /v1/time-logs?date=YYYY-MM-DD
final timeLogsProvider = FutureProvider<List<TimeLogEntry>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final date = ref.watch(timeLogDateProvider);
  final json = await api.get('/v1/time-logs', query: {'date': date});
  return (json['logs'] as List? ?? const [])
      .whereType<Map<String, dynamic>>()
      .map(TimeLogEntry.fromJson)
      .toList()
    ..sort((a, b) => a.startMinutes.compareTo(b.startMinutes));
});

/// GET /v1/time-logs/analytics?days=7 — planned vs actual rollup.
final timeLogAnalyticsProvider =
    FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final json = await api.get('/v1/time-logs/analytics', query: {'days': 7});
  return (json['analytics'] as Map<String, dynamic>?) ?? const {};
});

class TimeLogActions {
  TimeLogActions(this._ref);
  final Ref _ref;

  /// POST /v1/time-logs → {log, xpAwarded, skillXp}
  Future<Map<String, dynamic>> create({
    required String date,
    required int startHour,
    required int startMin,
    required int endHour,
    required int endMin,
    required String activity,
    String? category,
    String? description,
    String? notes,
    String? mood,
    int? energyLevel,
    String? location,
    List<String>? tags,
  }) async {
    final json = await _ref.read(apiClientProvider).post('/v1/time-logs', body: {
      'date': date,
      'startHour': startHour,
      'startMin': startMin,
      'endHour': endHour,
      'endMin': endMin,
      'activity': activity,
      if (category != null && category.isNotEmpty) 'category': category,
      if (description != null && description.isNotEmpty)
        'description': description,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
      if (mood != null && mood.isNotEmpty) 'mood': mood,
      if (energyLevel != null) 'energyLevel': energyLevel,
      if (location != null && location.isNotEmpty) 'location': location,
      if (tags != null && tags.isNotEmpty) 'tags': tags,
    });
    _invalidate();
    return json;
  }

  /// POST /v1/time-logs/analyze — AI classification + XP preview (no save).
  Future<Map<String, dynamic>> analyze({
    required int startHour,
    required int startMin,
    required int endHour,
    required int endMin,
    required String activity,
    String? category,
    String? description,
    int? energyLevel,
  }) {
    return _ref.read(apiClientProvider).post('/v1/time-logs/analyze', body: {
      'startHour': startHour,
      'startMin': startMin,
      'endHour': endHour,
      'endMin': endMin,
      'activity': activity,
      if (category != null && category.isNotEmpty) 'category': category,
      if (description != null && description.isNotEmpty)
        'description': description,
      if (energyLevel != null) 'energyLevel': energyLevel,
    });
  }

  /// PATCH /v1/time-logs/:id
  Future<void> update(String id, Map<String, Object?> updates) async {
    await _ref.read(apiClientProvider).patch('/v1/time-logs/$id',
        body: updates..removeWhere((_, v) => v == null));
    _invalidate();
  }

  /// DELETE /v1/time-logs/:id
  Future<void> delete(String id) async {
    await _ref.read(apiClientProvider).delete('/v1/time-logs/$id');
    _invalidate();
  }

  void _invalidate() {
    _ref.invalidate(timeLogsProvider);
    _ref.invalidate(timeLogAnalyticsProvider);
    _ref.invalidate(dashboardProvider);
  }
}

final timeLogActionsProvider = Provider<TimeLogActions>(TimeLogActions.new);
