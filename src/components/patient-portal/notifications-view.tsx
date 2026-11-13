"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPortalDateTime } from "./portal-format";

type PatientNotification = {
  id: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  isRead: boolean;
};

export function NotificationsView() {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    const response = await fetch("/api/patient/portal/notifications", { cache: "no-store" });
    const payload = await response.json() as { notifications?: PatientNotification[]; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || "Notifications could not be loaded.");
    setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/patient/portal/notifications", { cache: "no-store" });
        const payload = await response.json() as { notifications?: PatientNotification[]; error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message || "Notifications could not be loaded.");
        if (active) setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Notifications could not be loaded.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function markAsRead(notificationId: string) {
    setPendingId(notificationId);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/patient/portal/notifications/${encodeURIComponent(notificationId)}/read`, { method: "POST" });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "The notification could not be updated.");
      await loadNotifications();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The notification could not be updated.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Patient updates</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">Notifications</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#74857F]">In-app messages delivered to your patient account. Medical information remains available only inside the secure portal.</p></header>
      {errorMessage ? <p role="alert" className="rounded-xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}
      <section className="rounded-2xl border border-[#E3ECE8] bg-white p-5 sm:p-6">
        {isLoading ? <div className="h-28 animate-pulse rounded-xl bg-[#F5F8F7]" /> : null}
        {!isLoading && notifications.length === 0 ? <p className="rounded-xl bg-[#F5F8F7] p-4 text-sm text-[#788982]">You do not have any in-app notifications yet.</p> : null}
        <div className="divide-y divide-[#EEF2F0]">{notifications.map((notification) => <article key={notification.id} className={`flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0 ${notification.isRead ? "" : "bg-[#FBFDFC]"}`}><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-[#334D47]">{notification.title}</h2>{!notification.isRead ? <span className="rounded-full bg-[#EAF4F1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#176B67]">New</span> : null}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#647A72]">{notification.message}</p><p className="mt-2 text-xs text-[#82938C]">{formatPortalDateTime(notification.createdAt)}</p></div>{!notification.isRead ? <button type="button" onClick={() => void markAsRead(notification.id)} disabled={pendingId === notification.id} className="min-h-9 rounded-lg border border-[#C9DDD6] px-3 text-xs font-semibold text-[#176B67] hover:bg-[#F0F7F4] disabled:opacity-60">{pendingId === notification.id ? "Updating…" : "Mark as read"}</button> : <span className="text-xs font-medium text-[#82938C]">Read</span>}</article>)}</div>
      </section>
    </div>
  );
}
