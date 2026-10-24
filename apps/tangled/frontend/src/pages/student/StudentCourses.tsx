import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, StudentEnrolledCourse } from "../../api";

export default function StudentCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<StudentEnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.studentCourses()
      .then(res => {
        setCourses(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="page-heading" style={{ marginBottom: "24px" }}>
        <div>
          <p className="eyebrow">Academic Term · Spring 2026</p>
          <h1>Enrolled Courses</h1>
          <p className="lead">Select a course to view materials, practice activities, and study guides.</p>
        </div>
        <Link to="/join" className="btn primary">
          + Join Another Course
        </Link>
      </div>

      {loading ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <p className="lead">Loading enrolled courses…</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h2>No Enrolled Courses Found</h2>
          <p className="lead" style={{ marginBottom: "20px" }}>
            Enter a course join code provided by your instructor to get started.
          </p>
          <Link to="/join" className="btn primary">
            Join a Course
          </Link>
        </div>
      ) : (
        <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {courses.map(course => (
            <article key={course.id} className="panel" style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "12px",
              boxShadow: "var(--shadow)",
              border: course.is_current ? "2px solid var(--acc)" : "1px solid var(--line)"
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <span className="pill" style={{ fontSize: "11px", fontWeight: 700 }}>
                    Code: {course.join_code}
                  </span>
                  {course.is_current && (
                    <span className="tag addressed" style={{ fontSize: "11px" }}>
                      Active
                    </span>
                  )}
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>{course.name}</h3>
                <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "var(--mute)", margin: "14px 0" }}>
                  <span>{course.materials_count} Materials</span>
                  <span>{course.questions_count} Questions</span>
                </div>
              </div>

              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px" }}>
                <button
                  className="btn primary"
                  style={{ flex: 1 }}
                  onClick={() => navigate(`/student/courses/${course.id}`)}
                >
                  Open Workspace
                </button>
                <button
                  className="btn"
                  onClick={() => navigate(`/student/courses/${course.id}/materials`)}
                >
                  Reader
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
