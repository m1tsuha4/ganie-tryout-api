export function shuffle<T>(array: T[]): T[] {
    const a = array.slice();
    for (let i = a.length -1; i > 0; i --) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function isExpired(startedAt: Date | null | undefined, durationMin?: number | null): boolean {
  if (!startedAt) return false; 
  if (!durationMin || durationMin <= 0) return false; 
  const expiresAt = addMinutes(startedAt, durationMin);
  return new Date() > expiresAt;
}

export function remainingSeconds(startedAt: Date | null | undefined, durationMin?: number | null): number | null {
  if (!startedAt || !durationMin || durationMin <= 0) return null;
  const expiresAt = addMinutes(startedAt, durationMin);
  return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
}