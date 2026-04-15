const steps = ['Enter ID', 'Choose Slot', 'Confirmed'];

export function ProgressStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="bg-muted-bg border-b border-card-border py-3 px-4">
      <div className="max-w-sm mx-auto flex items-center">
        {steps.map((label, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <div key={label} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-accent text-white'
                      : isCurrent
                        ? 'bg-primary text-white'
                        : 'bg-card border-2 border-card-border text-muted'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                <span
                  className={`mt-1 text-[10px] font-medium whitespace-nowrap ${
                    isCompleted ? 'text-accent' : isCurrent ? 'text-primary' : 'text-muted'
                  }`}
                >
                  {label}
                </span>
              </div>
              {step < steps.length && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors ${
                    isCompleted ? 'bg-accent' : 'bg-card-border'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
