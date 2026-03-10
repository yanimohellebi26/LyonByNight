/**
 * Weekly event scraper for Lyon Night Guide.
 * Scrapes cultural, student, Erasmus, scientific, and nightlife events from multiple sources.
 *
 * Usage: npx tsx scripts/scrape-events.ts
 *
 * Primary source: visiterlyon.com (600+ events, server-rendered HTML)
 * Secondary: Eventbrite, Petit Bulletin, CityC Crunch RSS
 * Tertiary: ESN Lyon, ErasmusPlace, GL Lyon Events
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

        const desc = String(data.description ?? "").replace(/\\n/g, "\n");
        const dealUrl = String(data.dealUrl ?? "");
        const address = String(data.address ?? "");

        // Extract price from description
        let price: string | undefined;
        const priceMatch = desc.match(/(\d+)\s*€/);
        if (priceMatch) price = `${priceMatch[1]}€`;
        if (/free|gratuit/i.test(desc)) price = "Gratuit";

        // Extract venue from address or description
        const venue = address || (desc.match(/📍\s*(.+?)(?:\n|$)/)?.[1]?.trim()) || "Lyon";

        events.push({
          titre: title.slice(0, 200),
          description: desc.slice(0, 500),
          date: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`,
          heure_debut: `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`,
          heure_fin: endDate ? `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}` : undefined,
          type: classifyEvent(title, desc) === "autre" ? "erasmus" : classifyEvent(title, desc),
          prix_entree: price,
          source: "esn_cosmolyon",
          url: dealUrl ? `https://www.esnlyon.org${dealUrl}` : url,
          lieu_nom: venue.slice(0, 100),
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
    scrapeVisiterLyon,       // Primary: 600+ events, SSR
    scrapeEventbrite,        // Secondary: JSON-LD
    scrapePetitBulletin,     // Secondary: cultural events
    scrapeEsnLyon,           // ESN CosmoLyon: Erasmus/student events
    scrapeMuseeConfluences,  // Museum: exhibitions, performances
    scrapeMacLyon,           // MAC Lyon: contemporary art, student nights
    scrapeErasmusPlace,      // ErasmusPlace: international student events
    scrapeGlLyonEvents,      // GL Lyon: professional events
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
