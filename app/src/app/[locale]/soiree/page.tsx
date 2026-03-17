"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { PageTransition } from "@/components/shared/PageTransition";
import { StepDateVibe } from "@/components/soiree/StepDateVibe";
import { StepSuggestions } from "@/components/soiree/StepSuggestions";
import { StepSharePlan } from "@/components/soiree/StepSharePlan";
import { StepIndicator } from "@/components/soiree/StepIndicator";
import type { Lieu, Evenement } from "@/types";

export type VibeKey = "chill" | "party" | "culture" | "discover";

export interface SoireePlan {
  readonly date: string;
  readonly vibes: readonly VibeKey[];
  readonly venues: readonly Lieu[];
  readonly events: readonly Evenement[];
}

const STEP_LABELS = ["step_date", "step_suggestions", "step_share"] as const;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 200 : -200,
    opacity: 0,
  }),
};

export default function SoireePage() {
  const t = useTranslations("soiree");

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [vibes, setVibes] = useState<VibeKey[]>([]);
  const [selectedVenues, setSelectedVenues] = useState<Lieu[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Evenement[]>([]);

  function goNext() {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 2));
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  function restart() {
    setDirection(-1);
    setStep(0);
    setVibes([]);
    setSelectedVenues([]);
    setSelectedEvents([]);
    setDate(new Date().toISOString().split("T")[0]);
  }

  function toggleVibe(vibe: VibeKey) {
    setVibes((prev) =>
      prev.includes(vibe)
        ? prev.filter((v) => v !== vibe)
        : [...prev, vibe]
    );
  }

  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col items-center px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-2 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">
            {t("title")}
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
            {t("subtitle")}
          </h1>
        </div>

        {/* Step indicator */}
        <StepIndicator
          currentStep={step}
          labels={STEP_LABELS.map((key) => t(key))}
        />

        {/* Steps */}
        <div className="relative w-full max-w-2xl overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <motion.div
                key="step-0"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <StepDateVibe
                  date={date}
                  onDateChange={setDate}
                  vibes={vibes}
                  onToggleVibe={toggleVibe}
                  onNext={goNext}
                />
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <StepSuggestions
                  date={date}
                  vibes={vibes}
                  selectedVenues={selectedVenues}
                  onSelectedVenuesChange={setSelectedVenues}
                  selectedEvents={selectedEvents}
                  onSelectedEventsChange={setSelectedEvents}
                  onNext={goNext}
                  onBack={goBack}
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <StepSharePlan
                  plan={{
                    date,
                    vibes,
                    venues: selectedVenues,
                    events: selectedEvents,
                  }}
                  onRestart={restart}
                  onBack={goBack}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
