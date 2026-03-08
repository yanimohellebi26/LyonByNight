import { readFile } from "fs/promises";
import { join } from "path";
import type { Lieu } from "@/types";

let cachedLieux: Lieu[] | null = null;

/** Load all venues into memory (cached) */
async function loadLieux(): Promise<Lieu[]> {
  if (cachedLieux) return cachedLieux;

  const filePath = join(process.cwd(), "..", "data", "merged-geocoded.json");
  const raw = await readFile(filePath, "utf-8");
  cachedLieux = JSON.parse(raw) as Lieu[];
  return cachedLieux;
}

/** Normalize text for matching (remove accents, lowercase) */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Synonym expansions to catch related terms */
const SYNONYMS: Record<string, string[]> = {
  "club": ["boite", "discothèque", "discotheque", "dansant", "nuit"],
  "boite": ["club", "discothèque", "nuit", "dansant"],
  "bar": ["pub", "bistrot", "troquet"],
  "pub": ["bar", "irlandais", "ecossais"],
  "cocktail": ["mixologie", "speakeasy", "drinks"],
  "speakeasy": ["cocktail", "cache", "secret", "mixologie"],
  "latino": ["salsa", "bachata", "reggaeton", "cumbia", "merengue"],
  "salsa": ["latino", "bachata", "reggaeton"],
  "bachata": ["latino", "salsa", "reggaeton"],
  "reggaeton": ["latino", "salsa", "bachata"],
  "techno": ["electro", "house", "edm", "electronic"],
  "electro": ["techno", "house", "edm", "electronic"],
  "house": ["techno", "electro", "deep", "edm"],
  "rock": ["metal", "punk", "alternatif", "indie"],
  "jazz": ["blues", "soul", "swing"],
  "hip-hop": ["rap", "rnb", "trap", "hiphop"],
  "rap": ["hip-hop", "rnb", "trap", "hiphop"],
  "vin": ["wine", "vins", "oenologie"],
  "biere": ["craft", "pression", "ale", "ipa", "stout"],
  "gay": ["lgbt", "lgbtq", "queer"],
  "lgbt": ["gay", "lgbtq", "queer", "drag"],
  "lgbtq": ["gay", "lgbt", "queer", "drag"],
  "terrasse": ["exterieur", "plein air", "dehors"],
  "peniche": ["bateau", "quai", "berge", "fleuve"],
  "rooftop": ["toit", "terrasse", "vue", "panorama"],
  "pas cher": ["economique", "bon marche", "cheap", "etudiant"],
  "chic": ["luxe", "haut de gamme", "premium", "elegant"],
  "afterwork": ["apero", "happy hour", "cosy"],
  "danse": ["danser", "dansant", "piste"],
  "jeux": ["boardgame", "billard", "flechettes", "ludique"],
  "karaoke": ["chanter", "micro"],
  "presquile": ["presqu'ile", "peninsula", "centre"],
  "vieux lyon": ["vieux-lyon", "saint-jean"],
  "confluence": ["confluences"],
};

/** Tokenize a query into meaningful words, with synonym expansion */
function tokenize(query: string): string[] {
  const stopWords = new Set([
    "un", "une", "le", "la", "les", "des", "du", "de", "dans", "en", "à", "a",
    "au", "aux", "et", "ou", "qui", "que", "est", "pas", "pour", "par", "sur",
    "avec", "ce", "cette", "mon", "ton", "son", "mes", "tes", "ses", "je",
    "tu", "il", "nous", "vous", "un", "deux", "trois", "the", "is", "are",
    "in", "with", "near", "me", "i", "want", "looking", "for", "find", "best",
    "bon", "bonne", "meilleur", "meilleure", "quel", "quelle", "quels",
    "cherche", "veux", "voudrais", "connais", "recommande", "where", "can",
    "go", "sortir", "soiree", "soir", "ce", "tonight", "week-end", "weekend",
    "lieu", "endroit", "place", "trouver", "aller",
  ]);

  const raw = normalize(query)
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));

  // Expand with synonyms (lower weight handled in scoring)
  const expanded = new Set(raw);
  for (const token of raw) {
    const syns = SYNONYMS[token];
    if (syns) {
      for (const s of syns) expanded.add(normalize(s));
    }
  }

  return [...expanded];
}

