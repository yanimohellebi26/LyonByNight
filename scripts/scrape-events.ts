/**
 * Weekly event scraper for Lyon Night Guide.
 * Scrapes cultural, student, Erasmus, scientific, and nightlife events from multiple sources.
 *
 * Usage: npx tsx scripts/scrape-events.ts
 *
 * Primary source: visiterlyon.com (600+ events, server-rendered HTML)
 * Secondary: Eventbrite, Petit Bulletin, CityC Crunch RSS
 * Tertiary: ESN Lyon, ErasmusPlace, GL Lyon Events
 * University/Erasmus: Lyon1, Lyon2, Lyon3, ENS, INSA, emlyon, IAE, ESN France
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as cheerio from "cheerio";

const DATA_DIR = join(
  new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"),
  "..",
  "data"
);
const EVENTS_PATH = join(DATA_DIR, "events.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventType =
  | "concert" | "dj_set" | "soiree_theme" | "quiz"
  | "cultural" | "student" | "erasmus" | "scientific"
  | "theater" | "festival" | "expo" | "workshop" | "sport" | "autre";

interface ScrapedEvent {
  titre: string;
  description: string;
  date: string;          // YYYY-MM-DD
  heure_debut: string;   // HH:MM
  heure_fin?: string;
  type: EventType;
  prix_entree?: string;
  artiste?: string;
  image?: string;
  source: string;
  url: string;
  lieu_nom?: string;
}

interface StoredEvent extends ScrapedEvent {
  id: string;
  lieu_id: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Clean HTML entities, unicode escapes, and special characters from text */
function sanitizeText(text: string): string {
  return text
    // Decode unicode escapes: \u00e9 → é, \ud83c\udf89 → 🎉
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Decode HTML numeric entities: &#233; → é
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    // Decode HTML named entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Clean escapes
    .replace(/\\\//g, "/")
    .replace(/\\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

/** Classify event type from title + description keywords */
function classifyEvent(title: string, desc: string): EventType {
  const text = `${title} ${desc}`.toLowerCase();

  if (/erasmus|esn\b|international student/i.test(text)) return "erasmus";
  if (/\b(étudiant|student|campus|université|university|bde|fac\b|école|school)/i.test(text)) return "student";
  if (/\b(science|scientifique|conférence|conference|labo|recherche|research|astro|physique|chimie)\b/i.test(text)) return "scientific";
  if (/\b(musée|museum|patrimoine|heritage|visite guidée|guided tour|culture|culturel)\b/i.test(text)) return "cultural";
  if (/\b(théâtre|theater|theatre|spectacle|show|comédie|comedy|stand[- ]?up|humour|humor|impro)\b/i.test(text)) return "theater";
  if (/\b(expo|exposition|exhibition|galerie|gallery|vernissage)\b/i.test(text)) return "expo";
  if (/\b(festival|fête|fete)\b/i.test(text)) return "festival";
  if (/\b(atelier|workshop|masterclass|master class|formation|cours|class)\b/i.test(text)) return "workshop";
  if (/\b(sport|foot|rugby|basket|tennis|running|yoga|fitness|match|compétition|competition|tournoi)\b/i.test(text)) return "sport";
  if (/\b(dj|techno|house|electro|electronic|rave|clubbing)\b/i.test(text)) return "dj_set";
  if (/\b(concert|live music|musique live|gig|recital|opéra|opera|symphon)\b/i.test(text)) return "concert";
  if (/\b(quiz|blind test|trivia)\b/i.test(text)) return "quiz";
  if (/\b(soirée|soiree|party|nuit|night|karaoké|karaoke)\b/i.test(text)) return "soiree_theme";

  return "autre";
}

/** Map Visiter Lyon categories to our EventType */
function mapVisiterLyonCategory(cat: string, title: string): EventType {
  const c = cat.toLowerCase();
  if (c.includes("musique") || c.includes("concert")) return classifyEvent(title, "") === "autre" ? "concert" : classifyEvent(title, "");
  if (c.includes("spectacle")) return "theater";
  if (c.includes("festival")) return "festival";
  if (c.includes("exposition")) return "expo";
  if (c.includes("conférence") || c.includes("débat")) return "scientific";
  if (c.includes("sport")) return "sport";
  if (c.includes("atelier")) return "workshop";
  if (c.includes("fête") || c.includes("fete")) return "cultural";
  if (c.includes("jeune public") || c.includes("famille")) return "cultural";
  return classifyEvent(title, cat);
}

/** Parse date like "DD/MM/YYYY" or date range "DD/MM/YYYY-DD/MM/YYYY" → returns first date as YYYY-MM-DD */
function parseFrDate(text: string): string | null {
  // Try DD/MM/YYYY
  const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try French month name: "15 mars 2026"
  const months: Record<string, string> = {
    janvier: "01", février: "02", fevrier: "02", mars: "03", avril: "04", mai: "05", juin: "06",
    juillet: "07", août: "08", aout: "08", septembre: "09", octobre: "10", novembre: "11", décembre: "12", decembre: "12",
    jan: "01", fév: "02", fev: "02", mar: "03", avr: "04", jun: "06", jui: "07",
    jul: "07", aoû: "08", aou: "08", sep: "09", oct: "10", nov: "11", déc: "12", dec: "12",
  };

  const frMatch = text.match(/(\d{1,2})\s+([\wéûô]+)\.?\s*(\d{4})?/i);
  if (frMatch) {
    const day = frMatch[1].padStart(2, "0");
    const monthStr = frMatch[2].toLowerCase().replace(/\.$/, "");
    const monthNum = months[monthStr];
    if (monthNum) {
      const year = frMatch[3] ?? String(new Date().getFullYear());
      return `${year}-${monthNum}-${day}`;
    }
  }

  // Try ISO: "2026-03-10"
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  return null;
}

/** Extract time from "20h30", "20:30", etc. */
function parseTime(text: string): string | null {
  const hMatch = text.match(/(\d{1,2})h(\d{2})?/i);
  if (hMatch) return `${hMatch[1].padStart(2, "0")}:${hMatch[2] ?? "00"}`;
  const colonMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) return `${colonMatch[1].padStart(2, "0")}:${colonMatch[2]}`;
  return null;
}

// ---------------------------------------------------------------------------
// Scrapers
// ---------------------------------------------------------------------------

/**
 * PRIMARY SOURCE: visiterlyon.com
 * Server-rendered HTML with 600+ events, paginated (20/page).
 * Fetches pages 1-8 (up to 160 events) to keep scraping fast.
 */
async function scrapeVisiterLyon(): Promise<ScrapedEvent[]> {
  console.log("  [Visiter Lyon] Scraping...");
  const events: ScrapedEvent[] = [];
  const maxPages = 8;

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = page === 1
        ? "https://www.visiterlyon.com/sortir/l-agenda/tous-les-evenements"
        : `https://www.visiterlyon.com/sortir/l-agenda/tous-les-evenements?page=${page}`;
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);

      let pageCount = 0;

      // Parse event cards: look for links with event slugs and associated data
      // The site uses a card layout with images, categories, titles, dates, locations
      $("a[href*='/sortir/l-agenda/']").each((_, el) => {
        const anchor = $(el);
        const href = anchor.attr("href") ?? "";

        // Skip navigation/category links
        if (href === "/sortir/l-agenda/tous-les-evenements" || href.endsWith("/l-agenda/")) return;
        if (href.split("/").length < 5) return; // Must be deep enough to be an event

        const title = anchor.find("h2, h3, h4, .title").first().text().trim()
          || anchor.text().trim().split("\n")[0]?.trim();
        if (!title || title.length < 3 || title.length > 200) return;

        // Find parent card container
        const card = anchor.closest("div, article, li");
        const allText = card.text();

        // Extract category
        const categoryEl = card.find("[class*='category'], [class*='tag'], span").first();
        const category = categoryEl.text().trim();

        // Extract date from card text (look for DD/MM/YYYY pattern)
        const dateMatch = allText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        let eventDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}` : null;

        // Also try French date format
        if (!eventDate) {
          eventDate = parseFrDate(allText);
        }

        // Skip events with no parseable date or past events
        if (!eventDate) return;
        if (eventDate < todayIso()) return;

        // Extract image
        const img = card.find("img").first().attr("src") ?? card.find("img").first().attr("data-src");

        // Extract location
        const locationText = allText.match(/Lyon\s+\d+[eè]?r?m?e?/i)?.[0] ?? "";

        const fullUrl = href.startsWith("http") ? href : `https://www.visiterlyon.com${href}`;

        events.push({
          titre: title.slice(0, 200),
          description: "",
          date: eventDate,
          heure_debut: parseTime(allText) ?? "19:00",
          type: category ? mapVisiterLyonCategory(category, title) : classifyEvent(title, ""),
          source: "visiter_lyon",
          url: fullUrl,
          image: img && img.startsWith("http") ? img : undefined,
          lieu_nom: locationText || "Lyon",
        });
        pageCount++;
      });

      console.log(`    Page ${page}: ${pageCount} events`);
      if (pageCount === 0 && page > 1) break; // No more events

      await sleep(1500); // Rate limit
    } catch (err) {
      console.error(`    Page ${page} error:`, err instanceof Error ? err.message : err);
      break;
    }
  }

  console.log(`  -> ${events.length} events from Visiter Lyon`);
  return events;
}

