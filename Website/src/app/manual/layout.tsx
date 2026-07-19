import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works — Arise OS",
  description: "Field manual for Arise OS — the RPG layer over your real life.",
};

export default function ManualLayout({ children }: { children: React.ReactNode }) {
  return children;
}
