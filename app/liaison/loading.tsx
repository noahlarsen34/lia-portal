export default function LiaisonLoading() {
    return (
        <div className="mx-auto max-w-6xl animate-pulse" aria-label="Loading liaison portal">
            <div className="h-4 w-40 rounded bg-red-100" />
            <div className="mt-4 h-10 w-80 max-w-full rounded bg-zinc-200" />
            <div className="mt-3 h-5 w-full max-w-2xl rounded bg-zinc-200" />

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={index}
                        className="h-28 rounded-md border border-red-100 bg-white shadow-sm"
                    />
                ))}
            </div>

            <div className="mt-6 space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div
                        key={index}
                        className="h-28 rounded-md border border-red-100 bg-white shadow-sm"
                    />
                ))}
            </div>
        </div>
    );
}
