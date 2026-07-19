"use client";

/**
 * Time Log board — the "reality" timeline. Records what the user ACTUALLY
 * did in any time period; the backend AI classifies each entry and awards
 * XP / skill progress, overriding the planned timetable where they overlap.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, Zap, Sparkles, Brain, ChevronLeft, ChevronRight,
  Search, X, Flame,
} from "lucide-react";
import {
  createTimeLogAction, updateTimeLogAction, deleteTimeLogAction,
  analyzeTimeLogAction, type TimeLogInput,
} from "@/app/(app)/timetable/time-log-actions";

export interface ClientTimeLog {
  id: string;
  date: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  activity: string;
  category: string;
  description: string;
  notes: string;
  mood: string;
  energyLevel: number | null;
  location: string;
  blockId: string | null;
  aiSummary: string;
  xpAwarded: number;
  skillXp: number;
  tags: string[];
  analysis: {
    provider: string;
    category: string;
    difficulty: string;
    productivityScore: number;
    focusScore: number;
    suggestedSkill: string;
    xpMultiplier: number;
    isProductive: boolean;
    isDeepWork: boolean;
    insights: string;
  } | null;
}

export const TIME_LOG_CATEGORIES = [
  "STUDY", "CODING", "AIML", "READING", "WRITING", "FITNESS", "HEALTH",
  "FINANCE", "BUSINESS", "PERSONAL", "ENTERTAINMENT", "SOCIAL", "REST",
] as const;

const CATEGORY_STYLE: Record<string, { text: string; border: string; label: string }> = {
  STUDY: { text: "text-arc-blue", border: "border-arc-blue/40", label: "Study" },
  CODING: { text: "text-arc-cyan", border: "border-arc-cyan/40", label: "Coding" },
  AIML: { text: "text-arc-violet", border: "border-arc-violet/40", label: "AI/ML" },
  READING: { text: "text-arc-blue", border: "border-arc-blue/30", label: "Reading" },
  WRITING: { text: "text-arc-violet", border: "border-arc-violet/30", label: "Writing" },
  FITNESS: { text: "text-success", border: "border-success/40", label: "Fitness" },
  HEALTH: { text: "text-success", border: "border-success/30", label: "Health" },
  FINANCE: { text: "text-rank-gold", border: "border-rank-gold/40", label: "Finance" },
  BUSINESS: { text: "text-rank-gold", border: "border-rank-gold/40", label: "Business" },
  PERSONAL: { text: "text-slate-300", border: "border-white/10", label: "Personal" },
  ENTERTAINMENT: { text: "text-slate-400", border: "border-white/10", label: "Entertainment" },
  SOCIAL: { text: "text-slate-300", border: "border-white/10", label: "Social" },
  REST: { text: "text-slate-500", border: "border-white/10", label: "Rest" },
};

const FALLBACK_STYLE = { text: "text-slate-300", border: "border-white/10", label: "Personal" };

function catStyle(c: string) {
  return CATEGORY_STYLE[c] ?? FALLBACK_STYLE;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function fmtTime(h: number, m: number) {
  return `${pad(h)}:${pad(m)}`;
}

function parseHM(value: string): [number, number] {
  const [h, m] = value.split(":");
  return [Number(h) || 0, Number(m) || 0];
}

function durationMin(l: { startHour: number; startMin: number; endHour: number; endMin: number }) {
  const start = l.startHour * 60 + l.startMin;
  let end = l.endHour * 60 + l.endMin;
  if (end <= start) end += 24 * 60;
  return end - start;
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function shiftDay(key: string, delta: number) {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function TimeLogBoard({ initialLogs, date }: { initialLogs: ClientTimeLog[]; date: string }) {
  const router = useRouter();
  const [logs, setLogs] = useState<ClientTimeLog[]>(initialLogs);
  const [showAdd, setShowAdd] = useState(false);
  const [editLog, setEditLog] = useState<ClientTimeLog | null>(null);
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState<string>("");

  useEffect(() => setLogs(initialLogs), [initialLogs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs
      .filter((l) => (filterCat ? l.category === filterCat : true))
      .filter((l) =>
        q
          ? `${l.activity} ${l.description} ${l.notes} ${l.tags.join(" ")}`.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin));
  }, [logs, query, filterCat]);

  const totalMin = filtered.reduce((s, l) => s + durationMin(l), 0);
  const totalXp = filtered.reduce((s, l) => s + l.xpAwarded, 0);
  const isToday = date === todayKey();

  return (
    <div className="space-y-5">
      {/* Day navigation */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <button
          className="btn-ghost px-2"
          onClick={() => router.push(`/timetable?tab=log&date=${shiftDay(date, -1)}`)}
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="font-display text-sm font-semibold text-slate-200">
            {isToday ? "Today" : date}
          </p>
          <p className="sys-label">
            {Math.floor(totalMin / 60)}h {totalMin % 60}m logged · {totalXp} XP
          </p>
        </div>
        <button
          className="btn-ghost px-2 disabled:opacity-30"
          disabled={isToday}
          onClick={() => router.push(`/timetable?tab=log&date=${shiftDay(date, 1)}`)}
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Search / filter / quick add */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input
            className="tt-input pl-9"
            placeholder="Search logs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="tt-input w-auto"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="">All categories</option>
          {TIME_LOG_CATEGORIES.map((c) => (
            <option key={c} value={c}>{catStyle(c).label}</option>
          ))}
        </select>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Log Activity
        </button>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
          <Brain className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="font-display text-slate-300">No activities logged.</p>
          <p className="mt-1 text-sm text-slate-500">
            Record what you actually did — skipped a break to build something? Log it and earn the XP
            you deserve.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => (
            <TimeLogRow
              key={l.id}
              log={l}
              onEdit={() => setEditLog(l)}
              onDelete={() => {
                setLogs((prev) => prev.filter((x) => x.id !== l.id));
                void deleteTimeLogAction({ id: l.id }).catch(() => router.refresh());
              }}
            />
          ))}
        </div>
      )}

      {(showAdd || editLog) && (
        <TimeLogModal
          log={editLog}
          date={date}
          onClose={() => {
            setShowAdd(false);
            setEditLog(null);
          }}
          onSaved={() => {
            setShowAdd(false);
            setEditLog(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function TimeLogRow({
  log, onEdit, onDelete,
}: {
  log: ClientTimeLog;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cs = catStyle(log.category);
  const mins = durationMin(log);
  const a = log.analysis;

  return (
    <div
      className={`rounded-xl border px-4 py-3 transition ${cs.border} bg-white/[0.02] hover:bg-white/[0.04]`}
    >
      <div className="flex cursor-pointer items-center gap-3" onClick={() => setExpanded((e) => !e)}>
        <div className="w-20 shrink-0">
          <p className="font-mono text-xs text-slate-300">{fmtTime(log.startHour, log.startMin)}</p>
          <p className="font-mono text-[10px] text-slate-600">{fmtTime(log.endHour, log.endMin)}</p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-100">{log.activity}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`chip border border-white/10 ${cs.text}`}>{cs.label}</span>
            <span className="chip border border-white/10 text-slate-400">{mins}m</span>
            {log.xpAwarded > 0 && (
              <span className="chip flex items-center gap-1 border border-rank-gold/30 text-rank-gold">
                <Zap className="h-3 w-3" /> {log.xpAwarded} XP
              </span>
            )}
            {log.skillXp > 0 && (
              <span className="chip flex items-center gap-1 border border-arc-violet/30 text-arc-violet">
                <Sparkles className="h-3 w-3" /> {log.skillXp} skill
              </span>
            )}
            {a?.isDeepWork && (
              <span className="chip flex items-center gap-1 border border-arc-cyan/30 text-arc-cyan">
                <Flame className="h-3 w-3" /> Deep work
              </span>
            )}
            {log.tags.map((t) => (
              <span key={t} className="chip border border-white/10 text-slate-500">#{t}</span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            className="btn-ghost px-2"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label="Edit log"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="btn-ghost px-2 text-danger"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label="Delete log"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3 text-sm">
          {log.description && <p className="text-slate-300">{log.description}</p>}
          {log.notes && <p className="text-slate-500">Notes: {log.notes}</p>}
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            {log.mood && <span>Mood: {log.mood}</span>}
            {log.energyLevel != null && <span>Energy: {log.energyLevel}/10</span>}
            {log.location && <span>Location: {log.location}</span>}
          </div>
          {a && (
            <div className="rounded-lg border border-arc-violet/20 bg-arc-violet/[0.05] p-3">
              <p className="sys-label mb-2 flex items-center gap-1 text-arc-violet">
                <Brain className="h-3 w-3" /> AI Analysis · {a.provider}
              </p>
              <div className="flex flex-wrap gap-3 font-mono text-xs text-slate-400">
                <span>Productivity {a.productivityScore}/100</span>
                <span>Focus {a.focusScore}/100</span>
                <span>Difficulty {a.difficulty}</span>
                {a.suggestedSkill && <span>Skill: {a.suggestedSkill}</span>}
                <span>×{a.xpMultiplier.toFixed(1)} XP</span>
              </div>
              {(a.insights || log.aiSummary) && (
                <p className="mt-2 text-xs text-slate-400">{a.insights || log.aiSummary}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add / Edit modal with live AI classification + XP preview ─────
function TimeLogModal({
  log, date, onClose, onSaved,
}: {
  log: ClientTimeLog | null;
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const now = new Date();
  const [activity, setActivity] = useState(log?.activity ?? "");
  const [category, setCategory] = useState<string>(log?.category ?? "");
  const [start, setStart] = useState(
    log ? fmtTime(log.startHour, log.startMin) : fmtTime(Math.max(0, now.getHours() - 1), 0),
  );
  const [end, setEnd] = useState(log ? fmtTime(log.endHour, log.endMin) : fmtTime(now.getHours(), 0));
  const [description, setDescription] = useState(log?.description ?? "");
  const [notes, setNotes] = useState(log?.notes ?? "");
  const [mood, setMood] = useState(log?.mood ?? "");
  const [energy, setEnergy] = useState(log?.energyLevel ?? 7);
  const [location, setLocation] = useState(log?.location ?? "");
  const [tags, setTags] = useState(log?.tags.join(", ") ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ xpAwarded: number; skillXp: number } | null>(null);

  // Live AI preview (debounced).
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof analyzeTimeLogAction>> | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activity.trim().length < 3) {
      setPreview(null);
      return;
    }
    if (previewTimer.current) clearTimeout(previewTimer.current);
    setPreviewBusy(true);
    previewTimer.current = setTimeout(async () => {
      const [sh, sm] = parseHM(start);
      const [eh, em] = parseHM(end);
      try {
        const res = await analyzeTimeLogAction({
          date,
          startHour: sh, startMin: sm, endHour: eh, endMin: em,
          activity: activity.trim(),
          category: (category || undefined) as TimeLogInput["category"],
          description: description || undefined,
          notes: notes || undefined,
          energyLevel: energy,
        });
        setPreview(res);
      } catch {
        setPreview(null);
      } finally {
        setPreviewBusy(false);
      }
    }, 700);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, category, start, end, description, notes, energy]);

  async function save() {
    setBusy(true);
    const [sh, sm] = parseHM(start);
    const [eh, em] = parseHM(end);
    const payload: TimeLogInput = {
      date,
      startHour: sh, startMin: sm, endHour: eh, endMin: em,
      activity: activity.trim() || "Untitled",
      category: (category || undefined) as TimeLogInput["category"],
      description: description || undefined,
      notes: notes || undefined,
      mood: mood || undefined,
      energyLevel: energy,
      location: location || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20),
    };
    try {
      if (log) {
        await updateTimeLogAction({ id: log.id, updates: payload });
        onSaved();
      } else {
        const res = await createTimeLogAction(payload);
        setResult({ xpAwarded: res.xpAwarded, skillXp: res.skillXp });
        setTimeout(onSaved, 1200);
      }
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <ModalShell title="Activity Logged" onClose={onSaved}>
        <div className="py-6 text-center">
          <Zap className="mx-auto mb-3 h-10 w-10 text-rank-gold" />
          <p className="font-display text-2xl font-bold text-rank-gold">+{result.xpAwarded} XP</p>
          {result.skillXp > 0 && (
            <p className="mt-1 text-sm text-arc-violet">+{result.skillXp} skill progress</p>
          )}
          {result.xpAwarded === 0 && (
            <p className="mt-1 text-sm text-slate-500">Recorded — no XP for this category.</p>
          )}
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title={log ? "Edit Time Log" : "Log Activity"} onClose={onClose}>
      <label className="sys-label">What did you actually do?</label>
      <input
        className="tt-input"
        value={activity}
        autoFocus
        onChange={(e) => setActivity(e.target.value)}
        placeholder="Built Arise-OS Landing Page"
      />

      <div className="mt-3 flex gap-3">
        <div className="flex-1">
          <label className="sys-label">Start</label>
          <input type="time" className="tt-input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="sys-label">End</label>
          <input type="time" className="tt-input" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      <label className="sys-label mt-3">Category (AI suggests when empty)</label>
      <select className="tt-input" value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">Auto-detect</option>
        {TIME_LOG_CATEGORIES.map((c) => (
          <option key={c} value={c}>{catStyle(c).label}</option>
        ))}
      </select>

      <label className="sys-label mt-3">Description</label>
      <textarea
        className="tt-input h-16 resize-none"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Completed authentication UI and fixed navbar bugs."
      />

      <label className="sys-label mt-3">Notes</label>
      <textarea className="tt-input h-14 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="mt-3 flex gap-3">
        <div className="flex-1">
          <label className="sys-label">Mood</label>
          <input className="tt-input" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Focused" />
        </div>
        <div className="flex-1">
          <label className="sys-label">Location</label>
          <input className="tt-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Home" />
        </div>
      </div>

      <label className="sys-label mt-3">
        Energy: <span className="text-arc-cyan">{energy}/10</span>
      </label>
      <input
        type="range" min={1} max={10} value={energy} className="w-full accent-arc-blue"
        onChange={(e) => setEnergy(Number(e.target.value))}
      />

      <label className="sys-label mt-3">Tags (comma separated)</label>
      <input className="tt-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="arise-os, frontend" />

      {/* AI classification + XP preview */}
      <div className="mt-4 rounded-lg border border-arc-violet/25 bg-arc-violet/[0.06] p-3">
        <p className="sys-label flex items-center gap-1 text-arc-violet">
          <Brain className="h-3 w-3" /> AI Preview
        </p>
        {previewBusy ? (
          <p className="mt-1 animate-pulse text-xs text-slate-500">Analyzing…</p>
        ) : preview ? (
          <div className="mt-2 space-y-1">
            <div className="flex flex-wrap gap-3 font-mono text-xs text-slate-300">
              <span className={catStyle(preview.classification.category).text}>
                {catStyle(preview.classification.category).label}
              </span>
              <span>Prod {preview.classification.productivityScore}/100</span>
              <span>Focus {preview.classification.focusScore}/100</span>
              <span>{preview.classification.difficulty}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {preview.classification.isProductive ? "Productive — earns XP" : "Recorded, no XP"}
              </span>
              <span className="font-mono font-bold text-rank-gold">
                <Zap className="mr-1 inline h-3 w-3" />
                ~{preview.estimatedXp} XP
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-600">Start typing to see category + XP estimate.</p>
        )}
      </div>

      <button
        className="btn-primary mt-4 w-full justify-center"
        disabled={busy || activity.trim().length === 0}
        onClick={save}
      >
        {busy ? "Saving…" : log ? "Save Changes" : "Log Activity"}
      </button>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="panel-glow max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-slate-100">{title}</h3>
          <button className="text-slate-500 hover:text-slate-200" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
