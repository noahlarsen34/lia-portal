"use client";

import { useMemo, useState } from "react";

type AvailableSchool = {
  id: string;
  name: string;
  state: string | null;
};

type AssignSchoolFormProps = {
  availableSchools: AvailableSchool[];
  action: (formData: FormData) => void;
};

export function AssignSchoolForm({
  availableSchools,
  action,
}: AssignSchoolFormProps) {
  const [search, setSearch] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");

  const hasSearch = search.trim().length > 0;

  const filteredSchools = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) {
      return [];
    }

    return availableSchools
      .filter((school) => {
        const name = school.name.toLowerCase();
        const state = school.state?.toLowerCase() ?? "";

        return name.includes(searchText) || state.includes(searchText);
      })
      .slice(0, 6);
  }, [availableSchools, search]);

  const selectedSchool = availableSchools.find(
    (school) => school.id === selectedSchoolId
  );

  return (
    <form action={action} className="w-full max-w-md">
      <input type="hidden" name="school_id" value={selectedSchoolId} />

      <div className="relative">
        <label className="text-sm font-medium text-zinc-800">
          Assign School
        </label>

        <div className="mt-2 flex gap-2">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedSchoolId("");
            }}
            className="h-10 min-w-0 flex-1 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c8102e] focus:ring-4 focus:ring-red-100"
            placeholder="Search unassigned schools..."
          />

          <button
            type="submit"
            disabled={!selectedSchoolId}
            className="h-10 shrink-0 rounded-md bg-[#c8102e] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            Assign
          </button>
        </div>

        {hasSearch && !selectedSchool ? (
          <div className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-lg">
            {filteredSchools.map((school) => (
              <button
                key={school.id}
                type="button"
                onClick={() => {
                  setSelectedSchoolId(school.id);
                  setSearch(`${school.name} - ${school.state ?? "N/A"}`);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-red-50 hover:text-[#c8102e]"
              >
                <span className="font-medium">{school.name}</span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {school.state ?? "N/A"}
                </span>
              </button>
            ))}

            {filteredSchools.length === 0 ? (
              <div className="px-3 py-3 text-sm text-zinc-500">
                No matching unassigned schools.
              </div>
            ) : null}
          </div>
        ) : null}

        {selectedSchool ? (
          <p className="mt-2 text-xs text-zinc-500">
            Selected:{" "}
            <span className="font-semibold text-zinc-700">
              {selectedSchool.name}
            </span>
          </p>
        ) : null}
      </div>
    </form>
  );
}