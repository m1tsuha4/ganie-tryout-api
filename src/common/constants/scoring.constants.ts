/**
 * Scoring Constants untuk Tryout
 * 
 * Sistem Penilaian:
 * 
 * SARJANA & VOKASI (TKA & TKD):
 * - Benar: +4 poin
 * - Salah: -1 poin
 * - Tidak diisi: 0 poin
 * 
 * PASCASARJANA:
 * - TKA: Benar +4, Salah +0, Tidak diisi 0
 * - TBI: Benar +4, Salah -1, Tidak diisi 0
 */

export const SCORING_SARJANA = {
  CORRECT_ANSWER: 4,
  WRONG_ANSWER: -1,
  NOT_ANSWERED: 0,
} as const;

export const SCORING_PASCASARJANA_TKA = {
  CORRECT_ANSWER: 4,
  WRONG_ANSWER: 0, // Tidak ada minus untuk TKA
  NOT_ANSWERED: 0,
} as const;

export const SCORING_PASCASARJANA_TBI = {
  CORRECT_ANSWER: 4,
  WRONG_ANSWER: -1,
  NOT_ANSWERED: 0,
} as const;

// Helper function untuk get scoring berdasarkan type
export function getScoringConstants(
  packageType: 'SARJANA' | 'PASCASARJANA',
  examType?: 'TKA' | 'TBI' | 'TKD',
) {
  if (packageType === 'SARJANA') {
    return SCORING_SARJANA;
  }

  // Pascasarjana
  if (examType === 'TKA') {
    return SCORING_PASCASARJANA_TKA;
  } else if (examType === 'TBI') {
    return SCORING_PASCASARJANA_TBI;
  }

  // Default untuk Pascasarjana (TBI)
  return SCORING_PASCASARJANA_TBI;
}