/** Map lyon.fr categories to our EventType */
function mapLyonFrCategory(cat: string, title: string): EventType {
  const c = cat.toLowerCase();
  if (c.includes("concert") || c.includes("musique")) return "concert";
  if (c.includes("exposition")) return "expo";
  if (c.includes("spectacle") || c.includes("théâtre") || c.includes("theatre") || c.includes("danse")) return "theater";
  if (c.includes("festival")) return "festival";
  if (c.includes("conférence") || c.includes("débat") || c.includes("rencontre")) return "scientific";
  if (c.includes("atelier") || c.includes("formation") || c.includes("emploi")) return "workshop";
  if (c.includes("sport") || c.includes("trail") || c.includes("course")) return "sport";
  if (c.includes("patrimoine") || c.includes("visite") || c.includes("archéo")) return "cultural";
  return classifyEvent(title, cat);
}

/**
 * PRIORITY SOURCE: lyon.fr/agenda (official Lyon city agenda)
 * Drupal server-rendered HTML. Paginated (~9 per page, 4+ pages).
 * Structure: div.visuel-paysage-large > img + h3 > a[href*="/evenement/"] + p tags
 * P tags order: date, category, "Equipement", venue name, description
 */
async function scrapeLyonFr(): Promise<ScrapedEvent[]> {
  console.log("  [lyon.fr] Scraping...");
  const events: ScrapedEvent[] = [];
  const maxPages = 8;

  const today = todayIso();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 3); // 3 months ahead for more events
  const endDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-${String(nextMonth.getDate()).padStart(2, "0")}`;

  for (let page = 0; page < maxPages; page++) {
    try {
      const url = `https://www.lyon.fr/agenda?field_lieu=All&field_main_category=All&field_auj_periode=date&field_date_evenement_debut=${today}&field_date_evenement_fin_1=${endDate}&page=${page}`;
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);

      let pageCount = 0;

      // Each event card: div.suggestion-event > div.edito-suggestion-image (img)
      //   + div.edito-suggestion-texte > h3 > a.stretched-link
      //   + div.edito-suggestion-tags > event-date p, span.first-tag (category),
      //     div.location-text (venue), div.field--name-field-accroche (description)
      $("div.suggestion-event").each((_, el) => {
        const card = $(el);
        const anchor = card.find("a.stretched-link").first();
        if (!anchor.length) return;

        const href = anchor.attr("href") ?? "";
        const title = anchor.text().trim();

        if (!title || title.length < 3 || title.length > 200) return;

        // Date: prefer <time datetime="..."> for accurate ISO dates
        // Range events have "Du X au <time datetime='...'>" — use end date for active events
        const dateContainer = card.find(".event-date").first();
        const timeEl = dateContainer.find("time[datetime]").last(); // last = end date
        const dateText = dateContainer.text().trim();

        let parsedDate: string | null = null;
        if (timeEl.length) {
          // Use ISO datetime from <time> element
          const dt = timeEl.attr("datetime") ?? "";
          const isoMatch = dt.match(/^(\d{4}-\d{2}-\d{2})/);
          if (isoMatch) parsedDate = isoMatch[1];
        }
        // Fallback to text parsing
        if (!parsedDate) parsedDate = parseFrDate(dateText);

        if (!parsedDate) return;
        // For range events, keep if end date is today or later
        if (parsedDate < today) return;

        // Category from span.first-tag
        const category = card.find("span.first-tag").first().text().trim();

        // Venue from .location-text, field--name-field-equipement, or event-places
        const rawVenue = card.find(".location-text").first().text().trim()
          || card.find(".field--name-field-equipement .field--item").first().text().trim()
          || card.find(".event-places").first().text().trim();
        const venue = rawVenue.replace(/\s+/g, " ").trim();

        // Description from field--name-field-accroche
        const description = card.find(".field--name-field-accroche .field--item").first().text().trim();

        // Get image (try src, data-src, data-lazy-src)
        const imgEl = card.find("img").first();
        const img = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-lazy-src");
        const imageUrl = img
          ? (img.startsWith("http") ? img : `https://www.lyon.fr${img}`)
          : undefined;

        const fullUrl = href.startsWith("http") ? href : `https://www.lyon.fr${href}`;

        events.push({
          titre: sanitizeText(title).slice(0, 200),
          description: sanitizeText(description).slice(0, 500),
          date: parsedDate,
          heure_debut: parseTime(dateText) ?? "19:00",
          type: category ? mapLyonFrCategory(category, title) : classifyEvent(title, description),
          source: "lyon_fr",
          url: fullUrl,
          image: imageUrl,
          lieu_nom: venue || "Lyon",
        });
        pageCount++;
      });

      console.log(`    Page ${page}: ${pageCount} events`);
      if (pageCount === 0 && page > 0) break;

      await sleep(1500);
    } catch (err) {
      console.error(`    Page ${page} error:`, err instanceof Error ? err.message : err);
      break;
    }
  }

  console.log(`  -> ${events.length} events from lyon.fr`);
  return events;
}

/**
 * Eventbrite: scrape JSON-LD structured data from event search page
 */
