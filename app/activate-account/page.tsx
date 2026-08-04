import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { activateTeacherAccount } from "./actions";

export const metadata: Metadata = {
    title: "Activate Teacher Account | LIA Portal",
    robots: {
        index: false,
        follow: false,
    },
};

type ActivateAccountPageProps = {
    searchParams: Promise<{
        token_hash?: string;
        type?: string;
        error?: string;
    }>;
};

const errorMessages: Record<string, string> = {
    "invalid-invitation": "This invitation link is invalid.",
    "expired-invitation":
        "This invitation has expired or was already used. Ask an administrator or RPM to resend it.",
    "teacher-access-unavailable":
        "Portal access is unavailable for this teacher account. Please contact Latinos In Action support.",
    "activation-failed":
        "Your account could not be activated. Please contact Latinos In Action support.",
};

export default async function ActivateAccountPage({
    searchParams,
}: ActivateAccountPageProps) {
    const { token_hash: tokenHash, type, error } = await searchParams;
    const hasValidParameters = Boolean(tokenHash) && type === "invite";
    const errorMessage = error
        ? errorMessages[error] ?? "The invitation could not be completed."
        : null;

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f8f4f4] px-6 py-10 text-zinc-950">
            <section className="w-full max-w-[460px] rounded-lg border border-red-100 bg-white p-8 shadow-[0_20px_70px_rgba(85,0,8,0.12)]">
                <div className="flex justify-center">
                    <Image
                        src="/lia-logo.png"
                        alt="Latinos in Action logo"
                        width={150}
                        height={75}
                        priority
                    />
                </div>

                <h1 className="mt-6 text-center text-2xl font-semibold">
                    Activate your teacher account
                </h1>

                <p className="mt-3 text-center text-sm leading-6 text-zinc-600">
                    Press the button below to verify your invitation and open
                    the LIA Teacher Portal.
                </p>

                {errorMessage ? (
                    <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                    </div>
                ) : null}

                {hasValidParameters && !errorMessage ? (
                    <form action={activateTeacherAccount} className="mt-6">
                        <input
                            type="hidden"
                            name="token_hash"
                            value={tokenHash}
                        />
                        <input type="hidden" name="type" value="invite" />

                        <button
                            type="submit"
                            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white transition hover:bg-[#a70d25] focus:outline-none focus:ring-4 focus:ring-red-100"
                        >
                            Activate My Account
                        </button>
                    </form>
                ) : (
                    <Link
                        href="/teacher-login"
                        className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md border border-[#c8102e] px-4 text-sm font-semibold text-[#c8102e] hover:bg-red-50"
                    >
                        Go to Teacher Login
                    </Link>
                )}

                <p className="mt-5 text-center text-xs leading-5 text-zinc-500">
                    If your invitation expired, ask your RPM or an
                    administrator to select Resend Invitation on your teacher
                    profile.
                </p>
            </section>
        </main>
    );
}
