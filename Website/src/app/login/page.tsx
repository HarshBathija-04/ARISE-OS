import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { AuthError } from "next-auth";
import { signIn, auth } from "@/auth";
import { LoginButton } from "./login-button";

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void-950 px-4">
      <div className="grid-overlay absolute inset-0 opacity-30" />
      <div className="absolute inset-0 bg-radial-arc" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-arc-blue/40 bg-arc-blue/10 shadow-glow">
            <Zap className="h-8 w-8 text-arc-blue" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold tracking-tight">
            SOLO<span className="text-arc-blue">//</span>OS
          </h1>
          <p className="sys-label mt-1">Authenticate to enter the System</p>
        </div>

        <form action={loginAction} className="panel-glow space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              Invalid credentials. Try again.
            </div>
          )}
          <div>
            <label className="sys-label mb-1 block" htmlFor="email">Identifier</label>
            <input
              id="email" name="email" type="email" required autoComplete="email"
              defaultValue="harsh@ascend.local"
              className="w-full rounded-lg border border-white/[0.08] bg-void-800/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-arc-blue/50 focus:ring-1 focus:ring-arc-blue/40"
            />
          </div>
          <div>
            <label className="sys-label mb-1 block" htmlFor="password">Access Key</label>
            <input
              id="password" name="password" type="password" required autoComplete="current-password"
              className="w-full rounded-lg border border-white/[0.08] bg-void-800/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-arc-blue/50 focus:ring-1 focus:ring-arc-blue/40"
            />
          </div>
          <LoginButton />
          <p className="text-center text-xs text-slate-600">
            Seeded credentials come from your <code className="text-slate-500">.env</code>.
          </p>
        </form>
      </div>
    </div>
  );
}
