"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Bell, CheckCheck, CircleUserRound, FilePlus2, Flag, ListPlus } from "lucide-react";
import Link from "next/link";

import { markNotificationsReadAction } from "@/app/actions/notifications";
import { useLanguage } from "@/components/language-provider";
import {
  notificationHref,
  showDeviceNotification
} from "@/lib/device-notifications";
import {
  EMPTY_NOTIFICATION_COPY,
  EMPTY_NOTIFICATION_COPY_EN,
  stableVariant
} from "@/lib/presentation";
import { createClient } from "@/lib/supabase/client";
import type { Notification, NotificationKind } from "@/lib/types";

const icons: Record<NotificationKind, typeof Bell> = {
  group_member_joined: CircleUserRound,
  table_created: FilePlus2,
  table_row_created: ListPlus,
  table_closed: Flag
};

export function NotificationMenu({
  userId,
  initialNotifications
}: {
  userId: string;
  initialNotifications: Notification[];
}) {
  const { locale, t, date } = useLanguage();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [, startTransition] = useTransition();
  const unread = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );
  const emptyCopies: readonly { title: string; body: string }[] =
    locale === "en" ? EMPTY_NOTIFICATION_COPY_EN : EMPTY_NOTIFICATION_COPY;
  const emptyCopy = stableVariant(`empty-notifications:${userId}`, emptyCopies);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificaciones",
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as Notification;
          void showDeviceNotification(notification);
          setNotifications((current) => [
            notification,
            ...current.filter((item) => item.id !== notification.id)
          ].slice(0, 30));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const markRead = () => {
    if (unread === 0) return;
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) =>
        notification.read_at ? notification : { ...notification, read_at: readAt }
      )
    );
    startTransition(async () => {
      await markNotificationsReadAction();
    });
  };

  return (
    <div className="notification-menu">
      <button
        type="button"
        className="notification-trigger"
        aria-label={unread ? `${unread} ${t("notificaciones sin leer", "unread notifications")}` : t("Notificaciones", "Notifications")}
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) markRead();
        }}
      >
        <Bell size={19} />
        {unread ? <span>{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="notification-panel">
          <header>
            <div>
              <span className="eyebrow">{t("Actividad", "Activity")}</span>
              <h2>{t("Notificaciones", "Notifications")}</h2>
            </div>
            <CheckCheck size={18} aria-label={t("Todo leído", "All read")} />
          </header>
          {notifications.length ? (
            <div className="notification-list">
              {notifications.map((notification) => {
                const Icon = icons[notification.kind];
                return (
                  <Link
                    href={notificationHref(notification)}
                    className={notification.read_at ? "notification-item" : "notification-item unread"}
                    key={notification.id}
                    onClick={() => setOpen(false)}
                  >
                    <span className="notification-icon">
                      <Icon size={17} />
                    </span>
                    <span>
                      <strong>{notification.title}</strong>
                      <p>{notification.body}</p>
                      <small>{date(notification.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="notification-empty">
              <Bell size={25} />
              <strong>{emptyCopy.title}</strong>
              <p>{emptyCopy.body}</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
