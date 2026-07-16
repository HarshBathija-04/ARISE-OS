import 'json.dart';

/// Player profile view (GET /v1/dashboard → profile, GET /v1/profile).
/// Backend mirrors the Website's getProfileView: raw profile columns plus
/// `xpForNext` and `rankTier`. Tolerant of camelCase and snake_case.
class ProfileView {
  ProfileView({
    required this.displayName,
    required this.level,
    required this.currentXp,
    required this.totalXp,
    required this.xpForNext,
    required this.rank,
    required this.coins,
    required this.activeDays,
    required this.currentStreak,
    required this.longestStreak,
  });

  final String displayName;
  final int level;
  final int currentXp;
  final int totalXp;
  final int xpForNext;
  final String rank;
  final int coins;
  final int activeDays;
  final int currentStreak;
  final int longestStreak;

  double get xpProgress =>
      xpForNext > 0 ? (currentXp / xpForNext).clamp(0.0, 1.0) : 0;

  factory ProfileView.fromJson(Map<String, dynamic> json) => ProfileView(
        displayName: pickString(json, ['displayName', 'display_name'],
            fallback: 'Hunter'),
        level: pickInt(json, ['level'], fallback: 1),
        currentXp: pickInt(json, ['currentXp', 'current_xp']),
        totalXp: pickInt(json, ['totalXp', 'total_xp']),
        xpForNext: pickInt(json, ['xpForNext', 'xp_for_next'], fallback: 100),
        rank: pickString(json, ['rank'], fallback: 'Initiate'),
        coins: pickInt(json, ['coins']),
        activeDays: pickInt(json, ['activeDays', 'active_days']),
        currentStreak: pickInt(json, ['currentStreak', 'current_streak']),
        longestStreak: pickInt(json, ['longestStreak', 'longest_streak']),
      );
}

/// A quest row (quests table, optionally with completion).
class QuestItem {
  QuestItem({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.difficulty,
    required this.category,
    required this.estMinutes,
    required this.baseXp,
    required this.coinReward,
    required this.status,
  });

  final String id;
  final String title;
  final String description;
  final String type;
  final String difficulty;
  final String category;
  final int estMinutes;
  final int baseXp;
  final int coinReward;
  final String status;

  bool get isActive => status == 'ACTIVE';

  factory QuestItem.fromJson(Map<String, dynamic> json) => QuestItem(
        id: pickString(json, ['id']),
        title: pickString(json, ['title']),
        description: pickString(json, ['description']),
        type: pickString(json, ['type'], fallback: 'DAILY'),
        difficulty: pickString(json, ['difficulty'], fallback: 'E'),
        category: pickString(json, ['category']),
        estMinutes: pickInt(json, ['estMinutes', 'est_minutes']),
        baseXp: pickInt(json, ['baseXp', 'base_xp']),
        coinReward: pickInt(json, ['coinReward', 'coin_reward']),
        status: pickString(json, ['status'], fallback: 'ACTIVE'),
      );
}

/// Streak row (snake_case: key, title, current, longest).
class StreakItem {
  StreakItem({
    required this.key,
    required this.title,
    required this.current,
    required this.longest,
  });

  final String key;
  final String title;
  final int current;
  final int longest;

  factory StreakItem.fromJson(Map<String, dynamic> json) => StreakItem(
        key: pickString(json, ['key']),
        title: pickString(json, ['title']),
        current: pickInt(json, ['current']),
        longest: pickInt(json, ['longest']),
      );
}

/// Notification row.
class NotificationItem {
  NotificationItem({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.read,
    this.createdAt,
  });

  final String id;
  final String type;
  final String title;
  final String body;
  final bool read;
  final DateTime? createdAt;

  factory NotificationItem.fromJson(Map<String, dynamic> json) =>
      NotificationItem(
        id: pickString(json, ['id']),
        type: pickString(json, ['type'], fallback: 'SYSTEM'),
        title: pickString(json, ['title']),
        body: pickString(json, ['body']),
        read: pickBool(json, ['read']),
        createdAt: pickDate(json, ['createdAt', 'created_at']),
      );
}

