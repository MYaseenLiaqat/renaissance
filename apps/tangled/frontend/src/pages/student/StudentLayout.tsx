import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { api, StudentMe, StudentEnrolledCourse } from "../../api";

export default function StudentLayout() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId?: string }>();
  const [student, setStudent] = useState<StudentMe | null>(null);
  const [courses, setCourses] = useState<StudentEnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("student_token");
    if (!token) {
      navigate("/join");
      return;
    }
    Promise.all([
      api.studentMe().catch(() => null),
      api.studentCourses().catch(() => []),
    ]).then(([me, courseList]) => {
      if (!me) {
        localStorage.removeItem("student_token");
        navigate("/join");
        return;
      }
      setStudent(me);
      setCourses(courseList);
      setLoading(false);
    });
  }, [navigate]);

  async function handleCourseSwitch(newCourseId: string) {
    try {
      const res = await api.switchCourse(Number(newCourseId));
      localStorage.setItem("student_token", res.access_token);
      window.location.href = `/student/courses/${newCourseId}`;
    } catch {
      navigate(`/student/courses/${newCourseId}`);
    }
  }

  function handleLogout() {
    localStorage.removeItem("student_token");
    navigate("/join");
  }

  if (loading) {
    return (
      <main className="landing" style={{ padding: "48px 24px", textAlign: "center" }}>
        <p className="lead">Loading student workspace…</p>
      </main>
    );
  }

  const activeCourseId = courseId || String(student?.course_id || "");
  const currentCourse = courses.find(c => String(c.id) === activeCourseId);
  const courseTitle = currentCourse?.name || student?.course_name || "Course Workspace";

  return (
    <div className="student-workspace-shell">
      {/* Top Application Bar */}
      <header className="workspace-header" style={{
        background: "rgba(255, 255, 255, 0.94)",
        borderBottom: "1px solid var(--line)",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        backdropFilter: "blur(14px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <Link to="/student/courses" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-0.5px", color: "var(--acc)" }}>
              RENAISSANCE
            </span>
            <span style={{ fontSize: "11px", background: "var(--acc-soft)", color: "var(--acc)", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
              STUDENT
            </span>
          </Link>
          <span style={{ color: "var(--line)" }}>|</span>

          {/* Course Selector / Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {courses.length > 1 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--mute)", fontWeight: 600 }}>Course:</span>
                <select
                  value={activeCourseId}
                  onChange={(e) => handleCourseSwitch(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "var(--bg)"
                  }}
                  aria-label="Switch active course"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>{courseTitle}</span>
            )}

            {currentCourse?.join_code && (
              <span className="pill" style={{ fontSize: "11px", padding: "1px 6px" }}>
                Code: {currentCourse.join_code}
              </span>
            )}

            {student?.section_name && (
              <span className="pill" style={{ fontSize: "11px", padding: "1px 6px", background: "var(--acc-soft)", color: "var(--acc)", border: "1px solid rgba(53,109,99,0.25)", fontWeight: 700 }}>
                {student.section_name}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link to="/consent" style={{ textDecoration: "none" }}>
            <span className="tag addressed" style={{ fontSize: "11px" }}>
              Research Consent Active
            </span>
          </Link>
          <span style={{ fontSize: "13px", color: "var(--mute)" }}>
            {student?.email || "Student"}
          </span>
          <button className="btn btn-small" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      {/* Persistent Subnavigation Bar */}
      <nav className="workspace-subnav" style={{
        background: "#fbfdfc",
        borderBottom: "1px solid var(--line)",
        padding: "0 24px",
        display: "flex",
        gap: "24px",
        overflowX: "auto"
      }}>
        <NavLink
          to={`/student/courses/${activeCourseId}`}
          end
          className={({ isActive }) => `subnav-link ${isActive ? "active" : ""}`}
          style={({ isActive }) => ({
            padding: "12px 4px",
            fontSize: "13.5px",
            fontWeight: 600,
            color: isActive ? "var(--acc)" : "var(--mute)",
            borderBottom: isActive ? "2px solid var(--acc)" : "2px solid transparent",
            textDecoration: "none",
            whiteSpace: "nowrap"
          })}
        >
          Overview
        </NavLink>
        <NavLink
          to={`/student/courses/${activeCourseId}/materials`}
          className={({ isActive }) => `subnav-link ${isActive ? "active" : ""}`}
          style={({ isActive }) => ({
            padding: "12px 4px",
            fontSize: "13.5px",
            fontWeight: 600,
            color: isActive ? "var(--acc)" : "var(--mute)",
            borderBottom: isActive ? "2px solid var(--acc)" : "2px solid transparent",
            textDecoration: "none",
            whiteSpace: "nowrap"
          })}
        >
          Course Content
        </NavLink>
        <NavLink
          to={`/student/courses/${activeCourseId}/tutor`}
          className={({ isActive }) => `subnav-link ${isActive ? "active" : ""}`}
          style={({ isActive }) => ({
            padding: "12px 4px",
            fontSize: "13.5px",
            fontWeight: 600,
            color: isActive ? "var(--acc)" : "var(--mute)",
            borderBottom: isActive ? "2px solid var(--acc)" : "2px solid transparent",
            textDecoration: "none",
            whiteSpace: "nowrap"
          })}
        >
          AI Tutor
        </NavLink>
        <NavLink
          to={`/student/courses/${activeCourseId}/activities`}
          className={({ isActive }) => `subnav-link ${isActive ? "active" : ""}`}
          style={({ isActive }) => ({
            padding: "12px 4px",
            fontSize: "13.5px",
            fontWeight: 600,
            color: isActive ? "var(--acc)" : "var(--mute)",
            borderBottom: isActive ? "2px solid var(--acc)" : "2px solid transparent",
            textDecoration: "none",
            whiteSpace: "nowrap"
          })}
        >
          Activities
        </NavLink>
        <NavLink
          to={`/student/courses/${activeCourseId}/assessments`}
          className={({ isActive }) => `subnav-link ${isActive ? "active" : ""}`}
          style={({ isActive }) => ({
            padding: "12px 4px",
            fontSize: "13.5px",
            fontWeight: 600,
            color: isActive ? "var(--acc)" : "var(--mute)",
            borderBottom: isActive ? "2px solid var(--acc)" : "2px solid transparent",
            textDecoration: "none",
            whiteSpace: "nowrap"
          })}
        >
          Assessments
        </NavLink>
        <NavLink
          to={`/student/courses/${activeCourseId}/progress`}
          className={({ isActive }) => `subnav-link ${isActive ? "active" : ""}`}
          style={({ isActive }) => ({
            padding: "12px 4px",
            fontSize: "13.5px",
            fontWeight: 600,
            color: isActive ? "var(--acc)" : "var(--mute)",
            borderBottom: isActive ? "2px solid var(--acc)" : "2px solid transparent",
            textDecoration: "none",
            whiteSpace: "nowrap"
          })}
        >
          Progress
        </NavLink>
      </nav>

      {/* Main Outlet */}
      <main style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
