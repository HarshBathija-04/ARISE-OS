/**
 * One-time personalized account seed for aaditya.mittal@gmail.com.
 *
 * Creates the Supabase Auth user (confirmed), bootstraps the standard game
 * state, then tailors it:
 *   - default (GATE-themed) main quests are deactivated and replaced with the
 *     user's real goal tracks (ServiceNow, AWS, AI/ML, jobs, system design,
 *     DSA, projects, further studies, digital presence)
 *   - extra daily habits + streaks (GitHub push, news, tech radar, ...)
 *   - three day-type timetables (OFFICE / WFH / WEEKEND) plus shared ALL
 *     morning blocks, per the user's fixed 6am–12am routine
 *
 * Idempotent-ish: safe to re-run (upserts on natural keys; timetable is
 * replaced wholesale).
 *
 * Run: npx tsx scripts/seed-aaditya.ts
 */
import { db } from "../src/db/supabase.js";
import { bootstrapAccount } from "../src/services/account.service.js";
import type { TimetableCategory, TimetableDayType } from "../src/db/tables.js";

const EMAIL = "aaditya.mittal@gmail.com";
const PASSWORD = "Aaditya69";
const NAME = "Aaditya Mittal";

function check(error: { message: string } | null, ctx: string): void {
  if (error) throw new Error(`${ctx}: ${error.message}`);
}

// ─────────────────── goal tracks (main quests) ───────────────────

interface StageDef { key: string; title: string; description: string; targetUnits: number }
interface QuestDef { key: string; title: string; description: string; theme: string; order: number; stages: StageDef[] }

