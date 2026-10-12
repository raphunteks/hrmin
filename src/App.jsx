import { lazy, Suspense, useEffect } from "react";
import { useAuth } from "./auth/AuthProvider.jsx";
import { useRouter } from "./lib/router.jsx";

const Landing = lazy(() => import("./landing/Landing.jsx"));
const Login = lazy(() => import("./auth/Login.jsx"));
const AppShell = lazy(() => import("./app/AppShell.jsx"));

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

  useEffect(() => {
    if (ready && inApp && !profile) navigate("/masuk", { replace: true });
  }, [ready, inApp, profile, navigate]);

  if (path === "/" || (!inApp && path !== "/masuk")) {
    return <Suspense fallback={<Splash />}><Landing /></Suspense>;
  }
  if (!ready) return <Splash />;
  if (api === null) return <Setup />;
  if (path === "/masuk") return <Suspense fallback={<Splash />}><Login /></Suspense>;
  if (!profile) return <Splash />;
  return <Suspense fallback={<Splash />}><AppShell /></Suspense>;
}
