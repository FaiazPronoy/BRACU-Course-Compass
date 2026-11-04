import { describe, expect, it } from 'vitest';
import { findClashes, overlaps, type Slot, validSlot } from './routine';

const slot = (id: string, code: string, days: Slot['days'], start: string, end: string): Slot => ({
  id, code, section: '01', days, start, end,
});

describe('routine clashes', () => {
  it('finds two classes on the same day at overlapping times', () => {
    expect(overlaps(slot('a', 'CSE220', ['Sun', 'Tue'], '08:00', '09:20'), slot('b', 'MAT216', ['Tue'], '09:00', '10:20'))).toBe(true);
  });

  it('lets one class start when the other ends', () => {
    expect(overlaps(slot('a', 'CSE220', ['Sun'], '08:00', '09:20'), slot('b', 'MAT216', ['Sun'], '09:20', '10:40'))).toBe(false);
  });

  it('ignores the same time on different days', () => {
    expect(overlaps(slot('a', 'CSE220', ['Sun'], '08:00', '09:20'), slot('b', 'MAT216', ['Mon'], '08:00', '09:20'))).toBe(false);
  });

  it('names every course a slot clashes with', () => {
    const clashes = findClashes([
      slot('a', 'CSE220', ['Sun'], '08:00', '09:20'),
      slot('b', 'MAT216', ['Sun'], '08:30', '09:50'),
      slot('c', 'PHY111', ['Sun'], '09:00', '10:20'),
    ]);
    expect(clashes.a).toEqual(['MAT216', 'PHY111']);
    expect(clashes.c).toEqual(['CSE220', 'MAT216']);
  });

  it('refuses a slot that ends before it starts', () => {
    expect(validSlot({ code: 'CSE220', section: '1', days: ['Sun'], start: '10:00', end: '09:00' })).toBe(false);
    expect(validSlot({ code: 'CSE220', section: '1', days: ['Sun'], start: '08:00', end: '09:20' })).toBe(true);
  });
});
