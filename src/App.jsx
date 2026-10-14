import { lazy, Suspense, useEffect } from "react";
import { useAuth } from "./auth/AuthProvider.jsx";
import { useRouter } from "./lib/router.jsx";

const Landing = lazy(() => import("./landing/Landing.jsx"));
const Login = lazy(() => import("./auth/Login.jsx"));
const AppShell = lazy(() => import("./app/AppShell.jsx"));
const MemberShell = lazy(() => import("./member/MemberShell.jsx"));
const MemberAuth = lazy(() => import("./member/MemberAuth.jsx"));

// Bagian dalam /m yang bukan slug Tenant (Member sudah masuk).
const MEMBER_SECTIONS = new Set(["kartu", "riwayat", "profil", "privasi", "pesan", "reservasi"]);

function Splash() {
  return <div className="splash" role="status" aria-label="Memuat" />;
}

function Setup() {
  return (
    <main className="setup">
      <h1>Konfigurasi Supabase belum diisi</h1>
      <p>Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di file <code>.env</code>, lalu build ulang.</p>
    </main>
  );
}

export default function App() {
  const { path, navigate } = useRouter();
  const { ready, api, profile } = useAuth();
  const inApp = path.startsWith("/app");
  const inMember = path === "/m" || path.startsWith("/m/");
  const isMember = profile?.role === "member";

  useEffect(() => {
    if (ready && inApp && !profile) navigate("/masuk", { replace: true });
    if (ready && inApp && isMember) navigate("/m", { replace: true });       // Member tidak memakai dashboard operasional
    if (ready && inMember && profile && !isMember) navigate("/app", { replace: true });
  }, [ready, inApp, inMember, profile, isMember, navigate]);

  if (inMember) {
    if (!ready) return <Splash />;
    if (api === null) return <Setup />;
    if (isMember) return <Suspense fallback={<Splash />}><MemberShell /></Suspense>;
    if (profile) return <Splash />;
    const seg = path.split("/")[2] ?? "";
    if (!seg || MEMBER_SECTIONS.has(seg)) return <main className="setup"><h1>Buka tautan Member dari tempat usaha Anda</h1><p>Tautan Member berbentuk <code>/m/nama-usaha</code>. Karyawan masuk lewat <a href="/masuk">halaman masuk</a>.</p></main>;
    return <Suspense fallback={<Splash />}><MemberAuth slug={seg} /></Suspense>;
  }
  if (path === "/" || (!inApp && path !== "/masuk")) {
    return <Suspense fallback={<Splash />}><Landing /></Suspense>;
  }
  if (!ready) return <Splash />;
  if (api === null) return <Setup />;
  if (path === "/masuk") return <Suspense fallback={<Splash />}><Login /></Suspense>;
  if (!profile) return <Splash />;
  return <Suspense fallback={<Splash />}><AppShell /></Suspense>;
}
