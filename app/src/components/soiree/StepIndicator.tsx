"use client";

interface StepIndicatorProps {
  readonly currentStep: number;
  readonly labels: readonly string[];
}

export function StepIndicator({ currentStep, labels }: StepIndicatorProps) {
  return (
    <div className="my-6 flex items-center gap-3">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-3">
          {i > 0 && (
            <div
              className={`h-px w-6 transition-colors sm:w-10 ${
                i <= currentStep ? "bg-primary" : "bg-border"
              }`}
            />
          )}
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                i === currentStep
                  ? "bg-primary text-primary-foreground scale-110"
                  : i < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`hidden text-[10px] font-medium sm:block ${
                i === currentStep
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
