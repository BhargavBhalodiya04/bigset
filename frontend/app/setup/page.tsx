"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  X,
} from "lucide-react";
import {
  getLocalSetupStatus,
  saveOpenRouterApiKey,
  saveOpenAIApiKey,
  saveTinyFishApiKey,
  type LocalSetupStatus,
  type ServiceSetupStatus,
} from "@/lib/backend";
import { isLocalMode } from "@/lib/app-mode";

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<LocalSetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"tinyfish" | "openrouter" | "openai" | null>(null);

  useEffect(() => {
    if (!isLocalMode) {
      router.replace("/dashboard");
      return;
    }

    getLocalSetupStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, [router]);

  const complete = status?.complete ?? false;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface px-6 py-3">
        <img src="/BigSetLogo.png" alt="BigSet" className="h-[30px] dark:hidden" />
        <img src="/BigSetLogoDarkBG.png" alt="BigSet" className="h-[30px] hidden dark:block" />
      </header>

      <main className="flex-1 px-5 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-8 max-w-2xl">
            <h1 className="text-[32px] font-bold leading-none tracking-tight sm:text-[38px]">
              Connect your services
            </h1>
            <p className="mt-3 text-base leading-7 text-muted">
              Add TinyFish and at least one AI provider (OpenRouter or OpenAI) to start building live datasets.
            </p>
          </div>

          <div className="grid gap-4">
            <ServiceCard
              brand={
                <>
                  <img
                    src="https://www.tinyfish.ai/TF-Logos/Horizontal%20Logo/SVG/TF_Horizontal.svg"
                    alt="TinyFish"
                    className="h-8 w-auto dark:hidden"
                  />
                  <img
                    src="/logos/engines/tinyfish-wordmark-dark.svg"
                    alt="TinyFish"
                    className="hidden h-8 w-auto dark:block"
                  />
                </>
              }
              description="BigSet uses TinyFish's best-in-class search API to unlock real-time information."
              status={status?.services.tinyfish}
              primaryLabel={
                status?.services.tinyfish.configured ? "Update key" : "Add API key"
              }
              onPrimary={() => setModal("tinyfish")}
              helperHref="https://agent.tinyfish.ai/api-keys?utm_source=github&utm_medium=organic&utm_campaign=bigset-developer-2026q2"
              helperLabel="Need a TinyFish key?"
              helperDescription="Open the TinyFish API keys page"
            />

            <ServiceCard
              brand={<OpenRouterBrand />}
              description="BigSet uses OpenRouter's API to power BigSet with AI model access."
              status={status?.services.openrouter}
              primaryLabel={
                status?.services.openrouter.configured
                  ? "Update key"
                  : "Add API key"
              }
              onPrimary={() => setModal("openrouter")}
              helperHref="https://openrouter.ai/settings/keys"
              helperLabel="Need an OpenRouter key?"
              helperDescription="Open the OpenRouter keys page"
            />

            <ServiceCard
              brand={<OpenAIBrand />}
              description="Use OpenAI models (GPT-4o, o1, o3 and more) as an alternative AI provider."
              status={status?.services.openai}
              primaryLabel={
                status?.services.openai?.configured ? "Update key" : "Add API key"
              }
              onPrimary={() => setModal("openai")}
              helperHref="https://platform.openai.com/api-keys"
              helperLabel="Need an OpenAI key?"
              helperDescription="Open the OpenAI API keys page"
            />
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted sm:text-base">
              {complete
                ? "Everything is connected. You can start building datasets."
                : "Connect TinyFish and at least one AI provider to continue."}
            </p>
            <button
              type="button"
              disabled={!complete}
              onClick={() => router.replace("/dashboard")}
              className="inline-flex items-center gap-2 rounded-lg border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-accent-text transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Complete setup
              <CheckCircle2 className="size-4" />
            </button>
          </div>
        </div>
      </main>

      {modal && (
        <ApiKeyModal
          service={modal}
          onClose={() => setModal(null)}
          onSaved={(next) => {
            setStatus(next);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function ServiceCard({
  brand,
  description,
  status,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  helperHref,
  helperLabel,
  helperDescription,
}: {
  brand: ReactNode;
  description: string;
  status?: ServiceSetupStatus;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  helperHref: string;
  helperLabel: string;
  helperDescription: string;
}) {
  const connected = status?.configured ?? false;
  const detail = useMemo(() => {
    if (!connected) return "Not connected";
    if (status?.connectionMethod === "oauth") return "Connected through OAuth";
    if (status?.source === "env") return "Connected through .env";
    return "Connected through API key";
  }, [connected, status?.connectionMethod, status?.source]);

  return (
    <section className="border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex h-9 items-center">{brand}</div>
          <p className="mt-2 text-sm text-muted">{detail}</p>
        </div>
        {connected && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="size-4" />
            Connected
          </span>
        )}
      </div>

      <p className="mt-6 max-w-2xl text-base leading-7 text-foreground/80">
        {description}
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrimary}
            className="inline-flex items-center gap-2 rounded-lg border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-accent-text transition-opacity hover:opacity-90"
          >
            <KeyRound className="size-4" />
            {primaryLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-foreground/[0.04]"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
        <a
          href={helperHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
        >
          {helperLabel} {helperDescription}
          <ExternalLink className="size-4 shrink-0" />
        </a>
      </div>
    </section>
  );
}

function OpenRouterBrand() {
  return (
    <div className="flex items-center gap-2 text-black dark:invert">
      <svg
        width="24"
        height="24"
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          d="M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945"
          strokeWidth="90"
        />
        <path d="M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z" />
        <path
          d="M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377"
          strokeWidth="90"
        />
        <path d="M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z" />
      </svg>
      <span className="text-xl font-semibold tracking-tight">OpenRouter</span>
    </div>
  );
}

function OpenAIBrand() {
  return (
    <div className="flex items-center gap-2 text-black dark:invert">
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.843-3.369 2.02-1.168a.076.076 0 0 1 .071 0l4.83 2.786a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.402-.676zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
      </svg>
      <span className="text-xl font-semibold tracking-tight">OpenAI</span>
    </div>
  );
}

function ApiKeyModal({
  service,
  onClose,
  onSaved,
}: {
  service: "tinyfish" | "openrouter" | "openai";
  onClose: () => void;
  onSaved: (status: LocalSetupStatus) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalTitle =
    service === "tinyfish" ? "TinyFish API key"
    : service === "openai" ? "OpenAI API key"
    : "OpenRouter API key";
  const placeholder =
    service === "tinyfish" ? "tf_..."
    : service === "openai" ? "your-api-key"
    : "sk-or-...";
  const keyHref =
    service === "tinyfish"
      ? "https://agent.tinyfish.ai/api-keys?utm_source=github&utm_medium=organic&utm_campaign=bigset-developer-2026q2"
      : service === "openai"
      ? "https://platform.openai.com/api-keys"
      : "https://openrouter.ai/settings/keys";

  async function handleSubmit() {
    if (!apiKey.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      let next: LocalSetupStatus;
      if (service === "tinyfish") next = await saveTinyFishApiKey(apiKey.trim());
      else if (service === "openai") next = await saveOpenAIApiKey(apiKey.trim(), baseUrl.trim() || undefined);
      else next = await saveOpenRouterApiKey(apiKey.trim());
      onSaved(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">{modalTitle}</h2>
            <p className="mt-1 text-xs text-muted">
              BigSet verifies the key and stores it in your OS keychain.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-foreground/[0.05] hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {service === "openai" && (
            <label className="block text-xs font-medium text-muted">
              Base URL
              <span className="ml-1 font-normal text-muted/70">(optional — leave blank for standard OpenAI)</span>
              <input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                type="url"
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground/30"
                placeholder="https://your-compatible-api.com/v1"
              />
            </label>
          )}
          <label className="block text-xs font-medium text-muted">
            API key
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              type="password"
              autoFocus
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground/30"
              placeholder={placeholder}
            />
          </label>

          {error && (
            <div className="border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <a
              href={keyHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
            >
              Get a key
              <ExternalLink className="size-3" />
            </a>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!apiKey.trim() || saving}
              className="inline-flex items-center gap-2 rounded-lg border border-accent bg-accent px-4 py-2 text-xs font-semibold text-accent-text transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Verify and save to keychain
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
