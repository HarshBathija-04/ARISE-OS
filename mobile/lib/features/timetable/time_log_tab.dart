import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../core/widgets/widgets.dart';
import '../../core/widgets/award_feedback.dart';
import 'time_log_provider.dart';

Color _logCategoryColor(String category) {
  switch (category) {
    case 'STUDY':
    case 'READING':
      return AriseColors.blue;
    case 'CODING':
      return AriseColors.violetBright;
    case 'AIML':
    case 'WRITING':
      return AriseColors.violet;
    case 'FITNESS':
    case 'HEALTH':
      return AriseColors.success;
    case 'FINANCE':
    case 'BUSINESS':
      return AriseColors.gold;
    case 'ENTERTAINMENT':
    case 'SOCIAL':
    case 'REST':
      return AriseColors.textDim;
    default:
      return AriseColors.grey;
  }
}

IconData _logCategoryIcon(String category) {
  switch (category) {
    case 'STUDY':
      return Icons.menu_book_outlined;
    case 'CODING':
      return Icons.code;
    case 'AIML':
      return Icons.psychology_outlined;
    case 'READING':
      return Icons.auto_stories_outlined;
    case 'WRITING':
      return Icons.edit_note_outlined;
    case 'FITNESS':
      return Icons.fitness_center;
    case 'HEALTH':
      return Icons.favorite_outline;
    case 'FINANCE':
      return Icons.account_balance_outlined;
    case 'BUSINESS':
      return Icons.business_center_outlined;
    case 'ENTERTAINMENT':
      return Icons.sports_esports_outlined;
    case 'SOCIAL':
      return Icons.groups_outlined;
    case 'REST':
      return Icons.self_improvement_outlined;
    default:
      return Icons.circle_outlined;
  }
}

/// The Time Log tab body — the "reality" timeline for a selected day, with
/// quick add, AI classification preview and per-entry analysis details.
class TimeLogTab extends ConsumerStatefulWidget {
  const TimeLogTab({super.key});

  @override
  ConsumerState<TimeLogTab> createState() => _TimeLogTabState();
}

class _TimeLogTabState extends ConsumerState<TimeLogTab> {
  void _shiftDay(int delta) {
    final current = ref.read(timeLogDateProvider);
    final d = DateTime.parse('${current}T00:00:00Z').add(Duration(days: delta));
    ref.read(timeLogDateProvider.notifier).state =
        d.toIso8601String().substring(0, 10);
  }

  String get _todayKey {
    final now = DateTime.now();
    return '${now.year.toString().padLeft(4, '0')}-'
        '${now.month.toString().padLeft(2, '0')}-'
        '${now.day.toString().padLeft(2, '0')}';
  }

