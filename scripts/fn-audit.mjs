// Audit statis fungsi SQL: menelusuri migrasi berurutan, menghitung tanda tangan (overload) yang masih hidup,
// dan menunjuk migrasi yang memegang definisi efektif. Dipakai tes agar fungsi inti tidak punya duplikat/overload basi.
//   node scripts/fn-audit.mjs [nama ...]   (tanpa argumen: fungsi inti)
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "supabase/migrations");
export const CORE = ["pay_order", "decide_approval", "dashboard_daily"];

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
const norm = (t) => t.toLowerCase().replace(/\bpublic\./g, "").replace(/\s+/g, " ").trim();

function splitTop(s) {
  const out = []; let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function paramTypes(list, isDrop) {
  return splitTop(list).map((p) => {
    let x = p.replace(/\s+(default|=)\s[\s\S]*$/i, "").replace(/^\s*(in|inout|out|variadic)\s+/i, "").trim();
    if (!isDrop) x = x.replace(/^\w+\s+/, ""); // buang nama parameter
    return norm(x);
  }).join(",");
}
/** Ambil isi kurung seimbang mulai dari indeks '(' */
function balanced(s, i) {
  let d = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "(") d++;
    if (s[j] === ")" && --d === 0) return [s.slice(i + 1, j), j];
  }
  return [null, i];
}

export function audit(names = CORE) {
  const alive = Object.fromEntries(names.map((n) => [n, new Map()])); // nama -> Map(signature -> {file, count})
  const history = Object.fromEntries(names.map((n) => [n, []]));
  const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const s = stripComments(readFileSync(path.join(DIR, f), "utf8"));
    const events = [];
    for (const n of names) {
      for (const m of s.matchAll(new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\.)?${n}\\s*\\(`, "gi"))) {
        const [args] = balanced(s, m.index + m[0].length - 1);
        events.push({ at: m.index, n, kind: "def", sig: paramTypes(args, false) });
      }
      for (const m of s.matchAll(new RegExp(`drop\\s+function\\s+(?:if\\s+exists\\s+)?(?:public\\.)?${n}\\s*\\(`, "gi"))) {
        const [args] = balanced(s, m.index + m[0].length - 1);
        events.push({ at: m.index, n, kind: "drop", sig: paramTypes(args, true) });
      }
    }
    events.sort((a, b) => a.at - b.at);
    for (const e of events) {
      if (e.kind === "def") {
        const prev = alive[e.n].get(e.sig);
        alive[e.n].set(e.sig, { file: f, count: (prev?.count ?? 0) + 1 });
        history[e.n].push(`${f}`);
      } else alive[e.n].delete(e.sig);
    }
  }
  return Object.fromEntries(names.map((n) => [n, {
    signatures: [...alive[n]].map(([sig, v]) => ({ sig, effectiveIn: v.file, definitions: v.count })),
    definedIn: history[n],
  }]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = audit(process.argv.slice(2).length ? process.argv.slice(2) : CORE);
  for (const [n, v] of Object.entries(r)) {
    console.log(`${n}: ${v.signatures.length} tanda tangan hidup; ditulis ulang di ${v.definedIn.length} migrasi`);
    for (const s of v.signatures) console.log(`   (${s.sig})  efektif di ${s.effectiveIn}`);
  }
}
