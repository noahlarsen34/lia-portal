"use client";

import { useState } from "react";

const meetingDayOptions = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
];

type ClassScheduleFieldsProps = {
    initialScheduleType?: string | null;
    initialMeetingDays?: string[] | null;
    initialStartTime?: string | null;
    initialEndTime?: string | null;
    initialStartDate?: string | null;
    initialEndDate?: string | null;
    initialBlockDesignation?: string | null;
    initialTimeZone?: string | null;
};

export function ClassScheduleFields({
    initialScheduleType = "traditional",
    initialMeetingDays = [],
    initialStartTime = null,
    initialEndTime = null,
    initialStartDate = null,
    initialEndDate = null,
    initialBlockDesignation = null,
    initialTimeZone = "America/Denver",
} : ClassScheduleFieldsProps) {
    const [scheduleType, setScheduleType] = useState(
        initialScheduleType ?? "traditional",
    );

    return (
        <fieldset className="rounded-md border border-zinc-200 bg-zinc-50/60 p-5">
            <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-[#c4122f]">
                Class Schedule
            </legend>

            <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                    <span className="text-sm font-medium text-zinc-800">
                        Schedule Type
                    </span>

                    <select
                        name="schedule_type"
                        value={scheduleType}
                        onChange={(event) =>
                            setScheduleType(event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                    >
                        <option value="traditional">
                            Traditional schedule
                        </option>

                        <option value="block">
                            Block schedule
                        </option>
                        
                        <option value="other">
                            Other schedule
                        </option>
                    </select>
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-zinc-800">
                        Timezone
                    </span>

                    <select
                        name="timezone"
                        defaultValue={
                            initialTimeZone ?? "America/Denver"
                        }
                        className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                    >
                        <option value="America/Los_Angeles">
                            Pacific Time
                        </option>

                        <option value="America/Denver">
                            Mountain Time
                        </option>

                        <option value="America/Chicago">
                            Central Time
                        </option>

                        <option value="America/New_York">
                            Eastern Time
                        </option>

                        <option value="America/Anchorage">
                            Alaska Time
                        </option>

                        <option value="Pacific/Honolulu">
                            Hawaii Time
                        </option>
                    </select>
                </label>

                {scheduleType === "block" ? (
                    <label className="block">
                        <span className="text-sm font-medium text-zinc-800">
                            Block Designation
                        </span>

                        <select
                            name="block_designation"
                            defaultValue={
                                initialBlockDesignation ?? ""
                            }
                            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                        >
                            <option value="">
                                Select block
                            </option>
                            <option value="a_day">A Day</option>
                            <option value="b_day">B Day</option>
                            <option value="both">
                                Both A and B Days
                            </option>
                        </select>
                    </label>
                ) : null}
            </div>

            <div className="mt-5">
                <p className="text-sm font-medium text-zinc-800">
                    Meeting days
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {meetingDayOptions.map((day) => (
                        <label
                            key={day.value}
                            className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2.5"
                        >
                            <input
                                type="checkbox"
                                name="meeting_days"
                                value={day.value}
                                defaultChecked={
                                    initialMeetingDays?.includes(
                                        day.value,
                                    ) ?? false
                                }
                                className="h-4 w-4 accent-[#c4122f]"
                            />

                            <span className="text-sm font-medium text-zinc-700">
                            {day.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="block">
                    <span className="text-sm font-medium text-zinc-800">
                        Start Time
                    </span>

                    <input
                        type="time"
                        name="start_time"
                        defaultValue={
                            initialStartTime?.slice(0, 5) ?? ""
                        }
                        className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-zinc-800">
                        End Time
                    </span>

                    <input
                        type="time"
                        name="end_time"
                        defaultValue={
                            initialEndTime?.slice(0, 5) ?? ""
                        }
                        className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                    />
                </label>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="block">
                    <span className="text-sm font-medium text-zinc-800">
                        Class Start Date
                    </span>

                    <input
                        type="date"
                        name="start_date"
                        defaultValue={initialStartDate ?? ""}
                        className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-zinc-800">
                        Class End Date
                    </span>

                    <input  
                        type="date"
                        name="end_date"
                        defaultValue={initialEndDate ?? ""}
                        className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100"
                    />
                </label>
            </div>
        </fieldset>
    );
}