  void _showEditor({TimeLogEntry? log}) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AriseColors.panel,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
        ),
        child: _TimeLogEditorSheet(log: log),
      ),
    );
  }

  void _confirmDelete(TimeLogEntry log) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('DELETE LOG',
            style: Theme.of(context).textTheme.titleSmall),
        content: Text(
          'Delete "${log.activity}" (${log.timeLabel})?',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('CANCEL'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AriseColors.danger),
            onPressed: () async {
              Navigator.of(dialogContext).pop();
              try {
                await ref.read(timeLogActionsProvider).delete(log.id);
              } catch (e) {
                if (mounted) showErrorSnack(context, e);
              }
            },
            child: const Text('DELETE'),
          ),
        ],
      ),
    );
  }

  Future<void> _pickDate() async {
    final current = ref.read(timeLogDateProvider);
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(current) ?? DateTime.now(),
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      ref.read(timeLogDateProvider.notifier).state =
          picked.toIso8601String().substring(0, 10);
    }
  }

  @override
  Widget build(BuildContext context) {
    final logs = ref.watch(timeLogsProvider);
    final date = ref.watch(timeLogDateProvider);
    final history = ref.watch(timeLogHistoryModeProvider);
    final isToday = date == _todayKey;

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton(
        heroTag: 'time-log-add',
        backgroundColor: AriseColors.violetBright,
        onPressed: () => _showEditor(),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: Column(
        children: [
          // By Day / History switcher
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
            child: Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Center(
                      child: Text('BY DAY',
                          style: TextStyle(
                              fontSize: 11,
                              letterSpacing: 1,
                              fontWeight: FontWeight.w700)),
                    ),
                    selected: !history,
                    showCheckmark: false,
                    selectedColor: AriseColors.violetBright,
                    backgroundColor: AriseColors.panel,
                    labelStyle: TextStyle(
                        color: !history
                            ? AriseColors.bg
                            : AriseColors.textDim),
                    side: BorderSide(
                        color: AriseColors.violet.withValues(alpha: 0.3)),
                    onSelected: (_) => ref
                        .read(timeLogHistoryModeProvider.notifier)
                        .state = false,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Center(
                      child: Text('HISTORY',
                          style: TextStyle(
                              fontSize: 11,
                              letterSpacing: 1,
                              fontWeight: FontWeight.w700)),
                    ),
                    selected: history,
                    showCheckmark: false,
                    selectedColor: AriseColors.violetBright,
                    backgroundColor: AriseColors.panel,
                    labelStyle: TextStyle(
                        color: history
                            ? AriseColors.bg
                            : AriseColors.textDim),
                    side: BorderSide(
                        color: AriseColors.violet.withValues(alpha: 0.3)),
                    onSelected: (_) => ref
                        .read(timeLogHistoryModeProvider.notifier)
                        .state = true,
                  ),
                ),
              ],
            ),
          ),
          // Day switcher (day view only)
          if (!history)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 4),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left,
                        color: AriseColors.textDim),
                    onPressed: () => _shiftDay(-1),
                  ),
                  Expanded(
                    child: Center(
                      child: TextButton.icon(
                        onPressed: _pickDate,
                        icon: const Icon(Icons.calendar_month_outlined,
                            size: 16, color: AriseColors.textDim),
                        label: Text(
                          isToday ? 'TODAY' : date,
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.chevron_right,
                        color: isToday
                            ? AriseColors.textDim.withValues(alpha: 0.3)
                            : AriseColors.textDim),
                    onPressed: isToday ? null : () => _shiftDay(1),
                  ),
                ],
              ),
            ),
          Expanded(
            child: RefreshIndicator(
              color: AriseColors.blue,
              onRefresh: () async => ref.invalidate(timeLogsProvider),
              child: AsyncValueView<List<TimeLogEntry>>(
                value: logs,
                onRetry: () => ref.invalidate(timeLogsProvider),
                data: (entries) => entries.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: const [
                          SizedBox(height: 120),
                          Center(
                            child: Text(
                              'NOTHING LOGGED YET.\nRECORD WHAT YOU ACTUALLY DID\nAND EARN THE XP YOU DESERVE.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  color: AriseColors.textDim,
                                  letterSpacing: 2),
                            ),
                          ),
                        ],
                      )
                    : history
                        ? _buildHistoryList(entries)
                        : ListView.builder(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding:
                                const EdgeInsets.only(top: 8, bottom: 88),
                            itemCount: entries.length,
                            itemBuilder: (context, i) => _TimeLogTile(
                              log: entries[i],
                              onEdit: () => _showEditor(log: entries[i]),
                              onDelete: () => _confirmDelete(entries[i]),
                            ),
                          ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// History mode: flat list with a day header row before each new day.
  Widget _buildHistoryList(List<TimeLogEntry> entries) {
    final items = <Widget>[];
    String? lastDay;
    for (final log in entries) {
      if (log.date != lastDay) {
        lastDay = log.date;
        final dayXp = entries
            .where((l) => l.date == log.date)
            .fold<int>(0, (s, l) => s + l.xpAwarded);
        items.add(Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 2),
          child: Row(
            children: [
              Text(
                log.date == _todayKey ? 'TODAY' : log.date,
                style: const TextStyle(
                  color: AriseColors.violetBright,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
              const Spacer(),
              if (dayXp > 0)
                Text(
                  '+$dayXp XP',
                  style: const TextStyle(
                      color: AriseColors.gold, fontSize: 11),
                ),
            ],
          ),
        ));
      }
      items.add(_TimeLogTile(
        log: log,
        onEdit: () => _showEditor(log: log),
        onDelete: () => _confirmDelete(log),
      ));
    }
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(top: 4, bottom: 88),
      children: items,
    );
  }
}

class _TimeLogTile extends StatelessWidget {
  const _TimeLogTile({
    required this.log,
    required this.onEdit,
    required this.onDelete,
  });

  final TimeLogEntry log;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final color = _logCategoryColor(log.category);
    final a = log.analysis;

