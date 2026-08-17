"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: unknown;
  reset: () => void;
}) {
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-xl font-bold text-red-700">Something went wrong</h2>
      <p className="mt-2 text-sm text-slate-600">{toErrorMessage(error)}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === "object" && "type" in error) {
    return "An unexpected browser event interrupted this action. Please try again.";
  }
  return "An unexpected error occurred. Please refresh and try again.";
}
