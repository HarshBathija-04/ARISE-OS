"use client";

import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";

const AXIS = { stroke: "#3b4761", fontSize: 10, fontFamily: "var(--font-mono)" };
const GRID = "rgba(255,255,255,0.05)";

const tooltipStyle = {
  background: "#0b0e1c",
  border: "1px solid rgba(57,167,255,0.25)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

export function StudyFocusChart({ data }: { data: { day: string; study: number; focus: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gStudy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#39a7ff" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#39a7ff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gFocus" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cff" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#8b5cff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="day" {...AXIS} tickLine={false} />
        <YAxis {...AXIS} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="study" stroke="#39a7ff" fill="url(#gStudy)" strokeWidth={2} name="Study min" />
        <Area type="monotone" dataKey="focus" stroke="#8b5cff" fill="url(#gFocus)" strokeWidth={2} name="Focus min" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DistractionChart({ data }: { data: { day: string; distraction: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="day" {...AXIS} tickLine={false} />
        <YAxis {...AXIS} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="distraction" fill="#ff4d5e" radius={[3, 3, 0, 0]} name="Distraction min" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ScoreRadar({ data }: { data: { axis: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "#7c8aa5", fontSize: 11 }} />
        <Radar dataKey="value" stroke="#3ff0e0" fill="#3ff0e0" fillOpacity={0.25} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
