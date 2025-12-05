/**
 * Scoring Constants untuk Tryout
 *
 * Sistem Penilaian:
 *
 * TKA atau TKD (baik Pascasarjana maupun Sarjana & Vokasi):
 * - Benar: +4 poin
 * - Salah: -1 poin
 * - Tidak diisi: 0 poin
 *
 * Khusus Pascasarjana TBI:
 * - Benar: +4 poin
 * - Salah: 0 poin (tidak ada minus)
 * - Tidak diisi: 0 poin
 */

export const SCORING_DEFAULT = {
  CORRECT_ANSWER: 4,
  WRONG_ANSWER: -1,
  NOT_ANSWERED: 0,
} as const;

export const SCORING_PASCASARJANA_TBI = {
  CORRECT_ANSWER: 4,
  WRONG_ANSWER: 0, // Tidak ada minus untuk Pascasarjana TBI
  NOT_ANSWERED: 0,
} as const;

// Helper function untuk get scoring berdasarkan type
export function getScoringConstants(
  packageType: "SARJANA" | "PASCASARJANA",
  examType?: "TKA" | "TBI" | "TKD",
) {
  // Khusus Pascasarjana TBI menggunakan aturan berbeda
  if (packageType === "PASCASARJANA" && examType === "TBI") {
    return SCORING_PASCASARJANA_TBI;
  }

  // TKA atau TKD (baik Pascasarjana maupun Sarjana & Vokasi) menggunakan aturan default
  return SCORING_DEFAULT;
}

// Export untuk backward compatibility
export const SCORING_SARJANA = SCORING_DEFAULT;
export const SCORING_PASCASARJANA_TKA = SCORING_DEFAULT;