    return SystemPanel(
      glowColor: color,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: EdgeInsets.zero,
          childrenPadding: const EdgeInsets.only(bottom: 8),
          title: Row(
            children: [
              SizedBox(
                width: 92,
                child: Text(
                  log.timeLabel,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontFamilyFallback: ['Courier'],
                    fontSize: 12,
                    color: AriseColors.textDim,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              Icon(_logCategoryIcon(log.category), size: 16, color: color),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(log.activity,
                        style: Theme.of(context).textTheme.bodyMedium),
                    Text(
                      '${log.category}  ·  ${log.durationMinutes}m'
                      '${log.xpAwarded > 0 ? '  ·  +${log.xpAwarded} XP' : ''}'
                      '${log.skillXp > 0 ? '  ·  +${log.skillXp} skill' : ''}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              if (a?.isDeepWork ?? false)
                const Padding(
                  padding: EdgeInsets.only(left: 4),
                  child: Icon(Icons.local_fire_department,
                      size: 16, color: AriseColors.gold),
                ),
            ],
          ),
          children: [
            if (log.description.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(log.description,
                      style: Theme.of(context).textTheme.bodySmall),
                ),
              ),
            if (a != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AriseColors.violet.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: AriseColors.violet.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('AI ANALYSIS · ${a.provider.toUpperCase()}',
                        style: const TextStyle(
                          color: AriseColors.violetBright,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1,
                        )),
                    const SizedBox(height: 6),
                    Text(
                      'Productivity ${a.productivityScore}/100  ·  '
                      'Focus ${a.focusScore}/100  ·  ${a.difficulty}'
                      '${a.suggestedSkill.isNotEmpty ? '  ·  ${a.suggestedSkill}' : ''}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if ((a.insights.isNotEmpty
                            ? a.insights
                            : log.aiSummary)
                        .isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        a.insights.isNotEmpty ? a.insights : log.aiSummary,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
              ),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined,
                      size: 16, color: AriseColors.blue),
                  label: const Text('EDIT',
                      style: TextStyle(color: AriseColors.blue)),
                ),
                TextButton.icon(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline,
                      size: 16, color: AriseColors.danger),
                  label: const Text('DELETE',
                      style: TextStyle(color: AriseColors.danger)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Add / Edit sheet with live AI preview ─────────────────────────

class _TimeLogEditorSheet extends ConsumerStatefulWidget {
  const _TimeLogEditorSheet({this.log});

  final TimeLogEntry? log;

  @override
  ConsumerState<_TimeLogEditorSheet> createState() =>
      _TimeLogEditorSheetState();
}

class _TimeLogEditorSheetState extends ConsumerState<_TimeLogEditorSheet> {
  late final TextEditingController _activity;
  late final TextEditingController _description;
  late final TextEditingController _notes;
  late final TextEditingController _tags;
  String _category = '';
  late TimeOfDay _start;
  late TimeOfDay _end;
  int _energy = 7;
  bool _saving = false;

  Map<String, dynamic>? _preview;
  bool _previewBusy = false;
  Timer? _previewTimer;

  bool get _isEdit => widget.log != null;

  @override
  void initState() {
    super.initState();
    final l = widget.log;
    _activity = TextEditingController(text: l?.activity ?? '');
    _description = TextEditingController(text: l?.description ?? '');
    _notes = TextEditingController(text: l?.notes ?? '');
    _tags = TextEditingController(text: l?.tags.join(', ') ?? '');
    _category = l?.category ?? '';
    _energy = l?.energyLevel ?? 7;
    final now = TimeOfDay.now();
    _start = l != null
        ? TimeOfDay(hour: l.startHour, minute: l.startMin)
        : TimeOfDay(hour: (now.hour - 1).clamp(0, 23), minute: 0);
    _end = l != null
        ? TimeOfDay(hour: l.endHour, minute: l.endMin)
        : TimeOfDay(hour: now.hour, minute: 0);
    _activity.addListener(_schedulePreview);
    _description.addListener(_schedulePreview);
  }

  @override
  void dispose() {
    _previewTimer?.cancel();
    _activity.dispose();
    _description.dispose();
    _notes.dispose();
    _tags.dispose();
    super.dispose();
  }

  void _schedulePreview() {
    _previewTimer?.cancel();
    if (_activity.text.trim().length < 3) {
      setState(() => _preview = null);
      return;
    }
    setState(() => _previewBusy = true);
    _previewTimer = Timer(const Duration(milliseconds: 700), () async {
      try {
        final res = await ref.read(timeLogActionsProvider).analyze(
              startHour: _start.hour,
              startMin: _start.minute,
              endHour: _end.hour,
              endMin: _end.minute,
              activity: _activity.text.trim(),
              category: _category,
              description: _description.text.trim(),
              energyLevel: _energy,
            );
        if (mounted) setState(() => _preview = res);
      } catch (_) {
        if (mounted) setState(() => _preview = null);
      } finally {
        if (mounted) setState(() => _previewBusy = false);
      }
    });
  }

  Future<void> _pickTime({required bool isStart}) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _start : _end,
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _start = picked;
        } else {
          _end = picked;
        }
      });
      _schedulePreview();
    }
  }

  String _fmtTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  List<String> _parsedTags() => _tags.text
      .split(',')
      .map((t) => t.trim())
      .where((t) => t.isNotEmpty)
      .take(20)
      .toList();

  Future<void> _save() async {
    final name = _activity.text.trim();
    if (name.isEmpty) return;
    setState(() => _saving = true);
    try {
      final actions = ref.read(timeLogActionsProvider);
      if (_isEdit) {
        await actions.update(widget.log!.id, {
          'startHour': _start.hour,
          'startMin': _start.minute,
          'endHour': _end.hour,
          'endMin': _end.minute,
          'activity': name,
          if (_category.isNotEmpty) 'category': _category,
          'description': _description.text.trim(),
          'notes': _notes.text.trim(),
          'energyLevel': _energy,
          'tags': _parsedTags(),
        });
        if (mounted) Navigator.of(context).pop();
      } else {
        final res = await actions.create(
          date: ref.read(timeLogDateProvider),
          startHour: _start.hour,
          startMin: _start.minute,
          endHour: _end.hour,
          endMin: _end.minute,
          activity: name,
          category: _category,
          description: _description.text.trim(),
          notes: _notes.text.trim(),
          energyLevel: _energy,
          tags: _parsedTags(),
        );
        if (mounted) {
          Navigator.of(context).pop();
          final xp = (res['xpAwarded'] as num?)?.toInt() ?? 0;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                xp > 0
                    ? '+$xp XP EARNED FOR REAL WORK'
                    : 'ACTIVITY RECORDED',
                style: const TextStyle(
                  color: AriseColors.blue,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
              duration: const Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final preview = _preview;
    final classification =
        preview?['classification'] as Map<String, dynamic>?;
    final estimatedXp = (preview?['estimatedXp'] as num?)?.toInt() ?? 0;

    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _isEdit ? 'EDIT TIME LOG' : 'LOG WHAT YOU ACTUALLY DID',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 16),

            TextField(
              controller: _activity,
              autofocus: !_isEdit,
              decoration: const InputDecoration(
                labelText: 'ACTIVITY',
                hintText: 'Built Arise-OS Landing Page',
              ),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickTime(isStart: true),
                    icon: const Icon(Icons.schedule, size: 16),
                    label: Text('START ${_fmtTime(_start)}'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickTime(isStart: false),
                    icon: const Icon(Icons.schedule, size: 16),
                    label: Text('END ${_fmtTime(_end)}'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            DropdownButtonFormField<String>(
              initialValue: _category.isEmpty ? null : _category,
              decoration:
                  const InputDecoration(labelText: 'CATEGORY (AI AUTO-DETECTS)'),
              items: [
                const DropdownMenuItem(value: '', child: Text('Auto-detect')),
                ...timeLogCategories.map((c) => DropdownMenuItem(
                      value: c,
                      child: Row(
                        children: [
                          Icon(_logCategoryIcon(c),
                              size: 16, color: _logCategoryColor(c)),
                          const SizedBox(width: 8),
                          Text(c),
                        ],
                      ),
                    )),
              ],
              onChanged: (v) {
                setState(() => _category = v ?? '');
                _schedulePreview();
              },
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _description,
              decoration: const InputDecoration(
                labelText: 'DESCRIPTION',
                hintText: 'Completed authentication UI and fixed navbar bugs.',
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _notes,
              decoration: const InputDecoration(labelText: 'NOTES'),
              maxLines: 2,
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _tags,
              decoration: const InputDecoration(
                labelText: 'TAGS (COMMA SEPARATED)',
                hintText: 'arise-os, frontend',
              ),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Text('ENERGY $_energy/10',
                    style: Theme.of(context).textTheme.bodySmall),
                Expanded(
                  child: Slider(
                    value: _energy.toDouble(),
                    min: 1,
                    max: 10,
                    divisions: 9,
                    activeColor: AriseColors.blue,
                    onChanged: (v) => setState(() => _energy = v.round()),
                  ),
                ),
              ],
            ),

            // AI preview
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AriseColors.violet.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                    color: AriseColors.violet.withValues(alpha: 0.3)),
              ),
              child: _previewBusy
                  ? const Text('ANALYZING…',
                      style: TextStyle(
                          color: AriseColors.textDim,
                          fontSize: 11,
                          letterSpacing: 1))
                  : classification != null
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'AI: ${classification['category']}  ·  '
                              'PROD ${classification['productivityScore']}/100  ·  '
                              '${classification['difficulty']}',
                              style: const TextStyle(
                                color: AriseColors.violetBright,
                                fontSize: 11,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              (classification['isProductive'] == true)
                                  ? 'ESTIMATED REWARD: ~$estimatedXp XP'
                                  : 'RECORDED — NO XP FOR THIS CATEGORY',
                              style: const TextStyle(
                                color: AriseColors.gold,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        )
                      : const Text(
                          'START TYPING TO SEE THE AI CLASSIFICATION + XP PREVIEW',
                          style: TextStyle(
                              color: AriseColors.textDim,
                              fontSize: 11,
                              letterSpacing: 1)),
            ),
            const SizedBox(height: 16),

            FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving
                  ? 'SAVING…'
                  : _isEdit
                      ? 'SAVE CHANGES'
                      : 'LOG ACTIVITY'),
            ),
          ],
        ),
      ),
    );
  }
}
