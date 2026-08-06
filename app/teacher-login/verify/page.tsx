import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyTeacherCode } from "../actions";
import { EmailDeliveryStatus } from "./email-delivery-status";

type VerifyTeacherCodePageProps = {
    searchParams: Promise<{
        error?: string;
        resent?: string;
    }>;
};

function maskEmail(email: string) {
    const [localPart, domain] = email.split("@");

    if (!localPart || !domain) {
        return email;
    }

    if (localPart.length <= 2) {
        return `${localPart.charAt(0)}***@${domain}`;
    }

    return `${localPart.slice(0,2)}***@${domain}`;
}

export default async function VerifyTeacherCodePage({
    searchParams,
}: VerifyTeacherCodePageProps) {
    const { error, resent } = await searchParams;
    const cookieStore = await cookies();

    const email = cookieStore.get(
        "lia_pending_teacher_email",
    )?.value;

    if (!email) {
        redirect("/teacher-login?error=email-required");
    }

    const errorMessage =
        error === "invalid-code"
            ? "That code is invalid or has expired. Please check the code and try again."
            : error === "code-cooldown"
                ? "A code was requested recently. Wait for the countdown before requesting another one."
            : error
                ? "The code could not be verified."
                : null;
    const maskedEmail = maskEmail(email);
    
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
                        Check Your Email
                    </p>

                    <h1 className="mt-2 text-center text-2xl font-semibold">
                        Enter your login code
                    </h1>

                    <p className="mt-2 text-center text-sm leading-6 text-zinc-600">
                        We requested a six-digit code for {" "}
                        <span className="font-semibold text-zinc-800">
                            {maskedEmail}
                        </span>
                        . Delivery may take a few minutes on school email systems.
                    </p>
                </div>

                {errorMessage ? (
                    <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                    </div>
                ) : null}

                {resent === "true" ? (
                    <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        A new code was requested. Use the newest code you receive;
                        older codes may no longer work.
                    </div>
                ) : null}

                <EmailDeliveryStatus
                    maskedEmail={maskedEmail}
                    recipientEmail={email}
                />

                <form
                    action={verifyTeacherCode}
                    className="space-y-5"
                >
                    <label className="block">
                        <span className="text-sm font-medium text-zinc-800">
                            Six-digit code
                        </span>

                        <input
                            name="token"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]{6}"
                            minLength={6}
                            maxLength={6}
                            required
                            autoFocus
                            placeholder="123456"
                            className="mt-2 h-14 w-full rounded-md border border-zinc-300 px-4 text-center text-2xl font-semibold tracking-[0.45em] outline-none transition focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                        />
                    </label>

                    <button
                        type="submit"
                        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white transition hover:bg-[#a70d25] focus:outline-none focus:ring-4 focus:ring-red-100"
                    >
                        Verify and Sign In
                    </button>
                </form>

                <div className="mt-6 border-t border-zinc-100 pt-6">
                    <Link
                        href="/teacher-login"
                        className="inline-flex h-11 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-red-50 hover:text-[#c8102e]"
                    >
                        Use a Different Email
                    </Link>
                </div>

                <p className="mt-5 text-center text-xs leading-5 text-zinc-500">
                    Check spam and quarantine folders. If no code arrives,
                    ask your district email administrator to allow messages
                    from no-reply@mail.lia-portal.org. The code expires after
                    a short period and can only be used once.
                </p>
            </section>
        </main>
    );
}
