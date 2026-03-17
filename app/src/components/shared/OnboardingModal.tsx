"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

const ONBOARDING_DONE_KEY = "lyon-night-onboarding-done";
const PREFERENCES_KEY = "lyon-night-preferences";

const GENRES = [
  "Rock",
  "Jazz",
  "Techno",
  "House",
  "Hip-Hop",
  "Latin",
  "Pop",
  "R&B",
  "Reggae",
  "Electro",
  "Funk",
  "Metal",
] as const;

const DISTRICTS = ["1er", "2e", "3e", "4e", "5e", "6e", "7e", "8e", "9e"] as const;

type Budget = "low" | "mid" | "high";

interface Preferences {
  readonly genres: readonly string[];
  readonly budget: string;
  readonly districts: readonly string[];
}

const BUDGET_OPTIONS: ReadonlyArray<{
  readonly value: Budget;
  readonly symbol: string;
  readonly labelKey: string;
  readonly descKey: string;
}> = [
  { value: "low", symbol: "\u20AC", labelKey: "budget_low", descKey: "budget_low_desc" },
  { value: "mid", symbol: "\u20AC\u20AC", labelKey: "budget_mid", descKey: "budget_mid_desc" },
  { value: "high", symbol: "\u20AC\u20AC\u20AC", labelKey: "budget_high", descKey: "budget_high_desc" },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

function TogglePill({
  label,
  active,
  onToggle,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
      }`}
    >
      {label}
    </button>
  );
}

function StepDots({
  total,
  current,
}: {
  readonly total: number;
  readonly current: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i === current ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

export function OnboardingModal() {
  const t = useTranslations("onboarding");
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [genres, setGenres] = useState<readonly string[]>([]);
  const [budget, setBudget] = useState<Budget | "">("");
  const [districts, setDistricts] = useState<readonly string[]>([]);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_DONE_KEY);
    if (!done) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, []);

  const saveAndClose = useCallback(() => {
    const preferences: Preferences = {
      genres,
      budget,
      districts,
    };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    localStorage.setItem(ONBOARDING_DONE_KEY, "true");
    setVisible(false);
  }, [genres, budget, districts]);

  const handleNext = useCallback(() => {
    if (step < 2) {
      setDirection(1);
      setStep((prev) => prev + 1);
    } else {
      saveAndClose();
    }
  }, [step, saveAndClose]);

  const handleSkip = useCallback(() => {
    saveAndClose();
  }, [saveAndClose]);

  const toggleGenre = useCallback((genre: string) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }, []);

  const toggleDistrict = useCallback((district: string) => {
    setDistricts((prev) =>
      prev.includes(district)
        ? prev.filter((d) => d !== district)
        : [...prev, district]
    );
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border bg-card/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <StepDots total={3} current={step} />

        <div className="mt-6 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {step === 0 && (
                <div>
                  <h2 className="font-display text-xl font-semibold sm:text-2xl">
                    {t("step_music")}
                  </h2>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {GENRES.map((genre) => (
                      <TogglePill
                        key={genre}
                        label={genre}
                        active={genres.includes(genre)}
                        onToggle={() => toggleGenre(genre)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="font-display text-xl font-semibold sm:text-2xl">
                    {t("step_budget")}
                  </h2>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {BUDGET_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setBudget(option.value)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                          budget === option.value
                            ? "border-primary bg-primary/10 text-foreground shadow-md"
                            : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Coins className="h-6 w-6" />
                        <span className="text-base font-bold">{option.symbol}</span>
                        <span className="text-xs font-medium">{t(option.labelKey)}</span>
                        <span className="text-center text-[11px] leading-tight text-muted-foreground">
                          {t(option.descKey)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="font-display text-xl font-semibold sm:text-2xl">
                    {t("step_districts")}
                  </h2>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {DISTRICTS.map((district) => (
                      <TogglePill
                        key={district}
                        label={district}
                        active={districts.includes(district)}
                        onToggle={() => toggleDistrict(district)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("skip")}
          </button>
          <Button onClick={handleNext} size="lg">
            {step === 2 ? t("done") : t("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
