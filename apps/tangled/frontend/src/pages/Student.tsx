import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, friendlyError, ResearchLearner, ResearchTask, StudentMaterial, StudentMe, StudentMessage, SubmitOut } from "../api";
import MarkdownView from "../components/MarkdownView";

function formatRemaining(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "";
  const end = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((end - now) / 1000));
  if (diffSec <= 0) return "Session expired";
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function Student() {
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState<StudentMe | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [materials, setMaterials] = useState<StudentMaterial[]>([]);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [feedbackBusy, setFeedbackBusy] = useState<number | null>(null);
  const [feedbackError, setFeedbackError] = useState<number | null>(null);

  // Research module & tasks
  const [learner, setLearner] = useState<ResearchLearner | null>(null);
  const [module, setModule] = useState<any>(null);
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [researchError, setResearchError] = useState("");
  const [taskCodes, setTaskCodes] = useState<Record<number, string>>({});
  const [submissionResults, setSubmissionResults] = useState<Record<number, SubmitOut>>({});
  const [researchBusy, setResearchBusy] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  // Research Controlled AI chat
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [remainingAi, setRemainingAi] = useState<number | null>(null);

  // Live countdown timer tick
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("student_token");
    if (!token) {
      setNotLoggedIn(true);
      return;
    }
    api.studentMe()
      .then(info => {
        setStudentInfo(info);
        setNotLoggedIn(false);
      })
      .catch(() => {
        setNotLoggedIn(true);
      });

    api.studentMaterials().then(setMaterials).catch(() => setMaterials([]));
    api.studentMessages().then(setMessages).catch(() => setMessages([]));

    // Research data
    api.researchLearner().then(l => {
      setLearner(l);
      if (l.ai_interaction_cap !== undefined && l.ai_interaction_cap !== null) {
        setRemainingAi(l.ai_interaction_cap);
      }
    }).catch(() => {});

    api.researchLoops()
      .then(setModule)
      .catch(() => setResearchError("Register for the course to open the Loops study activity."));

    api.researchTasks().then(rows => {
      setTasks(rows);
      const supported = rows.find(r => r.type === "supported");
      if (supported && supported.remaining_interactions !== undefined) {
        setRemainingAi(supported.remaining_interactions);
      }
    }).catch(() => setTasks([]));
  }, []);

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    const question = text;
    setText("");
    const result = await api.chat(question, sessionId);
    setMessages(old => [...old, { ...result, question, feedback: "" }]);
  }

  async function startLoops() {
    setResearchBusy(true);
    setResearchError("");
    try {
      const result = await api.startResearchLoops();
      if (result && typeof result === "object" && "module" in result) {
        setModule((result as any).module);
      } else {
        setModule(result);
      }
      const updatedTasks = await api.researchTasks();
      setTasks(updatedTasks);
      const supported = updatedTasks.find(r => r.type === "supported");
      if (supported && supported.remaining_interactions !== undefined) {
        setRemainingAi(supported.remaining_interactions);
      }
    } catch (error) {
      // Idempotency: if already started or completed, refresh module and tasks gracefully
      try {
        const m = await api.researchLoops();
        setModule(m);
        const updatedTasks = await api.researchTasks();
        setTasks(updatedTasks);
        const supported = updatedTasks.find(r => r.type === "supported");
        if (supported && supported.remaining_interactions !== undefined) {
          setRemainingAi(supported.remaining_interactions);
        }
      } catch {
        setResearchError(friendlyError(error, "Could not start the activity."));
      }
    } finally {
      setResearchBusy(false);
    }
  }

  async function submitTask(task: ResearchTask) {
    const code = taskCodes[task.id] || "";
    if (!code.trim()) return;
    setResearchBusy(true);
    setResearchError("");
    try {
      // Supported practice session timer is started via startResearchLoops.
      // Explicit assessment tasks (immediate/delayed) use startResearchTask.
      if (task.type !== "supported" && !task.started_at) {
        await api.startResearchTask(task.id);
      }
      const res = await api.submitResearchTask(task.id, code);
      setSubmissionResults(prev => ({ ...prev, [task.id]: res }));
      const updated = await api.researchTasks();
      setTasks(updated);
      setTaskCodes(prev => ({ ...prev, [task.id]: "" }));
    } catch (error) {
      setResearchError(friendlyError(error, "Could not submit assessment."));
    } finally {
      setResearchBusy(false);
    }
  }

  async function setFeedback(messageId: number, value: string) {
    setFeedbackBusy(messageId);
    setFeedbackError(null);
    try {
      await api.feedback(messageId, value);
      setMessages(old => old.map(m => (m.message_id === messageId ? { ...m, feedback: value } : m)));
    } catch {
      setFeedbackError(messageId);
    } finally {
      setFeedbackBusy(null);
    }
  }

  async function askResearchAi(event: FormEvent, attemptId: number) {
    event.preventDefault();
    if (!aiPrompt.trim()) return;
    const msg = aiPrompt.trim();
    setAiPrompt("");
    setAiBusy(true);
    setAiError("");
    setAiMessages(old => [...old, { role: "user", text: msg }]);

    try {
      const res = await api.researchAiChat(attemptId, msg);
      setAiMessages(old => [...old, { role: "assistant", text: res.response }]);
      setRemainingAi(res.remaining_interactions);
    } catch (err: any) {
      setAiError(friendlyError(err, "Research AI tutor request failed."));
    } finally {
      setAiBusy(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("student_token");
    navigate("/join");
  }

  if (notLoggedIn) {
    return (
      <main className="landing student-page">
        <section className="panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h2>Student workspace</h2>
          <p className="lead" style={{ marginBottom: "20px" }}>
            You are not currently logged in with an active course session.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link to="/join" className="btn primary">
              Join course or Log in
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const isControlledAi = learner?.condition === "controlled_ai";
  const supportedTask = tasks.find(t => t.type === "supported");
  const isSupportedPending = Boolean(supportedTask && !supportedTask.started_at);
  const isSupportedActive = Boolean(supportedTask && supportedTask.started_at);

  return (
    <main className="landing student-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            Student workspace {studentInfo?.course_name ? `· ${studentInfo.course_name}` : ""}{studentInfo?.section_name ? ` · ${studentInfo.section_name}` : ""}
          </p>
          <h1>Course workspace</h1>
          <p className="lead">
            {studentInfo?.email ? `Logged in as ${studentInfo.email}` : "Ask questions grounded in your course materials."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className="pill">Anonymous by design</span>
          <button className="btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
      <p className="privacy-note">Your identity is not shown to your instructor; results are combined with other students.</p>

      {/* Course Materials */}
      <section className="panel student-card">
        <h2>Course materials</h2>
        <p className="note">Open a document to read it while you work through a question.</p>
        <div className="doc-grid">
          {materials.map(m => (
            <article className="doc-card" key={m.id}>
              {m.file_url ? (
                <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                  {m.filename}
                </a>
              ) : (
                <b>{m.filename}</b>
              )}
              <small>{m.status}</small>
            </article>
          ))}
          {materials.length === 0 && <p className="note">No materials uploaded yet.</p>}
        </div>
      </section>

      {/* Renaissance General Course Tutor */}
      <section className="panel student-card">
        <h2>Ask a question</h2>
        <p className="note">Renaissance answers from the course materials and cites relevant sources.</p>
        <form className="student-form form" onSubmit={ask}>
          <textarea
            aria-label="Your question"
            value={text}
            maxLength={1000}
            onChange={e => setText(e.target.value)}
            placeholder="What would you like to understand about the course?"
          />
          <button className="btn primary" style={{ width: "fit-content" }}>
            Ask Renaissance
          </button>
        </form>
        {messages.map(m => (
          <article key={m.message_id} style={{ marginTop: "16px", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
            <p>
              <b>You:</b> {m.question || ""}
            </p>
            <p>{m.answer}</p>
            <div aria-live="polite">
              {m.feedback === "clear" ? "Marked clear ✓" : m.feedback === "unclear" ? "Marked still unclear ✓" : ""}
            </div>
            <button className="btn btn-small" disabled={feedbackBusy === m.message_id} onClick={() => setFeedback(m.message_id, "clear")}>
              Clear
            </button>{" "}
            <button className="btn btn-small" disabled={feedbackBusy === m.message_id} onClick={() => setFeedback(m.message_id, "unclear")}>
              Still unclear
            </button>
            {feedbackError === m.message_id && (
              <p className="error" role="alert">
                Could not save your choice. Please try again.
              </p>
            )}
          </article>
        ))}
      </section>

      {/* Research Activity (Loops Study) */}
      <section className="panel student-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h2>Loops activity</h2>
            <p className="note">Your study activity and assessment progress are saved securely.</p>
          </div>
          {learner && (
            <div>
              {isControlledAi ? (
                <span className="tag monitor">Research condition: Controlled AI</span>
              ) : (
                <span className="pill">Research condition: Independent (No-AI)</span>
              )}
            </div>
          )}
        </div>

        {researchError && (
          <p className="error" role="alert" style={{ marginTop: "12px" }}>
            {researchError}
          </p>
        )}

        {module ? (
          <div style={{ marginTop: "16px" }}>
            <p>{String(module.title || module.description || "Explore the Loops learning module.")}</p>
            {module.explanation && (
              <div
                className="panel"
                style={{
                  background: "var(--bg)",
                  maxHeight: "380px",
                  overflowY: "auto",
                  fontSize: "13px",
                  padding: "16px 20px",
                  marginTop: "12px",
                }}
              >
                <MarkdownView content={module.explanation} />
              </div>
            )}
            {isSupportedPending && (
              <>
                <div className="callout" style={{ marginTop: "14px", marginBottom: "14px" }}>
                  <div>
                    <b>Study phase ready to begin</b>
                    <p className="note" style={{ margin: "2px 0 0" }}>
                      Review the Loops lessons above. When you are ready, click <b>Start activity</b> below to begin your 20-minute supported practice session.
                    </p>
                  </div>
                </div>
                <button
                  className="btn primary"
                  onClick={startLoops}
                  disabled={researchBusy}
                >
                  {researchBusy ? "Starting practice session…" : "Start activity (20m Timer)"}
                </button>
              </>
            )}
            {isSupportedActive && supportedTask?.expires_at && (
              <div style={{ marginTop: "14px", padding: "10px 14px", background: "var(--acc-soft)", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                <span>Practice Timer:</span>
                <span>{formatRemaining(supportedTask.expires_at)}</span>
              </div>
            )}
          </div>
        ) : (
          <p style={{ marginTop: "12px" }}>Register with a course code to unlock the activity.</p>
        )}

        {/* Empty / Completed State when no tasks are currently pending */}
        {tasks.length === 0 && module && (
          <div className="panel" style={{ marginTop: "18px", background: "var(--bg)", textAlign: "center", padding: "20px 16px" }}>
            <p style={{ fontWeight: 600, color: "var(--ok)", margin: "0 0 6px" }}>
              Current study phase complete
            </p>
            <p className="note" style={{ margin: 0 }}>
              All practice and immediate tasks for this phase have been submitted. Return when subsequent retention evaluations are scheduled.
            </p>
          </div>
        )}

        {/* Task Cards */}
        {tasks.map(task => {
          const isSupported = task.type === "supported";
          const currentCode = taskCodes[task.id] || "";

          return (
            <article key={task.id} className="panel" style={{ marginTop: "20px", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span className="pill">
                  {isSupported ? "Supported practice" : `Assessment: ${task.type}`}
                </span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {task.expires_at && (
                    <span className="tag monitor">
                      Time remaining: {formatRemaining(task.expires_at)}
                    </span>
                  )}
                  {isSupported && isControlledAi && remainingAi !== null && (
                    <span className="tag monitor">
                      {remainingAi > 0 ? `${remainingAi} AI interactions remaining` : "AI limit reached"}
                    </span>
                  )}
                </div>
              </div>

              {!task.started_at && isSupported && (
                <div className="callout" style={{ margin: "10px 0" }}>
                  <div>
                    <b>Session timer ready</b>
                    <p className="note" style={{ margin: "2px 0 0" }}>
                      Click <b>Start activity</b> above to activate your 20-minute countdown clock.
                    </p>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: "12px" }}>
                <MarkdownView content={task.prompt_text} />
              </div>

              {/* Controlled AI Chat Panel for Supported Practice only */}
              {isSupported && isControlledAi && (
                <div
                  className="panel"
                  style={{
                    background: "var(--bg)",
                    marginTop: "16px",
                    border: "1px solid var(--line)",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b>Controlled AI Tutor</b>
                    {remainingAi !== null && (
                      <small className="note">
                        Cap: {remainingAi} remaining
                      </small>
                    )}
                  </div>
                  <p className="note" style={{ margin: "4px 0 10px" }}>
                    Get guidance on your loop syntax and logic. The AI assists your learning but will not solve the assessment for you.
                  </p>

                  {/* AI Conversation Thread */}
                  {aiMessages.length > 0 && (
                    <div style={{ maxHeight: "220px", overflowY: "auto", margin: "10px 0", display: "grid", gap: "8px" }}>
                      {aiMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: msg.role === "user" ? "var(--acc-soft)" : "var(--card)",
                            border: "1px solid var(--line)",
                          }}
                        >
                          <b style={{ color: msg.role === "user" ? "var(--acc)" : "var(--ink)" }}>
                            {msg.role === "user" ? "You" : "AI Tutor"}:
                          </b>{" "}
                          <span style={{ whiteSpace: "pre-wrap" }}>{msg.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {aiError && (
                    <p className="error" role="alert" style={{ margin: "8px 0" }}>
                      {aiError}
                    </p>
                  )}

                  <div className="prompt-chips">
                    {[
                      "Explain the difference between a list and a tuple.",
                      "Walk me through this Python loop step by step.",
                      "Give me a hint without showing the complete answer.",
                      "Create a similar practice question."
                    ].map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        className="prompt-chip"
                        disabled={aiBusy || (remainingAi !== null && remainingAi <= 0)}
                        onClick={() => setAiPrompt(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={e => askResearchAi(e, task.attempt_id)} style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <input
                      type="text"
                      style={{ flex: 1 }}
                      placeholder="Ask the AI tutor about loops..."
                      value={aiPrompt}
                      disabled={aiBusy || (remainingAi !== null && remainingAi <= 0)}
                      onChange={e => setAiPrompt(e.target.value)}
                    />
                    <button
                      className="btn"
                      disabled={aiBusy || !aiPrompt.trim() || (remainingAi !== null && remainingAi <= 0)}
                    >
                      {aiBusy ? "Thinking…" : "Ask AI"}
                    </button>
                  </form>
                  {remainingAi !== null && remainingAi <= 0 && (
                    <p className="note" style={{ marginTop: "6px" }}>
                      AI interaction limit reached for this session.
                    </p>
                  )}
                </div>
              )}

              {/* Code Submission */}
              <div style={{ marginTop: "14px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "12px" }}>
                  Your Python solution:
                </label>
                <textarea
                  aria-label="Assessment code"
                  value={currentCode}
                  onChange={e => setTaskCodes(prev => ({ ...prev, [task.id]: e.target.value }))}
                  placeholder="# Write your Python code here&#10;result = ..."
                  style={{ fontFamily: "monospace", width: "100%", minHeight: "120px" }}
                />
                <button
                  className="btn primary"
                  style={{ marginTop: "10px" }}
                  disabled={researchBusy || !currentCode.trim()}
                  onClick={() => submitTask(task)}
                >
                  Submit assessment
                </button>
                {submissionResults[task.id] && (
                  <div
                    className="panel"
                    style={{
                      marginTop: "12px",
                      borderLeft: submissionResults[task.id].passed ? "4px solid #10b981" : "4px solid #f59e0b",
                      background: "var(--bg)",
                    }}
                    role="status"
                  >
                    <b>{submissionResults[task.id].passed ? "Assessment Passed ✓" : "Assessment Completed"}</b>
                    <p className="note" style={{ margin: "4px 0" }}>
                      Score: {Math.round((submissionResults[task.id].score || 0) * 100)}%
                    </p>
                    {Array.isArray(submissionResults[task.id].feedback) && submissionResults[task.id].feedback.length > 0 && (
                      <ul style={{ margin: "6px 0 0 16px", fontSize: "12px" }}>
                        {submissionResults[task.id].feedback.map((f, fi) => (
                          <li key={fi}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