const GOAL_QUESTS: QuestDef[] = [
  {
    key: "servicenow-ascension", title: "ServiceNow Ascension",
    description: "One certification every 1.5 months, plus Accelerator Program development.",
    theme: "#39a7ff", order: 1,
    stages: [
      { key: "csa", title: "CSA Certification", description: "Certified System Administrator — study, practice, pass.", targetUnits: 100 },
      { key: "cad", title: "CAD Certification", description: "Certified Application Developer — next 1.5-month block.", targetUnits: 100 },
      { key: "cis", title: "CIS Specialization", description: "First Certified Implementation Specialist track.", targetUnits: 100 },
      { key: "accelerator", title: "Accelerator Program Build", description: "Ship the ServiceNow Accelerator Program project.", targetUnits: 100 },
    ],
  },
  {
    key: "aws-cloud-path", title: "AWS Cloud Path",
    description: "Foundational AWS certification, then upward.",
    theme: "#ff9a3c", order: 2,
    stages: [
      { key: "fundamentals", title: "Cloud Fundamentals", description: "Core AWS services, billing, IAM, well-architected basics.", targetUnits: 100 },
      { key: "practice-exams", title: "Practice Exams", description: "Timed practice tests until consistently passing.", targetUnits: 100 },
      { key: "certified", title: "Cloud Practitioner Exam", description: "Book and pass the foundational certification.", targetUnits: 100 },
    ],
  },
  {
    key: "ai-ml-engineer", title: "AI/ML Engineer Path",
    description: "Complete the PWSkills course and build real projects.",
    theme: "#8b5cff", order: 3,
    stages: [
      { key: "pwskills-course", title: "PWSkills Course", description: "Finish every module of the PWSkills AI/ML course.", targetUnits: 100 },
      { key: "first-project", title: "First ML Project", description: "End-to-end project: data → model → evaluation → demo.", targetUnits: 100 },
      { key: "portfolio-project", title: "Portfolio Project", description: "A polished, deployed AI/ML project worth showing recruiters.", targetUnits: 100 },
    ],
  },
  {
    key: "job-hunt", title: "The Job Hunt",
    description: "Minimum 3 quality applications per week — tailored resume + LinkedIn approach.",
    theme: "#2fd67b", order: 4,
    stages: [
      { key: "resume-arsenal", title: "Resume Arsenal", description: "Tailored resume variants per role type (ServiceNow / AI-ML / SWE).", targetUnits: 100 },
      { key: "applications", title: "Quality Applications", description: "3 catered applications every week (1 unit = 1 application).", targetUnits: 36 },
      { key: "outreach", title: "LinkedIn Outreach", description: "Recruiter/referral messages alongside every application.", targetUnits: 36 },
      { key: "interviews", title: "Interview Rounds", description: "Convert applications into interviews and clear them.", targetUnits: 10 },
    ],
  },
  {
    key: "system-design-mastery", title: "System Design Mastery",
    description: "Complete Gaurav Sen's system design course and internalize it.",
    theme: "#39d0ff", order: 5,
    stages: [
      { key: "course", title: "Gaurav Sen Course", description: "Watch + note every lecture of the course.", targetUnits: 100 },
      { key: "case-studies", title: "Case Studies", description: "Re-derive the classic designs (URL shortener, chat, feed, ...).", targetUnits: 100 },
      { key: "mock-designs", title: "Mock Design Docs", description: "Write full design docs from scratch, unaided.", targetUnits: 100 },
    ],
  },
  {
    key: "dsa-arena", title: "DSA Arena",
    description: "3 problems daily (incl. LeetCode daily), contests, rank climb, upsolving.",
    theme: "#ffd23c", order: 6,
    stages: [
      { key: "daily-grind", title: "The Daily Grind", description: "3 random problems + the LeetCode daily, every day.", targetUnits: 100 },
      { key: "contests", title: "Competitive Arc", description: "Participate in rated contests and increase rank.", targetUnits: 50 },
      { key: "upsolve", title: "Upsolve Protocol", description: "Upsolve every problem you couldn't finish in contest.", targetUnits: 50 },
    ],
  },
  {
    key: "project-forge", title: "Project Forge",
    description: "Meaningful projects across every track — ServiceNow, AI/ML, and beyond.",
    theme: "#ff5c7a", order: 7,
    stages: [
      { key: "servicenow-build", title: "ServiceNow Build", description: "Accelerator-linked ServiceNow application.", targetUnits: 100 },
      { key: "aiml-build", title: "AI/ML Build", description: "Course-linked AI/ML project (see AI/ML path).", targetUnits: 100 },
      { key: "showcase", title: "Showcase Polish", description: "READMEs, demos, deployments — recruiter-ready repos.", targetUnits: 100 },
    ],
  },
  {
    key: "magnum-opus", title: "The Magnum Opus",
    description: "Your own large-scale personal project — idea to production.",
    theme: "#b45cff", order: 8,
    stages: [
      { key: "ideation", title: "Ideation", description: "Prepare and validate the idea; write the concept doc.", targetUnits: 100 },
      { key: "architecture", title: "Architecture", description: "System design, stack choice, data model.", targetUnits: 100 },
      { key: "mvp", title: "MVP", description: "Build and ship the minimum viable version.", targetUnits: 100 },
      { key: "scale", title: "Scale & Polish", description: "Harden, scale, iterate with real usage.", targetUnits: 100 },
    ],
  },
  {
    key: "further-studies-gate", title: "Further Studies Gate",
    description: "Prepare for study abroad / higher studies — language, core subjects, shortlist.",
    theme: "#5cffd0", order: 9,
    stages: [
      { key: "shortlist", title: "University Shortlist", description: "Research where to study further; requirements per program.", targetUnits: 100 },
      { key: "language", title: "Foreign Language", description: "Start and sustain language prep as required.", targetUnits: 100 },
      { key: "core-subjects", title: "Core Subjects", description: "Revise the core subjects admissions/tests demand.", targetUnits: 100 },
    ],
  },
  {
    key: "digital-presence", title: "Digital Presence",
    description: "LinkedIn + GitHub: profile, network, weekly posts, daily meaningful pushes.",
    theme: "#3c9aff", order: 10,
    stages: [
      { key: "profile-overhaul", title: "Profile Overhaul", description: "One-time: LinkedIn profile revamp + GitHub profile README.", targetUnits: 100 },
      { key: "weekly-posts", title: "Weekly Posts", description: "One quality LinkedIn post per week (1 unit = 1 post).", targetUnits: 26 },
      { key: "network", title: "Network Expansion", description: "Approach people, make real connections.", targetUnits: 100 },
    ],
  },
];

// ─────────────────── daily habits + streaks ───────────────────

const EXTRA_STREAKS = [
  { key: "github", title: "GitHub Push Streak" },
  { key: "news", title: "News Reading Streak" },
  { key: "tech-radar", title: "Tech Radar Streak" },
];

const EXTRA_HABITS = [
  { key: "github-push", title: "Meaningful GitHub Push", kind: "BUILD", streak_key: "github" },
  { key: "read-news", title: "Read News (10 min)", kind: "BUILD", streak_key: "news" },
  { key: "tech-radar", title: "Explore New Tools & Tech (10–20 min)", kind: "BUILD", streak_key: "tech-radar" },
  { key: "job-apply", title: "Job Application (3 quality/week)", kind: "BUILD", streak_key: null },
  { key: "linkedin-touch", title: "LinkedIn Networking / Post", kind: "BUILD", streak_key: null },
];

// ─────────────────── timetables ───────────────────

