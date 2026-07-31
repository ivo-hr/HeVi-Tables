"use client";

import { useActionState } from "react";
import { Camera, Save } from "lucide-react";

import { updateProfileAction } from "@/app/actions/profile";
import { Avatar } from "@/components/avatar";
import { INITIAL_ACTION_RESULT, type Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    INITIAL_ACTION_RESULT
  );

  return (
    <form action={action} className="profile-form">
      <div className="profile-avatar-block">
        <Avatar name={profile.username} src={profile.avatar_url} size="lg" />
        <label className="avatar-upload">
          <Camera size={17} />
          Cambiar foto
          <input
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp"
          />
        </label>
        <small>PNG, JPG o WebP. Máximo 2 MB.</small>
      </div>
      <div className="profile-fields">
        <label className="field">
          <span>Nombre visible</span>
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
          <Save size={18} />
          {pending ? "Guardando…" : "Guardar perfil"}
        </button>
      </div>
    </form>
  );
}
