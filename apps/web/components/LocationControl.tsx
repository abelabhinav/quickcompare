"use client";

import { useEffect, useRef, useState } from "react";
import { browserGeocodingProvider } from "../lib/geocoding";
import {
  createManualLocationState,
  getLocationIndicatorLabel,
  initialLocationState,
  parseManualLocation,
  requestBrowserLocation,
  requestingLocationState,
  shouldShowLocationOnboarding,
  type LocationState,
} from "../lib/location";
import {
  getPopularLocationSuggestions,
  searchLocationSuggestions,
  type LocationSuggestion,
} from "../lib/serviceAreas";

type DialogMode = "choice" | "manual";

export default function LocationControl() {
  const [locationState, setLocationState] =
    useState<LocationState>(initialLocationState);
  const [isDialogOpen, setIsDialogOpen] = useState(() =>
    shouldShowLocationOnboarding(initialLocationState),
  );
  const [dialogMode, setDialogMode] = useState<DialogMode>("choice");
  const [locationQuery, setLocationQuery] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const firstActionRef = useRef<HTMLButtonElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    const focusTarget =
      dialogMode === "manual" ? manualInputRef.current : firstActionRef.current;
    focusTarget?.focus();
  }, [dialogMode, isDialogOpen]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && locationState.status !== "requesting") {
        setIsDialogOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen, locationState.status]);

  async function useBrowserLocation() {
    setManualError(null);
    setStatusMessage("");
    setLocationState(requestingLocationState);

    const nextState = await requestBrowserLocation(
      navigator.geolocation,
      browserGeocodingProvider,
      (progress) => {
        setStatusMessage(
          progress === "geocoding"
            ? "Determining your area..."
            : "Getting your location...",
        );
      },
    );
    setLocationState(nextState);

    if (nextState.status === "granted") {
      setStatusMessage("");
      setIsDialogOpen(false);
      setDialogMode("choice");
      return;
    }

    setStatusMessage(
      nextState.status === "denied"
        ? "Location access was denied."
        : "Could not access your location.",
    );
  }

  function saveManualLocationFromQuery() {
    const manualLocation = parseManualLocation(
      /^\d{6}$/.test(locationQuery.trim()) ? locationQuery : "",
      /^\d{6}$/.test(locationQuery.trim()) ? "" : locationQuery,
    );

    if (!manualLocation) {
      setManualError("Enter a valid pincode, city or area.");
      return;
    }

    const nextState = createManualLocationState(manualLocation);
    setManualError(null);
    setLocationState(nextState);
    setStatusMessage(nextState.message);
    window.setTimeout(() => {
      setIsDialogOpen(false);
      setDialogMode("choice");
    }, 500);
  }

  function selectSuggestion(suggestion: LocationSuggestion) {
    const nextState = createManualLocationState({
      ...(suggestion.pincode ? { pincode: suggestion.pincode } : {}),
      city: suggestion.city,
      ...(suggestion.locality ? { locality: suggestion.locality } : {}),
    });

    setLocationQuery(suggestion.displayLabel);
    setManualError(null);
    setStatusMessage("");
    setLocationState(nextState);
    setIsDialogOpen(false);
    setDialogMode("choice");
  }

  const isRequesting = locationState.status === "requesting";
  const indicatorLabel = getLocationIndicatorLabel(locationState);
  const locationSuggestions = locationQuery.trim()
    ? searchLocationSuggestions(locationQuery)
    : getPopularLocationSuggestions();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setManualError(null);
          setStatusMessage("");
          setDialogMode("choice");
          setIsDialogOpen(true);
        }}
        className="inline-flex max-w-[11rem] items-center gap-1.5 truncate rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/75 transition hover:border-white/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-300/50 sm:max-w-xs"
        aria-label={`Change shopping location. Current status: ${indicatorLabel}`}
      >
        <span aria-hidden="true">📍</span>
        <span className="truncate">{indicatorLabel}</span>
      </button>

      {isDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 py-8 backdrop-blur-sm sm:items-center sm:py-10"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-dialog-title"
            className="w-full max-w-[360px] rounded-2xl border border-white/15 bg-[#11121f] p-6 text-left shadow-2xl shadow-black/50"
          >
            {dialogMode === "choice" ? (
              <>
                <h2
                  id="location-dialog-title"
                  className="text-center text-xl font-bold tracking-tight text-white"
                >
                  Where are you shopping from?
                </h2>

                <div className="mt-6 grid gap-3">
                <button
                  ref={firstActionRef}
                  type="button"
                  onClick={useBrowserLocation}
                  disabled={isRequesting}
                  className="rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-black transition hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-300/50 disabled:cursor-wait disabled:opacity-70"
                >
                  {isRequesting
                    ? statusMessage || "Getting your location..."
                    : "📍 Use my location"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualError(null);
                    setDialogMode("manual");
                  }}
                  disabled={isRequesting}
                  className="rounded-xl border border-white/15 px-4 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-300/50 disabled:cursor-wait disabled:opacity-60"
                >
                  Enter location manually
                </button>
                </div>

                {statusMessage && (
                  <div
                    aria-live="polite"
                    className="mt-4 text-center text-sm text-red-200"
                  >
                    {statusMessage}
                  </div>
                )}
              </>
            ) : (
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2
                    id="location-dialog-title"
                    className="text-xl font-bold tracking-tight text-white"
                  >
                    Enter your location
                  </h2>
                  {!shouldShowLocationOnboarding(locationState) && (
                    <button
                      type="button"
                      onClick={() => setIsDialogOpen(false)}
                      className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/60 transition hover:border-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-300/50"
                    >
                      Close
                    </button>
                  )}
                </div>

                <label htmlFor="location-search" className="sr-only">
                  Search city, area or pincode
                </label>
                <input
                  ref={manualInputRef}
                  id="location-search"
                  value={locationQuery}
                  onChange={(event) => {
                    setLocationQuery(event.target.value);
                    setManualError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      saveManualLocationFromQuery();
                    }
                  }}
                  autoComplete="off"
                  placeholder="Search city, area or pincode"
                  className="min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-base text-white outline-none placeholder:text-white/30 focus:border-violet-300/50"
                />

                <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-1">
                  {locationSuggestions.length === 0 ? (
                    <button
                      type="button"
                      onClick={saveManualLocationFromQuery}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-300/50"
                    >
                      <span>Use {locationQuery.trim()}</span>
                    </button>
                  ) : (
                    locationSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/75 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-300/50"
                      >
                        <span className="min-w-0 truncate">
                          {suggestion.displayLabel}
                        </span>
                        <span className="shrink-0 text-xs capitalize text-white/35">
                          {suggestion.type}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {manualError && (
                  <div className="text-sm text-red-200">{manualError}</div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setManualError(null);
                    setStatusMessage("");
                    setDialogMode("choice");
                  }}
                  className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/75 transition hover:border-white/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-300/50"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