interface BlockDef {
  dayType: TimetableDayType;
  order: number;
  start: [number, number];
  end: [number, number];
  activity: string;
  category: TimetableCategory;
  xp: number;
}

const B = (
  dayType: TimetableDayType, order: number,
  start: [number, number], end: [number, number],
  activity: string, category: TimetableCategory, xp: number,
): BlockDef => ({ dayType, order, start, end, activity, category, xp });

const TIMETABLE: BlockDef[] = [
  // Shared 6am–8am morning routine (sleep 12am, wake 6am)
  B("ALL", 0, [6, 0], [6, 30], "Morning Exercise", "EXERCISE", 80),
  B("ALL", 1, [6, 30], [7, 0], "Get Ready", "MORNING_ROUTINE", 20),
  B("ALL", 2, [7, 0], [8, 0], "Breakfast + Daily Works (news, GitHub push)", "BREAKFAST", 15),

  // Office day
  B("OFFICE", 10, [8, 0], [9, 0], "Commute — Study on the way", "COMMUTE", 30),
  B("OFFICE", 11, [9, 0], [11, 0], "Study — Certs / Courses", "STUDY", 120),
  B("OFFICE", 12, [11, 0], [13, 0], "Office Work", "WORK", 40),
  B("OFFICE", 13, [13, 0], [14, 0], "Healthy Lunch (cost-effective)", "LUNCH", 20),
  B("OFFICE", 14, [14, 0], [18, 0], "Office Work", "WORK", 40),
  B("OFFICE", 15, [18, 0], [19, 0], "Commute — Study on the way", "COMMUTE", 30),
  B("OFFICE", 16, [19, 0], [20, 0], "Get Ready / Dinner + Light Work", "DINNER", 20),
  B("OFFICE", 17, [20, 0], [21, 0], "DSA — 3 Problems + LeetCode Daily", "STUDY", 120),
  B("OFFICE", 18, [21, 0], [23, 0], "Study + Misc (Jobs / LinkedIn / Projects)", "STUDY", 120),
  B("OFFICE", 19, [23, 0], [23, 59], "Study / Talk / Rest / Important Work", "BREAK", 5),

  // Work-from-home day
  B("WFH", 10, [8, 0], [9, 0], "DSA (contest if scheduled) / Study", "STUDY", 120),
  B("WFH", 11, [9, 0], [11, 0], "Study — Certs / Courses", "STUDY", 120),
  B("WFH", 12, [11, 0], [13, 0], "Work", "WORK", 40),
  B("WFH", 13, [13, 0], [14, 0], "Lunch", "LUNCH", 20),
  B("WFH", 14, [14, 0], [19, 0], "Work", "WORK", 40),
  B("WFH", 15, [19, 0], [20, 0], "Talk / Dinner + Light Work", "DINNER", 20),
  B("WFH", 16, [20, 0], [21, 0], "DSA — 3 Problems + LeetCode Daily", "STUDY", 120),
  B("WFH", 17, [21, 0], [23, 0], "Study + Misc (Jobs / LinkedIn / Projects)", "STUDY", 120),
  B("WFH", 18, [23, 0], [23, 59], "Study / Talk / Rest / Important Work", "BREAK", 5),

  // Weekend / holiday
  B("WEEKEND", 10, [8, 0], [9, 0], "DSA (contest if scheduled) / Study", "STUDY", 120),
  B("WEEKEND", 11, [9, 0], [12, 0], "Study — Certs / Courses", "STUDY", 120),
  B("WEEKEND", 12, [12, 0], [14, 0], "ServiceNow Accelerator — Develop", "WORK", 100),
  B("WEEKEND", 13, [14, 0], [15, 0], "Lunch", "LUNCH", 20),
  B("WEEKEND", 14, [15, 0], [18, 0], "Projects + Study", "STUDY", 120),
  B("WEEKEND", 15, [18, 0], [19, 0], "LinkedIn + Networking + Posts", "NETWORKING", 40),
  B("WEEKEND", 16, [19, 0], [20, 0], "Dinner", "DINNER", 20),
  B("WEEKEND", 17, [20, 0], [22, 0], "DSA — Practice + Upsolve", "STUDY", 120),
  B("WEEKEND", 18, [22, 0], [23, 59], "Study + Misc / Important Work", "STUDY", 120),
];

// ─────────────────── main ───────────────────

