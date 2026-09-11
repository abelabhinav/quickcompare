"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  isLoading,
}: SearchBarProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="mt-10 flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-black/20 sm:flex-row"
    >
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="What are you looking for?"
        aria-label="Search for a product to compare"
        disabled={isLoading}
        className="h-14 flex-1 rounded-xl border border-white/10 bg-black/30 px-5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-white/25 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <button
        type="submit"
        disabled={isLoading}
        className="flex h-14 items-center justify-center rounded-xl bg-white px-7 font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? (
          <>
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
            Searching...
          </>
        ) : (
          "Compare"
        )}
      </button>
    </form>
  );
}