/// Performance scores (0–100 sub-scores + overall life score).
class PerformanceScores {
  PerformanceScores({
    required this.discipline,
    required this.knowledge,
    required this.physical,
    required this.focus,
    required this.recovery,
    required this.life,
  });

  final double discipline;
  final double knowledge;
  final double physical;
  final double focus;
  final double recovery;
  final double life;

  factory PerformanceScores.fromJson(Map<String, dynamic> json) =>
      PerformanceScores(
        discipline: pickDouble(json, ['discipline']),
        knowledge: pickDouble(json, ['knowledge']),
        physical: pickDouble(json, ['physical']),
        focus: pickDouble(json, ['focus']),
        recovery: pickDouble(json, ['recovery']),
        life: pickDouble(json, ['life']),
      );
}

/// Composite payload of GET /v1/dashboard.
class DashboardData {
  DashboardData({
    required this.profile,
    required this.quests,
    required this.streaks,
    required this.notifications,
    this.performance,
  });

  final ProfileView profile;
  final List<QuestItem> quests;
  final List<StreakItem> streaks;
  final List<NotificationItem> notifications;
  final PerformanceScores? performance;

  factory DashboardData.fromJson(Map<String, dynamic> json) => DashboardData(
        profile: ProfileView.fromJson(
            (json['profile'] as Map<String, dynamic>?) ?? const {}),
        quests: asList(json['quests']).map(QuestItem.fromJson).toList(),
        streaks: asList(json['streaks']).map(StreakItem.fromJson).toList(),
        notifications: asList(json['notifications'])
            .map(NotificationItem.fromJson)
            .toList(),
        performance: json['performance'] is Map<String, dynamic>
            ? PerformanceScores.fromJson(
                json['performance'] as Map<String, dynamic>)
            : null,
      );
}

/// Result of any XP-granting mutation (`award` in complete responses).
class AwardResult {
  AwardResult({
    required this.xpAwarded,
    required this.coinsAwarded,
    required this.leveledUp,
    required this.newLevel,
    required this.newRank,
  });

  final int xpAwarded;
  final int coinsAwarded;
  final bool leveledUp;
  final int newLevel;
  final String newRank;

  factory AwardResult.fromJson(Map<String, dynamic> json) => AwardResult(
        xpAwarded: pickInt(json, ['xpAwarded', 'xp_awarded']),
        coinsAwarded: pickInt(json, ['coinsAwarded', 'coins_awarded']),
        leveledUp: pickBool(json, ['leveledUp', 'leveled_up']),
        newLevel: pickInt(json, ['newLevel', 'new_level'], fallback: 1),
        newRank: pickString(json, ['newRank', 'new_rank']),
      );
}

/// Focus session row (snake_case Supabase row).
class FocusSession {
  FocusSession({
    required this.id,
    required this.category,
    required this.plannedMin,
    required this.actualMin,
    required this.xpAwarded,
    this.result,
    this.startedAt,
    this.endedAt,
  });

  final String id;
  final String category;
  final int plannedMin;
  final int actualMin;
  final int xpAwarded;
  final String? result;
  final DateTime? startedAt;
  final DateTime? endedAt;

  factory FocusSession.fromJson(Map<String, dynamic> json) => FocusSession(
        id: pickString(json, ['id']),
        category: pickString(json, ['category'], fallback: 'DSA'),
        plannedMin: pickInt(json, ['plannedMin', 'planned_min']),
        actualMin: pickInt(json, ['actualMin', 'actual_min']),
        xpAwarded: pickInt(json, ['xpAwarded', 'xp_awarded']),
        result: pick(json, ['result'])?.toString(),
        startedAt: pickDate(json, ['startedAt', 'started_at']),
        endedAt: pickDate(json, ['endedAt', 'ended_at']),
      );
}

/// Timetable block (camelCase view from the timetable service; tolerant of
/// snake_case rows: start_hour, start_min, end_hour, end_min, activity,
/// category, xp_reward, day_type).
class TimetableBlock {
  TimetableBlock({
    required this.id,
    required this.startHour,
    required this.startMin,
    required this.endHour,
    required this.endMin,
    required this.activity,
    required this.category,
    required this.xpReward,
    required this.dayType,
  });

