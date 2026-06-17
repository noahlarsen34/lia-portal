import Image from "next/image";
import { redirect } from "next/navigation";
import { signIn } from "./actions";
import { createClient } from "@/utils/supabase/server";
import { PasswordInput } from "./password-input";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "invalid-login": "The email or password was not correct.",
  "missing-fields": "Enter both your email and password.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const errorMessage = error ? errorMessages[error] : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f4f4] px-6 py-10 text-zinc-950">
      <section className="w-full max-w-[420px] rounded-lg border border-red-100 bg-white p-8 shadow-[0_20px_70px_rgba(85,0,8,0.12)]">
        <div className="mb-8">
          <div className="mb-6 flex justify-center">
            <Image
              src="/lia-logo.png"
              alt="Latinos in Action logo"
              width={140}
              height={70}
              priority
            />
            </div>
          <h1 className="text-center text-2xl font-semibold">
            Sign in to LIA Portal
            </h1>
          <p className="mt-2 text-center text-sm text-zinc-600">
            Use your Latinos in Action admin account to continue.
          </p>
        </div>

        {errorMessage ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <form action={signIn} className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">Email</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <PasswordInput />

          <button
            className="h-11 w-full rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white transition hover:bg-[#a70d25] focus:outline-none focus:ring-4 focus:ring-red-100"
            type="submit"
          >
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}