async function scrapeEventbrite(): Promise<ScrapedEvent[]> {
  console.log("  [Eventbrite] Scraping...");
  const events: ScrapedEvent[] = [];

  try {
    // Try different Eventbrite URLs
    const urls = [
      "https://www.eventbrite.fr/d/france--lyon/events/",
      "https://www.eventbrite.fr/d/france--lyon/student/",
      "https://www.eventbrite.fr/d/france--lyon/arts/",
    ];

    for (const url of urls) {
      try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        // Extract JSON-LD structured data
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const data = JSON.parse($(el).text());
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
              if (item["@type"] !== "Event") continue;

              const startDate = item.startDate ? new Date(item.startDate) : null;
              if (!startDate || isNaN(startDate.getTime())) continue;

              const endDate = item.endDate ? new Date(item.endDate) : null;
              const title = item.name ?? "";
              const desc = item.description ?? "";

              events.push({
                titre: title.slice(0, 200),
                description: desc.slice(0, 500),
                date: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`,
                heure_debut: `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`,
                heure_fin: endDate ? `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}` : undefined,
                type: classifyEvent(title, desc),
                prix_entree: item.offers?.price ? `${item.offers.price}€` : item.isAccessibleForFree ? "Gratuit" : undefined,
                image: item.image ?? undefined,
                source: "eventbrite",
                url: item.url ?? url,
                lieu_nom: item.location?.name ?? item.location?.address?.addressLocality ?? "Lyon",
              });
            }
          } catch { /* skip malformed JSON-LD */ }
        });

        // Also try parsing event cards directly
        $('[data-testid="event-card"], .discover-search-desktop-card, .search-event-card-wrapper').each((_, el) => {
          const card = $(el);
          const title = card.find("h2, h3, [data-testid*='title']").first().text().trim();
          const link = card.find("a[href]").first().attr("href") ?? "";
          const dateText = card.find("p, [data-testid*='date']").first().text().trim();
          const venue = card.find('[data-testid*="location"], [data-testid*="venue"]').first().text().trim();

          if (!title || title.length < 3) return;

          events.push({
            titre: title.slice(0, 200),
            description: "",
            date: parseFrDate(dateText) ?? todayIso(),
            heure_debut: parseTime(dateText) ?? "19:00",
            type: classifyEvent(title, ""),
            source: "eventbrite",
            url: link.startsWith("http") ? link : `https://www.eventbrite.fr${link}`,
            lieu_nom: venue || "Lyon",
          });
        });

        await sleep(2000);
      } catch (err) {
        console.error(`    ${url} error:`, err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    console.error("  [Eventbrite] Fatal:", err instanceof Error ? err.message : err);
  }

  console.log(`  -> ${events.length} events from Eventbrite`);
  return events;
}

/**
 * Petit Bulletin Lyon: cultural events (concerts, theater, expos)
 */
async function scrapePetitBulletin(): Promise<ScrapedEvent[]> {
  console.log("  [Petit Bulletin] Scraping...");
  const events: ScrapedEvent[] = [];

  const sections = [
    { url: "https://www.petit-bulletin.fr/lyon/musique-soirees.html", defaultType: "concert" as EventType },
    { url: "https://www.petit-bulletin.fr/lyon/theatre-danse.html", defaultType: "theater" as EventType },
    { url: "https://www.petit-bulletin.fr/lyon/expos-musees.html", defaultType: "expo" as EventType },
  ];

  for (const section of sections) {
    try {
      const html = await fetchHtml(section.url);
      const $ = cheerio.load(html);

      $(".event-item, article, .views-row, .widgot-content a, .agenda-item, .list-item").each((_, el) => {
        const card = $(el);
        const title = card.find("h2, h3, h4, .event-title, .title").first().text().trim()
          || card.text().trim().split("\n")[0]?.trim();
        const link = card.is("a") ? (card.attr("href") ?? "") : (card.find("a").first().attr("href") ?? "");
        const venue = card.find(".location, .venue, .event-location, .lieu").first().text().trim();
        const dateText = card.find(".date, time, .event-date").first().text().trim();
        const allText = card.text();

        if (!title || title.length < 3 || title.length > 200) return;

        const parsedDate = parseFrDate(dateText) ?? parseFrDate(allText);
        const fullUrl = link.startsWith("http") ? link : `https://www.petit-bulletin.fr${link}`;

        events.push({
          titre: title.slice(0, 200),
          description: "",
          date: parsedDate ?? todayIso(),
          heure_debut: parseTime(dateText) ?? parseTime(allText) ?? "20:00",
          type: section.defaultType,
          source: "petit_bulletin",
          url: fullUrl,
          lieu_nom: venue || "Lyon",
        });
      });

      await sleep(1500);
    } catch (err) {
      console.error(`    ${section.url} error:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`  -> ${events.length} events from Petit Bulletin`);
  return events;
}

/**
 * ESN Lyon / CosmoLyon: Erasmus & international student events.
 * The page embeds event data in JavaScript: var events = {}; events[id] = {...}
 * Each event has: id, title, start (unix), end (unix), description, dealUrl, address
 */
async function scrapeEsnLyon(): Promise<ScrapedEvent[]> {
  console.log("  [ESN CosmoLyon] Scraping...");
  const events: ScrapedEvent[] = [];

  try {
    const url = "https://www.esnlyon.org/page/2334789-nos-evenements";
    const html = await fetchHtml(url);

    // Extract JavaScript event objects: events[12345] = { ... }
    const eventBlocks = html.matchAll(/events\[(\d+)\]\s*=\s*(\{[^}]+\})/gs);

    for (const match of eventBlocks) {
      try {
        // The JS object may have unquoted keys or single quotes — try JSON.parse with fixes
        let jsonStr = match[2]
          .replace(/'/g, '"')
          .replace(/(\w+)\s*:/g, '"$1":')  // quote unquoted keys
          .replace(/,\s*\}/g, '}');         // trailing commas

        // If that doesn't parse, try extracting fields manually
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(jsonStr);
        } catch {
          // Manual extraction as fallback
          const titleMatch = match[2].match(/"title"\s*:\s*"([^"]+)"/);
          const startMatch = match[2].match(/"start"\s*:\s*(\d+)/);
          const endMatch = match[2].match(/"end"\s*:\s*(\d+)/);
          const descMatch = match[2].match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          const urlMatch = match[2].match(/"dealUrl"\s*:\s*"([^"]+)"/);
          const addrMatch = match[2].match(/"address"\s*:\s*"([^"]+)"/);

          if (!titleMatch || !startMatch) continue;

          data = {
            title: titleMatch[1],
            start: parseInt(startMatch[1], 10),
            end: endMatch ? parseInt(endMatch[1], 10) : null,
            description: descMatch ? descMatch[1].replace(/\\n/g, '\n') : "",
            dealUrl: urlMatch ? urlMatch[1] : "",
            address: addrMatch ? addrMatch[1] : "",
          };
        }

        const title = String(data.title ?? "");
        const startTs = Number(data.start);
        if (!title || !startTs) continue;

        const startDate = new Date(startTs * 1000);
        if (isNaN(startDate.getTime())) continue;

        const endTs = data.end ? Number(data.end) : null;
        const endDate = endTs ? new Date(endTs * 1000) : null;

        const desc = sanitizeText(String(data.description ?? ""));
        const dealUrl = String(data.dealUrl ?? "");
        const address = sanitizeText(String(data.address ?? ""));

        // Extract price from description
        let price: string | undefined;
        const priceMatch = desc.match(/(\d+)\s*€/);
        if (priceMatch) price = `${priceMatch[1]}€`;
        if (/free|gratuit/i.test(desc)) price = "Gratuit";

        // Extract venue from address or description
        const venue = address || (desc.match(/📍\s*(.+?)(?:\n|$)/)?.[1]?.trim()) || "Lyon";

        events.push({
          titre: sanitizeText(title).slice(0, 200),
          description: desc.slice(0, 500),
          date: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`,
          heure_debut: `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`,
          heure_fin: endDate ? `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}` : undefined,
          type: "erasmus", // All ESN CosmoLyon events are Erasmus by definition
          prix_entree: price,
          source: "esn_cosmolyon",
          url: dealUrl ? `https://www.esnlyon.org${dealUrl}` : url,
          lieu_nom: sanitizeText(venue).slice(0, 100),
        });
      } catch {
        // skip unparseable event
      }
    }
  } catch (err) {
    console.error("  [ESN CosmoLyon] Error:", err instanceof Error ? err.message : err);
  }

  console.log(`  -> ${events.length} events from ESN CosmoLyon`);
  return events;
}

