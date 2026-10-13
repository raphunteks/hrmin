import test from "node:test";
import assert from "node:assert/strict";
import { qrMatrix, qrSvg } from "../src/lib/qr.js";
import { isHex, contrast, inkOn, brandVars } from "../src/member/brand.js";

test("QR: ukuran sesuai versi dan pola pencari ada di tiga sudut", () => {
  const m = qrMatrix("HIN1");
  assert.equal(m.length, 21); // versi 1
  for (const [r, c] of [[0, 0], [0, 14], [14, 0]]) {
    assert.equal(m[r][c], true);
    assert.equal(m[r + 3][c + 3], true); // inti 3x3
    assert.equal(m[r + 1][c + 1], false); // cincin putih
  }
});
test("QR: deterministik, berbeda untuk teks berbeda, dan versi naik untuk teks panjang", () => {
  assert.deepEqual(qrMatrix("abc"), qrMatrix("abc"));
  assert.notDeepEqual(qrMatrix("abc"), qrMatrix("abd"));
  assert.ok(qrMatrix("x".repeat(120)).length > 21);
  assert.equal(qrMatrix("x".repeat(213)).length, 57); // versi 10
});
test("QR: menolak lebih dari 213 byte dan SVG berisi path", () => {
  assert.throws(() => qrMatrix("x".repeat(214)), /terlalu panjang/);
  const s = qrSvg("HIN1.cu1.123.abc");
  assert.ok(s.d.startsWith("M") && s.size > 21);
});
test("Merek: hanya hex 6 digit; warna tak sah diabaikan", () => {
  assert.equal(isHex("#a1B2c3"), true);
  for (const v of ["red", "#fff", "#12345g", "url(x)", null, "#1234567"]) assert.equal(isHex(v), false);
  assert.deepEqual(brandVars("javascript:alert(1)"), {});
});
test("Merek: teks tombol selalu punya kontras ≥ 4.5 pada warna aksen", () => {
  for (const hex of ["#000000", "#ffffff", "#c8a165", "#1d4ed8", "#facc15", "#16a34a", "#ef4444", "#7c3aed"]) {
    const ink = inkOn(hex);
    assert.ok(contrast(hex, ink) >= 4.5, `${hex} → ${ink} kontras ${contrast(hex, ink).toFixed(2)}`);
  }
});
