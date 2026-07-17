import { describe, expect, it } from "vitest";
import { localTimeToUtcInstant, dayKey, gameDay } from "../src/engine/date.js";
import { inDndWindow, minutesInTz } from "../src/services/notification.service.js";
import {
  TEMPLATES,
  categoryEmoji,
  fill,
} from "../src/engine/content/notification-templates.js";

describe("localTimeToUtcInstant", () => {
  it("converts IST wall-clock to UTC (fixed +05:30 offset)", () => {
    // 00:00 IST = 18:30 UTC previous day
    const d = localTimeToUtcInstant("2026-07-17", "00:00", "Asia/Kolkata");
    expect(d.toISOString()).toBe("2026-07-16T18:30:00.000Z");
  });

  it("converts 23:00 IST", () => {
    const d = localTimeToUtcInstant("2026-07-17", "23:00", "Asia/Kolkata");
    expect(d.toISOString()).toBe("2026-07-17T17:30:00.000Z");
  });

  it("handles UTC timezone as identity", () => {
    const d = localTimeToUtcInstant("2026-07-17", "11:00", "UTC");
    expect(d.toISOString()).toBe("2026-07-17T11:00:00.000Z");
  });

  it("handles DST-observing zones (America/New_York summer = UTC-4)", () => {
    const summer = localTimeToUtcInstant("2026-07-17", "09:00", "America/New_York");
    expect(summer.toISOString()).toBe("2026-07-17T13:00:00.000Z");
    const winter = localTimeToUtcInstant("2026-01-17", "09:00", "America/New_York");
    expect(winter.toISOString()).toBe("2026-01-17T14:00:00.000Z");
  });

  it("round-trips with gameDay/dayKey: reset at 00:00 lands inside the same game day", () => {
    const tz = "Asia/Kolkata";
    const today = dayKey(new Date(), tz);
    const resetInstant = localTimeToUtcInstant(today, "00:00", tz);
    expect(dayKey(resetInstant, tz)).toBe(today);
    expect(gameDay(resetInstant, tz).toISOString()).toBe(`${today}T00:00:00.000Z`);
  });
});

describe("minutesInTz", () => {
  it("computes minutes since local midnight", () => {
    // 18:30 UTC = 00:00 IST
    expect(minutesInTz(new Date("2026-07-16T18:30:00.000Z"), "Asia/Kolkata")).toBe(0);
    // 05:30 UTC = 11:00 IST
    expect(minutesInTz(new Date("2026-07-17T05:30:00.000Z"), "Asia/Kolkata")).toBe(660);
  });
});

describe("inDndWindow", () => {
  const tz = "Asia/Kolkata";
  const at = (utc: string) => new Date(utc);

  it("off when bounds are null", () => {
    expect(inDndWindow({ dnd_start: null, dnd_end: null, timezone: tz })).toBe(false);
  });

  it("simple window (13:00–15:00 IST)", () => {
    const s = { dnd_start: "13:00", dnd_end: "15:00", timezone: tz };
    expect(inDndWindow(s, at("2026-07-17T08:30:00.000Z"))).toBe(true); // 14:00 IST
    expect(inDndWindow(s, at("2026-07-17T10:30:00.000Z"))).toBe(false); // 16:00 IST
  });

  it("midnight-crossing window (22:00–07:00 IST)", () => {
    const s = { dnd_start: "22:00", dnd_end: "07:00", timezone: tz };
    expect(inDndWindow(s, at("2026-07-17T17:30:00.000Z"))).toBe(true); // 23:00 IST
    expect(inDndWindow(s, at("2026-07-17T00:30:00.000Z"))).toBe(true); // 06:00 IST
    expect(inDndWindow(s, at("2026-07-17T06:30:00.000Z"))).toBe(false); // 12:00 IST
  });

  it("boundary semantics: start inclusive, end exclusive", () => {
    const s = { dnd_start: "13:00", dnd_end: "15:00", timezone: tz };
    expect(inDndWindow(s, at("2026-07-17T07:30:00.000Z"))).toBe(true); // exactly 13:00 IST
    expect(inDndWindow(s, at("2026-07-17T09:30:00.000Z"))).toBe(false); // exactly 15:00 IST
  });

  it("degenerate equal bounds = off", () => {
    const s = { dnd_start: "13:00", dnd_end: "13:00", timezone: tz };
    expect(inDndWindow(s, at("2026-07-17T07:30:00.000Z"))).toBe(false);
  });
});

describe("notification templates", () => {
  it("fills placeholders", () => {
    expect(fill(TEMPLATES.EVENING_REMINDER_REMAINING.body, { count: 3 })).toBe(
      "You still have 3 quests left before today's reset.",
    );
  });

  it("leaves unknown placeholders intact", () => {
    expect(fill("{foo} bar", {})).toBe("{foo} bar");
  });

  it("pre-reminder title renders with category emoji", () => {
    const t = fill(TEMPLATES.BLOCK_PRE_REMINDER.title, {
      emoji: categoryEmoji("STUDY"),
      activity: "Study",
      minutes: 5,
    });
    expect(t).toBe("📚 Study starts in 5 minutes");
  });

  it("action ids are stable strings used by analytics", () => {
    expect(TEMPLATES.DAILY_RESET.actions.map((a) => a.id)).toEqual([
      "open_dashboard",
      "view_quests",
      "dismiss",
    ]);
    expect(TEMPLATES.EVENING_REMINDER_REMAINING.actions.map((a) => a.id)).toEqual([
      "continue",
      "skip_remaining",
      "open_dashboard",
    ]);
  });
});
