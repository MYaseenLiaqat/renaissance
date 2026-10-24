import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, friendlyError, StudentMaterial, StudentMessage } from "../../api";
import CourseReader from "../../components/CourseReader";
import MarkdownView from "../../components/MarkdownView";

export default function StudentAITutor() {
  const navigate = useNavigate();
  const { courseId, materialId } = useParams<{ courseId: string; materialId?: string }>();
  const [materials, setMaterials] = useState<StudentMaterial[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(
    materialId ? Number(materialId) : null
  );
  const [loading, setLoading] = useState(true);

  // Chat / Q&A state
  const [sessionId] = useState(() => crypto.randomUUID());
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState<number | null>(null);

  // Mobile layout tab toggle: 'material' | 'tutor'
  const [mobileTab, setMobileTab] = useState<"material" | "tutor">("material");

  useEffect(() => {
    setLoading(true);
    api.studentMaterials(courseId)
      .then(rows => {
        setMaterials(rows);
        if (rows.length > 0) {
          if (materialId) {
            const found = rows.find(r => String(r.id) === materialId);
            setSelectedMaterialId(found ? found.id : rows[0].id);
          } else {
            setSelectedMaterialId(rows[0].id);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setMaterials([]);
        setLoading(false);
      });

    api.studentMessages(courseId)
      .then(all => {
        if (materialId) {
          const matIdNum = Number(materialId);
          setMessages(all.filter(m => m.material_id === matIdNum || !m.material_id));
        } else {
          setMessages(all);
        }
      })
      .catch(() => setMessages([]));
  }, [courseId, materialId]);

  const activeMaterial = materials.find(m => m.id === selectedMaterialId) || materials[0] || null;

  async function handleAsk(e: FormEvent | null, promptOverride?: string) {
    if (e) e.preventDefault();
    const q = (promptOverride || text).trim();
    if (!q || chatBusy) return;
    setText("");
    setChatBusy(true);
    setChatError("");

    try {
      const res = await api.chat(q, sessionId, activeMaterial?.id || null);
      setMessages(prev => [...prev, { ...res, question: q, feedback: "" }]);
      setMobileTab("tutor");
    } catch (err) {
      setChatError(friendlyError(err, "Could not get an answer from the course tutor."));
    } finally {
      setChatBusy(false);
    }
  }

  async function handleFeedback(messageId: number, val: string) {
    setFeedbackBusy(messageId);
    try {
      await api.feedback(messageId, val);
      setMessages(prev => prev.map(m => m.message_id === messageId ? { ...m, feedback: val } : m));
    } catch {
      // ignore
    } finally {
      setFeedbackBusy(null);
    }
  }

  function handleMaterialChange(newMatId: number) {
    setSelectedMaterialId(newMatId);
    navigate(`/student/courses/${courseId}/tutor/${newMatId}`);
  }

  if (loading) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "48px 24px" }}>
        <p className="lead">Loading course materials and AI Tutor…</p>
      </div>
    );
  }

  const matName = activeMaterial?.filename || "Course Reading";

  return (
    <div className="ai-tutor-container">
      {/* Breadcrumb & Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: "13px", color: "var(--muted)" }}>
          <Link to="/student/courses" style={{ color: "var(--primary)", textDecoration: "none" }}>Courses</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <Link to={`/student/courses/${courseId}`} style={{ color: "var(--primary)", textDecoration: "none" }}>Course</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span style={{ color: "var(--text)", fontWeight: 500 }}>AI Tutor & Material Reader</span>
        </nav>

        {/* Mobile Tab Switcher */}
        <div className="mobile-only-tabs" style={{ display: "none" }}>
          <button
            type="button"
            className={`btn btn-small ${mobileTab === "material" ? "primary" : ""}`}
            onClick={() => setMobileTab("material")}
          >
            Material
          </button>
          <button
            type="button"
            className={`btn btn-small ${mobileTab === "tutor" ? "primary" : ""}`}
            onClick={() => setMobileTab("tutor")}
          >
            AI Tutor ({messages.length})
          </button>
        </div>
      </div>

      {/* 2-Column Responsive Workspace Grid */}
      <div className="ai-tutor-grid" style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.25fr) minmax(360px, 1fr)",
        gap: "24px",
        alignItems: "start"
      }}>
        {/* Left Column: Authentic Course Material Reader */}
        <div className={`tutor-material-column ${mobileTab !== "material" ? "mobile-hide" : ""}`}>
          <CourseReader
            material={activeMaterial}
            materials={materials}
            onSelectMaterial={handleMaterialChange}
          />
        </div>

        {/* Right Column: Grounded AI Tutor Conversation Panel */}
        <div className={`tutor-chat-column ${mobileTab !== "tutor" ? "mobile-hide" : ""}`}>
          <div className="panel" style={{
            padding: "20px",
            background: "var(--card-bg, #ffffff)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 220px)",
            minHeight: "560px",
          }}>
            {/* Tutor Header */}
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Renaissance AI Tutor</h3>
                  <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>
                    ● Grounded in verified course material
                  </span>
                </div>
                <span className="tag" style={{ fontSize: "11px" }}>
                  {activeMaterial?.filename ? "Scoped" : "Course-Wide"}
                </span>
              </div>
              <p className="note" style={{ margin: "6px 0 0", fontSize: "12px" }}>
                Ask anything about <b>{matName}</b>. Responses cite verified sections.
              </p>
            </div>

            {/* Quick Suggestion Pills */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
              <button
                type="button"
                className="btn btn-small"
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => handleAsk(null, "Summarize the key concepts in this material.")}
                disabled={chatBusy}
              >
                Summarize material
              </button>
              <button
                type="button"
                className="btn btn-small"
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => handleAsk(null, "What are common pitfalls or mistakes students make with this topic?")}
                disabled={chatBusy}
              >
                Common pitfalls
              </button>
              <button
                type="button"
                className="btn btn-small"
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => handleAsk(null, "Provide a simple code example demonstrating these concepts.")}
                disabled={chatBusy}
              >
                Code example
              </button>
            </div>

            {/* Conversation Stream */}
            <div className="tutor-stream" style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              paddingRight: "6px"
            }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 16px", color: "var(--muted)" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 600 }}>Welcome to your Course Tutor</p>
                  <p style={{ fontSize: "13px", margin: "0 auto", maxWidth: "340px", lineHeight: "1.5" }}>
                    Ask any question about the document on the left, or click one of the suggested prompts above to start learning.
                  </p>
                </div>
              ) : (
                messages.map(m => (
                  <div key={m.message_id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {/* User Question */}
                    <div style={{
                      alignSelf: "flex-end",
                      background: "var(--acc)",
                      color: "#ffffff",
                      borderRadius: "14px 14px 2px 14px",
                      padding: "10px 14px",
                      fontSize: "13px",
                      maxWidth: "85%",
                      lineHeight: "1.5"
                    }}>
                      {m.question}
                    </div>

                    {/* Tutor Response */}
                    <div style={{
                      alignSelf: "flex-start",
                      background: "var(--bg, #f3f4f6)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      borderRadius: "14px 14px 14px 2px",
                      padding: "12px 14px",
                      fontSize: "13px",
                      maxWidth: "92%",
                      lineHeight: "1.6"
                    }}>
                      <MarkdownView content={m.answer || ""} />

                      {/* Sources / Citations */}
                      {m.sources && m.sources.length > 0 && (
                        <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed var(--border)", fontSize: "11px", color: "var(--muted)" }}>
                          <b>Sources:</b> {m.sources.map(s => `[${s.n}] ${s.material}`).join(", ")}
                        </div>
                      )}

                      {/* Clarity Feedback */}
                      <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Clarity:</span>
                        <button
                          className={`btn ${m.feedback === "clear" ? "primary" : ""}`}
                          style={{ fontSize: "11px", padding: "2px 8px" }}
                          disabled={feedbackBusy === m.message_id}
                          onClick={() => handleFeedback(m.message_id, "clear")}
                        >
                          Clear
                        </button>
                        <button
                          className={`btn ${m.feedback === "unclear" ? "primary" : ""}`}
                          style={{ fontSize: "11px", padding: "2px 8px" }}
                          disabled={feedbackBusy === m.message_id}
                          onClick={() => handleFeedback(m.message_id, "unclear")}
                        >
                          Unclear
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Error Message */}
            {chatError && (
              <p className="error" role="alert" style={{ fontSize: "12px", margin: "8px 0" }}>
                {chatError}
              </p>
            )}

            {/* Prompt Input Form */}
            <form onSubmit={(e) => handleAsk(e)} style={{ marginTop: "14px", display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Ask the tutor a question…"
                value={text}
                onChange={e => setText(e.target.value)}
                disabled={chatBusy}
                style={{ flex: 1, padding: "10px 12px", fontSize: "13px", borderRadius: "6px", border: "1px solid var(--border)" }}
              />
              <button
                type="submit"
                className="btn primary"
                disabled={chatBusy || !text.trim()}
                style={{ fontSize: "13px", padding: "8px 16px" }}
              >
                {chatBusy ? "Thinking…" : "Ask"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