  final String id;
  final int startHour;
  final int startMin;
  final int endHour;
  final int endMin;
  final String activity;
  final String category;
  final int xpReward;
  final String dayType; // ALL | OFFICE | WFH | WEEKEND

  int get startMinutes => startHour * 60 + startMin;

  String get timeLabel =>
      '${_fmt(startHour, startMin)} – ${_fmt(endHour, endMin)}';

  static String _fmt(int h, int m) =>
      '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';

  factory TimetableBlock.fromJson(Map<String, dynamic> json) => TimetableBlock(
        id: pickString(json, ['id']),
        startHour: pickInt(json, ['startHour', 'start_hour']),
        startMin: pickInt(json, ['startMin', 'start_min']),
        endHour: pickInt(json, ['endHour', 'end_hour']),
        endMin: pickInt(json, ['endMin', 'end_min']),
        activity: pickString(json, ['activity']),
        category: pickString(json, ['category'], fallback: 'BREAK'),
        xpReward: pickInt(json, ['xpReward', 'xp_reward']),
        dayType: pickString(json, ['dayType', 'day_type'], fallback: 'ALL'),
      );
}

/// Per-day block state row (block_id, state).
class BlockState {
  BlockState({required this.blockId, required this.state});

  final String blockId;
  final String state;

  factory BlockState.fromJson(Map<String, dynamic> json) => BlockState(
        blockId: pickString(json, ['blockId', 'block_id']),
        state: pickString(json, ['state'], fallback: 'UPCOMING'),
      );
}

/// Habit row (snake_case, with embedded `logs`).
class HabitItem {
  HabitItem({
    required this.id,
    required this.key,
    required this.title,
    required this.kind,
    required this.logs,
    this.streakKey,
  });

  final String id;
  final String key;
  final String title;
  final String kind; // BUILD | SHADOW
  final String? streakKey;
  final List<HabitLog> logs;

  bool get isShadow => kind == 'SHADOW';

  /// Latest log dated today (game-day tolerant: compares y/m/d in local time).
  HabitLog? get todayLog {
    final now = DateTime.now();
    for (final log in logs) {
      final d = log.date?.toLocal();
      if (d != null &&
          d.year == now.year &&
          d.month == now.month &&
          d.day == now.day) {
        return log;
      }
    }
    return null;
  }

  factory HabitItem.fromJson(Map<String, dynamic> json) => HabitItem(
        id: pickString(json, ['id']),
        key: pickString(json, ['key']),
        title: pickString(json, ['title']),
        kind: pickString(json, ['kind'], fallback: 'BUILD'),
        streakKey: pick(json, ['streakKey', 'streak_key'])?.toString(),
        logs: asList(json['logs']).map(HabitLog.fromJson).toList(),
      );
}

class HabitLog {
  HabitLog({required this.result, this.date});

  final String result; // DONE | MISSED | CLEAN | RELAPSE
  final DateTime? date;

  factory HabitLog.fromJson(Map<String, dynamic> json) => HabitLog(
        result: pickString(json, ['result']),
        date: pickDate(json, ['date']),
      );
}

/// Shadow habit status entry from GET /v1/habits → shadow.
class ShadowStatus {
  ShadowStatus({required this.key, required this.title, this.streak});

  final String key;
  final String title;
  final StreakItem? streak;

  factory ShadowStatus.fromJson(Map<String, dynamic> json) => ShadowStatus(
        key: pickString(json, ['key']),
        title: pickString(json, ['title']),
        streak: json['streak'] is Map<String, dynamic>
            ? StreakItem.fromJson(json['streak'] as Map<String, dynamic>)
            : null,
      );
}

/// Open recovery quest (GET /v1/recovery/open → recovery, nullable).
class RecoveryQuest {
  RecoveryQuest({
    required this.id,
    required this.reason,
    required this.steps,
    required this.completed,
  });

  final String id;
  final String reason;
  final List<String> steps;
  final bool completed;

  factory RecoveryQuest.fromJson(Map<String, dynamic> json) => RecoveryQuest(
        id: pickString(json, ['id']),
        reason: pickString(json, ['reason']),
        steps: (json['steps'] is List)
            ? (json['steps'] as List).map((e) => e.toString()).toList()
            : const [],
        completed: pickBool(json, ['completed']),
      );
}

