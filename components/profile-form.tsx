"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";

import { updateProfileAction } from "@/app/actions/profile";
import { ImageUploadField } from "@/components/image-upload-field";
import { useLanguage } from "@/components/language-provider";
import { INITIAL_ACTION_RESULT, type Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [state, setState] = useState(INITIAL_ACTION_RESULT);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="profile-form"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        if (avatar) formData.set("avatar", avatar);
        startTransition(async () => {
          const result = await updateProfileAction(INITIAL_ACTION_RESULT, formData);
          setState(result);
          if (result.ok) router.refresh();
        });
      }}
    >
      <div className="profile-avatar-block">
        <ImageUploadField
          initialUrl={profile.avatar_url}
          placeholder={profile.username.slice(0, 2).toUpperCase()}
          label={t("Elegir foto", "Choose photo")}
          editorEyebrow={t("Foto de perfil", "Profile photo")}
          editorTitle={t("Decide qué entra en tu avatar", "Choose what appears in your avatar")}
          className="profile-image-upload"
          onFileChange={setAvatar}
        />
      </div>
      <div className="profile-fields">
        <label className="field">
          <span>{t("Nombre visible", "Display name")}</span>
          <input
            name="username"
            defaultValue={profile.username}
            maxLength={30}
            required
          />
          {state.fieldErrors?.username ? (
            <small className="field-error">{state.fieldErrors.username[0]}</small>
          ) : null}
        </label>
        {state.message ? (
          <p className={state.ok ? "form-message success" : "form-message error"}>
            {state.message}
          </p>
        ) : null}
        <button className="primary-button" disabled={pending}>
          {pending ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}
          {pending ? t("Guardando…", "Saving…") : t("Guardar perfil", "Save profile")}
        </button>
      </div>
    </form>
  );
}
