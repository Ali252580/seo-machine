import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { addTrackingKeywords } from "@/serverFunctions/rank-tracking";
import { MAX_TRACKED_KEYWORD_LENGTH } from "@/shared/rank-tracking";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { Loader2 } from "lucide-react";

export function AddKeywordsPanel({
  configId,
  projectId,
  onSuccess,
  onCancel,
}: {
  configId: string;
  projectId: string;
  onSuccess: (result: { added: number; checkTriggered: boolean }) => void;
  onCancel: () => void;
}) {
  const [keywordInput, setKeywordInput] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const mutation = useMutation({
    mutationFn: (kws: string[]) =>
      addTrackingKeywords({
        data: { projectId, configId, keywords: kws, matchCase },
      }),
    onSuccess: (result) => {
      setKeywordInput("");
      onSuccess(result);
    },
    onError: (error) => {
      toast.error(
        getStandardErrorMessage(error, "افزودن کلمات کلیدی ناموفق بود"),
      );
    },
  });
  const isPending = mutation.isPending;
  return (
    <div className="flex gap-2 items-end">
      <div className="flex flex-col gap-1 flex-1">
        <textarea
          className="textarea textarea-bordered textarea-sm w-full"
          rows={3}
          placeholder="کلمات کلیدی را هر کدام در یک خط وارد کنید"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
        />
        <label
          className="flex items-center gap-2 text-xs cursor-pointer w-fit"
          title="کلمات دقیقاً با همین حروف ثبت شوند؛ گوگل ممکن است برای نام برند با حروف متفاوت نتایج دیگری نمایش دهد."
        >
          <input
            type="checkbox"
            className="checkbox checkbox-xs [--radius-selector:0.25rem]"
            checked={matchCase}
            onChange={(e) => setMatchCase(e.target.checked)}
          />
          تطبیق حروف
        </label>
      </div>
      <div className="flex flex-col gap-1">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            const lines = keywordInput
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            if (lines.some((l) => l.length > MAX_TRACKED_KEYWORD_LENGTH)) {
              toast.error(
                `هر کلمه باید حداکثر ${MAX_TRACKED_KEYWORD_LENGTH} نویسه باشد.`,
              );
              return;
            }
            if (lines.length > 0) mutation.mutate(lines);
          }}
          disabled={isPending || !keywordInput.trim()}
        >
          {isPending && <Loader2 className="size-3 animate-spin" />}
          افزودن
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          انصراف
        </button>
      </div>
    </div>
  );
}