async function main() {
  // 1. Auth user (confirmed; reuse if it already exists)
  let userId: string;
  const created = await db.auth.admin.createUser({
    email: EMAIL,
    email_confirm: true,
    password: PASSWORD,
    user_metadata: { name: NAME },
  });
  if (created.error) {
    console.log(`createUser: ${created.error.message} — looking up existing user`);
    const list = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    check(list.error, "listUsers");
    const existing = list.data.users.find((u) => u.email === EMAIL);
    if (!existing) throw new Error("could not create or find the auth user");
    userId = existing.id;
    const upd = await db.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
    check(upd.error, "updateUser");
    console.log(`✓ reusing auth user ${userId} (password reset)`);
  } else {
    userId = created.data.user.id;
    console.log(`✓ auth user created ${userId}`);
  }

  // Auth trigger creates public.users; make sure the display name is right.
  {
    const { error } = await db.from("users").upsert({ id: userId, email: EMAIL, name: NAME }, { onConflict: "id" });
    check(error, "users");
  }

  // 2. Standard bootstrap (profile, attributes, streaks, habits, skill trees,
  //    achievements, starter title, rewards, first boss, today's quests)
  const boot = await bootstrapAccount(userId);
  console.log(`✓ bootstrap (created=${boot.created})`);

  // 3. Deactivate the default GATE-themed main quests, then seed real goals
  {
    const { error } = await db.from("main_quests").update({ active: false }).eq("user_id", userId);
    check(error, "deactivate default main quests");
  }
  for (const q of GOAL_QUESTS) {
    const { data: quest, error } = await db
      .from("main_quests")
      .upsert(
        { user_id: userId, key: q.key, title: q.title, description: q.description, theme: q.theme, order: q.order, active: true },
        { onConflict: "user_id,key" },
      )
      .select("id")
      .single();
    check(error, `main quest ${q.key}`);
    const { error: stageError } = await db.from("main_quest_stages").upsert(
      q.stages.map((s, i) => ({
        main_quest_id: quest!.id,
        key: s.key,
        title: s.title,
        description: s.description,
        order: i,
        target_units: s.targetUnits,
      })),
      { onConflict: "main_quest_id,key", ignoreDuplicates: true },
    );
    check(stageError, `stages ${q.key}`);
  }
  console.log(`✓ ${GOAL_QUESTS.length} goal tracks seeded (defaults deactivated)`);

  // 4. Extra streaks + habits
  {
    const { error } = await db.from("streaks").upsert(
      EXTRA_STREAKS.map((s) => ({ user_id: userId, key: s.key, title: s.title })),
      { onConflict: "user_id,key", ignoreDuplicates: true },
    );
    check(error, "extra streaks");
  }
  {
    const { error } = await db.from("habits").upsert(
      EXTRA_HABITS.map((h) => ({ user_id: userId, key: h.key, title: h.title, kind: h.kind, streak_key: h.streak_key })),
      { onConflict: "user_id,key", ignoreDuplicates: true },
    );
    check(error, "extra habits");
  }
  // Default habits that don't fit this user (wakes at 6am, no GATE prep) —
  // deactivated so the quest engine never anchors on them.
  {
    const { error } = await db
      .from("habits")
      .update({ active: false })
      .eq("user_id", userId)
      .in("key", ["wake-5am", "gate-study"]);
    check(error, "deactivate unfit default habits");
  }
  console.log(`✓ ${EXTRA_HABITS.length} habits + ${EXTRA_STREAKS.length} streaks added (wake-5am/gate-study deactivated)`);

  // 5. Timetables: replace everything with the three day-type schedules
  {
    const { error: delError } = await db.from("timetable_blocks").delete().eq("user_id", userId);
    check(delError, "clear timetable");
    const { error } = await db.from("timetable_blocks").insert(
      TIMETABLE.map((b) => ({
        user_id: userId,
        order: b.order,
        start_hour: b.start[0],
        start_min: b.start[1],
        end_hour: b.end[0],
        end_min: b.end[1],
        activity: b.activity,
        category: b.category,
        xp_reward: b.xp,
        day_type: b.dayType,
      })),
    );
    check(error, "timetable blocks");
  }
  console.log(`✓ ${TIMETABLE.length} timetable blocks (ALL/OFFICE/WFH/WEEKEND)`);

  // 6. Verify
  const counts: Record<string, number | null> = {};
  for (const [table, filter] of [
    ["main_quests", { active: true }],
    ["habits", {}],
    ["streaks", {}],
    ["timetable_blocks", {}],
    ["quests", {}],
  ] as const) {
    let q = db.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v as boolean);
    const { count, error } = await q;
    check(error, `count ${table}`);
    counts[table] = count;
  }
  console.log("✓ verify:", JSON.stringify(counts));
  console.log(`\n✅ ${EMAIL} is ready. Sign in on web or app with the provided password.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("SEED FAILED:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
