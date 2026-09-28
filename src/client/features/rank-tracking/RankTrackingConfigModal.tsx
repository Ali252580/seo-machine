import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Info, Loader2, X } from "lucide-react";
import { Modal } from "@/client/components/Modal";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";
import { domainField, normalizeDomain } from "@/types/schemas/domain";
import {
  depthToPages,
  pagesToDepth,
  estimateRankCheckCredits,
} from "@/shared/rank-tracking";
import { getLanguageCode } from "@/client/features/keywords/locations";
import {
  SERP_LANGUAGE_OPTIONS,
  getIsoCountryCode,
} from "@/shared/keyword-locations";
import { LocationSelect } from "@/client/components/LocationSelect";
import type { ProjectMarket } from "@/client/features/projects/types";
import { useProjectMarket } from "@/client/features/projects/useProjectMarket";
import { SearchTargetingField } from "./SearchTargetingField";
import { KeywordSuggestionStep } from "./KeywordSuggestionStep";
import { useSaveConfigMutations } from "./useSaveConfigMutations";

type Props = {
  projectId: string;
  existingConfig?: RankTrackingConfig | null;
  onClose: () => void;
  onSaved: (createdConfigId?: string) => void;
  onConfigCreated?: () => void;
};

export function RankTrackingConfigModal({
  projectId,
  existingConfig,
  onClose,
  onSaved,
  onConfigCreated,
}: Props) {
  const projectMarket = useProjectMarket(projectId);

  if (!existingConfig && !projectMarket) {
    return (
      <Modal
        maxWidth="max-w-lg"
        onClose={onClose}
        labelledBy="rank-config-modal-title"
      >
        <h2 id="rank-config-modal-title" className="sr-only">
          افزودن دامنه
        </h2>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-base-content/50" />
        </div>
      </Modal>
    );
  }

  return (
    <RankTrackingConfigModalContent
      projectId={projectId}
      existingConfig={existingConfig}
      initialMarket={existingConfig ?? projectMarket!}
      onClose={onClose}
      onSaved={onSaved}
      onConfigCreated={onConfigCreated}
    />
  );
}

