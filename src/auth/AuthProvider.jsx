import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loadApi } from "../api/index.js";

const Ctx = createContext(null);
const VIEW_KEY = "harumin-view-tenant";
const remember = (t) => {
  try { t ? sessionStorage.setItem(VIEW_KEY, t) : sessionStorage.removeItem(VIEW_KEY); } catch { /* penyimpanan tidak tersedia */ }
};

export function AuthProvider({ children }) {
  const [api, setApi] = useState(undefined); // undefined = memuat, null = belum dikonfigurasi
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  // Alasan akun ditolak (nonaktif / tenant ditangguhkan) — ditampilkan di halaman masuk.
  const [blocked, setBlocked] = useState(null);
  // Kegagalan memuat profil setelah login berhasil (skema salah / profil belum dibuat) — ditampilkan, bukan ditelan diam-diam.
  const [problem, setProblem] = useState(null);
  const apiRef = useRef(null);
  // Superadmin memilih tenant yang sedang dilihat (konteks lintas tenant).
  // Disimpan per tab (sessionStorage) agar tidak hilang saat halaman dimuat ulang.
  const [viewTenant, setViewTenant] = useState(() => {
    try { return sessionStorage.getItem(VIEW_KEY); } catch { return null; }
  });
  // Jenis usaha tenant aktif (fnb, health, …) menentukan ruang kerja yang relevan.
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    let off = () => {};
    loadApi().then(async (a) => {
      setApi(a);
      if (!a) return setReady(true);
      apiRef.current = a;
      const sync = async (uid) => {
        try {
          const p = uid ? await a.getProfile(uid) : null;
          const st = p && a.accessState ? await a.accessState().catch(() => ({ ok: true })) : { ok: true };
          if (st?.ok === false) {
            setBlocked(st.reason);
            setProfile(null);
            await a.signOut();
          } else {
            if (p) {
              setBlocked(null);
              setProblem(null);
              const key = `harumin-login-${uid}`;
              let first = true;
              try { first = !sessionStorage.getItem(key); sessionStorage.setItem(key, "1"); } catch { /* abaikan */ }
              a.touchPresence?.(first).catch(() => {});
            }
            setProfile(p);
          }
        } catch (e) {
          setProfile(null);
          if (uid) {
            const m = String(e?.message ?? e);
            setProblem(
              /schema cache|column|does not exist|relation|PGRST20[45]/i.test(m)
                ? `Login berhasil, tetapi database proyek Supabase ini bukan skema Harum.in (${m}). Jalankan \`npm run db:doctor\` di terminal, lalu ikuti langkahnya.`
                : /multiple \(or no\) rows|no rows|PGRST116/i.test(m)
                  ? "Login berhasil, tetapi profil akun ini belum ada di tabel profiles. Jalankan `npm run demo:users` (atau bootstrap.sql)."
                  : `Login berhasil, tetapi profil gagal dimuat: ${m}`,
            );
            try { await a.signOut(); } catch { /* abaikan */ }
          }
        }
        setReady(true);
      };
      off = a.onAuthChange(sync);
      await sync(await a.getSessionUserId());
    });
    return () => off();
  }, []);

  // Denyut: presence tiap 5 menit; status akses dicek tiap menit agar penonaktifan/penangguhan berlaku tanpa menunggu login ulang.
  useEffect(() => {
    if (!profile || !apiRef.current?.accessState) return undefined;
    let n = 0;
    const id = setInterval(async () => {
      const a = apiRef.current;
      try {
        const st = await a.accessState();
        if (st?.ok === false) { setBlocked(st.reason); setProfile(null); await a.signOut(); return; }
        if (++n % 5 === 0) a.touchPresence(false).catch(() => {});
      } catch { /* jaringan: coba lagi pada denyut berikutnya */ }
    }, 60000);
    return () => clearInterval(id);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseTenant = useCallback(
    (t) => {
      setViewTenant(t);
      remember(t);
      if (t && profile?.role === "superadmin") api.logAccess(t, "dashboard").catch(() => {});
    },
    [api, profile]
  );

  const tenantId = profile?.role === "superadmin" ? viewTenant : profile?.tenant_id ?? null;
  useEffect(() => {
    let live = true;
    if (!api || !tenantId) { setTenant(null); return; }
    api.listTenants().then((ts) => live && setTenant(ts.find((t) => t.id === tenantId) ?? null)).catch(() => live && setTenant(null));
    return () => { live = false; };
  }, [api, tenantId]);

  const value = useMemo(
    () => ({
      api,
      ready,
      profile,
      blocked,
      problem,
      role: profile?.role ?? null,
      // Tenant efektif untuk halaman bisnis.
      tenantId,
      tenant,
      pillar: tenant?.pillar ?? null,
      viewTenant,
      chooseTenant,
      signIn: (e, p) => api.signIn(e, p),
      signOut: async () => {
        setViewTenant(null);
        remember(null);
        setProfile(null);
        setTenant(null);
        setBlocked(null);
        setProblem(null);
        try {
          if (apiRef.current?.signOut) {
            await apiRef.current.signOut();
          }
        } catch (e) {
          console.warn("Sign out error:", e);
        }
      },
    }),
    [api, ready, profile, blocked, problem, viewTenant, chooseTenant, tenantId, tenant]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
