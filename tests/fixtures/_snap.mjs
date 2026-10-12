import { PAGES } from "../../src/app/pages.js";
import { ROLES } from "../../src/lib/rbac-matrix.js";
const out = {};
for (const r of ROLES) out[r] = PAGES.filter((p) => p.gate(r)).map((p) => p.path);
console.log(JSON.stringify(out, null, 2));
