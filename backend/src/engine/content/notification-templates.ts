/**
 * Notification copy for scheduled/system pushes, kept in code rather than a
 * notification_templates table — versioned in git, typed, and available to
 * the scheduler without a DB round trip. AI-personalized copy (phase 2)
 * overrides these via scheduled_notifications.payload.
 */

export interface NotificationAction {
  /** Stable id recorded in notification_events.action */
  id: string;
  title: string;
  /** Client-side navigation target */
  deeplink?: string;
}

export interface NotificationTemplate {
  title: string;
  body: string;
  deeplink: string;
  actions: NotificationAction[];
}

export const TEMPLATES = {
  DAILY_RESET: {
    title: "🎯 New Daily Quests Available",
    body: "Your new missions have arrived. Complete them to gain XP and continue your streak.",
    deeplink: "/quests",
    actions: [
      { id: "open_dashboard", title: "Open Dashboard", deeplink: "/dashboard" },
      { id: "view_quests", title: "View Quests", deeplink: "/quests" },
      { id: "dismiss", title: "Dismiss" },
    ],
  },
  EVENING_REMINDER_REMAINING: {
    title: "⚠ Remaining Quests",
    body: "You still have {count} quests left before today's reset.",
    deeplink: "/quests",
    actions: [
      { id: "continue", title: "Continue", deeplink: "/quests" },
      { id: "skip_remaining", title: "Skip Remaining" },
      { id: "open_dashboard", title: "Open Dashboard", deeplink: "/dashboard" },
    ],
  },
  EVENING_REMINDER_DONE: {
    title: "🎉 Amazing work!",
    body: "You completed every quest today.",
    deeplink: "/dashboard",
    actions: [{ id: "open_dashboard", title: "Open Dashboard", deeplink: "/dashboard" }],
  },
  BLOCK_PRE_REMINDER: {
    title: "{emoji} {activity} starts in {minutes} minutes",
    body: "Prepare yourself — {activity} begins at {time}.",
    deeplink: "/timetable",
    actions: [
      { id: "open", title: "Open", deeplink: "/timetable" },
      { id: "skip", title: "Skip" },
      { id: "snooze", title: "Snooze 5 min" },
    ],
  },
} as const satisfies Record<string, NotificationTemplate>;

const CATEGORY_EMOJI: Record<string, string> = {
  STUDY: "📚",
  EXERCISE: "💪",
  MORNING_ROUTINE: "🌅",
  BATH: "🚿",
  BREAKFAST: "🍳",
  LUNCH: "🍱",
  DINNER: "🍽",
  GAMING: "🎮",
  BREAK: "☕",
  SLEEP: "😴",
  WORK: "💼",
  COMMUTE: "🚆",
  NETWORKING: "🤝",
};

export function categoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? "⏰";
}

/** Replace {placeholders} in a template string. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}
