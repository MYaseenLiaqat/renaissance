import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, friendlyError, StudentMaterial, StudentMessage } from "../../api";
import CourseReader from "../../components/CourseReader";
import MarkdownView from "../../components/MarkdownView";

export default function StudentMaterialReader() {
  const { courseId, materialId } = useParams<{ courseId: string; materialId: string }>();
  const [material, setMaterial] = useState<StudentMaterial | null>(null);
  const [materials, setMaterials] = useState<StudentMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Q&A / Chat State
  const [sessionId] = useState(() => crypto.randomUUID());
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.studentMaterials(courseId)
      .then(rows => {
        setMaterials(rows);
        const current = rows.find(r => String(r.id) === materialId);
        if (current) {
          setMaterial(current);
        } else if (rows.length > 0) {
          setMaterial(rows[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // Load prior messages
    api.studentMessages(courseId)
      .then(all => {
        const matIdNum = Number(materialId);
        const scoped = all.filter(m => m.material_id === matIdNum || !m.material_id);
        setMessages(scoped);
      })
      .catch(() => setMessages([]));
  }, [courseId, materialId]);

  async function handleAsk(e: FormEvent | null, promptOverride?: string) {
    if (e) e.preventDefault();
    const q = (promptOverride || text).trim();
    if (!q || chatBusy) return;
    setText("");
    setChatBusy(true);
    setChatError("");

    try {
      const res = await api.chat(q, sessionId, material?.id || null);
      setMessages(prev => [...prev, { ...res, question: q, feedback: "" }]);
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

  if (loading) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
        <p className="lead">Loading document reader…</p>
      </div>
    );
  }

  const matName = material?.filename || "Document";

  return (
    <div className="material-reader-container">
      {/* Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: "13px", color: "var(--muted)" }}>
          <Link to="/student/courses" style={{ color: "var(--primary)", textDecoration: "none" }}>Courses</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <Link to={`/student/courses/${courseId}`} style={{ color: "var(--primary)", textDecoration: "none" }}>Course</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <Link to={`/student/courses/${courseId}/materials`} style={{ color: "var(--primary)", textDecoration: "none" }}>Materials</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span style={{ color: "var(--text)", fontWeight: 500 }}>{matName}</span>
        </nav>
        <button
          className="btn drawer-toggle-btn"
          style={{ display: "none" }}
          onClick={() => setDrawerOpen(o => !o)}
        >
          {drawerOpen ? "Hide AI Tutor" : "Open AI Tutor"}
        </button>
      </div>

      {/* 2-Column Desktop Grid Layout */}
      <div className="reader-layout-grid" style={{
        display: "grid",
        gridTemplateColumns: drawerOpen ? "minmax(0, 1.25fr) minmax(360px, 1fr)" : "1fr",
        gap: "24px",
        alignItems: "start"
      }}>
        {/* Left Column: Authentic Course Material Reader */}
        <div className="reader-document-column">
          <CourseReader
            material={material}
            materials={materials}
            onSelectMaterial={(newId) => {
              const found = materials.find(m => m.id === newId);
              if (found) setMaterial(found);
            }}
          />
        </div>

        {/* Right Column: Contextual AI Assistant Panel */}
        <div className="reader-tutor-column">
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
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Contextual AI Tutor</h3>
                <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>
                  ● Scoped to {matName}
                </span>
              </div>
              <p className="note" style={{ margin: "4px 0 0", fontSize: "12px" }}>
                Answers grounded strictly in verified course citations.
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
            </div>

            {/* Conversation Stream */}
            <div className="tutor-stream" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px", paddingRight: "4px" }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--muted)" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600 }}>Have a question about this reading?</p>
                  <p style={{ fontSize: "12px", margin: 0, lineHeight: 1.5 }}>
                    Ask any question about the concepts or examples in the document on the left.
                  </p>
                </div>
              ) : (
                messages.map(m => (
                  <div key={m.message_id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {/* User Question Bubble */}
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

                    {/* Tutor Answer Bubble */}
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

            {/* Error Display */}
            {chatError && (
              <p className="error" role="alert" style={{ fontSize: "12px", margin: "8px 0" }}>
                {chatError}
              </p>
            )}

            {/* Input Bar */}
            <form onSubmit={(e) => handleAsk(e)} style={{ marginTop: "14px", display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Ask about this material…"
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
