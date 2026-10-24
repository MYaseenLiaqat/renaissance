import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, StudentMaterial, StudentMessage, StudentMe } from "../../api";

export default function StudentCourseOverview() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [student, setStudent] = useState<StudentMe | null>(null);
  const [materials, setMaterials] = useState<StudentMaterial[]>([]);
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.studentMe().catch(() => null),
      api.studentMaterials().catch(() => []),
      api.studentMessages().catch(() => []),
    ]).then(([me, mats, msgs]) => {
      setStudent(me);
      setMaterials(mats);
      setMessages(msgs);
      setLoading(false);
    });
  }, [courseId]);

  if (loading) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
        <p className="lead">Loading course overview…</p>
      </div>
    );
  }

  const courseTitle = student?.course_name || "Course Overview";
  const sectionLabel = student?.section_name || "Section A";

  return (
    <div className="student-course-overview" style={{ maxWidth: "1180px", margin: "0 auto" }}>
      {/* Header with Title and Single Primary Next Action */}
      <div className="page-heading" style={{ marginBottom: "22px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span className="eyebrow" style={{ margin: 0 }}>Course Dashboard</span>
            <span className="pill" style={{ fontSize: "11px", fontWeight: 700 }}>{sectionLabel}</span>
          </div>
          <h1 style={{ fontSize: "25px" }}>{courseTitle}</h1>
          <p className="lead">Grounded course assistant, verified study notes, and research learning activities.</p>
        </div>

        {/* Focused Single Primary Action */}
        <div>
          <button
            className="btn primary"
            style={{ padding: "10px 18px", fontSize: "13px" }}
            onClick={() => navigate(`/student/courses/${courseId}/activities`)}
          >
            Continue Loops Activity →
          </button>
        </div>
      </div>

      {/* Aligned 3-Column Overview KPI Row (Calm & Focused) */}
      <section className="kpi" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginBottom: "24px" }} aria-label="Student course metrics">
        <div>
          <b>{materials.length}</b>
          <span>course materials indexed</span>
        </div>
        <div>
          <b style={{ color: "var(--acc)" }}>Loops & Iteration</b>
          <span>current study activity</span>
        </div>
        <div>
          <b>{messages.length}</b>
          <span>questions asked to tutor</span>
        </div>
      </section>

      {/* Available Learning Materials (Compact & Clean) */}
      <section className="panel" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div>
            <h2 style={{ fontSize: "17px", margin: 0 }}>Available Learning Materials</h2>
            <p className="note" style={{ margin: "2px 0 0" }}>Verified curriculum guides indexed into the course vector database.</p>
          </div>
          <Link to={`/student/courses/${courseId}/materials`} style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--acc)", textDecoration: "none" }}>
            View all ({materials.length}) →
          </Link>
        </div>

        {materials.length === 0 ? (
          <p className="note">No materials uploaded yet for this course.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "12px" }}>
            {materials.map(m => (
              <div key={m.id} style={{
                padding: "14px 16px",
                border: "1px solid var(--line)",
                borderRadius: "9px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--card)"
              }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "14px" }}>{m.filename}</p>
                  <span className="pill" style={{ fontSize: "10.5px" }}>{m.kind || "Guide"} · {m.status}</span>
                </div>
                <button
                  className="btn btn-small primary"
                  onClick={() => navigate(`/student/courses/${courseId}/tutor/${m.id}`)}
                >
                  Read & Ask Tutor
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Questions Preview */}
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div>
            <h2 style={{ fontSize: "17px", margin: 0 }}>Recent Questions</h2>
            <p className="note" style={{ margin: "2px 0 0" }}>Your prior inquiries answered by the grounded AI tutor.</p>
          </div>
          <Link to={`/student/courses/${courseId}/tutor`} style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--acc)", textDecoration: "none" }}>
            Open AI Tutor →
          </Link>
        </div>

        {messages.length === 0 ? (
          <div className="empty" style={{ padding: "24px 0" }}>
            <p style={{ margin: "0 0 8px", fontWeight: 600 }}>You haven't asked any questions yet</p>
            <small style={{ marginBottom: "14px" }}>Ask questions anytime while reading course documents in the AI Tutor.</small>
            <div>
              <button className="btn primary" onClick={() => navigate(`/student/courses/${courseId}/tutor`)}>
                Ask a Question
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.slice(-3).reverse().map(m => (
              <article key={m.message_id} style={{ padding: "12px 16px", border: "1px solid var(--line)", borderRadius: "8px", background: "var(--bg)" }}>
                <p style={{ fontWeight: 700, margin: "0 0 4px", fontSize: "13.5px" }}>Q: {m.question}</p>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--mute)", lineHeight: 1.5 }}>
                  {m.answer ? (m.answer.length > 180 ? m.answer.slice(0, 177) + "…" : m.answer) : "No answer"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
