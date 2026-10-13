import { lazy, Suspense, useEffect, useMemo } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { Link, useRouter } from "../lib/router.jsx";
import { useAsync, Loading, ErrorNote } from "../app/ui/index.jsx";
import { brandVars, isHex } from "./brand.js";
import "../styles/dashboard.css";
import "../styles/member.css";

const Home = lazy(() => import("./pages/Home.jsx"));
const Card = lazy(() => import("./pages/Card.jsx"));
const History = lazy(() => import("./pages/History.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Privacy = lazy(() => import("./pages/Privacy.jsx"));

const TABS = [
  ["/m", "Beranda", Home], ["/m/kartu", "Kartu", Card], ["/m/riwayat", "Riwayat", History],
  ["/m/profil", "Profil", Profile], ["/m/privasi", "Privasi", Privacy],
];

/** Cangkang Member: ringan, mobile-first, bermerek Tenant. Tidak berbagi menu dengan dashboard operasional. */
export default function MemberShell() {
  const { api, signOut } = useAuth();
  const { path, navigate } = useRouter();
  const brand = useAsync(() => api.rpc("member_brand"), [api]);
  const tab = TABS.find(([p]) => p === path) ?? TABS[0];
  const Page = tab[2];

  useEffect(() => { if (!TABS.some(([p]) => p === path)) navigate("/m", { replace: true }); }, [path, navigate]);
  const style = useMemo(() => brandVars(brand.data?.accent_color), [brand.data?.accent_color]);
  useEffect(() => { document.title = `${brand.data?.display_name ?? "Member"} · Member`; }, [brand.data?.display_name]);

  if (brand.loading) return <div className="m-shell" role="status"><Loading label="Memuat akun Member…" /></div>;
  if (brand.error) {
    return (
      <div className="m-shell">
        <main className="m-main"><ErrorNote error={brand.error} onRetry={brand.reload} />
          <button type="button" className="d-btn d-btn--ghost" onClick={() => signOut()}>Keluar</button></main>
      </div>
    );
  }
  const b = brand.data;
  return (
    <div className="m-shell" style={style}>
      <a href="#m-main" className="skip-link">Lewati ke konten</a>
      <header className="m-top">
        <div className="m-brand">
          {b.logo_url ? <img className="m-brand__logo" src={b.logo_url} alt="" width="32" height="32" referrerPolicy="no-referrer" /> : <span className="m-brand__mark" aria-hidden="true">{b.display_name?.[0] ?? "H"}</span>}
          <span className="m-brand__name">{b.display_name}</span>
        </div>
        <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={() => signOut()}>Keluar</button>
      </header>
      <main id="m-main" className="m-main" tabIndex={-1}>
        <Suspense fallback={<Loading />}>
          <Page brand={b} />
        </Suspense>
      </main>
      <nav className="m-tabs" aria-label="Menu Member">
        {TABS.map(([p, label]) => (
          <Link key={p} to={p} className="m-tab" aria-current={p === tab[0] ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
    </div>
  );
}
export { isHex };
