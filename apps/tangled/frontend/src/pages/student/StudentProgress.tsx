import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, StudentMessage } from "../../api";
import MarkdownView from "../../components/MarkdownView";

export default function StudentProgress() {
  const { courseId } = useParams<{ courseId: string }>();
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.studentMessages()
      .then(rows => {
        setMessages(rows);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [courseId]);

  const totalQuestions = messages.length;
  const clearCount = messages.filter(m => m.feedback === "clear").length;
  const unclearCount = messages.filter(m => m.feedback === "unclear").length;
  const ratedCount = clearCount + unclearCount;
  const clarityPct = ratedCount > 0 ? Math.round((clearCount / ratedCount) * 100) : null;

  return (
    <div>
      <nav aria-label="Breadcrumb" style={{ marginBottom: "16px", fontSize: "13px", color: "var(--muted)" }}>
        <Link to="/student/courses" style={{ color: "var(--primary)", textDecoration: "none" }}>Courses</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <Link to={`/student/courses/${courseId}`} style={{ color: "var(--primary)", textDecoration: "none" }}>Course</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span style={{ color: "var(--text)", fontWeight: 500 }}>Learning Progress</span>
      </nav>

      <div className="page-heading" style={{ marginBottom: "24px" }}>
        <div>
          <p className="eyebrow">Personal Learning Analytics</p>
          <h1>My Learning Progress</h1>
          <p className="lead">Summary of your course study engagement, clarity feedback, and questions asked.</p>
        </div>
      </div>

      {loading ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <p className="lead">Loading progress metrics…</p>
        </div>
      ) : (
        <div>
          {/* Key Metric Tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div className="panel" style={{ padding: "18px" }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Questions Asked</span>
              <h3 style={{ fontSize: "28px", margin: "8px 0 2px" }}>{totalQuestions}</h3>
              <p className="note" style={{ margin: 0 }}>Grounded course inquiries</p>
            </div>

            <div className="panel" style={{ padding: "18px" }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Answer Clarity Rate</span>
              <h3 style={{ fontSize: "28px", margin: "8px 0 2px", color: clarityPct && clarityPct >= 70 ? "var(--ok, #166534)" : "var(--text)" }}>
                {clarityPct !== null ? `${clarityPct}%` : "—"}
              </h3>
              <p className="note" style={{ margin: 0 }}>{clearCount} marked clear out of {ratedCount} rated</p>
            </div>

            <div className="panel" style={{ padding: "18px" }}>
              <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Study Activity</span>
              <h3 style={{ fontSize: "28px", margin: "8px 0 2px" }}>Loops</h3>
              <p className="note" style={{ margin: 0 }}>Research practice module</p>
            </div>
          </div>

          {/* Question History Breakdown */}
          <section className="panel">
            <h2>Question & Clarity History</h2>
            {messages.length === 0 ? (
              <p className="note" style={{ marginTop: "12px" }}>No questions recorded yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                {messages.slice().reverse().map(m => (
                  <div key={m.message_id} style={{
                    padding: "16px",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    background: "var(--bg)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "14px" }}>{m.question}</p>
                      {m.feedback ? (
                        <span className={`tag ${m.feedback === "clear" ? "addressed" : "review"}`} style={{ fontSize: "11px" }}>
                          {m.feedback === "clear" ? "Marked Clear" : "Marked Unclear"}
                        </span>
                      ) : (
                        <span className="pill" style={{ fontSize: "11px" }}>Unrated</span>
                      )}
                    </div>
                    <div style={{ margin: 0, fontSize: "13px", color: "var(--text)", lineHeight: 1.6 }}>
                      <MarkdownView content={m.answer || ""} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
