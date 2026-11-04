// A class slot in a weekly routine, and the clash check between them.
export const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'] as const;
export type Day = (typeof DAYS)[number];

export interface Slot {
  id: string;
  code: string;
  section: string;
  days: Day[];
  start: string; // "08:00"
  end: string; // "09:20"
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// two slots clash when they share a day and their times overlap;
// one ending at 9:20 and the next starting at 9:20 is fine
export function overlaps(a: Slot, b: Slot) {
  if (!a.days.some((d) => b.days.includes(d))) return false;
  return minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);
}

// id of every slot -> codes of the slots it clashes with
export function findClashes(slots: Slot[]) {
  const clashes: Record<string, string[]> = {};
  slots.forEach((a, i) => {
    slots.slice(i + 1).forEach((b) => {
      if (!overlaps(a, b)) return;
      (clashes[a.id] ||= []).push(b.code);
      (clashes[b.id] ||= []).push(a.code);
    });
  });
  return clashes;
}

export function validSlot(s: Omit<Slot, 'id'>) {
  return /^[A-Z]{3}\d{3}$/.test(s.code) && s.days.length > 0 && !!s.start && !!s.end && minutes(s.start) < minutes(s.end);
}
