import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ApplicationQrCode } from "@/components/application-qr-code";
import { requireStaff } from "@/utils/role-guards";
import { headers } from "next/headers";

async function getRequestBaseUrl() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol ?? (host?.startsWith("localhost") ? "http" : "https");

  if (host) {
    return `${protocol}://${host}`;
  }

  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export default async function InterestFormAdminPage() {
  await requireStaff();
  const baseUrl = await getRequestBaseUrl();
  const interestUrl = `${baseUrl}/interest?source=admin-qr`;

  return (
    <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
      <DashboardSidebar />
      <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">School onboarding</p>
          <h1 className="mt-2 text-3xl font-semibold">Interest Form</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Share this permanent public link with prospective schools. Download the QR code for presentations, flyers, and events.
          </p>
          <div className="mt-6">
            <ApplicationQrCode
              applicationUrl={interestUrl}
              title="School interest form QR code"
              description="School leaders can scan this code to open the public interest form."
              downloadName="lia-school-interest-form-qr-code.png"
              imageAlt="QR code for the LIA school interest form"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
