import { submitApplication } from "./actions";
import Link from "next/link";
import ApplicationForm from "./application-form";

type ApplicationPageProps = {
    params: Promise<{ applicationToken: string }>;
    searchParams: Promise<{ error?: string; success?: string; lang?: string;}>;
};

export default async function ApplicationPageProps({
    params,
    searchParams,
}: ApplicationPageProps) {
    const { applicationToken } = await params;
    const { error, success, lang } = await searchParams;
    const isSpanish = lang === "es";
    const submitForClass = submitApplication.bind(null, applicationToken);

    const confirmationText = isSpanish
    ? {
          received: "Solicitud recibida",
          thankYou: "Gracias por enviar tu solicitud",
          emailSent:
              "Tu solicitud fue enviada y se envió un correo de confirmación a la dirección que proporcionaste.",
          submitted: "Tu solicitud de LIA fue enviada correctamente.",
          review:
              "Tu maestro revisará tu solicitud y se comunicará contigo con una decisión final.",
          inbox:
              "Revisa tu correo para encontrar la confirmación de tu solicitud. Puede tardar unos minutos en llegar.",
          next: "¿Qué sucede después?",
          steps: [
              "Tu solicitud aparecerá en la lista de solicitantes de tu maestro.",
              "Tu maestro revisará tus respuestas.",
              "Tu maestro aceptará, rechazará o se comunicará contigo.",
          ],
      }
    : {
          received: "Application received",
          thankYou: "Thank you for applying",
          emailSent:
              "Your application was submitted, and a confirmation email has been sent to the address you provided.",
          submitted: "Your LIA application has been submitted successfully.",
          review:
              "Your teacher will review your application and follow up with a final decision.",
          inbox:
              "Check your inbox for your application confirmation. It may take a few minutes to arrive.",
          next: "What happens next?",
          steps: [
              "Your application appears on your teacher's applicant list.",
              "Your teacher reviews your responses.",
              "Your teacher accepts, declines, or follows up with you.",
          ],
      };
      
    if (success === "submitted" || success === "email-sent") {
        const confirmationEmailSent = success === "email-sent";

        return (
            <main className="min-h-screen bg-[#f8f4f4] px-4 py-10 text-zinc-950">
                <section className="mx-auto max-w-2xl rounded-md border border-red-100 bg-white p-6 shadow-sm sm:p-8">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                        Latinos In Action
                    </p>

                    <div className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-4 text-green-800">
                        <p className="text-sm font-semibold">
                            {confirmationText.received}
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
                            {confirmationText.thankYou}
                        </h1>
                        <p className="mt-3 text-sm leading-6">
                            {confirmationEmailSent
                                ? confirmationText.emailSent
                                : confirmationText.submitted}
                        </p>
                    </div>

                    <div className="mt-6 space-y-4 text-sm leading-6 text-zinc-700">
                        <p>{confirmationText.review}</p>

                        {confirmationEmailSent ? (
                            <p>{confirmationText.inbox}</p>
                        ) : null}
                    </div>

                    <div className="mt-6 rounded-md border border-zinc-100 bg-zinc-50 px-4 py-4">
                        <h2 className="text-sm font-semibold text-zinc-950">
                            {confirmationText.next}
                        </h2>
                        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-700">
                            {confirmationText.steps.map((step) => (
                                <li key={step}>{step}</li>
                            ))}
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
                
                <ApplicationForm action={submitForClass} error={error} />
            </section>
        </main>
    );
}
