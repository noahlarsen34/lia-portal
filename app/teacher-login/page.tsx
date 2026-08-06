import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getHomePathForRole } from "@/utils/role-guards";
import {
    requestTeacherCode,
    resendTeacherActivation,
} from "./actions";

type TeacherLoginPageProps = {
    searchParams: Promise<{
        error?: string;
        notice?: string;
    }>;
};

const errorMessages: Record<string, string> ={
    "email-required": "Enter your registered teacher email.",
    "access-unavailable":
        "We could not request a code for this email. Confirm that it matches your teacher record or contact LIA support.",
    "activation-required":
        "This teacher account has not finished activation. Open your latest LIA invitation and select Activate My Account before requesting a login code.",
    "code-send-failed":
        "The login code could not be requested from our email service. Please wait a moment and try again. If this continues, contact LIA support.",
    "code-rate-limited":
        "Too many login codes were requested. Wait a few minutes before trying again.",
    "activation-rate-limited":
        "An activation email was recently requested. Wait at least one minute before requesting another one.",
    "activation-send-failed":
        "The activation email could not be sent. Please try again or contact LIA support.",
};

function maskEmail(email: string) {
    const [localPart, domain] = email.split("@");

    if (!localPart || !domain) {
        return email;
    }

    return `${localPart.slice(0, 2)}***@${domain}`;
}

export default async function TeacherLoginPage({
    searchParams,
}: TeacherLoginPageProps) {
    const { error, notice } = await searchParams;
    const errorMessage = error
        ? errorMessages[error] ??
            "Something went wrong. Please try again."
        : null;
    const cookieStore = await cookies();
    const pendingEmail = cookieStore.get(
        "lia_pending_teacher_email",
    )?.value;
    const canResendActivation =
        Boolean(pendingEmail) &&
        (error === "activation-required" ||
            error === "activation-rate-limited" ||
            error === "activation-send-failed");
    
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .eq("id", user.id)
            .maybeSingle();
        
        redirect(getHomePathForRole(profile?.role));
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f8f4f4] px-6 py-10 text-zinc-950">
            <section className="w-full max-w-[420px] rounded-lg border border-red-100 bg-white p-8 shadow-[0_20px_70px_rgba(85,0,8,0.12)]">
                <div className="mb-8">
                    <div className="mb-6 flex justify-center">
                        <Image
                            src="/lia-logo.png"
                            alt="Latinos In Action logo"
                            width={160}
                            height={80}
                            priority
                        />
                    </div>

                    <p className="text-center text-sm font-semibold uppercase tracking-wide text-[#c8102e]">
                        Teacher Portal
                    </p>

                    <h1 className="mt-2 text-center text-2xl font-semibold">
                        Sign in with your email
                    </h1>

                    <p className="mt-2 text-center text-sm leading-6 text-zinc-600">
                        Enter the email address registered with your LIA teacher account.
                        We will send you a six-digit login code.
                    </p>
                </div>

                {errorMessage ? (
                    <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                    </div>
                ) : null}

                {notice === "activation-sent" ? (
                    <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        A new activation email was requested. Open it and select
                        <span className="font-semibold"> Activate My Account</span>
                        , then confirm activation on the portal page.
                    </div>
                ) : null}

                {notice === "already-activated" ? (
                    <div className="mb-5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                        This account is already activated. Request a login code below.
                    </div>
                ) : null}

                {canResendActivation && pendingEmail ? (
                    <div className="mb-5 rounded-md border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-sm font-semibold text-zinc-900">
                            Activation status: Not completed
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                            Destination: {maskEmail(pendingEmail)}
                        </p>
                        <p className="mt-3 text-xs leading-5 text-zinc-500">
                            Opening the invitation alone does not activate the account.
                            Select Activate My Account in the email and confirm it on
                            the portal page.
                        </p>
                        <form action={resendTeacherActivation} className="mt-4">
                            <button
                                type="submit"
                                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[#c8102e] bg-white px-4 text-sm font-semibold text-[#c8102e] transition hover:bg-red-50"
                            >
                                Resend Activation Email
                            </button>
                        </form>
                    </div>
                ) : null}

                <form 
                    action={requestTeacherCode}
                    className="space-y-5"
                >
                    <label className="block">
                        <span className="text-sm font-medium text-zinc-800">
                            Email address
                        </span>

                        <input
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            autoFocus
                            placeholder="teacher@school.org"
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        />
                    </label>

                    <button
                        type="submit"
                        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white transition hover:bg-[#a70d25] focus:outline-none focus:ring-4 focus:ring-red-100"
                    >
                        Email Me a Login Code
                    </button>
                </form>

                <div className="mt-6 border-t border-zinc-100 pt-6">
                    <p className="text-center text-sm text-zinc-600">
                        Are you an administrator or RPM
                    </p>

                    <Link
                        href="/login"
                        className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-red-50 hover:text-[#c8102e]"
                    >
                        Staff Password Login
                    </Link>
                </div>

                <p className="mt-5 text-center text-xs leading-5 text-zinc-500">
                    Only invited and activated teachers can request
                    a login code.
                </p>
            </section>
        </main>
    );
}
