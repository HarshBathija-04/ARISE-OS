import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Tables the app cares about; postgres_changes events on these (filtered to
/// the signed-in user) emit the table name on [tableChanges].
const _watchedTables = [
  'player_profiles',
  'quests',
  'streaks',
  'notifications',
  'timetable_blocks',
  'timetable_block_logs',
  'habit_logs',
];

/// Single realtime channel subscribing to postgres_changes for the watched
/// tables. Exposes a broadcast stream of table names that changed.
class RealtimeService {
  RealtimeService(this._client);

  final SupabaseClient _client;
  final _controller = StreamController<String>.broadcast();
  RealtimeChannel? _channel;

  Stream<String> get tableChanges => _controller.stream;

  void start() {
    final uid = _client.auth.currentUser?.id;
    if (uid == null || _channel != null) return;

    var channel = _client.channel('arise-db-changes');
    for (final table in _watchedTables) {
      channel = channel.onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: table,
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'user_id',
          value: uid,
        ),
        callback: (payload) => _controller.add(table),
      );
    }
    _channel = channel..subscribe();
  }

  Future<void> stop() async {
    final ch = _channel;
    _channel = null;
    if (ch != null) await _client.removeChannel(ch);
  }

  Future<void> dispose() async {
    await stop();
    await _controller.close();
  }
}

final realtimeServiceProvider = Provider<RealtimeService>((ref) {
  final service = RealtimeService(Supabase.instance.client);
  ref.onDispose(service.dispose);
  return service;
});
