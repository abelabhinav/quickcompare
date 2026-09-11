"use client";

import { useState } from "react";

const DEFAULT_LOCATION = "Bengaluru";

export default function LocationControl() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [draft, setDraft] = useState(DEFAULT_LOCATION);
  const [isEditing, setIsEditing] = useState(false);

  function saveLocation() {
    const nextLocation = draft.trim();
    if (!nextLocation) {
      return;
    }

    setLocation(nextLocation);
    setIsEditing(false);
  }

  return (
    <div className="flex w-full max-w-3xl items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm">
      <div className="min-w-0">
        <span className="text-white/35">Delivering to </span>
        <span className="font-medium text-white/80">{location}</span>
        {" "}
        <span className="text-xs text-white/30">(mock location)</span>
      </div>
      <button
        type="button"
        aria-expanded={isEditing}
        onClick={() => setIsEditing((current) => !current)}
        className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-300/50"
      >
        {isEditing ? "Close" : "Change"}
      </button>
      {isEditing && (
        <div className="absolute z-10 mt-24 flex w-[calc(100%-3rem)] max-w-3xl gap-2 rounded-xl border border-white/15 bg-[#11121f] p-3 shadow-2xl shadow-black/40 sm:w-auto sm:min-w-[22rem]">
          <label htmlFor="delivery-location" className="sr-only">
            Delivery location
          </label>
          <input
            id="delivery-location"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                saveLocation();
              }
            }}
            placeholder="City or PIN code"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-300/50"
          />
          <button
            type="button"
            onClick={saveLocation}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-300/50"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
