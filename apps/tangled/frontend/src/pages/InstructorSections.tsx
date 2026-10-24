import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, Course, CourseSection, friendlyError } from "../api";

export default function InstructorSections() {
  const { id = "" } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.course(id).catch(() => null),
      api.courseSections ? api.courseSections(id).catch(() => []) : Promise.resolve([]),
    ]).then(([c, secs]) => {
      setCourse(c);
      setSections(secs);
      setLoading(false);
    }).catch(err => {
      setError(friendlyError(err));
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="state"><p>Loading class sections…</p></div>;
  if (error) return <div className="state" role="alert"><p>{error}</p></div>;

  const totalEnrolled = sections.reduce((sum, s) => sum + s.enrolled, 0);

  return (
    <div className="instructor-sections-page">
      <div className="page-heading" style={{ marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">Cohort Organization</p>
          <h1>Course Sections</h1>
          <p className="lead">Section rosters, enrolment distributions, and student isolation groups for {course?.name}.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className="pill">Total Enrolled: <strong>{totalEnrolled} students</strong></span>
          <Link to={`/courses/${id}/overview`} className="btn">
            ← Back to Overview
          </Link>
        </div>
      </div>

      {/* Sections Summary Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        {sections.map(section => (
          <article key={section.id} className="panel" style={{
            margin: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: "12px",
            border: "1px solid var(--line)"
          }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span className="tag addressed" style={{ fontSize: "11px", fontWeight: 700 }}>
                  Active Section
                </span>
                <span className="pill" style={{ fontSize: "11px" }}>
                  Code: {section.section_code || `${course?.join_code}-${section.name.replace(/[^A-Za-z0-9]/g, "")}`}
                </span>
              </div>
              <h2 style={{ fontSize: "20px", margin: "0 0 6px" }}>{section.name}</h2>
              <p className="lead" style={{ fontSize: "14px", margin: "0 0 16px" }}>
                Undergraduate Computing Department Cohort
              </p>
            </div>

            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "14px", marginTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="note">Enrolled Students:</span>
                <strong style={{ fontSize: "18px", color: "var(--acc)" }}>{section.enrolled}</strong>
              </div>
              <div className="bar" style={{ margin: "10px 0 0" }}>
                <i style={{ width: `${Math.min((section.enrolled / 35) * 100, 100)}%` }} />
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Roster & Isolation Policy Notes */}
      <section className="panel">
        <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>Institutional Section Isolation & Safeguards</h2>
        <p className="note" style={{ lineHeight: "1.6", margin: 0 }}>
          Each student is enrolled into a distinct section (A, B, or C). Inquiries and research experimental tasks are tracked per section while preserving student anonymity across instructor dashboards.
        </p>
      </section>
    </div>
  );
}
