import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWordPressStatus,
  removeWordPressConnection,
  saveWordPressConnection,
} from "@/serverFunctions/wordpress";

export function WordPressConnectionCard({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const key = ["wordpress-connection", projectId];
  const status = useQuery({
    queryKey: key,
    queryFn: () => getWordPressStatus({ data: { projectId } }),
  });
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const save = useMutation({
    mutationFn: () =>
      saveWordPressConnection({
        data: { projectId, siteUrl, username, password },
      }),
    onSuccess: () => {
      setPassword("");
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
  const remove = useMutation({
    mutationFn: () => removeWordPressConnection({ data: { projectId } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  });
  return (
    <section
      className="rounded-xl border border-base-300 p-5 space-y-4"
      dir="rtl"
    >
      <div>
        <h2 className="font-semibold">اتصال وردپرس</h2>
        <p className="text-sm text-base-content/65">
          مدیر پروژه یک‌بار رمز برنامهٔ وردپرس را وصل می‌کند. عامل هوشمند فقط
          پیش‌نویس می‌سازد؛ کاربران نیازی به اتصال جداگانه ندارند.
        </p>
      </div>
      {status.isLoading && <p>در حال بررسی اتصال…</p>}
      {status.isError && (
        <p role="alert" className="text-error">
          وضعیت اتصال دریافت نشد.
        </p>
      )}
      {status.data?.connection && (
        <p>
          متصل به {status.data.connection.siteUrl} با نام کاربری{" "}
          {status.data.connection.username}
        </p>
      )}
      {status.data?.canManage && (
        <>
          <form
            className="grid gap-3 max-w-lg"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <label className="grid gap-1">
              نشانی سایت وردپرسی
              <input
                className="input input-bordered w-full"
                type="url"
                value={siteUrl}
                onChange={(event) => setSiteUrl(event.target.value)}
                placeholder="https://example.com"
                required
              />
            </label>
            <label className="grid gap-1">
              نام کاربری وردپرس
              <input
                className="input input-bordered w-full"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="grid gap-1">
              Application Password
              <input
                className="input input-bordered w-full"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <button className="btn btn-primary w-fit" disabled={save.isPending}>
              اتصال و بررسی دسترسی
            </button>
          </form>
          {save.isError && (
            <p role="alert" className="text-error">
              اتصال برقرار نشد. دامنه، نام کاربری و رمز برنامه را بررسی کنید.
            </p>
          )}
          {save.isSuccess && <p role="status">اتصال ذخیره شد.</p>}
          {status.data.connection && (
            <button
              className="btn btn-outline btn-error"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              قطع اتصال
            </button>
          )}
        </>
      )}
    </section>
  );
}
