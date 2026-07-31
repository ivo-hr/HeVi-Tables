"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, LoaderCircle, Send, Smartphone, Unplug } from "lucide-react";

import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction
} from "@/app/actions/push";
import {
  DEVICE_NOTIFICATIONS_KEY,
  getServiceWorkerRegistration,
  supportsBackgroundPush,
  supportsDeviceNotifications,
  urlBase64ToUint8Array
} from "@/lib/device-notifications";
import type { ActionResult } from "@/lib/types";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function DeviceNotificationSettings() {
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
                ? "El navegador las ha bloqueado. Tendrás que habilitarlas desde sus ajustes."
                : "No se concedió el permiso de notificaciones."
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
            throw new Error("Suscripción incompleta.");
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
            message: vapidPublicKey
              ? "Avisos activados mientras la app esté abierta o en segundo plano."
              : "Avisos del dispositivo activados. Falta configurar Web Push para recibirlos con la app cerrada."
          });
        }
      } catch (error) {
        setState({
          ok: false,
          message: error instanceof Error ? error.message : "No se pudieron activar."
        });
      }
    });
  };

  const disable = () => {
    startTransition(async () => {
      try {
        const registration = await getServiceWorkerRegistration();
        const subscription = await registration.pushManager?.getSubscription();
        if (subscription) {
          const formData = new FormData();
          formData.set("endpoint", subscription.endpoint);
          await deletePushSubscriptionAction(formData);
          await subscription.unsubscribe();
        }
        localStorage.removeItem(DEVICE_NOTIFICATIONS_KEY);
        setEnabled(false);
        setBackgroundReady(false);
        setState({ ok: true, message: "Notificaciones desactivadas en este dispositivo." });
      } catch {
        setState({ ok: false, message: "No se pudieron desactivar del todo." });
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
          <span className="eyebrow">Este dispositivo</span>
          <h2>Avisos donde estés mirando</h2>
          <p>Usa las notificaciones del sistema en este navegador o webapp.</p>
        </div>
      </div>

      {supported === false ? (
        <p className="form-message error">Este navegador no admite notificaciones web.</p>
      ) : (
        <div className="device-notification-body">
          <div className="device-status">
            <Smartphone size={20} />
            <span>
              <strong>
                {enabled
                  ? backgroundReady
                    ? "Activadas, incluso con la app cerrada"
                    : "Activadas mientras la app está conectada"
                  : permission === "denied"
                    ? "Bloqueadas por el navegador"
                    : "Desactivadas"}
              </strong>
              <small>
                En iPhone o iPad, instala primero la webapp en la pantalla de inicio.
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
                    await registration.showNotification("HeVi funciona", {
                      body: "Este es el aviso de prueba. El siguiente ya puede ser una desgracia real.",
                      icon: "/icons/192",
                      badge: "/icons/192",
                      tag: "hevi-test",
                      data: { url: "/perfil" }
                    });
                  }}
                >
                  <Send size={17} />
                  Enviar prueba
                </button>
                <button type="button" className="danger-button" disabled={pending} onClick={disable}>
                  {pending ? <LoaderCircle className="spin" size={17} /> : <Unplug size={17} />}
                  Desactivar aquí
                </button>
              </>
            ) : (
              <button type="button" className="primary-button" disabled={pending || !supported} onClick={enable}>
                {pending ? <LoaderCircle className="spin" size={17} /> : <BellRing size={17} />}
                {pending ? "Activando…" : "Activar en este dispositivo"}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
