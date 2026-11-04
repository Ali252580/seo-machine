import { Link, rootRouteId, useMatch, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import * as React from "react";
import { shouldCaptureAppErrorCode } from "@/shared/error-codes";
import {
  getErrorCode,
  getStandardErrorMessage,
} from "@/client/lib/error-messages";
import { AuthConfigErrorCard } from "@/client/components/AuthConfigErrorCard";
import { captureClientError } from "@/client/lib/posthog";
import { UnauthenticatedErrorCard } from "@/client/components/UnauthenticatedErrorCard";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });
  const pathname = router.state.location.pathname;

  const message = getStandardErrorMessage(
    error,
    "دریافت اطلاعات این صفحه انجام نشد. دوباره تلاش کنید.",
  );
  const errorCode = getErrorCode(error);

  React.useEffect(() => {
    if (!shouldCaptureAppErrorCode(errorCode)) {
      return;
    }

    captureClientError(error, {
      errorCode,
      path: pathname,
    });
  }, [error, errorCode, pathname]);

  const showAuthConfigHelp = errorCode === "AUTH_CONFIG_MISSING";
  const showSignInHelp = errorCode === "UNAUTHENTICATED";

  if (showAuthConfigHelp) {
    return (
      <div className="min-w-0 flex-1 p-4 flex items-center justify-center">
        <AuthConfigErrorCard
          message={message}
          onRetry={() => {
            void router.invalidate();
          }}
        />
      </div>
    );
  }

  if (showSignInHelp) {
    return (
      <div className="min-w-0 flex-1 p-4 flex items-center justify-center">
        <UnauthenticatedErrorCard
          message={message}
          onRetry={() => {
            void router.invalidate();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
      <h1 className="text-lg font-semibold">این صفحه بارگذاری نشد</h1>
      <p role="alert" className="max-w-xl break-words text-center text-error">
        {message}
      </p>
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={() => {
            void router.invalidate();
          }}
          className="btn btn-primary btn-sm"
        >
          تلاش دوباره
        </button>
        {isRoot ? (
          <Link to="/" className="btn btn-sm">
            صفحهٔ اصلی
          </Link>
        ) : (
          <Link
            to="/"
            className="btn btn-sm"
            onClick={(e) => {
              e.preventDefault();
              window.history.back();
            }}
          >
            بازگشت
          </Link>
        )}
      </div>
    </div>
  );
}