function RankTrackingConfigModalContent({
  projectId,
  existingConfig,
  initialMarket,
  onClose,
  onSaved,
  onConfigCreated,
}: Props & { initialMarket: ProjectMarket }) {
  const isEdit = !!existingConfig;
  const [step, setStep] = useState<"config" | "keywords">("config");
  const [domain, setDomain] = useState(existingConfig?.domain ?? "");
  const [devices, setDevices] = useState<"both" | "desktop" | "mobile">(
    existingConfig?.devices ?? "mobile",
  );
  const [locationCode, setLocationCode] = useState(
    existingConfig?.locationCode ?? initialMarket.locationCode,
  );
  const [languageCode, setLanguageCode] = useState(
    existingConfig?.languageCode ?? initialMarket.languageCode,
  );
  const [serpDepth, setSerpDepth] = useState(existingConfig?.serpDepth ?? 40);
  const [schedule, setSchedule] = useState<
    RankTrackingConfig["scheduleInterval"]
  >(existingConfig?.scheduleInterval ?? "weekly");
  const [targetingMode, setTargetingMode] = useState<"national" | "local">(
    existingConfig?.locationName ? "local" : "national",
  );
  const [locationName, setLocationName] = useState<string | undefined>(
    existingConfig?.locationName ?? undefined,
  );
  const [createdConfigId, setCreatedConfigId] = useState<string | null>(null);

  const selectedCountryCode = useMemo(
    () => getIsoCountryCode(locationCode),
    [locationCode],
  );

  const { createMutation, updateMutation } = useSaveConfigMutations({
    projectId,
    existingConfig,
    fields: {
      devices,
      serpDepth,
      locationCode,
      languageCode,
      targetingMode,
      locationName,
      schedule,
    },
    onCreated: (configId) => {
      setCreatedConfigId(configId);
      onConfigCreated?.();
      setStep("keywords");
    },
    onUpdated: () => onSaved(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    if (!domain.trim()) {
      toast.error("دامنه را وارد کنید");
      return;
    }
    if (targetingMode === "local" && !locationName) {
      toast.error("برای هدف‌گیری محلی، شهر یا منطقه را انتخاب کنید");
      return;
    }
    const parsedDomain = domainField.safeParse(domain);
    if (!parsedDomain.success) {
      toast.error("یک دامنه معتبر وارد کنید");
      return;
    }
    setDomain(parsedDomain.data);
    if (isEdit) {
      updateMutation.mutate(parsedDomain.data);
    } else {
      createMutation.mutate(parsedDomain.data);
    }
  };

  const handleDomainBlur = () => {
    try {
      setDomain(normalizeDomain(domain));
    } catch {
      // Keep invalid partial input editable; submit validation will show the error.
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (step === "keywords" && createdConfigId) {
    const closeKeywordStep = () => onSaved(createdConfigId);

    return (
      <Modal
        maxWidth="max-w-3xl"
        onClose={closeKeywordStep}
        labelledBy="keyword-suggestions-title"
      >
        <KeywordSuggestionStep
          configId={createdConfigId}
          projectId={projectId}
          domain={domain}
          locationCode={locationCode}
          onDone={(id) => onSaved(id)}
          onClose={closeKeywordStep}
        />
      </Modal>
    );
  }

  return (
    <Modal
      maxWidth="max-w-lg"
      onClose={onClose}
      labelledBy="rank-config-modal-title"
    >
      <div className="flex items-center justify-between">
        <h2 id="rank-config-modal-title" className="text-lg font-semibold">
          {isEdit ? "ویرایش تنظیمات دامنه" : "افزودن دامنه"}
        </h2>
        <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">دامنه هدف</span>
          </label>
          <input
            type="text"
            placeholder="example.com"
            className="input input-bordered w-full"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onBlur={handleDomainBlur}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">کشور</span>
          </label>
          <LocationSelect
            value={locationCode}
            onChange={(newLocationCode) => {
              setLocationCode(newLocationCode);
              setLanguageCode(getLanguageCode(newLocationCode));
              // A picked city belongs to the previous country.
              setLocationName(undefined);
            }}
          />
        </div>

        <SearchTargetingField
          mode={targetingMode}
          onModeChange={setTargetingMode}
          locationName={locationName}
          onLocationNameChange={setLocationName}
          countryCode={selectedCountryCode}
        />

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">زبان</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={languageCode}
            onChange={(e) => setLanguageCode(e.target.value)}
          >
            {SERP_LANGUAGE_OPTIONS.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
          <div className="mt-1.5 text-xs text-base-content/50">
            زبان کشور به‌صورت پیش‌فرض انتخاب می‌شود. زبانی را انتخاب کنید که
            مشتریان شما با آن جستجو می‌کنند.
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">دستگاه‌ها</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={devices}
            onChange={(e) => {
              const value = e.target.value;
              if (
                value === "both" ||
                value === "desktop" ||
                value === "mobile"
              ) {
                setDevices(value);
              }
            }}
          >
            <option value="both">دسکتاپ + موبایل</option>
            <option value="desktop">فقط دسکتاپ</option>
            <option value="mobile">فقط موبایل</option>
          </select>
          <div className="mt-1.5 text-xs text-base-content/50">
            بیشتر جستجوهای گوگل از موبایل انجام می‌شوند؛ گزینه مناسب کاربران خود
            را انتخاب کنید.
          </div>
          {devices === "both" && (
            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-info">
              <Info className="size-3.5 shrink-0 mt-0.5" />
              <span>
                ردیابی هر دو دستگاه برای هر کلمه دو برابر اعتبار مصرف می‌کند
              </span>
            </div>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">زمان‌بندی</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={schedule}
            onChange={(e) => {
              const value = e.target.value;
              if (
                value === "daily" ||
                value === "weekly" ||
                value === "monthly" ||
                value === "manual"
              ) {
                setSchedule(value);
              }
            }}
          >
            <option value="daily">روزانه</option>
            <option value="weekly">هفتگی</option>
            <option value="monthly">ماهانه (پایان ماه)</option>
            <option value="manual">فقط دستی</option>
          </select>
          {schedule === "daily" && (
            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-warning">
              <Info className="size-3.5 shrink-0 mt-0.5" />
              <span>بررسی روزانه ۷ برابر بررسی هفتگی اعتبار مصرف می‌کند</span>
            </div>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">عمق جستجو</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={depthToPages(serpDepth)}
            onChange={(e) => setSerpDepth(pagesToDepth(Number(e.target.value)))}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((pages) => (
              <option key={pages} value={pages}>
                {pages} صفحه (تا {pages * 10} نتیجه)
              </option>
            ))}
          </select>
          <div className="mt-1.5 text-xs text-base-content/50">
            بررسی ۱۰ صفحه حدود ۸ برابر بررسی یک صفحه هزینه دارد
          </div>
        </div>

        {(() => {
          // Scheduled checks run through the cheaper task queue; manual
          // configs only ever pay the live price.
          const { costUsd: costPerKeyword } = estimateRankCheckCredits(
            1,
            devices,
            serpDepth,
            schedule === "manual" ? "live" : "queued",
          );
          const checksPerMonth =
            schedule === "daily" ? 30 : schedule === "weekly" ? 4 : 1;
          return (
            <div className="rounded-lg bg-base-200/50 px-3 py-2.5 text-xs text-base-content/70 space-y-0.5">
              <div>
                <span className="font-mono font-semibold text-base-content">
                  ~${costPerKeyword.toFixed(4)}
                </span>{" "}
                برای هر کلمه در هر بررسی
              </div>
              {schedule !== "manual" && (
                <div>
                  هزینه ۵۰ کلمه کلیدی حدود{" "}
                  <span className="font-mono font-semibold text-base-content">
                    ~${(costPerKeyword * 50 * checksPerMonth).toFixed(2)}
                  </span>
                  در ماه است
                </div>
              )}
            </div>
          );
        })()}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            انصراف
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isPending || !domain.trim()}
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            {isEdit ? "ذخیره تغییرات" : "افزودن دامنه"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
