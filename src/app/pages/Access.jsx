import { useAuth } from "../../auth/AuthProvider.jsx";
import { MATRIX, ROLE_LABEL } from "../../lib/rbac-matrix.js";
import { permOf } from "../../lib/rbac.js";
import { PageHead, Panel, Badge } from "../ui/index.jsx";

const ACTIONS = [["c", "Buat"], ["r", "Baca"], ["u", "Ubah"], ["d", "Hapus"], ["a", "Setujui"], ["q", "Ajukan"]];

export default function Access() {
  const { role } = useAuth();
  return (
    <>
      <PageHead
        eyebrow="Matriks RBAC · versi asli dokumen"
        title="Hak akses saya"
        desc={`Daftar 20 fitur untuk peran ${ROLE_LABEL[role]}. Aturan yang sama ditegakkan oleh Row-Level Security di database.`}
      />
      <Panel>
        <div className="d-table-wrap">
          <table className="d-table">
            <thead>
              <tr>
                <th scope="col">No</th>
                <th scope="col">Fitur</th>
                <th scope="col">Label dokumen</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map(([no, name]) => {
                const p = permOf(role, no);
                const acts = ACTIONS.filter(([k]) => p[k]);
                return (
                  <tr key={no} className={acts.length ? undefined : "is-off"}>
                    <td className="d-mono">{String(no).padStart(2, "0")}</td>
                    <td>{name}</td>
                    <td className="d-mono">{p.label}</td>
                    <td>
                      {acts.length ? (
                        <span className="d-chips">
                          {acts.map(([k, l]) => <Badge key={k} tone={k === "a" ? "accent" : "neutral"}>{l}</Badge>)}
                          {p.scope && <Badge tone="warn">terbatas: {p.scope.replace("_", " ")}</Badge>}
                        </span>
                      ) : (
                        <span className="d-muted">Tidak ada akses</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