/// Boss definition (GET /v1/bosses → raw snake_case `bosses` rows).
class BossInfo {
  BossInfo({
    required this.id,
    required this.key,
    required this.name,
    required this.tagline,
    required this.description,
    required this.rarity,
    required this.maxHp,
    required this.rewardXp,
    required this.rewardCoins,
    this.rewardTitle,
  });

  final String id;
  final String key;
  final String name;
  final String tagline;
  final String description;
  final String rarity; // COMMON | RARE | EPIC | LEGENDARY | MYTHIC
  final int maxHp;
  final int rewardXp;
  final int rewardCoins;
  final String? rewardTitle;

  factory BossInfo.fromJson(Map<String, dynamic> json) => BossInfo(
        id: pickString(json, ['id']),
        key: pickString(json, ['key']),
        name: pickString(json, ['name']),
        tagline: pickString(json, ['tagline']),
        description: pickString(json, ['description']),
        rarity: pickString(json, ['rarity'], fallback: 'RARE'),
        maxHp: pickInt(json, ['maxHp', 'max_hp'], fallback: 1),
        rewardXp: pickInt(json, ['rewardXp', 'reward_xp']),
        rewardCoins: pickInt(json, ['rewardCoins', 'reward_coins']),
        rewardTitle: pick(json, ['rewardTitle', 'reward_title'])?.toString(),
      );
}

/// One hit against a boss (raw `boss_battle_logs` row embedded on battles).
class BossBattleLog {
  BossBattleLog({
    required this.action,
    required this.damage,
    required this.critical,
    this.createdAt,
  });

  final String action;
  final int damage;
  final bool critical;
  final DateTime? createdAt;

  factory BossBattleLog.fromJson(Map<String, dynamic> json) => BossBattleLog(
        action: pickString(json, ['action']),
        damage: pickInt(json, ['damage']),
        critical: pickBool(json, ['critical']),
        createdAt: pickDate(json, ['createdAt', 'created_at']),
      );
}

/// Boss battle (GET /v1/bosses/battles → raw snake_case rows with `boss`
/// and `logs` embeds).
class BossBattle {
  BossBattle({
    required this.id,
    required this.bossId,
    required this.status,
    required this.currentHp,
    required this.maxHp,
    required this.phase,
    required this.logs,
    this.boss,
    this.startedAt,
    this.endedAt,
  });

  final String id;
  final String bossId;
  final String status; // LOCKED | ACTIVE | DEFEATED
  final int currentHp;
  final int maxHp;
  final int phase;
  final List<BossBattleLog> logs;
  final BossInfo? boss;
  final DateTime? startedAt;
  final DateTime? endedAt;

  double get hpFraction =>
      maxHp > 0 ? (currentHp / maxHp).clamp(0.0, 1.0) : 0;

  factory BossBattle.fromJson(Map<String, dynamic> json) => BossBattle(
        id: pickString(json, ['id']),
        bossId: pickString(json, ['bossId', 'boss_id']),
        status: pickString(json, ['status'], fallback: 'ACTIVE'),
        currentHp: pickInt(json, ['currentHp', 'current_hp']),
        maxHp: pickInt(json, ['maxHp', 'max_hp'], fallback: 1),
        phase: pickInt(json, ['phase']),
        // The API does not order the embedded logs — newest first here.
        logs: asList(json['logs']).map(BossBattleLog.fromJson).toList()
          ..sort((a, b) {
            final at = a.createdAt, bt = b.createdAt;
            if (at == null || bt == null) return at == bt ? 0 : (at == null ? 1 : -1);
            return bt.compareTo(at);
          }),
        boss: json['boss'] is Map<String, dynamic>
            ? BossInfo.fromJson(json['boss'] as Map<String, dynamic>)
            : null,
        startedAt: pickDate(json, ['startedAt', 'started_at']),
        endedAt: pickDate(json, ['endedAt', 'ended_at']),
      );
}

/// Achievement definition (embedded `achievement:achievements(*)`).
class AchievementDef {
  AchievementDef({
    required this.id,
    required this.key,
    required this.title,
    required this.description,
    required this.rarity,
    required this.category,
    required this.targetValue,
    required this.xpReward,
    required this.coinReward,
    required this.hidden,
  });

