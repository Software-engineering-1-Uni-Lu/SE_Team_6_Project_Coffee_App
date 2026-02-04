export type OpeningHours = Record<string, { open: string; close: string }>;

export function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
}

/**
 * Checks if a given datetime falls within the opening hours for that day.
 * Assumes opening hours are within the same day (no overnight shifts).
 */
export function isWithinOpeningHours(
  date: Date,
  openingHours: OpeningHours
): boolean {
  if (!openingHours) return true; // If no hours defined, assume open

  const dayName = getDayName(date);
  const hours = openingHours[dayName];

  if (!hours) return false; // Closed on this day if not in object

  // Parse open/close times (HH:MM)
  const [openHour, openMinute] = hours.open.split(":").map(Number);
  const [closeHour, closeMinute] = hours.close.split(":").map(Number);

  const dateHour = date.getHours();
  const dateMinute = date.getMinutes();

  // Convert everything to minutes from midnight for comparison
  const timeInMinutes = dateHour * 60 + dateMinute;
  const openInMinutes = openHour * 60 + openMinute;
  const closeInMinutes = closeHour * 60 + closeMinute;

  return timeInMinutes >= openInMinutes && timeInMinutes < closeInMinutes;
}

/**
 * Returns the next available opening time slot from now.
 * Scans up to 7 days ahead.
 */
export function getNextOpenSlot(openingHours: OpeningHours): Date | null {
  if (!openingHours) return new Date();

  const now = new Date();
  const scanLimitDays = 7;

  // Start checking from current time
  // If closed today, check tomorrow's opening time

  for (let i = 0; i < scanLimitDays; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + i);
    const dayName = getDayName(checkDate);
    const hours = openingHours[dayName];

    if (hours) {
      const [openHour, openMinute] = hours.open.split(":").map(Number);

      const openTime = new Date(checkDate);
      openTime.setHours(openHour, openMinute, 0, 0);

      // If checking today, and we are before opening time, return today's opening time
      if (i === 0) {
        if (now < openTime) {
          return openTime;
        }
        // If we are currently within hours, return now (or next 15 min slot)
        if (isWithinOpeningHours(now, openingHours)) {
          // Round to next 15 mins? The utility just returns "next open slot".
          // Let's return openTime if today is valid but we missed it? No.
          // If we are open NOW, the next open slot is technically NOW.
          return now;
        }
        // If we are past closing today, loop continues to tomorrow
      } else {
        // Future day: return its opening time
        return openTime;
      }
    }
  }

  return null; // No open slots found in next 7 days
}
