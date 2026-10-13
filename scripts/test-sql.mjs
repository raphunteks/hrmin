// Uji SQL pada Postgres SEMENTARA (bukan database Supabase kamu): memasang tiruan Supabase, semua migrasi, data demo,
// lalu menjalankan supabase/tests/*.sql yang terdaftar. Butuh klien `psql` dan server Postgres 15+ yang boleh membuat database.
//   PG_TEST_URL=postgres://postgres@localhost:5432/postgres npm run test:sql
// Database `harumin_test` dibuat ulang setiap kali. JANGAN arahkan ke proyek Supabase produksi.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.PG_TEST_URL;
if (!url) { console.log("PG_TEST_URL belum diset — uji SQL dilewati."); process.exit(0); }
if (/supabase\.(co|com)/i.test(url)) { console.error("Menolak: PG_TEST_URL menunjuk Supabase. Pakai Postgres lokal/sementara."); process.exit(1); }

const DB = "harumin_test";
const withDb = (u, db) => { const x = new URL(u); x.pathname = "/" + db; return x.toString(); };
const psql = (u, args, label) => {
  const r = spawnSync("psql", [u, "-v", "ON_ERROR_STOP=1", "-q", "-At", ...args], { encoding: "utf8" });
  if (r.status !== 0) { console.error(`✖ ${label}\n${(r.stderr || r.stdout).split("\n").filter((l) => !/NOTICE/.test(l)).slice(0, 8).join("\n")}`); process.exit(1); }
  return r.stdout;
};

psql(url, ["-c", `drop database if exists ${DB} with (force)`, "-c", `create database ${DB}`], "membuat database uji");
const u = withDb(url, DB);
const f = (p) => ["-f", path.join(ROOT, p)];
psql(u, f("supabase/tests/stub_supabase.sql"), "tiruan Supabase");
for (const m of readdirSync(path.join(ROOT, "supabase/migrations")).filter((x) => x.endsWith(".sql")).sort()) psql(u, f(`supabase/migrations/${m}`), `migrasi ${m}`);
psql(u, f("supabase/seed.sql"), "data demo supabase/seed.sql");
console.log("✔ skema + migrasi + data demo terpasang");

const TESTS = ["member_isolation.sql", "member_login.sql", "member_dashboard.sql"];
for (const t of TESTS) {
  const out = psql(u, f(`supabase/tests/${t}`), t);
  const last = out.trim().split("\n").filter(Boolean).pop();
  if (!/^LULUS /.test(last ?? "")) { console.error(`✖ ${t}: tidak ada penanda LULUS`); process.exit(1); }
  console.log(`✔ ${last}`);
}
