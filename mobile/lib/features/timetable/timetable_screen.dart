import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../core/models/models.dart';
import '../../core/widgets/award_feedback.dart';
import '../../core/widgets/widgets.dart';
import 'timetable_provider.dart';

Color _stateColor(String state) {
  switch (state) {
    case 'COMPLETED':
    case 'FINISHED_EARLY':
      return AriseColors.success;
    case 'ACTIVE':
      return AriseColors.blue;
    case 'SKIPPED':
    case 'PAUSED':
      return AriseColors.warning;
    case 'EXCUSED':
      return AriseColors.warning;
    case 'MISSED':
    case 'LATE':
      return AriseColors.danger;
    default:
      return AriseColors.textDim;
  }
}

Color _categoryColor(String category) {
  switch (category) {
    case 'STUDY':
      return AriseColors.blue;
    case 'EXERCISE':
      return AriseColors.success;
    case 'WORK':
      return AriseColors.violetBright;
    case 'COMMUTE':
      return AriseColors.grey;
    case 'NETWORKING':
      return AriseColors.gold;
    case 'GAMING':
      return AriseColors.violet;
    case 'MORNING_ROUTINE':
      return AriseColors.warning;
    case 'BREAKFAST':
    case 'LUNCH':
    case 'DINNER':
      return AriseColors.warning;
    case 'SLEEP':
      return AriseColors.textDim;
    default:
      return AriseColors.textDim;
  }
}

IconData _categoryIcon(String category) {
  switch (category) {
    case 'STUDY':
      return Icons.menu_book_outlined;
    case 'EXERCISE':
      return Icons.fitness_center;
    case 'WORK':
      return Icons.work_outline;
    case 'COMMUTE':
      return Icons.directions_bus_outlined;
    case 'NETWORKING':
      return Icons.groups_outlined;
    case 'MORNING_ROUTINE':
      return Icons.wb_sunny_outlined;
    case 'BATH':
      return Icons.shower_outlined;
    case 'BREAKFAST':
    case 'LUNCH':
    case 'DINNER':
      return Icons.restaurant_outlined;
    case 'GAMING':
      return Icons.sports_esports_outlined;
    case 'SLEEP':
      return Icons.bedtime_outlined;
    default:
      return Icons.circle_outlined;
  }
}

String _categoryLabel(String category) {
  switch (category) {
    case 'MORNING_ROUTINE':
      return 'Morning Routine';
    default:
      return category[0] + category.substring(1).toLowerCase();
  }
}

class TimetableScreen extends ConsumerStatefulWidget {
  const TimetableScreen({super.key});

  @override
  ConsumerState<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends ConsumerState<TimetableScreen> {
  Future<void> _setState(
      TimetableBlock block, String state, {String? reason}) async {
    try {
      await ref
          .read(timetableActionsProvider)
          .setState(block.id, state, reason: reason);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  void _showActions(TimetableBlock block) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AriseColors.panel,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Text(
              block.activity.toUpperCase(),
              style: Theme.of(context).textTheme.titleSmall,
            ),
            Text(block.timeLabel,
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 8),
            ListTile(
              leading:
                  const Icon(Icons.check_circle, color: AriseColors.success),
              title: const Text('MARK COMPLETED'),
              onTap: () {
                Navigator.pop(sheetContext);
                _setState(block, 'COMPLETED');
              },
            ),
            ListTile(
              leading:
                  const Icon(Icons.skip_next, color: AriseColors.warning),
              title: const Text('SKIP'),
              onTap: () {
                Navigator.pop(sheetContext);
                _setState(block, 'SKIPPED');
              },
            ),
            ListTile(
              leading: const Icon(Icons.gpp_maybe_outlined,
                  color: AriseColors.warning),
              title: const Text('RAISE EXCEPTION (EXCUSE)'),
              onTap: () {
                Navigator.pop(sheetContext);
                _showExcuseDialog(block);
              },
            ),
            if (block.category == 'STUDY')
              ListTile(
                leading: const Icon(Icons.menu_book, color: AriseColors.blue),
                title: const Text('LOG STUDY SESSION'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _showStudyLog(block);
                },
              ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.edit_outlined, color: AriseColors.blue),
              title: const Text('EDIT BLOCK'),
              onTap: () {
                Navigator.pop(sheetContext);
                _showBlockEditor(block: block);
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: AriseColors.danger),
              title: const Text('DELETE BLOCK'),
              onTap: () {
                Navigator.pop(sheetContext);
                _confirmDelete(block);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(TimetableBlock block) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('DELETE BLOCK',
            style: Theme.of(context).textTheme.titleSmall),
        content: Text(
          'Delete "${block.activity}" (${block.timeLabel})?\nThis cannot be undone.',
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
                await ref.read(timetableActionsProvider).deleteBlock(block.id);
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

  void _showExcuseDialog(TimetableBlock block) {
    final controller = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('RAISE EXCEPTION',
            style: Theme.of(context).textTheme.titleSmall),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Excused blocks earn no XP but are not counted as a miss. '
              'State the valid reason.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              autofocus: true,
              maxLength: 300,
              maxLines: 3,
              minLines: 1,
              decoration: const InputDecoration(labelText: 'REASON'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('CANCEL'),
          ),
          FilledButton(
            onPressed: () {
              final reason = controller.text.trim();
              if (reason.isEmpty) return;
              Navigator.of(dialogContext).pop();
              _setState(block, 'EXCUSED', reason: reason);
            },
            child: const Text('EXCUSE'),
          ),
        ],
      ),
    ).then((_) => controller.dispose());
  }

  void _showStudyLog(TimetableBlock block) {
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
        child: _StudyLogSheet(block: block),
      ),
    );
  }

