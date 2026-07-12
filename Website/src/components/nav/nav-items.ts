import {
  LayoutDashboard, Swords, Target, Timer, BarChart3, Hexagon, GitBranch,
  Skull, Trophy, Crown, Flame, EyeOff, HeartPulse, Coins, FileText, Bot,
  Calendar, CalendarClock, History, Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, group: "Core" },
  { href: "/quests", label: "Daily Quests", icon: Target, group: "Core" },
  { href: "/main-quests", label: "Main Quests", icon: Swords, group: "Core" },
  { href: "/focus", label: "Focus Mode", icon: Timer, group: "Core" },
  { href: "/timetable", label: "Timetable", icon: CalendarClock, group: "Core" },

  { href: "/attributes", label: "Attributes", icon: Hexagon, group: "Progression" },
  { href: "/skills", label: "Skill Trees", icon: GitBranch, group: "Progression" },
  { href: "/bosses", label: "Boss Battles", icon: Skull, group: "Progression" },
  { href: "/achievements", label: "Achievements", icon: Trophy, group: "Progression" },
  { href: "/titles", label: "Titles", icon: Crown, group: "Progression" },
  { href: "/streaks", label: "Streaks", icon: Flame, group: "Progression" },

  { href: "/shadow", label: "Shadow Habits", icon: EyeOff, group: "Discipline" },
  { href: "/recovery", label: "Recovery", icon: HeartPulse, group: "Discipline" },
  { href: "/rewards", label: "Reward Shop", icon: Coins, group: "Discipline" },

  { href: "/analytics", label: "Analytics", icon: BarChart3, group: "Insight" },
  { href: "/report", label: "Weekly Report", icon: FileText, group: "Insight" },
  { href: "/guide", label: "The Guide", icon: Bot, group: "Insight" },
  { href: "/calendar", label: "Calendar", icon: Calendar, group: "Insight" },
  { href: "/activity", label: "Activity Log", icon: History, group: "Insight" },
  { href: "/settings", label: "Settings", icon: Settings, group: "Insight" },
];

export const NAV_GROUPS = ["Core", "Progression", "Discipline", "Insight"];
