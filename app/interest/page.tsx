import Image from "next/image";
import { InterestForm } from "./interest-form";

type InterestPageProps = {
  searchParams: Promise<{ source?: string }>;
};

export default async function InterestPage({ searchParams }: InterestPageProps) {
  const { source } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f8f4f4] px-4 py-8 text-zinc-950 sm:py-12">
      <section className="mx-auto max-w-3xl rounded-xl border border-red-100 bg-white p-5 shadow-sm sm:p-8">
        <Image src="/lia-logo.png" alt="Latinos In Action" width={150} height={60} className="h-auto w-36" priority />
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-[#c8102e]">Bring LIA to your school</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">School Interest Form</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Tell us about your school and the students you hope to serve. This form starts a conversation—it does not create a contract or require payment.
        </p>
        <div className="mt-8"><InterestForm source={(source ?? "direct").slice(0, 80)} /></div>
      </section>
    </main>
  );
}
