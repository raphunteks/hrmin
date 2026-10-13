// Menyalin definisi EFEKTIF fungsi inti dari migrasi ke supabase/canonical/<nama>.sql sebagai acuan baca tunggal.
// Migrasi tetap sumber yang dijalankan; berkas ini hanya salinan terbaca. Ubah fungsi lewat migrasi BARU, lalu jalankan:
//   npm run gen:canonical
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { audit, CORE } from "./fn-audit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Ambil teks definisi terakhir `create or replace function public.<nama>(...) ... $$ ... $$;` dari sebuah migrasi. */
export function extractLast(file, name) {
  const s = readFileSync(path.join(ROOT, "supabase/migrations", file), "utf8");
  const starts = [...s.matchAll(new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\s*\\(`, "gi"))].map((m) => m.index);
  const at = starts.at(-1);
  const open = /\$(\w*)\$/.exec(s.slice(at));
  const tag = open[0];
  const bodyStart = at + open.index + tag.length;
  const end = s.indexOf(tag, bodyStart) + tag.length;
  return s.slice(at, s[end] === ";" ? end + 1 : end).trimEnd() + "\n";
}

export function build() {
  const r = audit(CORE);
  return Object.fromEntries(CORE.map((n) => {
    const { effectiveIn } = r[n].signatures[0];
    const header = `-- SALINAN TERBACA (jangan dijalankan dari sini). Definisi efektif ${n} ada di supabase/migrations/${effectiveIn}.\n-- Ubah lewat migrasi baru, lalu jalankan: npm run gen:canonical\n\n`;
    return [n, header + extractLast(effectiveIn, n)];
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(path.join(ROOT, "supabase/canonical"), { recursive: true });
  for (const [n, sql] of Object.entries(build())) writeFileSync(path.join(ROOT, `supabase/canonical/${n}.sql`), sql);
  console.log("Tersalin:", CORE.join(", "));
}