/**
 * Musée des Confluences: exhibitions, performances, workshops.
 * Server-rendered HTML with event cards across paginated pages.
 */
async function scrapeMuseeConfluences(): Promise<ScrapedEvent[]> {
  console.log("  [Musée des Confluences] Scraping...");
  const events: ScrapedEvent[] = [];

  const maxPages = 3;
  for (let page = 0; page < maxPages; page++) {
    try {
      const url = page === 0
        ? "https://www.museedesconfluences.fr/agenda"
        : `https://www.museedesconfluences.fr/agenda?page=${page}`;
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);

      // Find event links with /fr/agenda/ pattern
      $("a[href*='/fr/agenda/']").each((_, el) => {
        const anchor = $(el);
        const href = anchor.attr("href") ?? "";
        if (href === "/fr/agenda" || href === "/fr/agenda/") return;

        const card = anchor.closest("div, article, li");
        const allText = card.length ? card.text() : anchor.text();
        const title = card.find("h2, h3, h4").first().text().trim() || anchor.text().trim().split("\n")[0]?.trim();

        if (!title || title.length < 3 || title.length > 200) return;
        if (/en savoir plus|voir plus/i.test(title)) return;

        // Parse date: "Du 14 juin 2025 au 28 juin 2026" or "21 mars 2026"
        const dateStr = parseFrDate(allText);
        const img = card.find("img").first().attr("src") ?? card.find("img").first().attr("data-src");

        // Determine type from text
        let type: EventType = "cultural";
        const textLower = allText.toLowerCase();
        if (textLower.includes("exposition")) type = "expo";
        else if (textLower.includes("spectacle") || textLower.includes("performance")) type = "theater";
        else if (textLower.includes("atelier")) type = "workshop";
        else if (textLower.includes("concert") || textLower.includes("musique")) type = "concert";
        else if (textLower.includes("conférence")) type = "scientific";

        const fullUrl = href.startsWith("http") ? href : `https://www.museedesconfluences.fr${href}`;

        events.push({
          titre: title.slice(0, 200),
          description: "",
          date: dateStr ?? todayIso(),
          heure_debut: parseTime(allText) ?? "10:00",
          type,
          source: "musee_confluences",
          url: fullUrl,
          image: img && img.startsWith("http") ? img : undefined,
          lieu_nom: "Musée des Confluences, Lyon 2e",
        });
      });

      await sleep(1500);
    } catch (err) {
      console.error(`    Page ${page} error:`, err instanceof Error ? err.message : err);
      break;
    }
  }

  console.log(`  -> ${events.length} events from Musée des Confluences`);
  return events;
}

/**
 * MAC Lyon (Musée d'Art Contemporain): exhibitions, concerts, workshops.
 * Server-rendered HTML with event cards under /fr/programmation/ or /fr/agenda
 */
async function scrapeMacLyon(): Promise<ScrapedEvent[]> {
  console.log("  [MAC Lyon] Scraping...");
  const events: ScrapedEvent[] = [];

  try {
    const url = "https://www.mac-lyon.com/fr/agenda";
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    $("a[href*='/fr/programmation/']").each((_, el) => {
      const anchor = $(el);
      const href = anchor.attr("href") ?? "";
      if (href === "/fr/programmation/" || href === "/fr/programmation") return;

      const card = anchor.closest("div, article, li");
      const allText = card.length ? card.text() : anchor.text();

      // Extract title from h2/h3 inside the card
      const title = card.find("h2, h3").first().text().trim() || anchor.text().trim().split("\n")[0]?.trim();
      if (!title || title.length < 3 || title.length > 200) return;
      if (/en savoir|voir plus/i.test(title)) return;

      // Parse date from card text: "Vendredi 6 mars 2026 - Dimanche 12 juillet 2026"
      const dateStr = parseFrDate(allText);

      // Extract type
      let type: EventType = "expo";
      const textLower = allText.toLowerCase();
      if (textLower.includes("concert") || textLower.includes("musique") || textLower.includes("improvisation")) type = "concert";
      else if (textLower.includes("nocturne étudiante") || textLower.includes("nocturne")) type = "student";
      else if (textLower.includes("atelier") || textLower.includes("vacances au musée")) type = "workshop";
      else if (textLower.includes("rencontre") || textLower.includes("conférence")) type = "scientific";
      else if (textLower.includes("spectacle") || textLower.includes("projection")) type = "theater";

      const img = card.find("img").first().attr("src");
      const fullUrl = href.startsWith("http") ? href : `https://www.mac-lyon.com${href}`;

      events.push({
        titre: title.slice(0, 200),
        description: "",
        date: dateStr ?? todayIso(),
        heure_debut: parseTime(allText) ?? "10:00",
        type,
        source: "mac_lyon",
        url: fullUrl,
        image: img && img.startsWith("http") ? img : undefined,
        lieu_nom: "MAC Lyon, Cité Internationale",
      });
    });
  } catch (err) {
    console.error("  [MAC Lyon] Error:", err instanceof Error ? err.message : err);
  }

  console.log(`  -> ${events.length} events from MAC Lyon`);
  return events;
}

/**
 * ErasmusPlace Lyon: international student events (SPA — limited results)
 */
async function scrapeErasmusPlace(): Promise<ScrapedEvent[]> {
  console.log("  [ErasmusPlace] Scraping...");
  const events: ScrapedEvent[] = [];

  try {
    const url = "https://erasmusplace.com/region/lyon/";
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).text());
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item["@type"] !== "Event") continue;
          const startDate = item.startDate ? new Date(item.startDate) : null;
          if (!startDate || isNaN(startDate.getTime())) continue;

          events.push({
            titre: (item.name ?? "").slice(0, 200),
            description: (item.description ?? "").slice(0, 500),
            date: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`,
            heure_debut: `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`,
            type: "erasmus",
            source: "erasmus_place",
            url: item.url ?? url,
            image: item.image ?? undefined,
            lieu_nom: item.location?.name ?? "Lyon",
          });
        }
      } catch { /* skip */ }
    });

    // Fallback card parsing
    if (events.length === 0) {
      $(".event-card, .event-item, article, .card, [class*='event']").each((_, el) => {
        const card = $(el);
        const title = card.find("h2, h3, h4, .event-title, .card-title").first().text().trim();
        const link = card.find("a[href]").first().attr("href") ?? "";
        const dateText = card.find(".date, time, .event-date").first().text().trim();
        const img = card.find("img").first().attr("src");

        if (!title || title.length < 3) return;

        events.push({
          titre: title.slice(0, 200),
          description: "",
          date: parseFrDate(dateText) ?? todayIso(),
          heure_debut: parseTime(dateText) ?? "19:00",
          type: "erasmus",
          source: "erasmus_place",
          url: link.startsWith("http") ? link : `https://erasmusplace.com${link}`,
          image: img,
          lieu_nom: "Lyon",
        });
      });
    }
  } catch (err) {
    console.error("  [ErasmusPlace] Error:", err instanceof Error ? err.message : err);
  }

  console.log(`  -> ${events.length} events from ErasmusPlace`);
  return events;
}

/**
 * GL Lyon Events: professional/cultural events
 */
