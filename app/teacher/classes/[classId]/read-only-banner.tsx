import { Eye } from "lucide-react";

export function ReadOnlyBanner() {
    return (
        <div className="mt-5 flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
                <p className="font-semibold">Co-teacher read-only view</p>
                <p className="mt-0.5 text-blue-800">
                    You can view this class and export its information, but only
                    the primary teacher can make changes.
                </p>
            </div>
        </div>
    );
}

