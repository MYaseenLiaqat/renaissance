import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, StudentMaterial } from "../../api";

export default function StudentMaterials() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [materials, setMaterials] = useState<StudentMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.studentMaterials(courseId)
      .then(res => {
        setMaterials(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [courseId]);

  return (
    <div>
      <nav aria-label="Breadcrumb" style={{ marginBottom: "16px", fontSize: "13px", color: "var(--muted)" }}>
        <Link to="/student/courses" style={{ color: "var(--primary)", textDecoration: "none" }}>Courses</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <Link to={`/student/courses/${courseId}`} style={{ color: "var(--primary)", textDecoration: "none" }}>Course</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span style={{ color: "var(--text)", fontWeight: 500 }}>Course Content</span>
      </nav>

      <div className="page-heading" style={{ marginBottom: "24px" }}>
        <div>
          <p className="eyebrow">Verified Course Content & Syllabi</p>
          <h1>Course Content</h1>
          <p className="lead">Read study guides and lecture documents inline, or engage with the contextual AI tutor grounded in these materials.</p>
        </div>
        <Link to={`/student/courses/${courseId}/tutor`} className="btn primary">
          Open AI Tutor Workspace
        </Link>
      </div>

      {loading ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <p className="lead">Loading course content…</p>
        </div>
      ) : materials.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <h2>No Course Content Uploaded Yet</h2>
          <p className="lead">Your instructor has not uploaded any study documents for this course yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {materials.map(m => (
            <article key={m.id} className="panel" style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <span className="pill" style={{ fontSize: "11px", fontWeight: 600 }}>
                    {m.kind || "PDF Guide"}
                  </span>
                  <span className="tag addressed" style={{ fontSize: "11px" }}>
                    {m.status}
                  </span>
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: "17px" }}>{m.filename}</h3>
                <p className="note" style={{ margin: "0 0 16px" }}>
                  {m.size_kb ? `${m.size_kb} KB` : "Document"} · Verified & indexed for grounded tutor Q&A
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--line)", paddingTop: "14px", flexWrap: "wrap" }}>
                <button
                  className="btn primary"
                  style={{ flex: 1 }}
                  onClick={() => navigate(`/student/courses/${courseId}/tutor/${m.id}`)}
                >
                  Read & Ask AI Tutor
                </button>
                {m.file_url && (
                  <a
                    href={m.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{ textDecoration: "none", fontSize: "12px" }}
                  >
                    Open PDF ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
