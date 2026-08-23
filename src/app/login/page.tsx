"use client";

import { useActionState } from "react";
import Image from "next/image";
import { login, type LoginState } from "./actions";
import { useLocale } from "@/components/i18n/LocaleProvider";

const initialState: LoginState = null;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(120%_90%_at_82%_-10%,#2A2F3A_0%,#14161B_55%)] p-6">
      <div className="grid w-full max-w-[940px] overflow-hidden rounded-[20px] bg-card shadow-2xl md:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(165deg,#191C23_0%,#0E1014_100%)] p-11 text-white md:flex">
          <div>
            <div className="mb-8 flex items-center gap-2.5">
              <Image
                src="/qonvra-mark-white.png"
                alt="Qonvra"
                width={36}
                height={36}
                className="h-9 w-auto"
                priority
              />
              <span className="font-display text-[17px] font-semibold uppercase tracking-[0.2em]">
                Qonvra
              </span>
            </div>
            <h1 className="mb-3 font-display text-[31px] font-semibold leading-[1.15] tracking-[-0.5px]">
              {t("login.brandTitle")
                .split("\n")
                .map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
            </h1>
          </div>
        </div>

        <div className="flex flex-col justify-center p-8 md:p-11">
          <div className="font-mono text-[11.5px] uppercase tracking-[1.5px] text-[#9AA1AC]">
            {t("login.signIn")}
          </div>
          <h2 className="mb-1 mt-1.5 font-display text-[22px] font-semibold">{t("login.welcomeBack")}</h2>
          <p className="mb-6 text-[13.5px] text-muted">{t("login.intro")}</p>

          <form action={formAction}>
            <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="username">
              {t("login.username")}
            </label>
            <input
              id="username"
              name="username"
              className="w-full rounded-[9px] border border-line px-[15px] py-[13px] text-[15px] text-text transition-colors focus:border-accent focus:shadow-[0_0_0_3px_rgba(11,209,160,0.16)] focus:outline-none"
              placeholder={t("login.usernamePlaceholder")}
              autoComplete="username"
            />

            <div className="h-3.5" />

            <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="password">
              {t("login.password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full rounded-[9px] border border-line px-[15px] py-[13px] text-[15px] text-text transition-colors focus:border-accent focus:shadow-[0_0_0_3px_rgba(11,209,160,0.16)] focus:outline-none"
              placeholder={t("login.passwordPlaceholder")}
              autoComplete="current-password"
            />

            <div className="mb-1 mt-2.5 min-h-[18px] text-[12.5px] font-medium text-[#F0524B]">
              {state?.error}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-[9px] bg-ink py-3.5 font-display text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-black hover:shadow-md active:translate-y-0 active:shadow-none disabled:opacity-60"
            >
              {pending ? t("login.signingIn") : t("login.enterWorkspace")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
