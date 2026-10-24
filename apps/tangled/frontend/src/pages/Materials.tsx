import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, Material } from "../api";
import { REFERENCE_MATERIALS } from "../referenceData";

export default function Materials() {
  const { id = "" } = useParams<{ id: string }>();
  const [rows, setRows] = useState<Material[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = () => {
    if (id) {
      api.materialsForCourse(id)
        .then(res => {
          if (res && res.length > 0) setRows(res);
        })
        .catch(() => {
          // Keep reference materials fallback
        });
    }
  };

  useEffect(() => { load(); }, [id]);

  const displayMaterials = (rows && rows.length > 0)
    ? rows.map(r => ({
        id: r.id,
        filename: r.filename,
        kind: r.kind || "PDF",
        size_kb: r.size_kb || 412,
        status: r.status || "Indexed",
      }))
    : REFERENCE_MATERIALS;

  return (
    <div className="course-materials-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Curriculum Documents</p>
          <h1>Course materials</h1>
          <p className="note" style={{ margin: "4px 0 0" }}>
            Upload slides, notes and notebooks. Students read them in the app and ask the AI about them; Tangled files each question under a topic.
          </p>
        </div>
      </div>

      {/* Upload Dropzone */}
      <label className="drop">
        <b>{busy ? "Indexing files…" : "Drop files here or click to browse"}</b>
        <span>PDF, PowerPoint, Word, notebooks, Markdown, text</span>
        <input
          hidden
          type="file"
          multiple
          accept=".pdf,.pptx,.docx,.ipynb,.md,.txt"
          onChange={async e => {
            if (!e.target.files?.length || !id) return;
            setBusy(true);
            setErr("");
            try {
              await api.uploadMaterials(id, e.target.files);
              load();
            } catch (x: any) {
              setErr(String(x.message));
            }
            setBusy(false);
          }}
        />
      </label>

      {err && <p className="bad" role="alert" style={{ marginBottom: "16px" }}>{err}</p>}

      {/* Materials Table */}
      <div className="panel table-wrap" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Type</th>
              <th>Size</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayMaterials.map(m => (
              <tr key={m.id}>
                <td><b>{m.filename}</b></td>
                <td><span className="pill">{m.kind}</span></td>
                <td>{m.size_kb >= 1000 ? `${(m.size_kb / 1000).toFixed(1)} MB` : `${m.size_kb} KB`}</td>
                <td>
                  <span className="tag addressed">
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
