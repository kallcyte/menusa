import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Button, Logo } from "../../components";
import { Input } from "../../components/ui/input";
import {
  deleteAccount,
  fetchSession,
  updateAccountEmail,
  updateAccountName,
  signUp,
  updateAccountPassword,
} from "../../api";

type Navigate = (path: string) => void;

export function Login({ navigate }: { navigate: Navigate }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["auth", "session"],
    queryFn: fetchSession,
    staleTime: 30_000,
  });
  useEffect(() => {
    if (sessionQuery.data) navigate("/admin");
  }, [sessionQuery.data, navigate]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === "signup") {
        await signUp(normalizedEmail, password, name);
      }
      const response = mode === "signup" ? null : await fetch("/api/auth/sign-in/email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password, rememberMe: true }),
      });
      if (response && !response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;
        throw new Error(
          body?.message ?? body?.error ?? "Invalid email or password",
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      const session = await queryClient.fetchQuery({
        queryKey: ["auth", "session"],
        queryFn: fetchSession,
        staleTime: 30_000,
      });
      if (!session)
        throw new Error(
          "Signed in, but the session cookie was not available. Try again.",
        );
      queryClient.removeQueries({ queryKey: ["admin"] });
      queryClient.removeQueries({ queryKey: ["superadmin"] });
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="auth-shell">
      <div className="auth-art">
        <Logo />
        <div>
          <p className="eyebrow">A better menu for</p>
          <div className="auth-art-title" aria-hidden="true">
            Good
            <br />
            <em>evenings.</em>
          </div>
        </div>
        <p className="auth-art-foot">
          Beautiful menus for places worth finding.
        </p>
      </div>
      <section className="auth-panel">
        <button className="back-link" onClick={() => navigate("/")}>
          <ArrowLeft size={16} /> Back to menu
        </button>
        <form className="login-card" onSubmit={submit}>
          <p className="section-kicker">Restaurant workspace</p>
          <h1>
            {mode === "signin" ? <>Welcome back<span>.</span></> : <>Create your account<span>.</span></>}
          </h1>
          <p className="auth-copy">{mode === "signin" ? "Sign in to keep your menu fresh." : "Create a workspace for your restaurant."}</p>
          {mode === "signup" && <label>Full name<Input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" /></label>}
          <label>
            Email address
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@restaurant.com"
            />
          </label>
          <label>
            Password
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <Button variant="default" className="login-button" disabled={loading}>
            {loading ? (mode === "signup" ? "Creating..." : "Signing in...") : (mode === "signup" ? "Create account" : "Sign in")} <ArrowUpRight size={16} />
          </Button>
          <p className="auth-help">
            Need an account?{" "}
            <button
              type="button"
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
            >
              {mode === "signin" ? "Create an account" : "Already have an account? Sign in"}
            </button>
          </p>
          <button
            type="button"
            className="demo-link"
            onClick={() => navigate("/admin")}
          >
            Open demo workspace <ArrowUpRight size={14} />
          </button>
        </form>
      </section>
    </main>
  );
}
