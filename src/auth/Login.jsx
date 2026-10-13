import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider.jsx";
import { Link, useRouter } from "../lib/router.jsx";
import { ROLE_LABEL, ROLE_LEVEL } from "../lib/rbac-matrix.js";
import "../styles/dashboard.css";

// Hanya tampil saat `npm run dev` dengan Supabase asli (dibuang dari build produksi). Email tetap; kata sandi = DEMO_PASSWORD di .env.local.
const DEV_ACCOUNTS = [
  ["superadmin@demo.harum.in", "superadmin"], ["owner@demo.harum.in", "owner"], ["gm@demo.harum.in", "gm"], ["staff@demo.harum.in", "staff"],
  ["dokter@demo.harum.in", "dokter"], ["kasir.klinik@demo.harum.in", "staff", "Kasir klinik"], ["owner.klinik@demo.harum.in", "owner", "Owner klinik"],
  ["member@demo.harum.in", "member"],
];

export default function Login() {
  const { api, profile, signIn, blocked, problem } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) navigate(profile.role === "member" ? "/m" : "/app", { replace: true });
  }, [profile, navigate]);

  const submit = async (e, creds) => {
    e?.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await signIn(creds?.email ?? email, creds?.password ?? password);
    } catch (e2) {
      setErr(e2.message === "Invalid login credentials" ? "Email atau kata sandi salah." : e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="d-login">
      <main className="d-login__card" aria-labelledby="login-title">
        <Link to="/" className="d-brand">
          <span className="d-brand__mark" aria-hidden="true">H</span>Harum.in
        </Link>
        <h1 id="login-title">Masuk ke dashboard</h1>
        <p className="d-head__desc">Satu akun, satu peran. Menu yang muncul mengikuti hak akses peran Anda.</p>

        <form className="d-form" onSubmit={submit} noValidate>
          <div className="d-field">
            <label htmlFor="l-email">Email</label>
            <input id="l-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="d-field">
            <label htmlFor="l-pass">Kata sandi</label>
            <input id="l-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required={api?.mode !== "demo"} />
          </div>
          {err && <p className="d-field__error" role="alert">{err}</p>}
          {!err && problem && <p className="d-field__error" role="alert"><strong>Pengaturan database.</strong> {problem}</p>}
          {!err && !problem && blocked && <p className="d-field__error" role="alert"><strong>Akses ditolak.</strong> {blocked} Hubungi pemilik bisnis Anda atau dukungan Harum.in.</p>}
          <button type="submit" className="d-btn d-btn--primary d-btn--block" disabled={busy || !api}>{busy ? "Memeriksa…" : "Masuk"}</button>
        </form>

        {import.meta.env.DEV && api?.mode === "supabase" && (
          <section className="d-demo" aria-labelledby="dev-title">
            <p id="dev-title" className="d-eyebrow">Dev · Supabase asli</p>
            <ul>
              {DEV_ACCOUNTS.map(([em, role, label]) => (
                <li key={em}>
                  <button type="button" className="d-demo__btn" onClick={() => { setEmail(em); document.getElementById("l-pass")?.focus(); }}>
                    <span className="d-mono">{ROLE_LEVEL[role]}</span>
                    <span>{label ?? ROLE_LABEL[role]}</span>
                    <span className="d-muted d-mono">{em.split("@")[0]}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="d-text d-muted">Kata sandi = <code>DEMO_PASSWORD</code> di <code>.env.local</code> (sama untuk semua akun). Ditolak terus? Jalankan <code>npm run db:doctor</code> di terminal, lalu <code>npm run setup:demo</code>.</p>
          </section>
        )}

        {api?.mode === "demo" && (
          <section className="d-demo" aria-labelledby="demo-title">
            <p id="demo-title" className="d-eyebrow">Mode demo · data contoh di browser</p>
            <ul>
              {api.demoUsers.map((u) => (
                <li key={u.id}>
                  <button type="button" className="d-demo__btn" onClick={() => submit(null, { email: u.email, password: "" })}>
                    <span className="d-mono">{ROLE_LEVEL[u.role]}</span>
                    <span>{u.label ?? ROLE_LABEL[u.role]}</span>
                    {u.pin && <span className="d-muted d-mono">PIN {u.pin}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