  final String id;
  final String key;
  final String title;
  final String description;
  final String rarity;
  final String category;
  final int targetValue;
  final int xpReward;
  final int coinReward;
  final bool hidden;

  factory AchievementDef.fromJson(Map<String, dynamic> json) => AchievementDef(
        id: pickString(json, ['id']),
        key: pickString(json, ['key']),
        title: pickString(json, ['title']),
        description: pickString(json, ['description']),
        rarity: pickString(json, ['rarity'], fallback: 'COMMON'),
        category: pickString(json, ['category'], fallback: 'GENERAL'),
        targetValue: pickInt(json, ['targetValue', 'target_value'], fallback: 1),
        xpReward: pickInt(json, ['xpReward', 'xp_reward']),
        coinReward: pickInt(json, ['coinReward', 'coin_reward']),
        hidden: pickBool(json, ['hidden']),
      );
}

/// Per-user achievement progress row (GET /v1/achievements → raw
/// `user_achievements` rows with `achievement` embed).
class AchievementEntry {
  AchievementEntry({
    required this.id,
    required this.progress,
    required this.unlocked,
    required this.achievement,
    this.unlockedAt,
  });

  final String id;
  final int progress;
  final bool unlocked;
  final AchievementDef achievement;
  final DateTime? unlockedAt;

  double get progressFraction => achievement.targetValue > 0
      ? (progress / achievement.targetValue).clamp(0.0, 1.0)
      : 0;

  factory AchievementEntry.fromJson(Map<String, dynamic> json) =>
      AchievementEntry(
        id: pickString(json, ['id']),
        progress: pickInt(json, ['progress']),
        unlocked: pickBool(json, ['unlocked']),
        unlockedAt: pickDate(json, ['unlockedAt', 'unlocked_at']),
        achievement: AchievementDef.fromJson(
            (json['achievement'] as Map<String, dynamic>?) ?? const {}),
      );
}

/// Reward shop item (GET /v1/rewards → raw snake_case `rewards` rows).
class RewardItem {
  RewardItem({
    required this.id,
    required this.title,
    required this.description,
    required this.cost,
    required this.icon,
    required this.custom,
  });

  final String id;
  final String title;
  final String description;
  final int cost;
  final String icon;
  final bool custom;

  factory RewardItem.fromJson(Map<String, dynamic> json) => RewardItem(
        id: pickString(json, ['id']),
        title: pickString(json, ['title']),
        description: pickString(json, ['description']),
        cost: pickInt(json, ['cost']),
        icon: pickString(json, ['icon'], fallback: 'gift'),
        custom: pickBool(json, ['custom']),
      );
}

/// Purchase history row (raw `reward_purchases` rows with a partial
/// `reward:rewards(title, icon)` embed).
class RewardPurchase {
  RewardPurchase({
    required this.id,
    required this.rewardId,
    required this.cost,
    required this.rewardTitle,
    required this.rewardIcon,
    this.createdAt,
  });

  final String id;
  final String rewardId;
  final int cost;
  final String rewardTitle;
  final String rewardIcon;
  final DateTime? createdAt;

  factory RewardPurchase.fromJson(Map<String, dynamic> json) {
    final reward = json['reward'] is Map<String, dynamic>
        ? json['reward'] as Map<String, dynamic>
        : const <String, dynamic>{};
    return RewardPurchase(
      id: pickString(json, ['id']),
      rewardId: pickString(json, ['rewardId', 'reward_id']),
      cost: pickInt(json, ['cost']),
      rewardTitle: pickString(reward, ['title'], fallback: 'Reward'),
      rewardIcon: pickString(reward, ['icon'], fallback: 'gift'),
      createdAt: pickDate(json, ['createdAt', 'created_at']),
    );
  }
}

/// One heatmap cell (GET /v1/analytics/heatmap → {date, intensity 0–4}).
class HeatmapCell {
  HeatmapCell({required this.date, required this.intensity});

  final String date; // YYYY-MM-DD
  final int intensity; // 0–4

  factory HeatmapCell.fromJson(Map<String, dynamic> json) => HeatmapCell(
        date: pickString(json, ['date']),
        intensity: pickInt(json, ['intensity']).clamp(0, 4),
      );
}
