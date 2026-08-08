import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin, listRecentComments } from "@/lib/admin/actions";
import {
  AdminReportActions,
  AdminUserSearch,
  AdminRecipeSearch,
  AdminCommentsList,
} from "@/components/admin/admin-ui";
import {
  BanIcon,
  MegaphoneIcon,
  ShieldIcon,
  FlagIcon,
  MessageIcon,
  ChefHatIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Yönetim",
};

function timeAgo(value: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  );
  if (seconds < 60) return "az önce";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

type ReportView = {
  id: string;
  targetType: string;
  targetLabel: string;
  reason: string;
  createdAt: string;
  reporterName: string;
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-latte text-plum-soft">
          <ShieldIcon className="h-8 w-8" />
        </span>
        <h1 className="font-heading text-lg font-bold text-plum">
          Yetkin yok
        </h1>
        <p className="max-w-xs text-sm text-plum-soft">
          Bu sayfayı görüntülemek için yönetici hesabına ihtiyacın var.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();

  const [{ data: reports }, comments, statsRes] = await Promise.all([
    admin
      .from("reports")
      .select("id, target_type, target_id, reason, status, created_at, reporter_id")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    listRecentComments(15),
    admin.from("reports").select("status"),
  ]);

  const openCount =
    (statsRes.data ?? []).filter((r) => r.status === "open").length;
  const totalCount = (statsRes.data ?? []).length;

  const reporterIds = [
    ...new Set((reports ?? []).map((r) => r.reporter_id)),
  ];
  const targetUserIds = [
    ...new Set(
      (reports ?? [])
        .filter((r) => r.target_type === "user")
        .map((r) => r.target_id)
    ),
  ];
  const targetRecipeIds = [
    ...new Set(
      (reports ?? [])
        .filter((r) => r.target_type === "recipe")
        .map((r) => r.target_id)
    ),
  ];
  const targetCommentIds = [
    ...new Set(
      (reports ?? [])
        .filter((r) => r.target_type === "comment")
        .map((r) => r.target_id)
    ),
  ];
  const targetMessageIds = [
    ...new Set(
      (reports ?? [])
        .filter((r) => r.target_type === "message")
        .map((r) => r.target_id)
    ),
  ];

  const [{ data: reporterProfiles }, { data: userTargets }, { data: recipes }, { data: commentTargets }, { data: messageTargets }] =
    await Promise.all([
      reporterIds.length
        ? admin
            .from("profiles")
            .select("user_id, first_name, last_name")
            .in("user_id", reporterIds)
        : { data: [] },
      targetUserIds.length
        ? admin
            .from("profiles")
            .select("user_id, first_name, last_name")
            .in("user_id", targetUserIds)
        : { data: [] },
      targetRecipeIds.length
        ? admin.from("recipes").select("id, title").in("id", targetRecipeIds)
        : { data: [] },
      targetCommentIds.length
        ? admin
            .from("recipe_comments")
            .select("id, content")
            .in("id", targetCommentIds)
        : { data: [] },
      targetMessageIds.length
        ? admin.from("messages").select("id, content").in("id", targetMessageIds)
        : { data: [] },
    ]);

  const reporterById = new Map(
    (reporterProfiles ?? []).map((p) => [p.user_id, p])
  );
  const userTargetById = new Map(
    (userTargets ?? []).map((p) => [p.user_id, p])
  );
  const recipeById = new Map((recipes ?? []).map((r) => [r.id, r]));
  const commentById = new Map((commentTargets ?? []).map((c) => [c.id, c]));
  const messageById = new Map((messageTargets ?? []).map((m) => [m.id, m]));

  const name = (row: { first_name: string | null; last_name: string | null } | undefined) =>
    [row?.first_name, row?.last_name].filter(Boolean).join(" ") || "Kullanıcı";

  const reportViews: ReportView[] = (reports ?? []).map((report) => {
    let targetLabel = "Bilinmeyen içerik";
    if (report.target_type === "user") {
      targetLabel = name(userTargetById.get(report.target_id));
    } else if (report.target_type === "recipe") {
      targetLabel = recipeById.get(report.target_id)?.title ?? "Silinmiş tarif";
    } else if (report.target_type === "comment") {
      targetLabel = `Yorum: ${(commentById.get(report.target_id)?.content ?? "").slice(0, 60)}`;
    } else if (report.target_type === "message") {
      targetLabel = `Mesaj: ${(messageById.get(report.target_id)?.content ?? "").slice(0, 60)}`;
    }
    return {
      id: report.id,
      targetType: report.target_type,
      targetLabel,
      reason: report.reason,
      createdAt: report.created_at,
      reporterName: name(reporterById.get(report.reporter_id)),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="eyebrow">Moderasyon</p>
        <h1 className="flex items-center gap-2 font-heading text-[26px] leading-tight font-bold tracking-tight text-plum">
          <ShieldIcon className="h-6 w-6 text-rose-deep" />
          Yönetim Paneli
        </h1>
        <p className="text-sm text-plum-soft">
          Raporlar, kullanıcılar ve içerik moderasyonu.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-plum-soft">
            <FlagIcon className="h-3.5 w-3.5 text-rose-deep" />
            Açık rapor
          </p>
          <p className="mt-1 font-heading text-2xl font-bold text-plum">
            {openCount}
          </p>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-plum-soft">
            <MessageIcon className="h-3.5 w-3.5 text-rose-deep" />
            Toplam rapor
          </p>
          <p className="mt-1 font-heading text-2xl font-bold text-plum">
            {totalCount}
          </p>
        </div>
      </div>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="flex items-center gap-1.5 font-heading text-base font-bold text-plum">
          <MegaphoneIcon className="h-4.5 w-4.5 text-rose-deep" />
          Raporlar
        </h2>
        {reportViews.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {reportViews.map((report) => (
              <li
                key={report.id}
                className="flex flex-col gap-2 rounded-2xl bg-cream p-3 dark:bg-[#241b22]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-terracotta/15 px-2.5 py-0.5 text-[11px] font-bold text-terracotta">
                    {report.targetType}
                  </span>
                  <span className="text-[11px] text-plum-faint">
                    {timeAgo(report.createdAt)}
                  </span>
                </div>
                <p className="text-sm font-semibold break-words text-plum">
                  {report.targetLabel}
                </p>
                <p className="text-xs text-plum-soft">
                  “{report.reason}”
                </p>
                <p className="text-[11px] text-plum-faint">
                  Bildiren: {report.reporterName}
                </p>
                <AdminReportActions reportId={report.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-plum-soft">
            Açık rapor yok. Her şey yolunda! ✨
          </p>
        )}
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="flex items-center gap-1.5 font-heading text-base font-bold text-plum">
          <BanIcon className="h-4.5 w-4.5 text-rose-deep" />
          Kullanıcı Yönetimi
        </h2>
        <AdminUserSearch />
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="flex items-center gap-1.5 font-heading text-base font-bold text-plum">
          <ChefHatIcon className="h-4.5 w-4.5 text-rose-deep" />
          Tarif Yönetimi
        </h2>
        <AdminRecipeSearch />
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="flex items-center gap-1.5 font-heading text-base font-bold text-plum">
          <MessageIcon className="h-4.5 w-4.5 text-rose-deep" />
          Son Yorumlar
        </h2>
        <AdminCommentsList initialComments={comments} />
      </section>
    </div>
  );
}