/** Score a lieu against query tokens — higher is better */
function scoreLieu(lieu: Lieu, tokens: string[], originalTokens: string[]): number {
  let score = 0;
  const nom = normalize(lieu.nom);
  const type = normalize(lieu.type);
  const categorie = normalize(lieu.categorie);
  const sousCategories = (lieu.sous_categories ?? []).map(normalize);
  const quartier = normalize(lieu.quartier ?? "");
  const arr = normalize(lieu.arrondissement ?? "");
  const description = normalize(lieu.description ?? "");
  const musiques = lieu.musique.map(normalize);
  const specs = lieu.specificites.map(normalize);
  const clientele = normalize(lieu.clientele ?? "");
  const prix = normalize(lieu.prix.fourchette);

  // Check if the full original query appears in the name (strong signal)
  const fullQuery = originalTokens.join(" ");
  if (fullQuery.length > 2 && nom.includes(fullQuery)) score += 20;

  for (const token of tokens) {
    const isOriginal = originalTokens.includes(token);
    // Original tokens score more than synonym expansions
    const weight = isOriginal ? 1 : 0.5;

    // Name match is strongest signal
    if (nom.includes(token)) score += 12 * weight;
    // Type match (bar, club)
    if (type.includes(token)) score += 5 * weight;
    // Category match
    if (categorie.includes(token)) score += 7 * weight;
    // Sous-category match
    if (sousCategories.some((sc) => sc.includes(token))) score += 7 * weight;
    // Arrondissement match ("1er", "2e", etc.)
    if (arr.includes(token) || token.replace(/[eè]me?|er/, "") === arr.replace(/[eè]me?|er/, "")) score += 8 * weight;
    // Quartier match
    if (quartier.includes(token)) score += 7 * weight;
    // Music genre match
    if (musiques.some((m) => m.includes(token))) score += 9 * weight;
    // Specificities match (terrasse, cocktail, etc.)
    if (specs.some((s) => s.includes(token))) score += 6 * weight;
    // Description match
    if (description.includes(token)) score += 3 * weight;
    // Clientele match
    if (clientele.includes(token)) score += 5 * weight;
    // Price match
    if (prix === token || ((token === "cheap" || token === "pas cher") && prix === "€")) score += 5 * weight;
    if ((token === "cher" || token === "chic" || token === "luxe") && prix === "€€€") score += 5 * weight;
  }

  // Bonus for venues with a rating
  if (lieu.note) score += lieu.note * 0.3;

  return score;
}

/** Retrieve the most relevant lieux for a user query */
export async function retrieveLieux(
  query: string,
  options: { limit?: number; minScore?: number } = {}
): Promise<Lieu[]> {
  const { limit = 8, minScore = 2 } = options;
  const lieux = await loadLieux();

  // Keep original tokens separate for weight distinction
  const originalTokens = normalize(query)
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    // No meaningful tokens — return top-rated lieux
    return [...lieux]
      .filter((l) => l.note != null)
      .sort((a, b) => (b.note ?? 0) - (a.note ?? 0))
      .slice(0, limit);
  }

  const scored = lieux
    .map((lieu) => ({ lieu, score: scoreLieu(lieu, tokens, originalTokens) }))
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ lieu }) => lieu);
}

/** Format retrieved lieux as context text for the LLM prompt */
export function formatLieuxForContext(lieux: Lieu[]): string {
  return lieux
    .map(
      (l) =>
        `• [id:${l.id}] **${l.nom}** (${l.type}) — ${l.note ?? "?"}★ — ${l.prix.fourchette} — ${l.quartier ?? l.arrondissement ?? l.adresse} — Musique: ${l.musique.join(", ") || "N/A"} — Spécificités: ${l.specificites.slice(0, 5).join(", ") || "Pas de détails"} — Clientèle: ${l.clientele ?? "N/A"} — Horaires: ${l.horaires?.texte ?? "Non spécifiés"}${l.description ? " — " + l.description.slice(0, 120) : ""}`
    )
    .join("\n");
}

/** Invalidate cache (for hot-reloading in dev) */
export function invalidateCache(): void {
  cachedLieux = null;
}
