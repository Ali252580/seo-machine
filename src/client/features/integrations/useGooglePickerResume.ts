import { useEffect, useState } from "react";
import {
  startGoogleLink,
  useGoogleLinkPending,
} from "@/client/features/integrations/startGoogleLink";

/** Restore the picker after Google's full-page redirect, scoped to this project. */
export function useGooglePickerResume(
  provider: "gsc" | "ga4",
  projectId: string,
) {
  // null lets the card derive unfinished setup from the saved authorization.
  // false means the user explicitly closed the picker during this visit.
  const [picker, setPicker] = useState<{ key: string; open: boolean | null }>();
  const linking = useGoogleLinkPending();
  const key = `google-property-picker:${provider}:${projectId}`;
  const picking = picker?.key === key ? picker.open : null;
  const setPicking = (open: boolean | null) => setPicker({ key, open });
  useEffect(() => {
    setPicker({ key, open: null });
    try {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        setPicker({ key, open: true });
      }
    } catch {
      /* Storage can be disabled; Connect still opens the picker. */
    }
  }, [key]);

  const linkAccount = async (callbackURL: string) => {
    try {
      sessionStorage.setItem(key, "open");
    } catch {
      /* Google authorization does not require browser storage. */
    }
    const redirecting = await startGoogleLink(provider, callbackURL);
    if (!redirecting) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Storage is optional. */
      }
    }
  };
  return { picking, setPicking, linkAccount, linking };
}
