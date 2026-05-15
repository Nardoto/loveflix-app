export const MIN_AGE = 18;

export const TERMS_VERSION = '2026-05-14';

export type VerificationMethod =
  | 'self_declaration'
  | 'credit_card'
  | 'id_check'
  | 'face_estimation';

export function isAdult(dob: Date, now: Date = new Date()): boolean {
  if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) return false;
  const cutoff = new Date(
    now.getFullYear() - MIN_AGE,
    now.getMonth(),
    now.getDate(),
  );
  return dob.getTime() <= cutoff.getTime();
}

export function parseDob(
  year: string | number,
  month: string | number,
  day: string | number,
): Date | null {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || y < 1900 || y > 9999) return null;
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  if (!Number.isInteger(d) || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

export function dobToIsoDate(dob: Date): string {
  return dob.toISOString().slice(0, 10);
}
