"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";

type Service = {
  slug: string;
  category: string;
  reason: string;
  pricing: string;
};

type Plan = {
  app_name: string;
  summary: string;
  services: Service[];
  setup_commands: string[];
  env_map: Record<string, string>;
  notes?: string;
};

type HistoryRow = {
  id: string;
  idea: string;
  plan: Plan;
  created_at: string;
};

export default function Stacksmith({
  supabaseUrl,
  supabaseKey,
}: {
  supabaseUrl: string;
  supabaseKey: string;
}) {
  const supabase: SupabaseClient | null = useMemo(
    () =>
      supabaseUrl && supabaseKey
        ? createClient(supabaseUrl, supabaseKey, {
            auth: { detectSessionInUrl: true, persistSession: true },
          })
        : null,
    [supabaseUrl, supabaseKey],
  );

  const [idea, setIdea] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [authStep, setAuthStep] = useState<"idle" | "email" | "sent">("idle");
  const [authMsg, setAuthMsg] = useState("");

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const lastIdea = useRef("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session && window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) {
      setHistory([]);
      return;
    }
    supabase
      .from("stacks")
      .select("id, idea, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setHistory((data as HistoryRow[]) ?? []));
  }, [supabase, user]);

  async function generate() {
    setLoading(true);
    setError("");
    setPlan(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setPlan(data.plan);
      setModel(data.model ?? "");
      lastIdea.current = idea;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveStack() {
    if (!supabase || !user || !plan) return;
    const { data, error: err } = await supabase
      .from("stacks")
      .insert({ user_id: user.id, idea: lastIdea.current, plan })
      .select("id, idea, plan, created_at")
      .single();
    if (err) {
      setError(`Save failed: ${err.message}`);
      return;
    }
    setHistory((h) => [data as HistoryRow, ...h]);
  }

  async function sendMagicLink() {
    if (!supabase) return;
    setAuthMsg("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin,
      },
    });
    if (err) setAuthMsg(err.message);
    else {
      setAuthStep("sent");
      setAuthMsg("Check your email and click the login link.");
    }
  }

  return (
    <main className="wrap">
      <header className="top">
        <h1>
          Stacksmith <span className="hammer">🔨</span>
        </h1>
        <div className="auth">
          {user ? (
            <>
              <span className="who">{user.email}</span>
              <button className="ghost" onClick={() => supabase?.auth.signOut()}>
                Sign out
              </button>
            </>
          ) : authStep === "idle" ? (
            <button className="ghost" onClick={() => setAuthStep("email")}>
              Log in to save history
            </button>
          ) : authStep === "email" ? (
            <span className="authrow">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button onClick={sendMagicLink} disabled={!email.includes("@")}>
                Send login link
              </button>
            </span>
          ) : (
            <button className="ghost" onClick={() => setAuthStep("email")}>
              Resend link
            </button>
          )}
        </div>
      </header>
      {authMsg && <p className="authmsg">{authMsg}</p>}

      <p className="tag">
        Describe your app in one sentence, get a provisioned architecture plan for the{" "}
        <a href="https://projects.dev" target="_blank" rel="noreferrer">
          Stripe Projects CLI
        </a>
        .
      </p>

      <div className="forge">
        <textarea
          rows={3}
          placeholder='e.g. "I need a private feedback app with login, search, and AI summaries"'
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
          }}
        />
        <button className="primary" onClick={generate} disabled={loading || idea.trim().length < 10}>
          {loading ? "Forging…" : "Forge my stack"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {plan && (
        <section className="result">
          <div className="resulthead">
            <h2>{plan.app_name}</h2>
            {user && (
              <button className="ghost" onClick={saveStack}>
                Save to history
              </button>
            )}
          </div>
          <p className="summary">{plan.summary}</p>

          <h3>Recommended services</h3>
          <ul className="services">
            {plan.services.map((s) => (
              <li key={s.slug}>
                <code>{s.slug}</code>
                <span className={`badge ${s.pricing.toLowerCase().includes("free") ? "free" : "paid"}`}>
                  {s.pricing}
                </span>
                <p>{s.reason}</p>
              </li>
            ))}
          </ul>

          <h3>Setup commands</h3>
          <pre className="commands">
            <code>{plan.setup_commands.join("\n")}</code>
          </pre>
          <button
            className="ghost"
            onClick={() => navigator.clipboard.writeText(plan.setup_commands.join("\n"))}
          >
            Copy commands
          </button>

          <h3>Starter .env map</h3>
          <ul className="envmap">
            {Object.entries(plan.env_map).map(([k, v]) => (
              <li key={k}>
                <code>{k}</code>: {v}
              </li>
            ))}
          </ul>

          {plan.notes && <p className="notes">{plan.notes}</p>}
          {model && <p className="model">model: {model}</p>}
        </section>
      )}

      {user && history.length > 0 && (
        <section className="history">
          <h3>Your history</h3>
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                <button
                  className="linklike"
                  onClick={() => {
                    setIdea(h.idea);
                    setPlan(h.plan);
                    lastIdea.current = h.idea;
                  }}
                >
                  {h.idea.length > 80 ? h.idea.slice(0, 80) + "…" : h.idea}
                </button>
                <span className="when">{new Date(h.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer>
        Built with the Stripe Projects CLI · OpenRouter · Supabase · Vercel,{" "}
        <a
          href="https://github.com/sumonmselim/stacksmith"
          target="_blank"
          rel="noreferrer"
        >
          by SumonMSelim
        </a>
      </footer>
    </main>
  );
}
