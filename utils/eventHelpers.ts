import { Lunar, Solar } from "lunar-javascript";

export type EventType = "birthday" | "death_anniversary" | "custom";

export interface FamilyEvent {
  id: string; // personId or custom event id
  personId?: string;
  personName: string;
  type: EventType;
  /** Solar date of the occurrence in the requested year */
  occurrence: Date;
  /** Display label for the date of the event (e.g., "12/03" solar or "05/02 ÂL") */
  eventDateLabel: string;
  /** The actual year of original event (birth year or death year) */
  originYear: number | null;
}

export interface CustomEvent {
  id: string;
  title: string;
  event_day: number;
  event_month: number;
  event_year?: number | null;
}

/**
 * Finds the solar Date on which a given lunar (month, day) falls in a specific solar year.
 */
function getSolarForLunarInYear(
  lunarMonth: number,
  lunarDay: number,
  solarYear: number,
): Date | null {
  // Try to find the lunar date in the given solar year
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LunarClass = Lunar as any;
  
  // A lunar year usually overlaps with the solar year.
  // We check lunar year = solarYear and solarYear - 1
  for (let offset = -1; offset <= 1; offset++) {
    try {
      const l = LunarClass.fromYmd(
        solarYear + offset,
        lunarMonth,
        lunarDay,
      );
      const s = l.getSolar();
      if (s.getYear() === solarYear) {
        return new Date(s.getYear(), s.getMonth() - 1, s.getDay());
      }
    } catch {
      // lunar date may not exist in this year (e.g., leap month); try next
    }
  }
  return null;
}

/**
 * Computes FamilyEvents from a list of persons and custom events for a specific year.
 */
export function computeEventsForYear(
  persons: {
    id: string;
    full_name: string;
    birth_year: number | null;
    birth_month: number | null;
    birth_day: number | null;
    death_year: number | null;
    death_month: number | null;
    death_day: number | null;
    is_deceased: boolean;
  }[],
  customEvents: CustomEvent[],
  year: number
): FamilyEvent[] {
  const events: FamilyEvent[] = [];

  for (const p of persons) {
    // ── Birthday (solar) ────────────────────────────────────────────
    if (p.birth_month && p.birth_day) {
      events.push({
        id: `birth-${p.id}`,
        personId: p.id,
        personName: p.full_name,
        type: "birthday",
        occurrence: new Date(year, p.birth_month - 1, p.birth_day),
        eventDateLabel: `${p.birth_day.toString().padStart(2, "0")}/${p.birth_month.toString().padStart(2, "0")}`,
        originYear: p.birth_year,
      });
    }

    // ── Death anniversary (lunar) ────────────────────────────────────
    if (p.is_deceased && p.death_month && p.death_day) {
      try {
        // Convert the solar death date to a lunar date
        const deathYear = p.death_year ?? year;
        const solar = Solar.fromYmd(deathYear, p.death_month, p.death_day);
        const lunar = solar.getLunar();
        const lMonth = Math.abs(lunar.getMonth()); // abs to handle leap month
        const lDay = lunar.getDay();

        const occurrence = getSolarForLunarInYear(lMonth, lDay, year);
        if (occurrence) {
          events.push({
            id: `death-${p.id}`,
            personId: p.id,
            personName: p.full_name,
            type: "death_anniversary",
            occurrence,
            eventDateLabel: `${lDay.toString().padStart(2, "0")}/${lMonth.toString().padStart(2, "0")} ÂL`,
            originYear: p.death_year,
          });
        }
      } catch {
        // Skip if lunar conversion fails
      }
    }
  }

  // ── Custom Events (solar) ────────────────────────────────────────
  for (const ce of customEvents) {
    if (ce.event_month && ce.event_day) {
      events.push({
        id: ce.id,
        personName: ce.title,
        type: "custom",
        occurrence: new Date(year, ce.event_month - 1, ce.event_day),
        eventDateLabel: `${ce.event_day.toString().padStart(2, "0")}/${ce.event_month.toString().padStart(2, "0")}`,
        originYear: ce.event_year || null,
      });
    }
  }

  // Sort: by occurrence date
  events.sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime());
  return events;
}
