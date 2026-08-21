import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireAdmin } from "@/utils/role-guards";
import { SchoolSelector } from "@/app/events/new/school-selector";
import { updateEvent } from "./actions";

type EditEventPageProps = {
    params: Promise<{
        eventId: string;
    }>;
    searchParams: Promise<{
        error?: string;
    }>;
};

function getErrorMessage(error: string | undefined) {
    switch(error) {
        case "missing-fields":
            return "Event name, date, and location are required.";
        case "name-too-long":
            return "The event name must be 200 characters or fewer.";
        case "invalid-time":
            return "The event end time must be after its start time.";
        case "invalid-deadline":
            return "the registration deadline cannot be after the event date.";
        case "invalid-capacity":
            return "Capacity must be a whole number greater than zero.";
        case "missing-schools":
            return 'Select at least one eligible school or choose All Schools.';
        case "invalid-schools":
            return "One or more selected schools are invalid.";
        case "school-assignment-failed":
            return "The eligible schools could not be updated.";
        case "update-failed":
            return "The event could not be updated. Please try again.";
        case "description-too-long":
            return "The event description is too long.";
        case "event-content-too-long":
            return "Requirements, agenda, and additional instructions must each be 15,000 characters or fewer.";
        case "invalid-contact-email":
            return "Enter a valid event contact email address.";
        case "invalid-resource-url":
            return "The resource link must begin with http:// or https://.";
        case "invalid-banner-type":
            return "The banner must be a JPG, PNG, or WebP image.";
        case "banner-too-large":
            return "The banner image must be 5 MB or smaller.";
        case "banner-upload-failed":
            return "The banner image could not be uploaded. Please try again.";
        default:
            return null;
    }
}

