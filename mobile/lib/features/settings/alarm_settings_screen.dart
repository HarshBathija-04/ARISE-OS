import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/alarms/alarm_channel.dart';
import '../../core/alarms/alarm_sync_service.dart';
import '../../core/api/api_providers.dart';
import '../timetable/timetable_provider.dart';

/// GET /v1/settings — reuse the shared provider from timetable_provider.
final settingsProvider = userSettingsProvider;

/// Native permission/health state for the banners.
final nativeAlarmStateProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  try {
    return await AlarmChannel.getNativeState();
  } catch (_) {
    return const {};
  }
});

/// Alarm & notification settings — PATCH /v1/settings then resync native alarms.
class AlarmSettingsScreen extends ConsumerStatefulWidget {
  const AlarmSettingsScreen({super.key});

  @override
  ConsumerState<AlarmSettingsScreen> createState() => _AlarmSettingsScreenState();
}

class _AlarmSettingsScreenState extends ConsumerState<AlarmSettingsScreen> {
  final Map<String, dynamic> _patch = {};
  bool _saving = false;

  Future<void> _save() async {
    if (_patch.isEmpty) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/v1/settings', body: Map<String, dynamic>.from(_patch));
      _patch.clear();
      ref.invalidate(settingsProvider);
      // The PATCH bumps timetable_version server-side; force-resync now.
      await ref.read(alarmSyncServiceProvider).sync(force: true);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Settings saved')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Save failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final native = ref.watch(nativeAlarmStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('ALARMS & NOTIFICATIONS'),
        actions: [
          IconButton(
            onPressed: _saving ? null : _save,
            icon: _saving
                ? const SizedBox(
                    width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.save_outlined),
          ),
        ],
      ),
      body: settings.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Failed to load settings: $e')),
        data: (s) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ...native.maybeWhen(
              data: (n) => _permissionBanners(n),
              orElse: () => const <Widget>[],
            ),
            _sectionLabel('SCHEDULE'),
            _timeTile(s, 'reset_time', 'resetTime', 'Daily reset time', '00:00'),
            _timeTile(s, 'evening_reminder_time', 'eveningReminderTime',
                'Evening reminder time', '23:00'),
            _numberTile(s, 'pre_reminder_minutes', 'preReminderMinutes',
                'Pre-reminder lead (min)', 5, 0, 60),
            _numberTile(s, 'alarm_repeat_count', 'alarmRepeatCount',
                'Alarm repeat attempts', 3, 1, 10),
            _sectionLabel('BEHAVIOR'),
            _switchTile(s, 'push_enabled', 'pushEnabled', 'Push notifications'),
            _switchTile(s, 'quest_push_enabled', 'questPushEnabled',
                'Quest reset & reminder pushes'),
            _switchTile(s, 'timetable_alarms_enabled', 'timetableAlarmsEnabled',
                'Timetable alarms'),
            _switchTile(s, 'weekend_alarms', 'weekendAlarms', 'Alarms on weekends'),
            _switchTile(s, 'auto_start_focus', 'autoStartFocus',
                'Auto-start focus on confirm'),
            _sectionLabel('DO NOT DISTURB'),
            _timeTile(s, 'dnd_start', 'dndStart', 'DND start', null),
            _timeTile(s, 'dnd_end', 'dndEnd', 'DND end', null),
            _sectionLabel('DIAGNOSTICS'),
            ListTile(
              leading: const Icon(Icons.alarm_add_outlined),
              title: const Text('Fire test alarm in 10 seconds'),
              subtitle: const Text('Lock the screen after tapping to verify'),
              onTap: () async {
                await AlarmChannel.testAlarm();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Test alarm scheduled (10s)')));
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _permissionBanners(Map<String, dynamic> n) {
    final banners = <Widget>[];
    Widget banner(String text, VoidCallback onFix) => Card(
          color: Colors.amber.withValues(alpha: 0.12),
          child: ListTile(
            leading: const Icon(Icons.warning_amber_outlined, color: Colors.amber),
            title: Text(text, style: const TextStyle(fontSize: 13)),
            trailing: TextButton(onPressed: onFix, child: const Text('FIX')),
          ),
        );
    if (n['canExactAlarm'] == false) {
      banners.add(banner('Exact alarms are disabled — alarms may be late.',
          AlarmChannel.openExactAlarmSettings));
    }
    if (n['notificationsEnabled'] == false) {
      banners.add(banner('Notifications are blocked for Arise OS.',
          AlarmChannel.openBatteryOptimizationSettings));
    }
    if (n['canFullScreenIntent'] == false) {
      banners.add(banner('Full-screen alarms are not permitted.',
          AlarmChannel.openFullScreenIntentSettings));
    }
    if (n['batteryOptimized'] == true) {
      banners.add(banner('Battery optimization may delay alarms.',
          AlarmChannel.openBatteryOptimizationSettings));
    }
    return banners;
  }

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(top: 20, bottom: 6, left: 4),
        child: Text(text,
            style: TextStyle(
              fontSize: 11,
              letterSpacing: 2,
              color: Theme.of(context).colorScheme.primary,
            )),
      );

  String? _current(Map<String, dynamic> s, String dbKey, String patchKey) =>
      (_patch[patchKey] ?? s[dbKey])?.toString();

  Widget _switchTile(Map<String, dynamic> s, String dbKey, String patchKey, String label) {
    final value = (_patch[patchKey] as bool?) ?? (s[dbKey] as bool? ?? true);
    return SwitchListTile(
      title: Text(label),
      value: value,
      onChanged: (v) => setState(() => _patch[patchKey] = v),
    );
  }

  Widget _numberTile(Map<String, dynamic> s, String dbKey, String patchKey,
      String label, int fallback, int min, int max) {
    final value = (_patch[patchKey] as int?) ?? (s[dbKey] as num?)?.toInt() ?? fallback;
    return ListTile(
      title: Text(label),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.remove),
            onPressed: value > min ? () => setState(() => _patch[patchKey] = value - 1) : null,
          ),
          Text('$value'),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: value < max ? () => setState(() => _patch[patchKey] = value + 1) : null,
          ),
        ],
      ),
    );
  }

  Widget _timeTile(Map<String, dynamic> s, String dbKey, String patchKey,
      String label, String? fallback) {
    final current = _current(s, dbKey, patchKey) ?? fallback;
    return ListTile(
      title: Text(label),
      trailing: Text(current ?? 'Off'),
      onTap: () async {
        final parts = (current ?? '00:00').split(':');
        final picked = await showTimePicker(
          context: context,
          initialTime: TimeOfDay(
            hour: int.tryParse(parts[0]) ?? 0,
            minute: int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0,
          ),
        );
        if (picked != null) {
          setState(() => _patch[patchKey] =
              '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}');
        }
      },
      onLongPress: fallback == null
          ? () => setState(() => _patch[patchKey] = null) // clear DND bound
          : null,
    );
  }
}
