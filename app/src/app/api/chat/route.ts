import { openai } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { retrieveLieux, formatLieuxForContext } from "@/lib/rag/retriever";
import {
  searchYelpLyon,
  formatYelpForContext,
} from "@/lib/api/yelp";

export const maxDuration = 30;

const SYSTEM_PROMPT = `Tu es "Lyon Night Guide", l'assistant expert de la vie nocturne lyonnaise.
Tu connais tous les bars, clubs, speakeasies, péniches et lieux de sortie de Lyon sur le bout des doigts.

═══ RÈGLES ABSOLUES ═══
1. Réponds en français. Si l'utilisateur écrit en anglais, réponds en anglais.
2. Base-toi UNIQUEMENT sur les données du CONTEXTE ci-dessous. Ne mentionne JAMAIS un lieu qui n'y figure pas.
3. Chaque lieu recommandé DOIT inclure son identifiant [id:xxx] tel qu'il apparaît dans le contexte. Le frontend affiche des fiches interactives grâce à ces identifiants. N'invente JAMAIS un id.
4. Limite-toi à 3-5 recommandations par réponse.
5. Ne donne PAS de numéro de téléphone ni d'adresse exacte.
6. Si aucun lieu ne correspond, dis-le honnêtement et propose les plus proches.

═══ FORMAT OBLIGATOIRE ═══
Pour chaque recommandation :

[id:xxx] **Nom du lieu** — [type] — [quartier] — [prix] — Musique: genres
Description courte et enthousiaste (1-2 phrases max), basée sur les spécificités et la description du contexte.

═══ COMPORTEMENT ═══
- Sois chaleureux, enthousiaste, comme un ami lyonnais qui connaît les bons plans.
- Pose une question de suivi quand c'est pertinent (« Tu préfères plutôt ambiance chill ou dancefloor ? »).
- Quand l'utilisateur mentionne un lieu spécifique, donne des détails riches (horaires, ambiance, clientèle, prix des consos) s'ils sont dans le contexte.
- Pour les demandes vagues (« je veux sortir ce soir »), demande des préférences ou propose un mix varié (1 bar chill + 1 bar dansant + 1 club).
- Mentionne les spécificités uniques de chaque lieu (terrasse, vue, déco, événements, happy hour…).`;

/** Extract text content from UIMessage parts */
function extractTextFromMessage(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ");
}

/** Pick the best available model: Gemini → OpenAI */
function getModel() {
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return google("gemini-2.0-flash");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "No AI API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY in environment variables."
    );
  }

  return openai("gpt-4o-mini");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body as { messages: UIMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const model = getModel();

    // Extract text from the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const lastUserMessage = lastUserMsg ? extractTextFromMessage(lastUserMsg) : "";

    // Retrieve relevant local lieux — generous limit for better coverage
    const localLieux = await retrieveLieux(lastUserMessage, { limit: 10, minScore: 2 });

    // Always try Yelp enrichment if local results are thin
    let yelpContext = "";
    if (localLieux.length < 4 && process.env.YELP_API_KEY) {
      try {
        const yelpResults = await searchYelpLyon(lastUserMessage, { limit: 5 });
        yelpContext = formatYelpForContext(yelpResults);
      } catch (error) {
        console.error("Yelp API error:", error);
      }
    }

    const localContext = formatLieuxForContext(localLieux);

    const contextBlock = [
      "=== DONNÉES LOCALES (prioritaires — utilise les [id:xxx] de cette section) ===",
      localContext || "(Aucun résultat local pertinent pour cette requête)",
      yelpContext ? `\n=== DONNÉES YELP (complémentaires — pas d'id disponible) ===\n${yelpContext}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const result = streamText({
      model,
      system: `${SYSTEM_PROMPT}\n\n--- CONTEXTE ---\n${contextBlock}`,
      messages: await convertToModelMessages(messages),
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
