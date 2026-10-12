import { MATRIX, ROLES, parseLabel } from "./rbac-matrix.js";

// Indeks: PERMS[role][feature] = { c, r, u, d, a, q, scope, pin, label }
export const PERMS = Object.fromEntries(
  ROLES.map((role, ri) => [
    role,
    Object.fromEntries(MATRIX.map((row) => [row[0], { ...parseLabel(row[2 + ri]), label: row[2 + ri] }])),
  ])
);

export const FEATURE_NAME = Object.fromEntries(MATRIX.map((r) => [r[0], r[1]]));

/** can("owner", 2, "r") → boolean. action ∈ c r u d a q */
export function can(role, feature, action = "r") {
  const p = PERMS[role]?.[feature];
  return Boolean(p && p[action]);
}

export function permOf(role, feature) {
  return PERMS[role]?.[feature] ?? null;
}

/** Fitur yang bisa dibaca role — untuk beranda & daftar akses. */
export function readableFeatures(role) {
  return MATRIX.filter((r) => can(role, r[0], "r") || can(role, r[0], "c")).map((r) => ({
    no: r[0],
    name: r[1],
    label: PERMS[role][r[0]].label,
  }));
}