export default async function EditEventPage({
    params,
    searchParams,
}: EditEventPageProps) {
    const { eventId } = await params;
    const { error } = await searchParams;
    const { supabase } = await requireAdmin();

    const [
        eventResult,
        schoolsResult,
        assignmentsResult,
    ] = await Promise.all([
        supabase
            .from("lia_events")
            .select(
                `
                    id,
                    name,
                    description,
                    event_date,
                    start_time,
                    end_time,
                    location_name,
                    address,
                    registration_deadline,
                    capacity,
                    all_schools,
                    status,
                    banner_image_url,
                    requirements,
                    agenda,
                    additional_instructions,
                    contact_name,
                    contact_email,
                    contact_phone,
                    resource_label,
                    resource_url
                `,
            )
            .eq("id", eventId)
            .maybeSingle(),
        
        supabase
            .from("schools")
            .select("id, name, state")
            .eq("status", "active")
            .order("state")
            .order("name"),
        
        supabase
            .from("lia_event_schools")
            .select('school_id')
            .eq("event_id", eventId),
    ]);

    if (eventResult.error) {
        throw new Error(
            `Unable to load event: ${eventResult.error.message}`,
        );
    }

    if (!eventResult.data) {
        notFound();
    }

    if (schoolsResult.error) {
        throw new Error(
            `Unable to load schools: ${schoolsResult.error.message}`,
        );
    }

    if (assignmentsResult.error) {
        throw new Error(
            `Unable to load event schools: ${assignmentsResult.error.message}`,
        );
    }

    const event = eventResult.data;
    
    const selectedSchoolIds = (
        assignmentsResult.data ?? []
    ).map((assignment) => assignment.school_id);

    const updateCurrentEvent =
        updateEvent.bind(null, event.id);
    
    const errorMessage = getErrorMessage(error);

    return (
        <main className="min-h-screen bg-[#f8f4f4] text-zinc-950">
            <DashboardSidebar />

            <section className="min-h-screen px-4 py-6 sm:px-6 lg:ml-52 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link
                            href="/events"
                            className="text-sm font-semibold text-[#c8102e] hover:text-[#a70d25]"
                        >
                            Back to events
                        </Link>

                        <Link
                            href={`/teacher/events/${event.id}?preview=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-10 items-center justify-center rounded-md border border-[#c8102e] bg-white px-4 text-sm font-semibold text-[#c8102e] hover:bg-red-50"
                        >
                            Preview Teacher Page
                        </Link>
                    </div>

                    <header className="mt-5">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#c8102e]">
                            Event Management
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-semibold">
                                Edit Event
                            </h1>

                            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase text-zinc-600">
                                {event.status}
                            </span>
                        </div>

                        <p className="mt-2 text-sm text-zinc-600">
                            Update event details and eligible schools.
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
                    action={updateCurrentEvent}
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
                                        defaultValue={event.name}
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
                                        defaultValue={
                                            event.description ?? ""
                                        }
                                        className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                    />
                                </label>

                                <div className="grid gap-5 sm:grid-cols-3">
                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Date
                                        </span>

                                        <input
                                            name="event_date"
                                            type="date"
                                            required
                                            defaultValue={
                                                event.event_date
                                            }
                                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Start Time
                                        </span>

                                        <input
                                            name="start_time"
                                            type="time"
                                            defaultValue={
                                                event.start_time?.slice(
                                                    0,
                                                    5,
                                                ) ?? ""
                                            }
                                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            End Time
                                        </span>

                                        <input
                                            name="end_time"
                                            type="time"
                                            defaultValue={
                                                event.end_time?.slice(
                                                    0,
                                                    5,
                                                ) ?? ""
                                            }
                                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
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
                                            defaultValue={
                                                event.location_name
                                            }
                                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Address
                                        </span>

                                        <input
                                            name="address"
                                            defaultValue={
                                                event.address ?? ""
                                            }
                                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Registration Deadline
                                        </span>

                                        <input
                                            name="registration-deadline"
                                            type="date"
                                            defaultValue={
                                                event.registration_deadline ?? ""
                                            }
                                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Capacity
                                        </span>

                                        <input
                                            name="capacity"
                                            type="number"
                                            min={1}
                                            step={1}
                                            defaultValue={
                                                event.capacity ?? ""
                                            }
                                            placeholder="No limit"
                                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                            <div>
                                <h2 className="text-xl font-semibold">
                                    Event Page Content
                                </h2>

                                <p className="mt-1 text-sm text-zinc-500">
                                    Customize the teacher-facing event detail page.
                                </p>
                            </div>

                            <div className="mt-5 space-y-5">
                                {event.banner_image_url ? (
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-700">
                                            Current Banner
                                        </p>

                                        <img
                                            src={event.banner_image_url}
                                            alt={`${event.name} banner`}
                                            className="mt-2 aspect-[3/1] w-full rounded-lg border border-zinc-200 object-cover"
                                        />

                                        <label className="mt-3 flex items-center gap-2 text-sm font-medium text-red-700">
                                            <input
                                                name="remove_banner"
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-zinc-300 accent-[#c8102e]"
                                            />
                                            Remove current banner
                                        </label>
                                    </div>
                                ) : null}

                                <label className="block">
                                    <span className="text-sm font-semibold text-zinc-700">
                                        {event.banner_image_url
                                            ? "Replace Banner"
                                            : "Event Banner"}
                                    </span>

                                    <input
                                        name="banner_image"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="mt-2 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-red-50 file:px-4 file:py-2 file:font-semibold file:text-[#c8102e] hover:file:bg-red-100"
                                    />

                                    <span className="mt-2 block text-xs text-zinc-500">
                                        JPG, PNG, or WebP. Maximum size: 5 MB.
                                    </span>
                                </label>

                                <label className="block">
                                    <span className="text-sm font-semibold text-zinc-700">
                                        Requirements
                                    </span>

                                    <textarea
                                        name="requirements"
                                        rows={6}
                                        maxLength={15000}
                                        defaultValue={event.requirements ?? ""}
                                        placeholder="Enter one requirement per line."
                                        className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-sm font-semibold text-zinc-700">
                                        Schedule or Agenda
                                    </span>

                                    <textarea
                                        name="agenda"
                                        rows={7}
                                        maxLength={15000}
                                        defaultValue={event.agenda ?? ""}
                                        placeholder={"Example:\n8:00 AM - Check-in\n9:00 AM - Opening session"}
                                        className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-sm font-semibold text-zinc-700">
                                        Additional Instructions
                                    </span>

                                    <textarea
                                        name="additional_instructions"
                                        rows={5}
                                        maxLength={15000}
                                        defaultValue={
                                            event.additional_instructions ?? ""
                                        }
                                        placeholder="Transportation, dress, arrival, meal, or preparation instructions."
                                        className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                    />
                                </label>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Contact Name
                                        </span>

                                        <input
                                            name="contact_name"
                                            maxLength={200}
                                            defaultValue={event.contact_name ?? ""}
                                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Contact Email
                                        </span>

                                        <input
                                            name="contact_email"
                                            type="email"
                                            maxLength={320}
                                            defaultValue={event.contact_email ?? ""}
                                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Contact Phone
                                        </span>

                                        <input
                                            name="contact_phone"
                                            type="tel"
                                            maxLength={50}
                                            defaultValue={event.contact_phone ?? ""}
                                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Resource Button Label
                                        </span>

                                        <input
                                            name="resource_label"
                                            maxLength={100}
                                            defaultValue={event.resource_label ?? ""}
                                            placeholder="Download event packet."
                                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Resource Link
                                        </span>

                                        <input
                                            name="resource_url"
                                            type="url"
                                            maxLength={200}
                                            defaultValue={event.resource_url ?? ""}
                                            placeholder="https://..."
                                            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>
                                </div>
                            </div>
                        </section>

                        <SchoolSelector
                            schools={schoolsResult.data ?? []}
                            initalAllSchools={event.all_schools}
                            initalSelectedSchoolIds={
                                selectedSchoolIds
                            }
                        />

                        <div className="flex flex-col-reverse gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:justify-end">
                            <Link
                                href="/events"
                                className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                            >
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                className="inline-flex h-11 items-center justify-center rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}
