// Penjaga drift: fungsi inti Pesanan harus punya tepat satu tanda tangan hidup (tanpa overload basi),
// definisi efektifnya tercatat di bawah, dan salinan terbaca di supabase/canonical/ sama dengan migrasi.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { audit, CORE } from "../scripts/fn-audit.mjs";
import { build } from "../scripts/gen-canonical.mjs";

// Memperbarui fungsi lewat migrasi baru? Ubah angka di sini dengan sengaja, lalu `npm run gen:canonical`.
const EFEKTIF = {
  pay_order: { sig: "uuid,jsonb,text,numeric,text", file: "20261011000016_fase3_value_add.sql" },
  decide_approval: { sig: "uuid,approval_status,text,text,text", file: "20261011000015_fase2_hardening.sql" },
  dashboard_daily: { sig: "date,date,uuid,uuid", file: "20261011000010_foundation.sql" },
};

test("fungsi inti: satu tanda tangan hidup dan definisi efektif sesuai catatan", () => {
  const r = audit(CORE);
  for (const n of CORE) {
    assert.equal(r[n].signatures.length, 1, `${n}: overload basi → ${r[n].signatures.map((s) => s.sig).join(" | ")}`);
    assert.equal(r[n].signatures[0].sig, EFEKTIF[n].sig, `${n}: tanda tangan berubah`);
    assert.equal(r[n].signatures[0].effectiveIn, EFEKTIF[n].file, `${n}: definisi efektif pindah migrasi`);
  }
});

test("salinan supabase/canonical/ sama dengan definisi efektif di migrasi", () => {
  for (const [n, sql] of Object.entries(build())) {
    assert.equal(readFileSync(new URL(`../supabase/canonical/${n}.sql`, import.meta.url), "utf8"), sql, `${n}: jalankan npm run gen:canonical`);
  }
});
