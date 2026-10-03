import type { BillStatusEnum, HouseEnum } from "../../../shared/types";
import {
  calculateProgressWidth,
  getCurrentStep,
  getOrderedSteps,
  getStatusMessage,
  getStepState,
} from "../../../shared/utils/bill-progress";

interface BillStatusProgressProps {
  status: BillStatusEnum;
  originatingHouse: HouseEnum;
  statusNote?: string | null;
}

interface StatusBadgeProps {
  message: string;
}

interface ProgressStepProps {
  label: string;
  stepNumber: number;
  currentStep: number;
  isActive: boolean;
  isPreparing: boolean;
}

// 基本ステップ定義
const BASE_STEPS = [
  { label: "議案\n提出" },
  { label: "委員会\n審査" },
  { label: "本会議\n審議" },
  { label: "議決" },
] as const;

// ステータスバッジコンポーネント
function StatusBadge({ message }: StatusBadgeProps) {
  if (!message) return null;

  return (
    <p className="w-full max-w-md rounded-2xl bg-brand-accent-tint px-4 py-3 text-center text-sm font-bold text-brand-link">
      {message}
    </p>
  );
}

// プログレスステップコンポーネント
function ProgressStep({
  label,
  stepNumber,
  currentStep,
  isActive,
  isPreparing,
}: ProgressStepProps) {
  const isCurrentStep = isActive && stepNumber === currentStep;

  return (
    <div className="flex flex-col items-center">
      {/* ドット */}
      <div
        className={`w-3 h-3 rounded-full border transition-all duration-300 ${
          isActive
            ? "bg-brand-link border-brand-link"
            : "bg-mirai-surface-muted border-mirai-border"
        }`}
      >
        {/* 現在のステップを強調 */}
        {isCurrentStep && (
          <div className="w-5 h-5 bg-brand-link rounded-full -mt-[5px] -ml-[5px] ring-4 ring-brand-accent-tint" />
        )}
      </div>

      {/* ラベル */}
      <div className="mt-2">
        <span
          className={`flex flex-col text-sm leading-6 whitespace-pre-line text-center ${
            isActive && !isPreparing
              ? "text-mirai-text font-bold"
              : "text-mirai-text-muted"
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export function BillStatusProgress({
  status,
  originatingHouse,
  statusNote,
}: BillStatusProgressProps) {
  const isPreparing = status === "preparing";
  const currentStep = getCurrentStep(status);

  const orderedSteps = getOrderedSteps(originatingHouse, BASE_STEPS);
  const progressWidth = calculateProgressWidth(currentStep);

  const statusMessage = getStatusMessage(status, statusNote);

  return (
    <section
      aria-labelledby="bill-status-title"
      className="flex flex-col gap-3"
    >
      <h2
        id="bill-status-title"
        className="text-lg font-extrabold text-mirai-text md:text-xl"
      >
        審議のステータス
      </h2>
      <div className="pt-2">
        <div className="flex flex-col items-center gap-7">
          {/* ステータスメッセージバッジ */}
          <StatusBadge message={statusMessage} />

          {/* プログレスライン */}
          <div className="relative w-full max-w-md">
            {/* 背景ライン */}
            <div className="absolute top-[5.5px] left-0 w-full h-[1px] bg-mirai-border" />

            {/* アクティブライン */}
            {!isPreparing && currentStep > 0 && (
              <div
                className="absolute top-[5px] left-0 h-0.5 bg-brand-link transition-all duration-300"
                style={{ width: `${Math.min(progressWidth, 100)}%` }}
              />
            )}

            {/* ステップドット */}
            <div className="relative flex justify-around">
              {orderedSteps.map((step, index) => {
                const stepNumber = index + 1;
                const isActive =
                  getStepState(stepNumber, currentStep, isPreparing) ===
                  "active";

                return (
                  <ProgressStep
                    key={stepNumber}
                    label={step.label}
                    stepNumber={stepNumber}
                    currentStep={currentStep}
                    isActive={isActive}
                    isPreparing={isPreparing}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
