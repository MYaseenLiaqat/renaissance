import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ResearchTask, LearnerStatus } from "../../api";

export default function StudentAssessments() {
  const { courseId } = useParams<{ courseId: string }>();
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [status, setStatus] = useState<LearnerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.researchTasks().catch(() => []),
      api.researchLearnerStatus().catch(() => null),
    ]).then(([tList, st]) => {
      setTasks(tList);
      setStatus(st);
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
        <span style={{ color: "var(--text)", fontWeight: 500 }}>Assessments</span>
      </nav>

      <div className="page-heading" style={{ marginBottom: "24px" }}>
        <div>
          <p className="eyebrow">Academic & Research Evaluations</p>
          <h1>Practice & Retention Assessments</h1>
          <p className="lead">Scheduled coding evaluations, automatic unit test grading, and empirical metrics.</p>
        </div>
      </div>

      {loading ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <p className="lead">Loading assessments…</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Active Assessments */}
          <section className="panel">
            <h2>Active & Available Assessments</h2>
            {tasks.length === 0 ? (
              <p className="note" style={{ marginTop: "12px" }}>No assessments currently due for submission.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
                {tasks.map(t => (
                  <div key={t.id} style={{
                    padding: "16px",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span className="pill" style={{ textTransform: "uppercase", fontSize: "11px", fontWeight: 600 }}>
                          {t.type}
                        </span>
                        <h3 style={{ margin: 0, fontSize: "15px" }}>Task #{t.id} - Coding Evaluation</h3>
                      </div>
                      <p className="note" style={{ margin: "4px 0 0" }}>
                        {t.started_at ? `Started on ${new Date(t.started_at).toLocaleTimeString()}` : "Ready to begin"}
                      </p>
                    </div>
                    <Link to={`/student/courses/${courseId}/activities`} className="btn primary" style={{ textDecoration: "none" }}>
                      Take Assessment →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Retention Milestones */}
          <section className="panel">
            <h2>Retention Milestones</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "14px" }}>
              <div style={{ padding: "16px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg)" }}>
                <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Immediate Post-Test</span>
                <p style={{ margin: "6px 0 2px", fontWeight: 600 }}>Loops & Iteration Mastery</p>
                <p className="note" style={{ margin: 0 }}>Administered directly following the 20-minute study session.</p>
              </div>
              <div style={{ padding: "16px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg)" }}>
                <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Delayed Retention (24h/7d)</span>
                <p style={{ margin: "6px 0 2px", fontWeight: 600 }}>Long-Term Transfer Evaluation</p>
                <p className="note" style={{ margin: 0 }}>
                  {status?.has_future_assessments
                    ? `Scheduled for ${status.next_assessment_at ? new Date(status.next_assessment_at).toLocaleString() : "tomorrow"}`
                    : "Scheduled according to study protocol parameters"}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
