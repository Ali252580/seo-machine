import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { PortalMenu } from "@/client/components/PortalMenu";
import { formatCreatedBy } from "@/client/features/reports/shared";
import { formatRelativeTime } from "@/client/lib/relative-time";
import type { ReportListItem } from "@/serverFunctions/reports";
import { REPORT_APP_LIST_LIMIT } from "@/types/schemas/reports";

export function ReportsList({
  projectId,
  reports,
  onDelete,
}: {
  projectId: string;
  reports: ReportListItem[];
  onDelete: (report: ReportListItem) => void;
}) {
  if (reports.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-base-300 px-4 py-6 text-sm">
        <p className="font-medium">
          هنوز گزارشی برای این پروژه ذخیره نشده است.
        </p>
        <p className="text-base-content/70">
          در گفت‌وگو با SAM درخواست کنید: «سایت همین پروژه را بررسی کن و نتیجه
          را به‌صورت گزارش ذخیره کن.» گزارش‌های ذخیره‌شده اینجا قابل مشاهده‌اند.
        </p>
        <Link
          to="/p/$projectId/sam"
          params={{ projectId }}
          className="btn btn-primary btn-sm"
        >
          گفت‌وگو با عامل همین پروژه
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>عنوان گزارش</th>
              <th>سازنده</th>
              <th>نوع</th>
              <th>آخرین تغییر</th>
              <th>
                <span className="sr-only">عملیات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-base-200">
                <td className="max-w-[420px]">
                  <Link
                    to="/p/$projectId/reports/$reportId"
                    params={{ projectId, reportId: report.id }}
                    className="link link-hover break-words font-medium"
                  >
                    {report.title}
                  </Link>
                </td>
                <td className="text-base-content/70">
                  {formatCreatedBy(report)}
                </td>
                {/* The template the report was written from, else the skill
                    that produced it: what a reader needs to tell two reports
                    on the same site apart. */}
                <td className="text-base-content/70">
                  {report.templateName ?? report.skill ?? "—"}
                </td>
                <td className="whitespace-nowrap text-base-content/70">
                  {formatRelativeTime(report.updatedAt)}
                </td>
                <td className="w-10 text-end">
                  <PortalMenu ariaLabel={`عملیات گزارش ${report.title}`}>
                    {(close) => (
                      <li>
                        <button
                          className="text-error"
                          onClick={() => {
                            close();
                            onDelete(report);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                          حذف گزارش
                        </button>
                      </li>
                    )}
                  </PortalMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {reports.length === REPORT_APP_LIST_LIMIT ? (
        <p className="text-xs text-base-content/60">
          {REPORT_APP_LIST_LIMIT.toLocaleString("fa-IR")} گزارش اخیر نمایش داده
          می‌شود.
        </p>
      ) : null}
    </div>
  );
}
