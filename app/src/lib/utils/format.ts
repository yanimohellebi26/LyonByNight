import type { PriceRange } from "@/types";

/** Formater une note sur 5 → "4.3 / 5" */
export function formatNote(note: number | null): string {
  if (note === null) return "N/D";
  return `${note.toFixed(1)} / 5`;
}

/** Formater un prix en symboles "€€€" */
export function formatPriceRange(range: PriceRange): string {
  return range;
}

/** Formater un prix numérique → "6,00 €" */
export function formatPrice(price: number | null): string {
  if (price === null) return "N/D";
  return `${price.toFixed(2).replace(".", ",")} €`;
}

/** Formater une adresse courte (sans code postal si déjà connu) */
export function formatAdresseShort(adresse: string): string {
  return adresse.replace(/,?\s*\d{5}\s*Lyon\s*$/i, "").trim();
}

/** Générer un slug URL-friendly */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
