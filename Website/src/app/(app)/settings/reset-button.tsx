"use client";

import { resetProfileAction } from "@/app/actions";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResetButton() {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleReset() {
    if (confirm("Are you absolutely sure you want to reset your entire profile? This will wipe your level, XP, coins, attributes, quests, timetable, and all tracking history. This cannot be undone.")) {
      setIsPending(true);
      try {
        await resetProfileAction();
        alert("Profile reset successfully.");
        router.refresh();
      } catch (e) {
        alert("Failed to reset profile.");
      } finally {
        setIsPending(false);
      }
    }
  }

  return (
    <button type="button" onClick={handleReset} disabled={isPending} className="btn-danger w-full sm:w-auto">
      <RotateCcw className="h-4 w-4" /> {isPending ? "Resetting..." : "Reset Profile"}
    </button>
  );
}
