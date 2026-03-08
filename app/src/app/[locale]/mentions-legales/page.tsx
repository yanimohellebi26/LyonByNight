import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

export const metadata = {
  title: "Mentions légales — Lyon Night Guide",
  description: "Mentions légales, politique de confidentialité et cookies du Lyon Night Guide.",
};

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Accueil
      </Link>

      <h1 className="mb-8 text-3xl font-bold">Mentions légales</h1>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">1. Éditeur du site</h2>
          <p>
            Lyon Night Guide est un projet personnel à titre informatif. Les informations
            présentées (horaires, prix, contacts) sont fournies à titre indicatif et peuvent
            être inexactes ou périmées. Nous déclinons toute responsabilité quant à leur
            exactitude.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">2. Hébergement</h2>
          <p>
            Ce site est hébergé par <strong className="text-foreground">Vercel Inc.</strong>,
            340 Pine Street, Suite 701, San Francisco, CA 94104, USA.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">3. Propriété intellectuelle</h2>
          <p>
            Les données des établissements sont issues de sources publiques. Les logos et
            marques mentionnés appartiennent à leurs propriétaires respectifs. Le code source
            de ce projet est à usage personnel.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">4. Données personnelles (RGPD)</h2>
          <p className="mb-2">
            Ce site ne collecte aucune donnée personnelle identifiable. Aucun compte
            utilisateur n&apos;est requis.
          </p>
          <p>
            La géolocalisation est utilisée uniquement en mémoire locale pour calculer les
            distances. Elle n&apos;est ni stockée ni transmise à un serveur.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">5. Cookies</h2>
          <p className="mb-2">Ce site utilise uniquement des cookies techniques :</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong className="text-foreground">lng-theme</strong> : mémorisation de votre
              préférence de thème (clair/sombre). Durée : illimitée.
            </li>
            <li>
              <strong className="text-foreground">lng-cookie-consent</strong> : mémorisation
              de votre choix de consentement cookies. Durée : illimitée.
            </li>
          </ul>
          <p className="mt-2">
            Aucun cookie publicitaire ni de traçage tiers n&apos;est utilisé.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">6. Services tiers</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong className="text-foreground">Mapbox</strong> — Cartographie interactive.
              Soumis à la{" "}
              <a
                href="https://www.mapbox.com/legal/privacy"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                politique de confidentialité Mapbox
              </a>
              .
            </li>
            <li>
              <strong className="text-foreground">OpenAI</strong> — Chatbot IA. Les messages
              envoyés au chatbot sont traités par OpenAI selon leur{" "}
              <a
                href="https://openai.com/policies/privacy-policy"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                politique de confidentialité
              </a>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">7. Contact</h2>
          <p>
            Pour toute question, erreur ou demande de retrait d&apos;information concernant
            un établissement, vous pouvez contacter le site via GitHub.
          </p>
        </section>

        <p className="border-t pt-4 text-xs">
          Dernière mise à jour : mars 2026
        </p>
      </div>
    </div>
  );
}
