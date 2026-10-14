import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { Link, useRouter } from "../lib/router.jsx";
import { ROLE_LABEL, ROLE_LEVEL } from "../lib/rbac-matrix.js";
import { pagesFor, findPage, pillarOk } from "./pages.js";
import { Loading, useAsync } from "./ui/index.jsx";
import { gsap, useGSAP, prefersReducedMotion } from "../lib/gsap.js";
import "../styles/dashboard.css";
import "../styles/clinic.css";
import "../styles/service.css";

function TenantSwitcher() {
  const { api, viewTenant, chooseTenant } = useAuth();
  const { data } = useAsync(() => api.listTenants(), [api]);
  return (
    <label className="d-switch">
      <span className="d-switch__label">Tenant</span>
      <select value={viewTenant ?? ""} onChange={(e) => chooseTenant(e.target.value || null)}>
        <option value="">Pilih tenant…</option>
        {(data ?? []).map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </label>
  );
}

function TenantName() {
  const { tenant } = useAuth();
  return <p className="d-top__tenant">{tenant?.name ?? "…"}</p>;
}

function NeedTenant() {
  return (
    <div className="d-empty d-empty--page">
      <h1 className="d-empty__title">Pilih tenant terlebih dahulu</h1>
      <p>Halaman ini menampilkan data bisnis satu merchant. Pilih tenant di bilah atas; aksesnya dicatat di audit log.</p>
    </div>
  );
}

function Denied() {
  return (
    <div className="d-empty d-empty--page">
      <h1 className="d-empty__title">Halaman ini di luar hak akses peran Anda</h1>
      <p>Lihat <Link to="/app/akses">Hak akses saya</Link> untuk daftar fitur yang tersedia.</p>
    </div>
  );
}

function SidebarToggleIcon({ collapsed = false, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="d-side-toggle-svg"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="4" />
      <path d="M9 3v18" />
      {collapsed ? (
        <path d="m12 9 3 3-3 3" />
      ) : (
        <path d="m15 9-3 3 3 3" />
      )}
    </svg>
  );
}

export default function AppShell() {
  const { profile, role, tenantId, signOut, api, pillar } = useAuth();
  const { path, navigate } = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem("harumin:sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 960) {
      setNavOpen(false);
      return;
    }
    setCollapsed((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem("harumin:sidebar_collapsed", next ? "1" : "0");
      } catch {
        /* abaikan */
      }
      return next;
    });
  };

  const main = useRef(null);
  const pages = pagesFor(role, pillar);
  const page = findPage(path);
  const allowed = page && page.gate(role) && pillarOk(page, pillar);

  useEffect(() => setNavOpen(false), [path]);

  // Transisi halaman: fade + naik 8px, hanya transform/opacity.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(main.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", clearProps: "transform" });
    },
    { dependencies: [path], scope: main }
  );

  const groups = [...new Set(pages.map((p) => p.group))];
  const Comp = page?.Comp;

  return (
    <div className={`d-app${navOpen ? " nav-open" : ""}${collapsed ? " d-app--collapsed" : ""}`}>
      <a className="skip-link" href="#d-main">Lompat ke konten</a>
      <aside className="d-side" aria-label="Navigasi aplikasi">
        <div className="d-side__head">
          <Link to="/app" className="d-brand" title={collapsed ? "Harum.in Dash" : undefined}>
            <span className="d-brand__mark" aria-hidden="true">H</span>
            <span className="d-brand__text">
              Harum.in
              <span className="d-brand__sub">{api?.mode === "demo" ? "Demo" : "Dash"}</span>
            </span>
          </Link>
          <button
            type="button"
            className="d-side__toggle"
            onClick={toggleSidebar}
            title={collapsed ? "Buka sidebar ( > )" : "Tutup sidebar ( < )"}
            aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          >
            <SidebarToggleIcon collapsed={collapsed} size={18} />
          </button>
        </div>
        <nav className="d-nav">
          {groups.map((g) => (
            <div key={g} className="d-nav__group">
              <p className="d-nav__label">{g}</p>
              <ul>
                {pages.filter((p) => p.group === g).map((p) => (
                  <li key={p.path}>
                    <Link
                      to={p.path}
                      className={p.path === path ? "is-active" : undefined}
                      aria-current={p.path === path ? "page" : undefined}
                      title={collapsed ? `${p.label} (${p.code})` : undefined}
                    >
                      <span className="d-nav__text">{p.label}</span>
                      <span className="d-nav__code">{p.code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="d-side__foot">
          <div className="d-who-wrap">
            <div className="d-who-avatar" title={`${profile.full_name} (${ROLE_LEVEL[role]} · ${ROLE_LABEL[role]})`}>
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="d-who-info">
              <p className="d-who">{profile.full_name}</p>
              <p className="d-who__role">{ROLE_LEVEL[role]} · {ROLE_LABEL[role]}</p>
            </div>
          </div>
          <button
            type="button"
            className="d-btn d-btn--ghost d-btn--block d-side__logout"
            title={collapsed ? "Keluar" : undefined}
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              try {
                await signOut();
              } finally {
                navigate("/masuk", { replace: true });
              }
            }}
          >
            <svg className="d-logout-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="d-logout-text">{loggingOut ? "Keluar…" : "Keluar"}</span>
          </button>
        </div>
      </aside>
      <button type="button" className="d-scrim" aria-label="Tutup menu" onClick={() => setNavOpen(false)} tabIndex={navOpen ? 0 : -1} />

      <div className="d-body">
        <header className="d-top">
          <button
            type="button"
            className="d-icon-btn d-top__menu"
            aria-label="Buka menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          >
            <SidebarToggleIcon collapsed={!navOpen} size={18} />
          </button>
          {role === "superadmin" ? <TenantSwitcher /> : <TenantName />}
          <span className="d-role-chip">{ROLE_LEVEL[role]} {ROLE_LABEL[role]}</span>
        </header>
        <main id="d-main" className="d-main" ref={main} tabIndex={-1}>
          {!page || !allowed ? (
            <Denied />
          ) : page.tenant && !tenantId ? (
            <NeedTenant />
          ) : (
            <Suspense fallback={<Loading />}>
              <Comp key={`${path}-${tenantId ?? "platform"}`} />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}
