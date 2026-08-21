"use client";

import { useState } from "react";

const CATEGORIES = ["Public speaking", "Art", "Video", "Essay"] as const;

type Entry = {
    key: number;
    category: string;
};

const fieldClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none placeholder:text-gray-500 focus:border-[#c8102e] focus:ring-2 focus:ring-red-100";

export function CompetitionEntries() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [nextKey, setNextKey] = useState(0);

    const selectedCategories = new Set(
        entries.map((entry) => entry.category).filter(Boolean),
    );

    function addEntry() {
        if (entries.length >= CATEGORIES.length) return;

        setEntries((current) => [...current, { key: nextKey, category: "" }]);
        setNextKey((current) => current + 1);
    }

    return (
        <div className="border-t border-gray-200 pt-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-xl font-bold">Competition entries</h3>
                    <p className="mt-2 max-w-2xl text-gray-600">
                        Competition entries are optional for now. You may submit
                        one entry in each category using a file or shareable link.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={addEntry}
                    disabled={entries.length >= CATEGORIES.length}
                    className="shrink-0 rounded-xl border border-[#c8102e] px-4 py-2.5 font-semibold text-[#c8102e] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                >
                    + Add competition entry
                </button>
            </div>

            {entries.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-sm text-gray-600">
                    No competition entry added. You can still complete your event
                    registration.
                </div>
            ) : (
                <div className="mt-6 space-y-6">
                    {entries.map((entry, index) => (
                        <section
                            key={entry.key}
                            className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                        >
                            <input
                                type="hidden"
                                name="competition_entry_key"
                                value={entry.key}
                            />

                            <div className="mb-5 flex items-center justify-between gap-4">
                                <h4 className="font-bold text-gray-950">
                                    Competition entry {index + 1}
                                </h4>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setEntries((current) =>
                                            current.filter(
                                                (item) => item.key !== entry.key,
                                            ),
                                        )
                                    }
                                    className="text-sm font-semibold text-red-700 hover:text-red-900"
                                >
                                    Remove
                                </button>
                            </div>

                            <div className="space-y-5">
                                <label className="block space-y-2 font-semibold">
                                    <span>Competition category</span>
                                    <select
                                        name={`competition_category_${entry.key}`}
                                        value={entry.category}
                                        onChange={(event) => {
                                            const category = event.target.value;
                                            setEntries((current) =>
                                                current.map((item) =>
                                                    item.key === entry.key
                                                        ? { ...item, category }
                                                        : item,
                                                ),
                                            );
                                        }}
                                        className={fieldClass}
                                    >
                                        <option value="">Select a category</option>
                                        {CATEGORIES.map((category) => (
                                            <option
                                                key={category}
                                                value={category}
                                                disabled={
                                                    category !== entry.category &&
                                                    selectedCategories.has(category)
                                                }
                                            >
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block space-y-2 font-semibold">
                                    <span>
                                        Entry title{" "}
                                        <span className="font-normal text-gray-500">
                                            (optional)
                                        </span>
                                    </span>
                                    <input
                                        name={`entry_title_${entry.key}`}
                                        placeholder="Enter the title of your entry"
                                        className={fieldClass}
                                    />
                                </label>

                                <label className="block space-y-2 font-semibold">
                                    <span>Google Doc, website, or video link</span>
                                    <input
                                        type="url"
                                        name={`external_url_${entry.key}`}
                                        placeholder="https://docs.google.com/... or https://youtube.com/..."
                                        className={fieldClass}
                                    />
                                    <span className="block text-sm font-normal text-gray-500">
                                        Make sure anyone with the link can view it.
                                    </span>
                                </label>

                                <label className="block space-y-2 font-semibold">
                                    <span>Upload competition files</span>
                                    <input
                                        type="file"
                                        name={`entry_files_${entry.key}`}
                                        multiple
                                        accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.doc,.docx,.ppt,.pptx,.mp4,.mov"
                                        className="block w-full rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 font-normal text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#c8102e] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-[#a80d27]"
                                    />
                                </label>
                            </div>
                        </section>
                    ))}
                </div>
            )}

            <p className="mt-4 text-sm text-gray-500">
                Across all entries, upload up to five files with a combined size
                below 9 MB. Word documents, PDFs, images, presentations, and
                supported videos are accepted.
            </p>
        </div>
    );
}