async function scrapeGlLyonEvents(): Promise<ScrapedEvent[]> {
  console.log("  [GL Lyon Events] Scraping...");
  const events: ScrapedEvent[] = [];

  try {
    const url = "https://www.gl-lyonevents.com/fr";
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).text());
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item["@type"] !== "Event") continue;
          const startDate = item.startDate ? new Date(item.startDate) : null;
          if (!startDate || isNaN(startDate.getTime())) continue;

          events.push({
            titre: (item.name ?? "").slice(0, 200),
            description: (item.description ?? "").slice(0, 500),
            date: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`,
            heure_debut: `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`,
            type: classifyEvent(item.name ?? "", item.description ?? ""),
            source: "gl_lyon",
            url: item.url ?? url,
            lieu_nom: item.location?.name ?? "Lyon",
          });
        }
      } catch { /* skip */ }
    });
  } catch (err) {
    console.error("  [GL Lyon Events] Error:", err instanceof Error ? err.message : err);
  }

  console.log(`  -> ${events.length} events from GL Lyon Events`);
  return events;
}

// ---------------------------------------------------------------------------
// University & Erasmus Scrapers
// ---------------------------------------------------------------------------

/**
 * Université Claude Bernard Lyon 1: /agenda — calendar grid with event links
 * Calendar month header shows "Mars 2026", day numbers are in td cells.
 * We extract the month/year from the page, then combine with day from each cell.
 */
async function scrapeUnivLyon1(): Promise<ScrapedEvent[]> {
  console.log("  [Univ Lyon 1] Scraping...");
  const events: ScrapedEvent[] = [];

  try {
    const html = await fetchHtml("https://www.univ-lyon1.fr/agenda");
    const $ = cheerio.load(html);

    // Extract current calendar month/year from page header (e.g. "Mars 2026")
    const pageText = $("body").text();
    const monthYearMatch = pageText.match(/(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})/i);
    const calMonths: Record<string, string> = {
      janvier: "01", février: "02", fevrier: "02", mars: "03", avril: "04", mai: "05", juin: "06",
      juillet: "07", août: "08", aout: "08", septembre: "09", octobre: "10", novembre: "11", décembre: "12", decembre: "12",
    };
    const calMonth = monthYearMatch ? calMonths[monthYearMatch[1].toLowerCase()] : null;
    const calYear = monthYearMatch ? monthYearMatch[2] : null;

    $("a[href*='/agenda/']").each((_, el) => {
      const anchor = $(el);
      const href = anchor.attr("href") ?? "";

      // Skip navigation links
      if (/\/agenda\/?$/.test(href)) return;
      if (href.includes("DTSTART")) return; // Calendar nav links

      const title = anchor.text().trim();
      if (!title || title.length < 5 || title.length > 200) return;
      if (/agenda|accueil|calendrier|home|mois (précédent|suivant)/i.test(title)) return;
      if (/^\d+ autres?$/.test(title)) return; // "3 autres" links

      // Try to find date from surrounding td cell
      const td = anchor.closest("td");
      const tdText = td.length ? td.text() : "";

      // Extract day number from td text (first number that's 1-31)
      const dayMatch = tdText.match(/\b(\d{1,2})\b/);
      let parsedDate: string | null = null;

      if (dayMatch && calMonth && calYear) {
        const day = dayMatch[1].padStart(2, "0");
        const dayNum = parseInt(day, 10);
        if (dayNum >= 1 && dayNum <= 31) {
          parsedDate = `${calYear}-${calMonth}-${day}`;
        }
      }

      // Fallback: try parsing from the link text or parent
      if (!parsedDate) {
        const parent = anchor.closest("div, li, article");
        const allText = parent.length ? parent.text() : "";
        parsedDate = parseFrDate(allText);
      }

      if (!parsedDate || parsedDate < todayIso()) return;

      const fullUrl = href.startsWith("http") ? href : `https://www.univ-lyon1.fr${href}`;

      events.push({
        titre: sanitizeText(title).slice(0, 200),
        description: "",
        date: parsedDate,
        heure_debut: parseTime(title) ?? parseTime(tdText) ?? "12:00",
        type: classifyEvent(title, tdText) === "autre" ? "student" : classifyEvent(title, tdText),
        source: "univ_lyon1",
        url: fullUrl,
        lieu_nom: "Université Lyon 1",
      });
    });
  } catch (err) {
    console.error("  [Univ Lyon 1] Error:", err instanceof Error ? err.message : err);
  }

  console.log(`  -> ${events.length} events from Univ Lyon 1`);
  return events;
}

/**
 * Université Lumière Lyon 2: /agenda — calendar grid with event links
 * Links point to subdomains: seg.univ-lyon2.fr, icom.univ-lyon2.fr, etc.
 * Calendar header shows "mars 2026". Day numbers are in td cells.
 */
async function scrapeUnivLyon2(): Promise<ScrapedEvent[]> {
  console.log("  [Univ Lyon 2] Scraping...");
  const events: ScrapedEvent[] = [];

  try {
    const html = await fetchHtml("https://www.univ-lyon2.fr/agenda");
    const $ = cheerio.load(html);

    // Extract month/year from page text
    const pageText = $("body").text();
    const calMonths: Record<string, string> = {
      janvier: "01", février: "02", fevrier: "02", mars: "03", avril: "04", mai: "05", juin: "06",
      juillet: "07", août: "08", aout: "08", septembre: "09", octobre: "10", novembre: "11", décembre: "12", decembre: "12",
    };
    const monthYearMatch = pageText.match(/(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})/i);
    const calMonth = monthYearMatch ? calMonths[monthYearMatch[1].toLowerCase()] : null;
    const calYear = monthYearMatch ? monthYearMatch[2] : null;

    // Find all links — the event links can be absolute URLs to subdomains
    $("td a[href]").each((_, el) => {
      const anchor = $(el);
      const href = anchor.attr("href") ?? "";
      const title = anchor.text().trim();

      // Skip non-event links
      if (!title || title.length < 5 || title.length > 200) return;
      if (/^\d+\s*autres?$/i.test(title)) return;
      if (/mois|agenda|accueil/i.test(title)) return;

      // Accept links to univ-lyon2.fr subdomains or local paths
      if (!href.includes("univ-lyon2.fr") && !href.startsWith("/")) return;
      if (href.includes("DTSTART")) return;

      // Get day from the containing td
      const td = anchor.closest("td");
      const tdText = td.length ? td.children().first().text().trim() : "";
      const dayMatch = tdText.match(/^(\d{1,2})$/);
      let parsedDate: string | null = null;

      if (dayMatch && calMonth && calYear) {
        const day = dayMatch[1].padStart(2, "0");
        parsedDate = `${calYear}-${calMonth}-${day}`;
      }

      if (!parsedDate || parsedDate < todayIso()) return;

      events.push({
        titre: sanitizeText(title).slice(0, 200),
        description: "",
        date: parsedDate,
        heure_debut: "12:00",
        type: classifyEvent(title, "") === "autre" ? "student" : classifyEvent(title, ""),
        source: "univ_lyon2",
        url: href.startsWith("http") ? href : `https://www.univ-lyon2.fr${href}`,
        lieu_nom: "Université Lyon 2",
      });
    });
  } catch (err) {
    console.error("  [Univ Lyon 2] Error:", err instanceof Error ? err.message : err);
  }

  console.log(`  -> ${events.length} events from Univ Lyon 2`);
  return events;
}

/**
 * Université Jean Moulin Lyon 3: /agenda — cards with images, dates, links at root level
 * Event URLs: /projections-cine-kozmos-2025-2026, /seminaire-materialites-poetiques-2e-edition-1
 * Dates: "24 septembre 2025 - 4 avril 2026" as text near/after the link
 */
