"use client";

import { useState, useTransition } from "react";
import { Check, Copy, LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { rotateInviteCodeAction } from "@/app/actions/groups";
import { useLanguage } from "@/components/language-provider";

type InviteCodeProps = {
  code: string;
  groupId: string;
  canRotate: boolean;
};

export function InviteCode({ code, groupId, canRotate }: InviteCodeProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <aside className="invite-card">
      <div>
        <span className="eyebrow">{t("Comparte el acceso", "Share access")}</span>
        <h2>{t("Código del grupo", "Group code")}</h2>
        <p>{t("Cualquiera que tenga este código puede entrar.", "Anyone with this code can join.")}</p>
      </div>
      <div className="invite-code-row">
        <code>{code}</code>
        <button
          type="button"
          className="copy-code-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setMessage(undefined);
              window.setTimeout(() => setCopied(false), 1800);
            } catch {
              setMessage(t("No se pudo copiar. Mantén pulsado el código para seleccionarlo.", "Could not copy it. Press and hold the code to select it."));
            }
          }}
        >
          {copied ? <Check size={17} /> : <Copy size={17} />}
          {copied ? t("Copiado", "Copied") : t("Copiar", "Copy")}
        </button>
      </div>
      {canRotate ? (
        <button
          type="button"
          className="rotate-code-button"
          disabled={pending}
          onClick={() => {
            const formData = new FormData();
            formData.set("group_id", groupId);
            startTransition(async () => {
              const result = await rotateInviteCodeAction(formData);
              setMessage(result.message);
              if (result.ok) router.refresh();
            });
          }}
        >
          {pending ? <LoaderCircle className="spin" size={14} /> : <RefreshCw size={14} />}
          {t("Renovar código", "Rotate code")}
        </button>
      ) : null}
      {message ? <small className="invite-feedback">{message}</small> : null}
    </aside>
  );
}
