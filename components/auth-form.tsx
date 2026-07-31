"use client";

import { useState, useTransition } from "react";
import {
  ArrowRight,
  AtSign,
  GitFork,
  LoaderCircle,
  LockKeyhole,
  UserRound
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [message, setMessage] = useState<string>();
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="auth-panel">
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "active" : undefined}
          onClick={() => {
            setMode("login");
            setMessage(undefined);
          }}
        >
          Entrar
        </button>
        <button
          type="button"
          className={mode === "signup" ? "active" : undefined}
          onClick={() => {
            setMode("signup");
            setMessage(undefined);
          }}
        >
          Crear cuenta
        </button>
      </div>

      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const email = String(formData.get("email") ?? "");
          const password = String(formData.get("password") ?? "");
          const username = String(formData.get("username") ?? "");
          setMessage(undefined);

          startTransition(async () => {
            try {
              const supabase = createClient();
              if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password
                });
                if (error) throw error;
                router.replace(safeNextPath(searchParams.get("next")));
                router.refresh();
                return;
              }

              const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                  data: { username },
                  emailRedirectTo: `${window.location.origin}/auth/callback`
                }
              });
              if (error) throw error;

              setIsError(false);
              if (data.session) {
                router.replace("/");
                router.refresh();
              } else {
                setMessage(
                  "Cuenta creada. Revisa tu email para confirmar el acceso."
                );
              }
            } catch (error) {
              setIsError(true);
              setMessage(
                error instanceof Error
                  ? error.message
                  : "No se pudo completar el acceso."
              );
            }
          });
        }}
      >
        {mode === "signup" ? (
          <label className="field icon-field">
            <span>Nombre visible</span>
            <div>
              <UserRound size={18} />
              <input
                name="username"
                minLength={1}
                maxLength={30}
                placeholder="Cómo te llamamos"
                autoComplete="nickname"
                required
              />
            </div>
          </label>
        ) : null}
        <label className="field icon-field">
          <span>Email</span>
          <div>
            <AtSign size={18} />
            <input
              name="email"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </div>
        </label>
        <label className="field icon-field">
          <span>Contraseña</span>
          <div>
            <LockKeyhole size={18} />
            <input
              name="password"
              type="password"
              minLength={8}
              maxLength={128}
              placeholder="Mínimo 8 caracteres"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </div>
        </label>
        {message ? (
          <p className={isError ? "form-message error" : "form-message success"}>
            {message}
          </p>
        ) : null}
        <button className="primary-button auth-submit" disabled={pending}>
          {pending ? <LoaderCircle className="spin" size={18} /> : null}
          {pending ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          {!pending ? <ArrowRight size={18} /> : null}
        </button>
      </form>

      <div className="auth-divider">
        <span>o continúa con</span>
      </div>
      <button
        type="button"
        className="oauth-button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "github",
              options: {
                redirectTo: `${window.location.origin}/auth/callback`
              }
            });
            if (error) {
              setIsError(true);
              setMessage(error.message);
            }
          });
        }}
      >
        <GitFork size={19} />
        GitHub
      </button>
    </div>
  );
}
