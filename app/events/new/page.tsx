import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireAdmin } from "@/utils/role-guards";
import { createEvent } from "./actions";

type NewEventPageProps = {
    searchParams: Promise<{
        error?: string;
    }>;
};

function getErrorMessage(error: string | undefined) {
    switch (error) {
        case "missing-fields":
            return "Event name, date, and location are required.";
        case "name-too-long":
            return "The event name must be 200 characters or fewer.";
        case "description-too-long":
            return "The event description is too long.";
        case "invalid-time":
            return "The event end time must be after its start time.";
        case "invalid-deadline":
            return "The registration deadline cannot be after the event date.";
        case "invalid-capacity":
            return "Capcity must be a whole number greater than zero.";
        case "missing-schools":
            return "Select at least one eligible school or choose All Schools.";
        case "invalid-schools":
            return "One or more selected schools are not valid.";
        case "school-assignment-failed":
            return "The eligible schools could not be saved. Please try again.";
        case "create-failed":
            return "The event could not be created. Please try again.";
        default:
            return null;
    }
}

export default async function NewEventPage({
    searchParams,
}: NewEventPageProps) {
    const { error } = await searchParams;
    const { supabase } = await requireAdmin();
    
    const { data: schools, error: schoolsError} =
        await supabase
            .from("schools")
            .select("id, name, state, status")
            .eq("status", "active")
            .order("state")
            .order("name");

    if (schoolsError) {
        throw new Error(
            `Unable to load eligible schools" ${schoolsError.message}`,
        );
    }

    const errorMessage = getErrorMessage(error);

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    <Link
                        href="/events"
                        className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
                    >
                        Back to events
                    </Link>

                    <header className="mt-5">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">
                            Event Management
                        </p>

                        <h1 className="mt-2 text-3xl font-semibold">
                            Create New Event
                        </h1>

                        <p className="mt-2 text-sm text-zinc-600">
                            Add the event details and choose which schools
                            can participate.
                        </p>
                    </header>

                    {errorMessage ? (
                        <div 
                            role="alert"
                            className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {errorMessage}
                        </div>
                    ) : null}

                    <form 
                        action={createEvent}
                        className="mt-6 space-y-6"
                    >
                        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                            <h2 className="text-xl font-semibold">
                                Event Details
                            </h2>

                            <div className="mt-5 space-y-5">
                                <label className="block">
                                    <span className="text-sm font-semibold text-zinc-700">
                                        Event Name
                                    </span>

                                    <input
                                        name="name"
                                        required
                                        maxLength={200}
                                        placeholder="Example: LIA Leadership Conference"
                                        className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-sm font-semibold text-zinc-700">
                                        Description
                                    </span>

                                    <textarea
                                        name="description"
                                        rows={5}
                                        maxLength={10000}
                                        placeholder="Describe the event and anything teachers or students should know."
                                        className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                    />
                                </label>

                                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Date
                                        </span>

                                        <input
                                            name="event_date"
                                            type="date"
                                            required
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Start Time
                                        </span>

                                        <input
                                            name="start_time"
                                            type="time"
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            End Time
                                        </span>

                                        <input
                                            name="end_time"
                                            type="time"
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>
                                </div>


                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Location Name
                                        </span>

                                        <input
                                            name="location_name"
                                            required
                                            placeholder="Example: Utah Valley Convention Center"
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Address
                                        </span>

                                        <input
                                            name="address"
                                            placeholder="Street, city, state, and ZIP"
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>
                                </div>

                                
                            </div>
                        </section>
                    </form>
                </div>
            </section>
        </main>
    )
}