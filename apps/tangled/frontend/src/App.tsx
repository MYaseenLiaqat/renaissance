import { FormEvent, lazy, Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { api, Course, friendlyError } from "./api";
import Join from "./pages/Join";
import Student from "./pages/Student";
import Consent from "./pages/Consent";

import StudentLayout from "./pages/student/StudentLayout";
import StudentCourses from "./pages/student/StudentCourses";
import StudentCourseOverview from "./pages/student/StudentCourseOverview";
import StudentMaterials from "./pages/student/StudentMaterials";
import StudentMaterialReader from "./pages/student/StudentMaterialReader";
import StudentAITutor from "./pages/student/StudentAITutor";
import StudentActivities from "./pages/student/StudentActivities";
import StudentAssessments from "./pages/student/StudentAssessments";
import StudentProgress from "./pages/student/StudentProgress";

const InstructorOverview = lazy(() => import("./pages/InstructorOverview"));
const InstructorSections = lazy(() => import("./pages/InstructorSections"));
const Topics = lazy(() => import("./pages/Topics"));
const TopicDetail = lazy(() => import("./pages/TopicDetail"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Materials = lazy(() => import("./pages/CourseMaterials"));
const TopicsSetup = lazy(() => import("./pages/TopicsSetup"));
const Integrations = lazy(() => import("./pages/Integrations"));

function Auth() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"instructor" | "student">("instructor");
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (role === "instructor") {
        const result = await (registering ? api.register(email, password) : api.login(email, password));
        localStorage.setItem("instructor_token", result.access_token);
        navigate("/courses");
      } else {
        // Student role
        if (registering) {
          if (!joinCode.trim()) {
            setError("Course join code is required for student registration.");
            setBusy(false);
            return;
          }
          const result = await api.registerStudent(email, password, joinCode.trim().toUpperCase());
          localStorage.setItem("student_token", result.access_token);
          navigate("/student/courses");
        } else {
          const result = await api.loginStudent(email, password);
          localStorage.setItem("student_token", result.access_token);
          navigate("/student/courses");
        }
      }
    } catch (err) {
      setError(friendlyError(err, "We could not sign you in. Check your details and try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <span className="brand-mark">R</span>
        <span>Renaissance</span>
      </div>

      <section className={`auth-card role-${role}`}>
        {/* Role Toggle Selector */}
        <div style={{
          display: "flex",
          borderRadius: "6px",
          background: "var(--bg, #f3f4f6)",
          padding: "3px",
          marginBottom: "20px"
        }}>
          <button
            type="button"
            className={`btn ${role === "instructor" ? "primary" : ""}`}
            style={{ flex: 1, padding: "6px 12px", fontSize: "13px", fontWeight: 600, border: "none" }}
            onClick={() => { setRole("instructor"); setError(""); }}
          >
            Instructor
          </button>
          <button
            type="button"
            className={`btn ${role === "student" ? "primary" : ""}`}
            style={{ flex: 1, padding: "6px 12px", fontSize: "13px", fontWeight: 600, border: "none" }}
            onClick={() => { setRole("student"); setError(""); }}
          >
            Student
          </button>
        </div>

        <p className="eyebrow">
          {role === "instructor" ? "Instructor Workspace" : "Student Learning Portal"}
        </p>
        <h1>{registering ? "Create your workspace" : "Welcome back"}</h1>
        <p className="lead">
          {role === "instructor"
            ? (registering ? "Turn student questions into clear, actionable teaching signals." : "See what your class understands, and where they need you next.")
            : (registering ? "Join your course to ask questions and participate in study activities." : "Access your course materials and grounded AI tutor.")}
        </p>

        <form className="form" onSubmit={submit}>
          {role === "student" && registering && (
            <label>
              Course Join Code
              <input
                required
                type="text"
                placeholder="6-character code (e.g. CS101A)"
                maxLength={6}
                value={joinCode}
                onChange={event => setJoinCode(event.target.value.toUpperCase())}
              />
            </label>
          )}

          <label>
            Email
            <input
              required
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
          </label>

          <label>
            Password
            <input
              required
              minLength={8}
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </label>

          <button className="btn primary btn-block" disabled={busy}>
            {busy ? "Working…" : registering ? "Create account" : "Log in"}
          </button>

          {error && <p className="error" role="alert">{error}</p>}
        </form>

        <button
          type="button"
          className="text-button"
          onClick={() => { setRegistering(!registering); setError(""); }}
        >
          {registering ? "Already have an account? Log in" : "New to Renaissance? Create an account"}
        </button>

        {role === "instructor" && (
          <div style={{ marginTop: "14px", borderTop: "1px solid var(--line, #e5e7eb)", paddingTop: "12px", textAlign: "center" }}>
            <Link to="/join" className="text-button">
              Have a course join code? Quick student join
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function Courses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [classSize, setClassSize] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = () => api.courses().then(setCourses).catch(err => setError(friendlyError(err)));
  useEffect(() => { load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createCourse(name, classSize ? Number(classSize) : undefined);
      setName("");
      setClassSize("");
      load();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  function copyJoinCode(e: React.MouseEvent, code: string) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  }

  return (
    <main className="landing courses-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Instructor Workspace</p>
          <h1>Your Courses</h1>
          <p className="lead">Choose a course to review its learning signals and student questions.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="avatar">I</span>
        </div>
      </div>

      <section className="panel create-course">
        <div>
          <h2>Create a Course</h2>
          <p className="note">Set up a space for your students and their questions.</p>
        </div>
        <form className="inline-form" onSubmit={create}>
          <input required placeholder="Course name" value={name} onChange={event => setName(event.target.value)} />
          <input type="number" min="1" placeholder="Class size (optional)" value={classSize} onChange={event => setClassSize(event.target.value)} />
          <button className="btn primary" disabled={busy}>{busy ? "Creating…" : "Create course"}</button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <div className="course-grid">
        {courses.map(course => (
          <article
            className="course-card"
            key={course.id}
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/courses/${course.id}/topics`)}
          >
            <div className="course-icon">∿</div>
            <div style={{ flex: 1 }}>
              <h2>
                <Link
                  to={`/courses/${course.id}/topics`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {course.name}
                </Link>
              </h2>
              <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span className="note">Join code: <strong>{course.join_code}</strong></span>
                <button
                  type="button"
                  className="btn btn-small"
                  style={{ fontSize: "11px", padding: "2px 8px" }}
                  onClick={(e) => copyJoinCode(e, course.join_code)}
                  aria-label={`Copy join code for ${course.name}`}
                >
                  {copiedCode === course.join_code ? "Copied! ✓" : "Copy code"}
                </button>
                <Link
                  to={`/join/${course.join_code}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-button"
                  style={{ fontSize: "11px" }}
                  aria-label={`Open student join page for ${course.name}`}
                >
                  Student join page ↗
                </Link>
              </div>
            </div>
            <span className="arrow">→</span>
          </article>
        ))}
      </div>
      {courses.length === 0 && (
        <div className="empty panel">No courses yet.<small>Create your first course above to get started.</small></div>
      )}
    </main>
  );
}

function StudentRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem("student_token");
    if (!token) {
      navigate("/join");
      return;
    }
    api.studentMe().then(me => {
      if (me && me.course_id) {
        navigate(`/student/courses/${me.course_id}`);
      } else {
        navigate("/student/courses");
      }
    }).catch(() => {
      navigate("/student/courses");
    });
  }, [navigate]);
  return <div className="state"><p>Loading student workspace…</p></div>;
}

function Layout() {
  const { id = "" } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.course(id).then(setCourse).catch(err => setError(friendlyError(err)));
  }, [id]);

  if (error) return <main className="state" role="alert"><p>{error}</p><Link className="btn" to="/courses">Back to courses</Link></main>;
  if (!course) return <main className="state"><p>Loading course…</p></main>;

  return (
    <div className="shell">
      <aside className="side">
        <Link className="logo" to="/courses">
          <span className="brand-mark">R</span>
          <span>Renaissance</span>
        </Link>
        <p className="side-label">Instructor Workspace</p>
        <NavLink to={`/courses/${id}/overview`}>Overview</NavLink>
        <NavLink to={`/courses/${id}/materials`}>Materials</NavLink>
        <NavLink to={`/courses/${id}/topics`}>Topics Needing Attention</NavLink>
        <NavLink to={`/courses/${id}/quiz`}>Quiz Results</NavLink>
        <NavLink to={`/courses/${id}/sections`}>Sections</NavLink>
        <NavLink to={`/courses/${id}/setup`}>Topic Setup</NavLink>
        <NavLink to={`/courses/${id}/integrations`}>Integrations</NavLink>
        <div className="side-spacer" />
        <Link to="/courses"><span>←</span> All Courses</Link>
      </aside>

      <div className="wrap">
        <header className="top">
          <div>
            <span className="breadcrumb">Course workspace / </span>
            <strong>{course.name}</strong>
          </div>
          <div className="top-actions">
            <span className="top-note">Instructor View</span>
            <span className="avatar">I</span>
          </div>
        </header>
        <main>
          <Suspense fallback={<div className="state"><p>Loading page…</p></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/join" element={<Join />} />
      <Route path="/join/:code" element={<Join />} />
      <Route path="/student/login" element={<Join initialMode="login" />} />
      <Route path="/consent" element={<Consent />} />

      {/* Student Workspace Portal */}
      <Route path="/student" element={<StudentRedirect />} />
      <Route path="/student/legacy" element={<Student />} />

      {/* Structured Student Workspace Routes */}
      <Route path="/student/courses" element={<StudentLayout />}>
        <Route index element={<StudentCourses />} />
        <Route path=":courseId" element={<StudentCourseOverview />} />
        <Route path=":courseId/materials" element={<StudentMaterials />} />
        <Route path=":courseId/materials/:materialId" element={<StudentMaterialReader />} />
        <Route path=":courseId/tutor" element={<StudentAITutor />} />
        <Route path=":courseId/tutor/:materialId" element={<StudentAITutor />} />
        <Route path=":courseId/activities" element={<StudentActivities />} />
        <Route path=":courseId/assessments" element={<StudentAssessments />} />
        <Route path=":courseId/progress" element={<StudentProgress />} />
      </Route>

      {/* Instructor Workspace Routes */}
      <Route path="/courses/:id" element={<Layout />}>
        <Route index element={<InstructorOverview />} />
        <Route path="overview" element={<InstructorOverview />} />
        <Route path="topics" element={<Topics />} />
        <Route path="topics/:topicId" element={<TopicDetail />} />
        <Route path="materials" element={<Materials />} />
        <Route path="quiz" element={<Quiz />} />
        <Route path="sections" element={<InstructorSections />} />
        <Route path="setup" element={<TopicsSetup />} />
        <Route path="integrations" element={<Integrations />} />
      </Route>
    </Routes>
  );
}
