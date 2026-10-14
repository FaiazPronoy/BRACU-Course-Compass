import { describe, expect, it } from 'vitest';
import { courses } from '../src/catalogue';

// The CSE and CS course sequence sheet, row by row: hard prerequisites, then
// soft ones. If BRACU changes a rule, change it here and in the catalogue.
const sheet: Record<string, [string[], string[]]> = {
  CSE111: [['CSE110'], []],
  CSE220: [['CSE111', 'CSE230'], []],
  CSE221: [['CSE220'], []],
  CSE250: [[], ['PHY112']],
  CSE251: [['CSE250'], []],
  CSE260: [['CSE251'], []],
  CSE310: [['CSE370'], []],
  CSE321: [['CSE221'], []],
  CSE330: [['MAT216'], []],
  CSE331: [['CSE221'], []],
  CSE340: [['CSE260'], []],
  CSE341: [['CSE260'], ['CSE340', 'CSE321']],
  CSE350: [['CSE251'], []],
  CSE360: [['CSE341'], []],
  CSE370: [['CSE221'], []],
  CSE391: [['CSE370'], []],
  CSE392: [['MAT215'], []],
  CSE410: [['CSE321'], []],
  CSE420: [['CSE321', 'CSE331', 'CSE340'], []],
  CSE421: [[], ['CSE320']],
  CSE422: [['CSE221'], []],
  CSE423: [['MAT216'], []],
  CSE430: [['MAT120'], []],
  CSE460: [['CSE260'], []],
  CSE461: [['CSE260'], []],
  CSE470: [['CSE370'], []],
  CSE471: [['CSE370'], []],
  CSE489: [['CSE370'], []],
  ENG102: [['ENG101'], []],
  ENG103: [['ENG102'], []],
  MAT120: [['MAT110'], []],
  MAT215: [['MAT216'], []],
  MAT216: [['MAT120'], []],
  PHY112: [['PHY111'], []],
};

const byCode = new Map(courses.map((c) => [c.code, c as (typeof courses)[number] & { recommended?: string[] }]));

describe('the course catalogue', () => {
  it('has each course once', () => {
    expect(byCode.size).toBe(courses.length);
  });

  it.each(Object.entries(sheet))('%s matches the sequence sheet', (code, [hard, soft]) => {
    const course = byCode.get(code);
    expect(course, `${code} is missing`).toBeDefined();
    expect([...course!.prerequisites].sort()).toEqual([...hard].sort());
    expect([...(course!.recommended || [])].sort()).toEqual([...soft].sort());
  });

  it('only points at courses it has', () => {
    const unknown = courses.flatMap((c: any) =>
      [...c.prerequisites, ...(c.recommended || []), ...(c.programPrerequisites || []).flatMap((p: any) => p.codes)]
        .filter((p: string) => !byCode.has(p))
        .map((p: string) => `${c.code} -> ${p}`)
    );
    expect(unknown).toEqual([]);
  });

  it('never needs a course to come before itself', () => {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const walk = (code: string, path: string[]): string | null => {
      if (done.has(code)) return null;
      if (visiting.has(code)) return [...path, code].join(' -> ');
      visiting.add(code);
      for (const p of byCode.get(code)?.prerequisites || []) {
        const loop = walk(p, [...path, code]);
        if (loop) return loop;
      }
      visiting.delete(code);
      done.add(code);
      return null;
    };
    for (const c of courses) expect(walk(c.code, [])).toBeNull();
  });

  it('follows the EEE sequence where it differs', () => {
    const rule = (code: string) => (byCode.get(code) as any).programPrerequisites;
    expect(rule('MAT215')).toContainEqual({ program: 'EEE', codes: ['MAT120'] });
    expect(rule('ENG102')).toContainEqual({ program: 'EEE', codes: [] });
    expect(byCode.get('EEE203')!.prerequisites).toEqual(['EEE101', 'MAT120']);
    expect(byCode.get('EEE341')!.prerequisites).toEqual(['EEE241', 'EEE243', 'STA201']);
  });
});
