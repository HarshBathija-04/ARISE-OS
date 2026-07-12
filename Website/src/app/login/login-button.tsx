"use client";

import { useFormStatus } from "react-dom";
import { LogIn, Loader2 } from "lucide-react";

export function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
      {pending ? "Binding…" : "Enter the System"}
    </button>
  );
}
