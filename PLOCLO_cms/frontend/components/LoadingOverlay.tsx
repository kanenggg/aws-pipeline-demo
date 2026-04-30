// components/LoadingOverlay.tsx (or wherever it is defined)

"use client";

export default function LoadingOverlay() {
  return (
    // FIX: Change 'fixed' to 'absolute' to contain it within the 'relative' parent
    // and use 'h-full w-full' to cover that parent completely.
    <div
      className="fixed inset-0 z-[9999] h-full w-full flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm transition-opacity duration-300"
      // Changed bg opacity slightly to ensure coverage of background
    >
      {/* Spinner and text content remain the same */}
      <div
        className="w-14 h-14 mb-4 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label="loading"
      />
      <h1 className="text-orange-600 text-lg font-light tracking-wide">
        Loading Data...
      </h1>
    </div>
  );
}
