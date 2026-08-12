"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, LoaderCircle, Send, Smartphone, Unplug } from "lucide-react";

import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction
} from "@/app/actions/push";
import { useLanguage } from "@/components/language-provider";
import {
  DEVICE_NOTIFICATIONS_KEY,
  getServiceWorkerRegistration,
  supportsBackgroundPush,
  supportsDeviceNotifications,
  urlBase64ToUint8Array
} from "@/lib/device-notifications";
import {
  stableVariant,
  SUCCESS_COPY,
  TEST_NOTIFICATION_COPY,
  TEST_NOTIFICATION_COPY_EN
} from "@/lib/presentation";
import type { ActionResult } from "@/lib/types";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function DeviceNotificationSettings() {
  const { locale, t } = useLanguage();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [state, setState] = useState<ActionResult>({ ok: false });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const available = supportsDeviceNotifications();
    setSupported(available);
    if (!available) return;
    setPermission(Notification.permission);
    setEnabled(
      Notification.permission === "granted" &&
        localStorage.getItem(DEVICE_NOTIFICATIONS_KEY) === "enabled"
    );
    if (supportsBackgroundPush()) {
      void getServiceWorkerRegistration()
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => setBackgroundReady(Boolean(subscription)))
        .catch(() => setBackgroundReady(false));
    }
  }, []);

  const enable = () => {
    startTransition(async () => {
      try {
        const nextPermission = await Notification.requestPermission();
        setPermission(nextPermission);
        if (nextPermission !== "granted") {
          setState({
            ok: false,
            message:
              nextPermission === "denied"
                ? t("El navegador las ha bloqueado. Tendrás que habilitarlas desde sus ajustes.", "The browser has blocked notifications. Enable them in its settings.")
                : t("No se concedió el permiso de notificaciones.", "Notification permission was not granted.")
          });
          return;
        }

        const registration = await getServiceWorkerRegistration();
        localStorage.setItem(DEVICE_NOTIFICATIONS_KEY, "enabled");
        setEnabled(true);

        if (supportsBackgroundPush() && vapidPublicKey) {
          const subscription =
            (await registration.pushManager.getSubscription()) ??
            (await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            }));
          const serialized = subscription.toJSON();
          if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
            throw new Error(t("Suscripción incompleta.", "Incomplete subscription."));
          }
          const formData = new FormData();
          formData.set("endpoint", serialized.endpoint);
          formData.set("p256dh", serialized.keys.p256dh);
          formData.set("auth", serialized.keys.auth);
          formData.set("userAgent", navigator.userAgent);
          const result = await savePushSubscriptionAction(formData);
          if (!result.ok) throw new Error(result.message);
          setBackgroundReady(true);
          setState(result);
        } else {
          setState({
            ok: true,
            message: locale === "en"
              ? "Notifications enabled. Peace is no longer guaranteed."
              : stableVariant(crypto.randomUUID(), SUCCESS_COPY.pushEnabled)
          });
        }
      } catch (error) {
        setState({
          ok: false,
          message: error instanceof Error ? error.message : t("No se pudieron activar.", "Notifications could not be enabled.")
        });
      }
    });
  };

  const disable = () => {
    startTransition(async () => {
      try {
        const registration = await getServiceWorkerRegistration();
        const subscription = await registration.pushManager?.getSubscription();
        let result: ActionResult | null = null;
        if (subscription) {
          const formData = new FormData();
          formData.set("endpoint", subscription.endpoint);
          result = await deletePushSubscriptionAction(formData);
          if (!result.ok) throw new Error(result.message);
          await subscription.unsubscribe();
        }
        localStorage.removeItem(DEVICE_NOTIFICATIONS_KEY);
        setEnabled(false);
        setBackgroundReady(false);
        setState(
          result ?? {
            ok: true,
            message: locale === "en"
              ? "Notifications disabled. A little peace has been restored."
              : stableVariant(crypto.randomUUID(), SUCCESS_COPY.pushDisabled)
          }
        );
      } catch {
        setState({ ok: false, message: t("No se pudieron desactivar del todo.", "Notifications could not be fully disabled.") });
      }
    });
  };

  return (
    <section className="appearance-card device-notification-card">
      <div className="appearance-heading">
        <span className="settings-block-icon">
          <BellRing size={19} />
        </span>
        <div>
          <span className="eyebrow">{t("Este dispositivo", "This device")}</span>
          <h2>{t("Avisos donde estés mirando", "Notifications where you are looking")}</h2>
          <p>{t("Usa las notificaciones del sistema en este navegador o webapp.", "Use system notifications in this browser or installed web app.")}</p>
        </div>
      </div>

      {supported === false ? (
        <p className="form-message error">{t("Este navegador no admite notificaciones web.", "This browser does not support web notifications.")}</p>
      ) : (
        <div className="device-notification-body">
          <div className="device-status">
            <Smartphone size={20} />
            <span>
              <strong>
                {enabled
                  ? backgroundReady
                    ? t("Activadas, incluso con la app cerrada", "Enabled, even when the app is closed")
                    : t("Activadas mientras la app está conectada", "Enabled while the app is connected")
                  : permission === "denied"
                    ? t("Bloqueadas por el navegador", "Blocked by the browser")
                    : t("Desactivadas", "Disabled")}
              </strong>
              <small>
                {t("En iPhone o iPad, instala primero la webapp en la pantalla de inicio.", "On iPhone or iPad, first install the web app on your Home Screen.")}
              </small>
            </span>
          </div>
          {state.message ? (
            <p className={state.ok ? "form-message success" : "form-message error"}>
              {state.message}
            </p>
          ) : null}
          <div className="device-notification-actions">
            {enabled ? (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={pending}
                  onClick={async () => {
                    const registration = await getServiceWorkerRegistration();
                    const copies: readonly { title: string; body: string }[] =
                      locale === "en" ? TEST_NOTIFICATION_COPY_EN : TEST_NOTIFICATION_COPY;
                    const copy = stableVariant(crypto.randomUUID(), copies);
                    await registration.showNotification(copy.title, {
                      body: copy.body,
                      icon: "/icons/icon-192.png",
                      badge: "/icons/icon-192.png",
                      tag: "hevi-test",
                      data: { url: "/perfil" }
                    });
                  }}
                >
                  <Send size={17} />
                  {t("Enviar prueba", "Send test")}
                </button>
                <button type="button" className="danger-button" disabled={pending} onClick={disable}>
                  {pending ? <LoaderCircle className="spin" size={17} /> : <Unplug size={17} />}
                  {t("Desactivar aquí", "Disable here")}
                </button>
              </>
            ) : (
              <button type="button" className="primary-button" disabled={pending || !supported} onClick={enable}>
                {pending ? <LoaderCircle className="spin" size={17} /> : <BellRing size={17} />}
                {pending ? t("Activando…", "Enabling…") : t("Activar en este dispositivo", "Enable on this device")}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
