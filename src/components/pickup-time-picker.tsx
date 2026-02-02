"use client";

/**
 * Pickup Time Picker Component
 *
 * Simplified time picker for selecting order pickup times.
 * Features:
 * - Quick select buttons (ASAP, 30 min, 1 hour)
 * - Manual time selection via datetime input
 * - Basic validation (minimum 15 min advance)
 * - Clear button to reset selection
 */

import { useEffect, useState, useCallback } from "react";

interface PickupTimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minAdvanceMinutes?: number;
  disabled?: boolean;
}

export function PickupTimePicker({
  value,
  onChange,
  minAdvanceMinutes = 15,
  disabled = false,
}: PickupTimePickerProps) {
  const [error, setError] = useState<string | null>(null);

  // Format date for datetime-local input (YYYY-MM-DDThh:mm)
  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Get minimum allowed time
  const getMinTime = useCallback((): Date => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minAdvanceMinutes);
    return now;
  }, [minAdvanceMinutes]);

  // Round time to nearest 15-minute interval
  const roundToQuarter = (date: Date): Date => {
    const rounded = new Date(date);
    const minutes = rounded.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    rounded.setMinutes(roundedMinutes);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded;
  };

  // Validate selected time
  const validateTime = useCallback(
    (date: Date | null): boolean => {
      if (!date) {
        setError(null);
        return true;
      }

      const minTime = getMinTime();
      if (date < minTime) {
        setError(
          `Pickup time must be at least ${minAdvanceMinutes} minutes from now`
        );
        return false;
      }

      // Don't allow more than 7 days in advance
      const maxTime = new Date();
      maxTime.setDate(maxTime.getDate() + 7);
      if (date > maxTime) {
        setError("Pickup times can only be scheduled within the next week");
        return false;
      }

      setError(null);
      return true;
    },
    [minAdvanceMinutes, getMinTime]
  );

  // Handle quick select button click
  const handleQuickSelect = (minutes: number) => {
    const newTime = new Date();
    newTime.setMinutes(newTime.getMinutes() + minutes);
    const rounded = roundToQuarter(newTime);

    if (validateTime(rounded)) {
      onChange(rounded);
    }
  };

  // Handle manual datetime input change
  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      onChange(null);
      setError(null);
      return;
    }

    const selectedDate = new Date(e.target.value);
    if (validateTime(selectedDate)) {
      onChange(selectedDate);
    }
  };

  // Handle clear button
  const handleClear = () => {
    onChange(null);
    setError(null);
  };

  // Format display time
  const formatDisplayTime = (date: Date): string => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow =
      date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    let dateStr = "";
    if (isToday) {
      dateStr = "Today";
    } else if (isTomorrow) {
      dateStr = "Tomorrow";
    } else {
      dateStr = date.toLocaleDateString("en-GB", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

    const timeStr = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${dateStr} at ${timeStr}`;
  };

  // Calculate relative time
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `in ${diffMins} min`;
    }

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (mins === 0) {
      return `in ${hours} hour${hours > 1 ? "s" : ""}`;
    }

    return `in ${hours}h ${mins}m`;
  };

  // Validate on value change
  useEffect(() => {
    if (value) {
      validateTime(value);
    }
  }, [value, validateTime]);

  return (
    <div className="space-y-4">
      {/* Quick Select Buttons */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]">
          Quick Select
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleQuickSelect(minAdvanceMinutes)}
            disabled={disabled}
            className="rounded-md border border-[hsl(35,20%,85%)] px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            ASAP ({minAdvanceMinutes} min)
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect(30)}
            disabled={disabled}
            className="rounded-md border border-[hsl(35,20%,85%)] px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            In 30 min
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect(60)}
            disabled={disabled}
            className="rounded-md border border-[hsl(35,20%,85%)] px-4 py-2 text-sm font-medium text-[hsl(25,35%,25%)] transition-colors hover:bg-[hsl(35,20%,95%)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            In 1 hour
          </button>
        </div>
      </div>

      {/* Manual Time Selection */}
      <div>
        <label
          htmlFor="pickup-time-input"
          className="mb-2 block text-sm font-medium text-[hsl(25,35%,25%)]"
        >
          Or choose a specific time
        </label>
        <input
          id="pickup-time-input"
          type="datetime-local"
          value={value ? formatDateTimeLocal(value) : ""}
          onChange={handleDateTimeChange}
          disabled={disabled}
          min={formatDateTimeLocal(getMinTime())}
          className="w-full rounded-md border border-[hsl(35,20%,90%)] px-3 py-2 text-[hsl(25,35%,25%)] focus:border-[hsl(25,75%,47%)] focus:outline-none focus:ring-2 focus:ring-[hsl(25,75%,47%)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Selected Time Display */}
      {value && !error && (
        <div className="rounded-md bg-[hsl(25,25%,95%)] p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[hsl(25,35%,45%)]">
                Selected Pickup Time
              </p>
              <p className="mt-1 text-base font-semibold text-[hsl(25,35%,25%)]">
                {formatDisplayTime(value)}
              </p>
              <p className="mt-1 text-sm text-[hsl(25,35%,55%)]">
                {getRelativeTime(value)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="text-sm font-medium text-[hsl(25,75%,47%)] hover:text-[hsl(25,75%,42%)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Help Text */}
      <p className="text-sm text-[hsl(25,35%,55%)]">
        Select when you would like to pick up your order. Orders typically take
        10-15 minutes to prepare.
      </p>
    </div>
  );
}
