import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireAdmin } from "@/utils/role-guards";
import { EVENT_TIMEZONES } from "@/utils/timezones";
import { createEvent } from "./actions";
import { SchoolSelector } from "./school-selector";

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
            return "Capacity must be a whole number greater than zero.";
        case "missing-schools":
            return "Select at least one eligible school or choose All Schools.";
        case "invalid-schools":
            return "One or more selected schools are not valid.";
        case "school-assignment-failed":
            return "The eligible schools could not be saved. Please try again.";
        case "create-failed":
            return "The event could not be created. Please try again.";
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
        case "invalid-event-type":
            return "Select a valid event type.";
        case "invalid-timezone":
            return "Select a valid event timezone.";
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

                            <label className="block">
                                <span className="text-sm font-semibold text-zinc-700">
                                    Event Type
                                </span>

                                <select
                                    name="event_type"
                                    required
                                    defaultValue="conference"
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                >
                                    <option value="conference">
                                        Confrence - students and teachers
                                    </option>

                                    <option value="bootcamp">
                                        Bootcamp - student presidency
                                    </option>

                                    <option value="mastermind">
                                        Mastermind - student presidency
                                    </option>
                                </select>

                                <span className="mt-2 block text-xs text-zinc-500">
                                    Confrence registrations include competition entries.
                                    Bootcamp and Mastermind are limited to class presidency
                                    students and do not include competitions.
                                </span>
                            </label>

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

                                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Timezone
                                        </span>

                                        <select
                                            name="timezone"
                                            required
                                            defaultValue="America/Denver"
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        >
                                            {EVENT_TIMEZONES.map((timezone) => (
                                                <option
                                                    key={timezone.value}
                                                    value={timezone.value}
                                                >
                                                    {timezone.label}
                                                </option>
                                            ))}
                                        </select>
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

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Registration Deadline
                                        </span>

                                        <input
                                            name="registration_deadline"
                                            type="date"
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
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
                                            placeholder="Leave blank for no limit"
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
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
                                    This information appears on the teacher-facing event page.
                                </p>
                            </div>

                            <div className="mt-5 space-y-5">
                                <label className="block">
                                    <span className="text-sm font-semibold text-zinc-700">
                                        Event Banner
                                    </span>

                                    <input
                                        name="banner_image"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="mt-2 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-red-50 file:px-4 file:py-2 file:font-semibold file:text-[#c8102e] hover:file-red-100"
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
                                        placeholder={"Example:\n8:00 AM - Check-in\n9:00 AM - Opening session\n10:00 AM - Workshops"}
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
                                        placeholder="Include transportation, dress, arrival, meal, or preparation instructions."
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
                                            placeholder="Event contact or leader"
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
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
                                            placeholder="contact@example.org"
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
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
                                            placeholder="(801) 555-0123"
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
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
                                            placeholder="Example: Download event packet"
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-zinc-700">
                                            Resource Link
                                        </span>

                                        <input
                                            name="resource_url"
                                            type="url"
                                            maxLength={2000}
                                            placeholder="https://..."
                                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
                                        />
                                    </label>
                                </div>
                            </div>
                        </section>

                        <SchoolSelector schools={schools ?? []} />

                        <div className="flex flex-col-reverse gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:justify-end">
                            <Link
                                href="/events"
                                className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                            >
                                Cancel
                            </Link>

                            <button 
                                type="submit"
                                name="intent"
                                value="draft"
                                className="inline-flex h-11 items-center justify-center rounded-md border border-[#c8102e] bg-white px-5 text-sm font-semibold text-[#c8102e] hover:bg-red-50"
                            >
                                Save Draft
                            </button>

                            <button
                                type="submit"
                                name="intent"
                                value="open"
                                className="inline-flex h-11 items-center justify-center rounded-md bg-[#c8102e] px-5 text-sm font-semibold text-white hover:bg-[#a70d25]"
                            >
                                Create and Open Event
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}