  void _showBlockEditor({TimetableBlock? block}) {
    final dayType = ref.read(timetableDayTypeProvider);
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
        child: _BlockEditorSheet(block: block, defaultDayType: dayType),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final timetable = ref.watch(timetableProvider);
    final dayType = ref.watch(timetableDayTypeProvider);
    final settings = ref.watch(userSettingsProvider);

    final alarmsEnabled = settings.maybeWhen(
      data: (s) => (s['timetable_alarms_enabled'] as bool?) ?? true,
      orElse: () => true,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('DAILY SCHEDULE'),
        actions: [
          Icon(
            alarmsEnabled ? Icons.alarm_on : Icons.alarm_off,
            color: alarmsEnabled ? AriseColors.blue : AriseColors.textDim,
            size: 20,
          ),
          Switch(
            value: alarmsEnabled,
            activeColor: AriseColors.blue,
            onChanged: (v) async {
              try {
                await ref.read(timetableActionsProvider).toggleAlarms(v);
              } catch (e) {
                if (mounted) showErrorSnack(context, e);
              }
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AriseColors.blue,
        onPressed: () => _showBlockEditor(),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 4),
            child: Row(
              children: [
                for (final type in timetableDayTypes) ...[
                  Expanded(
                    child: ChoiceChip(
                      label: Center(
                        child: Text(
                          type,
                          style: TextStyle(
                            fontSize: 11,
                            letterSpacing: 1,
                            fontWeight: FontWeight.w700,
                            color: dayType == type
                                ? AriseColors.bg
                                : AriseColors.textDim,
                          ),
                        ),
                      ),
                      selected: dayType == type,
                      showCheckmark: false,
                      selectedColor: AriseColors.blue,
                      backgroundColor: AriseColors.panel,
                      side: BorderSide(
                          color: AriseColors.blue.withValues(alpha: 0.3)),
                      onSelected: (_) => ref
                          .read(timetableDayTypeProvider.notifier)
                          .state = type,
                    ),
                  ),
                  if (type != timetableDayTypes.last) const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: AriseColors.blue,
              onRefresh: () async => ref.invalidate(timetableProvider),
              child: AsyncValueView<TimetableData>(
                value: timetable,
                onRetry: () => ref.invalidate(timetableProvider),
                data: (data) => data.blocks.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: [
                          const SizedBox(height: 120),
                          const Center(
                            child: Text(
                              'NO BLOCKS YET.\nTAP + TO ADD YOUR FIRST BLOCK.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  color: AriseColors.textDim, letterSpacing: 2),
                            ),
                          ),
                        ],
                      )
                    : ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: data.blocks.length,
                        itemBuilder: (context, i) {
                          final block = data.blocks[i];
                          final state = data.stateFor(block.id);
                          return _BlockTile(
                            block: block,
                            state: state,
                            excuse: data.excuseFor(block.id),
                            onTap: () => _showActions(block),
                          );
                        },
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BlockTile extends StatelessWidget {
  const _BlockTile({
    required this.block,
    required this.state,
    required this.onTap,
    this.excuse,
  });

  final TimetableBlock block;
  final String state;
  final String? excuse;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = _stateColor(state);
    final excused = state == 'EXCUSED';
    final catColor = _categoryColor(block.category);

    return SystemPanel(
      glowColor: color,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: InkWell(
        onTap: onTap,
        child: Opacity(
          opacity: excused ? 0.6 : 1.0,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              SizedBox(
                width: 92,
                child: Text(
                  block.timeLabel,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontFamilyFallback: ['Courier'],
                    fontSize: 12,
                    color: AriseColors.textDim,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              Icon(_categoryIcon(block.category), size: 16, color: catColor),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(block.activity,
                        style: Theme.of(context).textTheme.bodyMedium),
                    Text(
                      block.category +
                          (block.dayType != 'ALL'
                              ? '  ·  ${block.dayType}'
                              : '') +
                          (block.xpReward > 0
                              ? '  ·  +${block.xpReward} XP'
                              : ''),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (excused && excuse != null && excuse!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          'EXCUSED: $excuse',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AriseColors.warning,
                            fontSize: 11,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: color.withValues(alpha: 0.5)),
                ),
                child: Text(
                  state,
                  style: TextStyle(
                    color: color,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Block editor (add / edit) ─────────────────────────────────────

class _BlockEditorSheet extends ConsumerStatefulWidget {
  const _BlockEditorSheet({this.block, required this.defaultDayType});

  final TimetableBlock? block;
  final String defaultDayType;

  @override
  ConsumerState<_BlockEditorSheet> createState() => _BlockEditorSheetState();
}

class _BlockEditorSheetState extends ConsumerState<_BlockEditorSheet> {
  late final TextEditingController _activity;
  late String _category;
  late String _dayType;
  late TimeOfDay _start;
  late TimeOfDay _end;
  bool _saving = false;

  bool get _isEdit => widget.block != null;

  @override
  void initState() {
    super.initState();
    final b = widget.block;
    _activity = TextEditingController(text: b?.activity ?? '');
    _category = b?.category ?? 'STUDY';
    _dayType = b?.dayType ?? widget.defaultDayType;
    _start = b != null
        ? TimeOfDay(hour: b.startHour, minute: b.startMin)
        : const TimeOfDay(hour: 6, minute: 0);
    _end = b != null
        ? TimeOfDay(hour: b.endHour, minute: b.endMin)
        : const TimeOfDay(hour: 7, minute: 0);
  }

  @override
  void dispose() {
    _activity.dispose();
    super.dispose();
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
    }
  }

  String _fmtTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _save() async {
    final name = _activity.text.trim();
    if (name.isEmpty) return;
    setState(() => _saving = true);
    try {
      final actions = ref.read(timetableActionsProvider);
      if (_isEdit) {
        await actions.editBlock(
          widget.block!.id,
          startHour: _start.hour,
          startMin: _start.minute,
          endHour: _end.hour,
          endMin: _end.minute,
          activity: name,
          category: _category,
          dayType: _dayType,
        );
      } else {
        await actions.addBlock(
          startHour: _start.hour,
          startMin: _start.minute,
          endHour: _end.hour,
          endMin: _end.minute,
          activity: name,
          category: _category,
          dayType: _dayType,
        );
      }
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            _isEdit ? 'EDIT BLOCK' : 'ADD BLOCK',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 16),

          // Activity name
          TextField(
            controller: _activity,
            decoration: const InputDecoration(labelText: 'ACTIVITY NAME'),
            textCapitalization: TextCapitalization.sentences,
          ),
          const SizedBox(height: 12),

          // Category dropdown
          DropdownButtonFormField<String>(
            value: _category,
            decoration: const InputDecoration(labelText: 'CATEGORY'),
            items: timetableCategories
                .map((c) => DropdownMenuItem(
                      value: c,
                      child: Row(
                        children: [
                          Icon(_categoryIcon(c),
                              size: 16, color: _categoryColor(c)),
                          const SizedBox(width: 8),
                          Text(_categoryLabel(c)),
                        ],
                      ),
                    ))
                .toList(),
            onChanged: (v) {
              if (v != null) setState(() => _category = v);
            },
          ),
          const SizedBox(height: 12),

          // Day type dropdown
          DropdownButtonFormField<String>(
            value: _dayType,
            decoration: const InputDecoration(labelText: 'DAY TYPE'),
            items: ['ALL', ...timetableDayTypes]
                .map((d) => DropdownMenuItem(
                      value: d,
                      child: Text(d == 'ALL' ? 'Every Day' : d),
                    ))
                .toList(),
            onChanged: (v) {
              if (v != null) setState(() => _dayType = v);
            },
          ),
          const SizedBox(height: 12),

          // Time pickers
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => _pickTime(isStart: true),
                  child: InputDecorator(
                    decoration: const InputDecoration(labelText: 'START'),
                    child: Text(_fmtTime(_start)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: InkWell(
                  onTap: () => _pickTime(isStart: false),
                  child: InputDecorator(
                    decoration: const InputDecoration(labelText: 'END'),
                    child: Text(_fmtTime(_end)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          FilledButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(_isEdit ? 'SAVE CHANGES' : 'ADD BLOCK'),
          ),
        ],
      ),
    );
  }
}

// ── Study log sheet ───────────────────────────────────────────────

class _StudyLogSheet extends ConsumerStatefulWidget {
  const _StudyLogSheet({required this.block});

  final TimetableBlock block;

  @override
  ConsumerState<_StudyLogSheet> createState() => _StudyLogSheetState();
}

class _StudyLogSheetState extends ConsumerState<_StudyLogSheet> {
  final _formKey = GlobalKey<FormState>();
  final _subject = TextEditingController();
  final _notes = TextEditingController();
  late final TextEditingController _duration;
  double _deepWork = 5;
  int _distractions = 0;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final b = widget.block;
    final planned =
        (b.endHour * 60 + b.endMin) - (b.startHour * 60 + b.startMin);
    _duration =
        TextEditingController(text: (planned > 0 ? planned : 60).toString());
  }

  @override
  void dispose() {
    _subject.dispose();
    _notes.dispose();
    _duration.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ref.read(timetableActionsProvider).logStudy(
            blockId: widget.block.id,
            subject: _subject.text.trim(),
            durationMinutes: int.parse(_duration.text.trim()),
            deepWorkScore: _deepWork.round(),
            distractions: _distractions,
            notes: _notes.text.trim(),
          );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('LOG STUDY  ·  ${widget.block.activity.toUpperCase()}',
                style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 16),
            TextFormField(
              controller: _subject,
              decoration: const InputDecoration(labelText: 'SUBJECT'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _duration,
              decoration: const InputDecoration(labelText: 'DURATION (MIN)'),
              keyboardType: TextInputType.number,
              validator: (v) {
                final n = int.tryParse(v ?? '');
                if (n == null || n < 1 || n > 600) return '1–600 minutes';
                return null;
              },
            ),
            const SizedBox(height: 12),
            Text('DEEP WORK SCORE: ${_deepWork.round()}',
                style: Theme.of(context).textTheme.bodySmall),
            Slider(
              value: _deepWork,
              min: 1,
              max: 10,
              divisions: 9,
              activeColor: AriseColors.blue,
              onChanged: (v) => setState(() => _deepWork = v),
            ),
            Row(
              children: [
                Text('DISTRACTIONS: $_distractions',
                    style: Theme.of(context).textTheme.bodySmall),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.remove_circle_outline,
                      color: AriseColors.textDim),
                  onPressed: _distractions > 0
                      ? () => setState(() => _distractions--)
                      : null,
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle_outline,
                      color: AriseColors.blue),
                  onPressed: () => setState(() => _distractions++),
                ),
              ],
            ),
            TextFormField(
              controller: _notes,
              decoration: const InputDecoration(labelText: 'NOTES (OPTIONAL)'),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('LOG SESSION'),
            ),
          ],
        ),
      ),
    );
  }
}
