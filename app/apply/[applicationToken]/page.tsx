import { submitApplication } from "./actions";
import Link from "next/link";

type ApplicationPageProps = {
    params: Promise<{ applicationToken: string }>;
    searchParams: Promise<{ error?: string; success?: string}>;
};

export default async function ApplicationPageProps({
    params,
    searchParams,
}: ApplicationPageProps) {
    const { applicationToken } = await params;
    const { error, success } = await searchParams;
    const submitForClass = submitApplication.bind(null, applicationToken);

    if (success === "submitted") {
        return (
            <main className="min-h-screen bg-[#f8f4f4] px-4 py-10 text-zinc-950">
                <section className="mx-auto max-w-2xl rounded-md border border-red-100 bg-white p-6 shadow-sm sm:p-8">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                        Latinos In Action
                    </p>

                    <div className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-4 text-green-800">
                        <p className="text-sm font-semibold">Application received</p>
                        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
                            Thank you for applying
                        </h1>
                        <p className="mt-3 text-sm leading-6">
                            Your LIA application has been submitted successfully.
                        </p>
                    </div>

                    <div className="mt-6 space-y-4 text-sm leading-6 text-zinc-700">
                        <p>
                            Your teacher will review your application and follow up with a 
                            final decision.
                        </p>

                        <p>
                            If you entered an email address, you may receive a confirmation 
                            email once email notifications are enabled for the portal.
                        </p>
                    </div>

                    <div className="mt-6 rounded-md border border-zinc-100 bg-zinc-50 px-4 py-4">
                        <h2 className="text-sm font-semibold text-zinc-950">
                            What happens next?
                        </h2>
                        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-700">
                            <li>Your application appears on your teacher&apos;s applicant list.</li>
                            <li>Your teacher reviews your responses.</li>
                            <li>Your teacher accepts, declines, or follows up with you.</li>
                        </ol>
                    </div>

                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f8f4f4] px-4 py-10 text-zinc-950">
            <section className="mx-auto max-w-3xl rounded-md border border-red-100 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                    Latinos In Action
                </p>
                <h1 className="mt-2 text-3xl font-semibold">Student Application</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Complete this application if you are interested in joining LIA.
                </p>

                {error ? (
                    <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error === "missing-fields"
                            ? "First name and last name are required."
                            : error === "closed"
                                ? "This application is currently closed."
                                : error === "already-submitted"
                                    ? "An application with this email has already been submitted for this class."
                                    : "Could not submit your application. Please try again."}
                    </div>
                ) : null}

                <Link href="/apply">Choose a different school or teacher</Link>

                <form action={submitForClass} className="mt-6 space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <input name="first_name" required placeholder="First name" className="h-11 rounded-md border px-3" />
                        <input name="last_name" required placeholder="Last name" className="h-11 rounded-md border px-3" />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <input name="email" type="email" placeholder="School email" className="h-11 rounded-md border px-3" />
                        <input name="grade_level" placeholder="Grade level" className="h-11 rounded-md border px-3" />
                    </div>

                    <input name="advisory_teacher" placeholder="Advisory teacher" className="h-11 w-full rounded-md border px-3" />
                    <input name="color_team" placeholder="Color team / advisory group" className="h-11 w-full rounded-md border px-3" />

                    <textarea name="why_lia" rows={4} placeholder="Why do you want to join LIA?" className="w-full rounded-md border px-3 py-2" />
                    <textarea name="skills_strengths" rows={4} placeholder="What skills, interests, or strengths would you bring?" className="w-full rounded-md border px-3 py-2" />
                    <textarea name="why_good_fit" rows={4} placeholder="Why would you be a good addition to LIA?" className="w-full rounded-md border px-3 py-2" />
                    <textarea name="extracurriculars" rows={4} placeholder="List extracurricular activities or future plans" className="w-full rounded-md border px-3 py-2" />
                    <textarea name="inspiration" rows={4} placeholder="Who or what inspires you?" className="w-full rounded-md border px-3 py-2" />
                    <textarea name="academic_review" rows={4} placeholder="Describe your academic peformance." className="w-full rounded-md border px-3 py-2" />
                    <textarea name="three_rs_review" rows={4} placeholder="Reflect on being ready, respectful, and responsible." className="w-full rounded-md border px-3 py-2" />
                    
                    <button className="h-10 rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white">
                        Submit Application
                    </button>
                </form>
            </section>
        </main>
    );
}