async function scrapeUnivLyon3(): Promise<ScrapedEvent[]> {
  console.log("  [Univ Lyon 3] Scraping...");
  const events: ScrapedEvent[] = [];

  try {
    const html = await fetchHtml("https://www.univ-lyon3.fr/agenda");
    const $ = cheerio.load(html);

    // Lyon 3 events are in card divs with images. Look for any link that has
    // a date nearby (sibling/parent text). Links are at root level (/slug).
    // Strategy: find all links, check if the surrounding block contains a date.
    const seen = new Set<string>();

    $("a[href]").each((_, el) => {
      const anchor = $(el);
      const href = anchor.attr("href") ?? "";

      // Must be a local link
      const isLocal = href.startsWith("/") || href.startsWith("https://www.univ-lyon3.fr/");
      if (!isLocal) return;

      // Skip known non-event paths
      const path = href.replace("https://www.univ-lyon3.fr", "");
      if (/^\/(agenda|formation|recherche|universite|international|campus|#|$)/.test(path)) return;
      if (/\.(pdf|jpg|png|css|js)$/i.test(path)) return;
      if (path.length < 5) return;

      const title = anchor.find("strong, span").first().text().trim()
        || anchor.text().trim().split("\n")[0]?.trim();
      if (!title || title.length < 5 || title.length > 200) return;
      if (/agenda|accueil|mentions|contact|plan du site|voir plus|en savoir|lire la suite|cookie/i.test(title)) return;

      // Look for date in several layers of parent context
      let parsedDate: string | null = null;
      let contextText = "";
      const parents = [
        anchor.parent(),
        anchor.closest("div"),
        anchor.closest("li, article, section"),
      ];
      for (const p of parents) {
        if (!p.length) continue;
        contextText = p.text();
        parsedDate = parseFrDate(contextText);
        if (parsedDate) break;
      }

      if (!parsedDate || parsedDate < todayIso()) return;

      const key = `${path}_${parsedDate}`;
      if (seen.has(key)) return;
      seen.add(key);

      const img = anchor.find("img").first().attr("src")
        || anchor.parent().find("img").first().attr("src");
      const fullUrl = href.startsWith("http") ? href : `https://www.univ-lyon3.fr${href}`;

      events.push({
        titre: sanitizeText(title).slice(0, 200),
        description: "",
        date: parsedDate,
        heure_debut: parseTime(contextText) ?? "12:00",
        type: classifyEvent(title, contextText) === "autre" ? "student" : classifyEvent(title, contextText),
        source: "univ_lyon3",
        url: fullUrl,
        image: img && img.startsWith("http") ? img : undefined,
        lieu_nom: "Université Lyon 3",
      });
    });
  } catch (err) {
    console.error("  [Univ Lyon 3] Error:", err instanceof Error ? err.message : err);
  }

  console.log(`  -> ${events.length} events from Univ Lyon 3`);
  return events;
}

/**
 * ENS Lyon: /agenda — list of seminars, conferences, workshops
 * Structure: .event-item > .event-date (date) + .event-content > a[href*="/evenement/"]
 * Need to traverse up to .event-item to access the date in a sibling div.
 */
async function scrapeEnsLyon(): Promise<ScrapedEvent[]> {
  console.log("  [ENS Lyon] Scraping...");
  const events: ScrapedEvent[] = [];

  try {
    const html = await fetchHtml("https://www.ens-lyon.fr/agenda");
    const $ = cheerio.load(html);

    $("a[href*='/evenement/']").each((_, el) => {
      const anchor = $(el);
      const href = anchor.attr("href") ?? "";

      // Skip overly short paths
      if (href.split("/").filter(Boolean).length < 3) return;

      const title = anchor.text().trim();
      if (!title || title.length < 5 || title.length > 200) return;
      if (/en savoir plus|voir plus|agenda/i.test(title)) return;

      // Traverse up multiple levels to find the full event block including the date
      let allText = "";
      let parsedDate: string | null = null;
      const levels = [
        anchor.parent(),
        anchor.parent().parent(),
        anchor.closest(".event-item, .event, article, .views-row, section"),
        anchor.closest("div").parent(),
        anchor.closest("div").parent().parent(),
      ];
      for (const p of levels) {
        if (!p.length) continue;
        allText = p.text();
        parsedDate = parseFrDate(allText);
        if (parsedDate) break;
      }

      if (!parsedDate || parsedDate < todayIso()) return;

      // Detect type from ENS categorization
      const textLower = allText.toLowerCase();
      let type: EventType = "scientific"; // ENS events default to scientific
      if (/atelier|workshop/i.test(textLower)) type = "workshop";
      else if (/concert|musique/i.test(textLower)) type = "concert";
      else if (/exposition|expo/i.test(textLower)) type = "expo";
      else if (/festival/i.test(textLower)) type = "festival";
      else if (/spectacle|théâtre/i.test(textLower)) type = "theater";

      const fullUrl = href.startsWith("http") ? href : `https://www.ens-lyon.fr${href}`;

      events.push({
        titre: sanitizeText(title).slice(0, 200),
        description: "",
        date: parsedDate,
        heure_debut: parseTime(allText) ?? "14:00",
        type,
        source: "ens_lyon",
        url: fullUrl,
        lieu_nom: "ENS de Lyon",
      });
    });
  } catch (err) {
    console.error("  [ENS Lyon] Error:", err instanceof Error ? err.message : err);
  }

  console.log(`  -> ${events.length} events from ENS Lyon`);
  return events;
}

/**
 * INSA Lyon: /fr/agenda — card-based events with .event-item structure
 * Each card: img.event-thumb, .date, .category, h4 > a[href*="/evenement/"]
 */
async function scrapeInsaLyon(): Promise<ScrapedEvent[]> {
  console.log("  [INSA Lyon] Scraping...");
  const events: ScrapedEvent[] = [];

  try {
    const html = await fetchHtml("https://www.insa-lyon.fr/fr/agenda");
    const $ = cheerio.load(html);

    // Try structured .event-item cards first
    $(".event-item, article, .views-row").each((_, el) => {
      const card = $(el);
      const anchor = card.find("a[href*='/evenement/'], a[href*='/fr/'], h4 a").first();
      if (!anchor.length) return;

      const href = anchor.attr("href") ?? "";
      const title = anchor.text().trim() || card.find("h4, h3, h2").first().text().trim();
      if (!title || title.length < 5 || title.length > 200) return;

      const dateText = card.find(".date, time, .field--name-field-date").first().text().trim();
      const allText = card.text();
      const parsedDate = parseFrDate(dateText) ?? parseFrDate(allText);
      if (!parsedDate || parsedDate < todayIso()) return;

      const category = card.find(".category, .field--name-field-category").first().text().trim();
      const img = card.find("img").first().attr("src");
      const fullUrl = href.startsWith("http") ? href : `https://www.insa-lyon.fr${href}`;

      events.push({
        titre: sanitizeText(title).slice(0, 200),
        description: "",
        date: parsedDate,
        heure_debut: parseTime(allText) ?? "12:00",
        type: classifyEvent(title, `${category} ${allText}`) === "autre" ? "student" : classifyEvent(title, `${category} ${allText}`),
        source: "insa_lyon",
        url: fullUrl,
        image: img && img.startsWith("http") ? img : undefined,
        lieu_nom: "INSA Lyon",
      });
    });

    // Fallback: generic event link parsing
    if (events.length === 0) {
      $("a[href*='/evenement/'], a[href*='/fr/evenement/']").each((_, el) => {
        const anchor = $(el);
        const href = anchor.attr("href") ?? "";
        const title = anchor.text().trim();
        if (!title || title.length < 5 || title.length > 200) return;
        if (/en savoir plus|voir plus|agenda/i.test(title)) return;

        const parent = anchor.closest("div, li, article");
        const allText = parent.length ? parent.text() : "";
        const parsedDate = parseFrDate(allText);
        if (!parsedDate || parsedDate < todayIso()) return;

        const fullUrl = href.startsWith("http") ? href : `https://www.insa-lyon.fr${href}`;

        events.push({
          titre: sanitizeText(title).slice(0, 200),
          description: "",
          date: parsedDate,
          heure_debut: parseTime(allText) ?? "12:00",
          type: "student",
          source: "insa_lyon",
          url: fullUrl,
          lieu_nom: "INSA Lyon",
        });
      });
    }
  } catch (err) {
    console.error("  [INSA Lyon] Error:", err instanceof Error ? err.message : err);
  }

  console.log(`  -> ${events.length} events from INSA Lyon`);
  return events;
}

/**
 * emlyon Business School: /en/events or /fr/agenda — event cards
 * Links: /fr/agenda/[slug] or /fr/executive/agenda/[slug]
 * Dates: "Mar 16" or "16 mar" format with English/French month abbreviations
 */
async function scrapeEmLyon(): Promise<ScrapedEvent[]> {
  console.log("  [emlyon] Scraping...");
  const events: ScrapedEvent[] = [];

  const monthAbbrevs: Record<string, string> = {
    jan: "01", fev: "02", feb: "02", mar: "03", avr: "04", apr: "04",
    mai: "05", may: "05", jun: "06", jui: "07", jul: "07",
    aou: "08", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12", déc: "12",
  };

  const urls = [
    "https://em-lyon.com/en/events",
    "https://em-lyon.com/fr/agenda",
  ];

  for (const baseUrl of urls) {
    try {
      const html = await fetchHtml(baseUrl);
      const $ = cheerio.load(html);

      // Collect all agenda/event links with their surrounding text
      $("a[href*='/agenda/'], a[href*='/events/']").each((_, el) => {
        const anchor = $(el);
        const href = anchor.attr("href") ?? "";

        // Skip navigation
        if (/\/(agenda|events)\/?$/.test(href)) return;
        if (/page=|filter|sort|category/i.test(href)) return;

        const title = anchor.text().trim().split("\n")[0]?.trim() ?? "";
        if (!title || title.length < 5 || title.length > 200) return;
        if (/^(agenda|events|voir|see|résultats|results|pagination)/i.test(title)) return;

        // Gather text from progressively wider parent containers
        let parsedDate: string | null = null;
        let contextText = "";
        const containers = [
          anchor.parent(),
          anchor.parent().parent(),
          anchor.parent().parent().parent(),
          anchor.parent().parent().parent().parent(),
        ];

        for (const container of containers) {
          if (!container.length) continue;
          contextText = container.text();

          // Try English/French abbreviated months: "Mar 16", "16 mar", "mars 2026"
          const abbrMatch = contextText.match(/\b(Jan|Feb|Fev|Mar|Apr|Avr|May|Mai|Jun|Jui|Jul|Aug|Aou|Sep|Oct|Nov|Dec|Déc)\s*\.?\s*(\d{1,2})\b/i);
          if (abbrMatch) {
            const m = monthAbbrevs[abbrMatch[1].toLowerCase().replace(/é/, "e")];
            if (m) {
              const day = abbrMatch[2].padStart(2, "0");
              parsedDate = `${new Date().getFullYear()}-${m}-${day}`;
              break;
            }
          }

          // Try day + abbreviated month: "16 Mar"
          const abbrMatch2 = contextText.match(/\b(\d{1,2})\s+(Jan|Feb|Fev|Mar|Apr|Avr|May|Mai|Jun|Jui|Jul|Aug|Aou|Sep|Oct|Nov|Dec|Déc)\b/i);
          if (abbrMatch2) {
            const m = monthAbbrevs[abbrMatch2[2].toLowerCase().replace(/é/, "e")];
            if (m) {
              const day = abbrMatch2[1].padStart(2, "0");
              parsedDate = `${new Date().getFullYear()}-${m}-${day}`;
              break;
            }
          }

          // Standard French date
          parsedDate = parseFrDate(contextText);
          if (parsedDate) break;
        }

        if (!parsedDate || parsedDate < todayIso()) return;

        const fullUrl = href.startsWith("http") ? href : `https://em-lyon.com${href}`;
        const locationMatch = contextText.match(/Campus\s+(?:de\s+)?(\w+)/i);
        const venue = locationMatch ? `emlyon ${locationMatch[0]}` : "emlyon Business School, Lyon";

        events.push({
          titre: sanitizeText(title).slice(0, 200),
          description: "",
          date: parsedDate,
          heure_debut: parseTime(contextText) ?? "18:00",
          type: classifyEvent(title, contextText) === "autre" ? "student" : classifyEvent(title, contextText),
          source: "emlyon",
          url: fullUrl,
          lieu_nom: venue,
        });
      });

      if (events.length > 0) break;
      await sleep(1500);
    } catch (err) {
      console.error(`    ${baseUrl} error:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`  -> ${events.length} events from emlyon`);
  return events;
}

/**
 * IAE Lyon (School of Management, Lyon 3): agenda — list items with strong > a
 * Structure: ul.objets li with img, strong > a title, date text
 */
async function scrapeIaeLyon(): Promise<ScrapedEvent[]> {
  console.log("  [IAE Lyon] Scraping...");
  const events: ScrapedEvent[] = [];

  try {
    const html = await fetchHtml("https://iae.univ-lyon3.fr/agenda");
    const $ = cheerio.load(html);

    // Primary: list items with structured content
    $("ul.objets li, .event-item, article, .views-row").each((_, el) => {
      const card = $(el);
      const anchor = card.find("strong a, h3 a, h4 a, a[href]").first();
      if (!anchor.length) return;

      const href = anchor.attr("href") ?? "";
      const title = anchor.text().trim();
      if (!title || title.length < 5 || title.length > 200) return;

      const allText = card.text();
      const parsedDate = parseFrDate(allText);
      if (!parsedDate || parsedDate < todayIso()) return;

      const img = card.find("img").first().attr("src");
      const fullUrl = href.startsWith("http") ? href : `https://iae.univ-lyon3.fr${href}`;

      events.push({
        titre: sanitizeText(title).slice(0, 200),
        description: "",
        date: parsedDate,
        heure_debut: parseTime(allText) ?? "18:00",
        type: classifyEvent(title, allText) === "autre" ? "student" : classifyEvent(title, allText),
        source: "iae_lyon",
        url: fullUrl,
        image: img && img.startsWith("http") ? img : undefined,
        lieu_nom: "IAE Lyon",
      });
    });

    // Fallback: any links that look like events
    if (events.length === 0) {
      $("a[href]").each((_, el) => {
        const anchor = $(el);
        const href = anchor.attr("href") ?? "";
        if (!href.startsWith("/") || href.length < 10) return;
        if (/\.(pdf|jpg|png|css|js)$/i.test(href)) return;
        if (href === "/agenda" || href === "/agenda/") return;

        const title = anchor.find("strong").text().trim() || anchor.text().trim();
        if (!title || title.length < 5 || title.length > 200) return;
        if (/agenda|accueil|contact|mentions/i.test(title)) return;

        const parent = anchor.closest("div, li");
        const allText = parent.length ? parent.text() : "";
        const parsedDate = parseFrDate(allText);
        if (!parsedDate || parsedDate < todayIso()) return;

        const fullUrl = `https://iae.univ-lyon3.fr${href}`;

        events.push({
          titre: sanitizeText(title).slice(0, 200),
          description: "",
          date: parsedDate,
          heure_debut: parseTime(allText) ?? "18:00",
          type: "student",
          source: "iae_lyon",
          url: fullUrl,
          lieu_nom: "IAE Lyon",
        });
      });
    }
  } catch (err) {
    console.error("  [IAE Lyon] Error:", err instanceof Error ? err.message : err);
  }

  console.log(`  -> ${events.length} events from IAE Lyon`);
  return events;
}

/**
 * ESN France: /toutes-les-actus/ — national Erasmus news/events
 * Cards: .filtr-item .post-box with .portfolio_thumbnail, .bf_title_1-38
 */
async function scrapeEsnFrance(): Promise<ScrapedEvent[]> {
  console.log("  [ESN France] Scraping...");
  const events: ScrapedEvent[] = [];

  try {
    const html = await fetchHtml("https://esnfrance.org/toutes-les-actus/");
    const $ = cheerio.load(html);

    $(".filtr-item, .post-box, article").each((_, el) => {
      const card = $(el);
      const anchor = card.find("a[href]").first();
      const href = anchor.attr("href") ?? "";

      const title = card.find(".bf_title_1-38, h2, h3, h4, .entry-title").first().text().trim()
        || anchor.text().trim().split("\n")[0]?.trim();
      if (!title || title.length < 5 || title.length > 200) return;
      if (/lire la suite|read more|voir plus/i.test(title)) return;

      const allText = card.text();
      const description = card.find(".bf_desc_1-38, .entry-content, p").first().text().trim();

      // ESN articles often have dates in the text
      const parsedDate = parseFrDate(allText);
      // Accept events even without a clear date (use today + 7 as fallback for "upcoming" articles)
      const eventDate = parsedDate ?? (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })();
      if (eventDate < todayIso()) return;

      const img = card.find(".portfolio_thumbnail img, img").first().attr("src");
      const fullUrl = href.startsWith("http") ? href : `https://esnfrance.org${href}`;

      events.push({
        titre: sanitizeText(title).slice(0, 200),
        description: sanitizeText(description).slice(0, 500),
        date: eventDate,
        heure_debut: parseTime(allText) ?? "19:00",
        type: "erasmus",
        source: "esn_france",
        url: fullUrl,
        image: img && img.startsWith("http") ? img : undefined,
        lieu_nom: "France (ESN)",
      });
    });
  } catch (err) {
    console.error("  [ESN France] Error:", err instanceof Error ? err.message : err);
  }

  console.log(`  -> ${events.length} events from ESN France`);
  return events;
}

// ---------------------------------------------------------------------------
// Merge & Deduplicate
// ---------------------------------------------------------------------------

function normalizeTitle(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function deduplicateEvents(scraped: ScrapedEvent[], existing: StoredEvent[]): ScrapedEvent[] {
  const existingKeys = new Set(
    existing.map((e) => `${normalizeTitle(e.titre)}_${e.date}`)
  );

  const seen = new Set<string>();
  const unique: ScrapedEvent[] = [];

  for (const evt of scraped) {
    // Skip events with placeholder/generic titles
    if (evt.titre.length < 5) continue;
    if (/^(lyon|accueil|home|menu|contact|recherche|en savoir plus|voir plus|learn more|see more|lire la suite|read more)$/i.test(evt.titre)) continue;

    const key = `${normalizeTitle(evt.titre)}_${evt.date}`;
    if (existingKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    unique.push(evt);
  }

  return unique;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Lyon Night Guide — Event Scraper ===\n");

  // Load existing events
  let existingEvents: StoredEvent[] = [];
  try {
    existingEvents = JSON.parse(readFileSync(EVENTS_PATH, "utf-8"));
  } catch {
    console.log("No existing events.json found, starting fresh.");
  }

  // Separate manual events (no source field) from scraped events
  const manualEvents = existingEvents.filter((e) => !e.source);
  const previouslyScraped = existingEvents.filter((e) => !!e.source);

  console.log(`Existing: ${manualEvents.length} manual + ${previouslyScraped.length} scraped\n`);

  // Run all scrapers sequentially with delays between them
  const allScraped: ScrapedEvent[] = [];

  const scrapers = [
    scrapeLyonFr,            // Official Lyon city: cultural, theater, expos, with images
    scrapeVisiterLyon,       // Tourism: 600+ events, SSR
    scrapeEventbrite,        // Eventbrite: JSON-LD
    scrapePetitBulletin,     // Cultural: concerts, theater, expos
    scrapeEsnLyon,           // ESN CosmoLyon: Erasmus/student events
    scrapeMuseeConfluences,  // Museum: exhibitions, performances
    scrapeMacLyon,           // MAC Lyon: contemporary art, student nights
    scrapeErasmusPlace,      // ErasmusPlace: international student events
    scrapeGlLyonEvents,      // GL Lyon: professional events
    // --- University & Erasmus sources ---
    scrapeUnivLyon1,         // Univ Claude Bernard: campus events
    scrapeUnivLyon2,         // Univ Lumière: campus events
    scrapeUnivLyon3,         // Univ Jean Moulin: campus events
    scrapeEnsLyon,           // ENS Lyon: seminars, conferences, workshops
    scrapeInsaLyon,          // INSA Lyon: engineering school events
    scrapeEmLyon,            // emlyon Business School: business/student events
    scrapeIaeLyon,           // IAE Lyon: management school events
    scrapeEsnFrance,         // ESN France: national Erasmus events/news
  ];

  for (const scraper of scrapers) {
    try {
      const results = await scraper();
      allScraped.push(...results);
    } catch (err) {
      console.error(`  Scraper failed:`, err instanceof Error ? err.message : err);
    }
    console.log(""); // spacing
    await sleep(1000);
  }

  console.log(`Total raw scraped: ${allScraped.length}`);

  // Filter future events only
  const today = todayIso();
  const futureScraped = allScraped.filter((e) => e.date >= today);
  console.log(`Future events: ${futureScraped.length}`);

  // Deduplicate against manual + previously scraped events
  const newEvents = deduplicateEvents(futureScraped, [...manualEvents, ...previouslyScraped]);
  console.log(`New unique events: ${newEvents.length}`);

  // Find max ID
  let maxId = 0;
  for (const e of existingEvents) {
    const match = e.id.match(/\d+/);
    if (match) maxId = Math.max(maxId, parseInt(match[0], 10));
  }

  // Convert to stored format
  const storedNewEvents: StoredEvent[] = newEvents.map((evt, i) => ({
    ...evt,
    id: `scraped-${maxId + i + 1}`,
    lieu_id: "", // External events
  }));

  // Clean old scraped events in the past
  const freshPreviouslyScraped = previouslyScraped.filter((e) => e.date >= today);
  const removedOld = previouslyScraped.length - freshPreviouslyScraped.length;
  if (removedOld > 0) console.log(`Removed ${removedOld} past scraped events`);

  // Merge all
  const finalEvents = [
    ...manualEvents,
    ...freshPreviouslyScraped,
    ...storedNewEvents,
  ];

  // Sort by date
  finalEvents.sort((a, b) => a.date.localeCompare(b.date));

  writeFileSync(EVENTS_PATH, JSON.stringify(finalEvents, null, 2), "utf-8");
  console.log(`\nDone! Total events in events.json: ${finalEvents.length}`);
  console.log(`  Manual: ${manualEvents.length}`);
  console.log(`  Scraped (kept): ${freshPreviouslyScraped.length}`);
  console.log(`  Scraped (new): ${storedNewEvents.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
