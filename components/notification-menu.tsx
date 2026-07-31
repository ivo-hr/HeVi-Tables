"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Bell, CheckCheck, CircleUserRound, FilePlus2, Flag, ListPlus } from "lucide-react";
import Link from "next/link";

import { markNotificationsReadAction } from "@/app/actions/notifications";
import {
  notificationHref,
  showDeviceNotification
} from "@/lib/device-notifications";
import { createClient } from "@/lib/supabase/client";
import type { Notification, NotificationKind } from "@/lib/types";

const icons: Record<NotificationKind, typeof Bell> = {
  group_member_joined: CircleUserRound,
  table_created: FilePlus2,
  table_row_created: ListPlus,
  table_closed: Flag
};

function notificationDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function NotificationMenu({
  userId,
  initialNotifications
}: {
  userId: string;
  initialNotifications: Notification[];
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [, startTransition] = useTransition();
  const unread = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

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
        aria-label={unread ? `${unread} notificaciones sin leer` : "Notificaciones"}
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
              <span className="eyebrow">Actividad</span>
              <h2>Notificaciones</h2>
            </div>
            <CheckCheck size={18} aria-label="Todo leído" />
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
                      <small>{notificationDate(notification.created_at)}</small>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="notification-empty">
              <Bell size={25} />
              <strong>Nada nuevo</strong>
              <p>Por una vez, nadie ha tocado nada.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
