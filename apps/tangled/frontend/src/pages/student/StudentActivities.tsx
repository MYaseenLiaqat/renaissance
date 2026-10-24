import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  api,
  friendlyError,
  ResearchLearner,
  ResearchTask,
  SubmitOut,
  ConsentStatus,
  LearnerStatus
} from "../../api";
import MarkdownView from "../../components/MarkdownView";

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

export default function StudentActivities() {
  const { courseId } = useParams<{ courseId: string }>();

  // Research State
  const [learner, setLearner] = useState<ResearchLearner | null>(null);
  const [learnerStatus, setLearnerStatus] = useState<LearnerStatus | null>(null);
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [module, setModule] = useState<any>(null);
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchError, setResearchError] = useState("");

  // Submissions
  const [taskCodes, setTaskCodes] = useState<Record<number, string>>({});
  const [submissionResults, setSubmissionResults] = useState<Record<number, SubmitOut>>({});

  // Controlled AI Chat (for controlled_ai condition)
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [remainingAi, setRemainingAi] = useState<number | null>(null);

  // Live timer tick
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  async function loadData() {
    try {
      const [l, status, cons, mod, tList] = await Promise.all([
        api.researchLearner().catch(() => null),
        api.researchLearnerStatus().catch(() => null),
        api.studentConsent().catch(() => null),
        api.researchLoops().catch(() => null),
        api.researchTasks().catch(() => []),
      ]);
      setLearner(l);
      setLearnerStatus(status);
      setConsent(cons);
      setModule(mod);
      setTasks(tList);

      const supported = tList.find(t => t.type === "supported");
      if (supported && supported.remaining_interactions !== undefined) {
        setRemainingAi(supported.remaining_interactions);
      } else if (l?.ai_interaction_cap !== undefined && l?.ai_interaction_cap !== null) {
        setRemainingAi(l.ai_interaction_cap);
      }
    } catch (err) {
      setResearchError(friendlyError(err, "Failed to load study activity."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [courseId]);

  // Determine Canonical Activity Phase State Machine
  const isWithdrawn = consent?.research_participation_status === "withdrawn" || learner?.participation_status === "withdrawn";
  const supportedTask = tasks.find(t => t.type === "supported");
  const immediateTask = tasks.find(t => t.type === "immediate");

  let activityState: "withdrawn" | "ready" | "active" | "immediate_unlocked" | "completed" | "expired" = "ready";

  if (isWithdrawn) {
    activityState = "withdrawn";
  } else if (supportedTask) {
    if (!supportedTask.started_at) {
      activityState = "ready";
    } else {
      const isExpired = supportedTask.expires_at && new Date(supportedTask.expires_at).getTime() <= Date.now();
      activityState = isExpired ? "expired" : "active";
    }
  } else if (immediateTask) {
    activityState = "immediate_unlocked";
  } else {
    // Neither supported nor immediate is currently due
    activityState = "completed";
  }

  async function handleStartActivity() {
    if (activityState !== "ready") return;
    setResearchBusy(true);
    setResearchError("");
    try {
      const res = await api.startResearchLoops();
      if (res && typeof res === "object" && "module" in res) {
        setModule((res as any).module);
      } else {
        setModule(res);
      }
      const updatedTasks = await api.researchTasks();
      setTasks(updatedTasks);
      const supported = updatedTasks.find(t => t.type === "supported");
      if (supported && supported.remaining_interactions !== undefined) {
        setRemainingAi(supported.remaining_interactions);
      }
    } catch (err) {
      // If server returns already completed / expired or conflict, reload gracefully
      await loadData();
      setResearchError(friendlyError(err, "Could not start activity session."));
    } finally {
      setResearchBusy(false);
    }
  }

  async function handleSubmitTask(task: ResearchTask) {
    const code = taskCodes[task.id] || "";
    if (!code.trim() || researchBusy) return;
    setResearchBusy(true);
    setResearchError("");
    try {
      if (task.type !== "supported" && !task.started_at) {
        await api.startResearchTask(task.id);
      }
      const result = await api.submitResearchTask(task.id, code);
      setSubmissionResults(prev => ({ ...prev, [task.id]: result }));
      const updated = await api.researchTasks();
      setTasks(updated);
      setTaskCodes(prev => ({ ...prev, [task.id]: "" }));
    } catch (err) {
      setResearchError(friendlyError(err, "Submission could not be evaluated."));
    } finally {
      setResearchBusy(false);
    }
  }

  async function handleAskAi(e: FormEvent, attemptId: number) {
    e.preventDefault();
    if (!aiPrompt.trim() || aiBusy) return;
    const msg = aiPrompt.trim();
    setAiPrompt("");
    setAiBusy(true);
    setAiError("");
    setAiMessages(prev => [...prev, { role: "user", text: msg }]);

    try {
      const res = await api.researchAiChat(attemptId, msg);
      setAiMessages(prev => [...prev, { role: "assistant", text: res.response }]);
      setRemainingAi(res.remaining_interactions);
    } catch (err) {
      setAiError(friendlyError(err, "Research AI tutor query failed."));
    } finally {
      setAiBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
        <p className="lead">Loading Loops learning activity…</p>
      </div>
    );
  }

  const isControlledAi = learner?.condition === "controlled_ai";

  return (
    <div>
      <nav aria-label="Breadcrumb" style={{ marginBottom: "16px", fontSize: "13px", color: "var(--muted)" }}>
        <Link to="/student/courses" style={{ color: "var(--primary)", textDecoration: "none" }}>Courses</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <Link to={`/student/courses/${courseId}`} style={{ color: "var(--primary)", textDecoration: "none" }}>Course</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span style={{ color: "var(--text)", fontWeight: 500 }}>Loops Study Activity</span>
      </nav>

      {/* Header Banner */}
      <div className="page-heading" style={{ marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">Cognitive Load & AI Study Module</p>
          <h1>Loops & Iteration Learning Activity</h1>
          <p className="lead">Interactive practice, concept explanations, and pre-registered assessment phases.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isWithdrawn ? (
            <span className="pill">
              Research Withdrawn (Normal Mode)
            </span>
          ) : isControlledAi ? (
            <span className="tag addressed" style={{ fontWeight: 600, padding: "4px 10px" }}>
              Condition: Controlled AI Tutor
            </span>
          ) : (
            <span className="pill" style={{ fontWeight: 600, padding: "4px 10px" }}>
              Condition: Independent Practice
            </span>
          )}
        </div>
      </div>

      {researchError && (
        <div className="error-banner" role="alert" style={{ marginBottom: "20px", padding: "12px 16px", borderRadius: "6px", background: "#fee2e2", color: "#991b1b" }}>
          {researchError}
        </div>
      )}

      {/* State Machine Status Panel */}
      <section className="panel" style={{ marginBottom: "24px", background: "var(--card-bg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: "18px" }}>Activity Phase Status</h2>
            <p className="note" style={{ margin: 0 }}>
              {activityState === "ready" && "Review the lesson materials below. When ready, begin your 20-minute practice session."}
              {activityState === "active" && "Your 20-minute practice session is actively running. Review lessons and submit your solution."}
              {activityState === "immediate_unlocked" && "Immediate assessment unlocked! Complete the coding prompt below without AI assistance."}
              {activityState === "completed" && "Current study phase complete! Review your results or return for scheduled delayed evaluations."}
              {activityState === "withdrawn" && "You have withdrawn from the research study. Practice problems remain available without tracking."}
              {activityState === "expired" && "Supported session time has elapsed. Please proceed to the immediate assessment."}
            </p>
          </div>

          <div>
            {activityState === "ready" && (
              <button
                className="btn primary"
                onClick={handleStartActivity}
                disabled={researchBusy}
                style={{ padding: "10px 20px", fontWeight: 600 }}
              >
                {researchBusy ? "Starting Session…" : "Start Activity (20m Timer)"}
              </button>
            )}
            {activityState === "active" && supportedTask?.expires_at && (
              <div style={{
                background: "#fef3c7",
                border: "1px solid #f59e0b",
                color: "#92400e",
                padding: "8px 16px",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>Time Remaining:</span>
                <span>{formatRemaining(supportedTask.expires_at)}</span>
              </div>
            )}
            {activityState === "completed" && (
              <span className="tag" style={{ background: "#dcfce7", color: "#166534", fontWeight: 600, padding: "6px 12px", borderRadius: "6px" }}>
                ✓ Phase Completed
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Learning Material / Explanation */}
      {module && (
        <section className="panel" style={{ marginBottom: "24px" }}>
          <h2>{String(module.title || module.description || "Loops Learning Materials")}</h2>
          {module.explanation && (
            <div style={{
              background: "var(--bg, #f9fafb)",
              maxHeight: "360px",
              overflowY: "auto",
              padding: "16px 20px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              marginTop: "14px"
            }}>
              <MarkdownView content={module.explanation} />
            </div>
          )}
        </section>
      )}

      {/* Active Tasks Grid */}
      {tasks.length > 0 && (
        <section className="panel" style={{ marginBottom: "24px" }}>
          <h2>Current Tasks & Assessment Prompts</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px" }}>
            {tasks.map(task => {
              const result = submissionResults[task.id];
              const isTaskActive = Boolean(task.started_at);

              return (
                <div key={task.id} style={{
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "20px",
                  background: "var(--card-bg)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <span className="pill" style={{ textTransform: "uppercase", fontSize: "11px", fontWeight: 600 }}>
                        {task.type} Task
                      </span>
                      <h3 style={{ margin: "6px 0 0", fontSize: "16px" }}>
                        {task.type === "supported" ? "Supported Coding Practice" : "Immediate Assessment Problem"}
                      </h3>
                    </div>
                    {task.expires_at && (
                      <span className="pill" style={{ fontSize: "11px" }}>
                        Time: {formatRemaining(task.expires_at)}
                      </span>
                    )}
                  </div>

                  <div style={{
                    background: "var(--bg)",
                    padding: "14px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    marginBottom: "16px",
                    fontSize: "14px"
                  }}>
                    <MarkdownView content={task.prompt_text} />
                  </div>

                  {/* Submission Code Area */}
                  <div>
                    <label htmlFor={`code-${task.id}`} style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                      Your Python Solution:
                    </label>
                    <textarea
                      id={`code-${task.id}`}
                      rows={6}
                      value={taskCodes[task.id] || ""}
                      onChange={e => setTaskCodes(prev => ({ ...prev, [task.id]: e.target.value }))}
                      placeholder="# Write your Python code here&#10;def solution():&#10;    ..."
                      style={{
                        width: "100%",
                        fontFamily: "monospace",
                        fontSize: "13px",
                        padding: "12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        boxSizing: "border-box"
                      }}
                      disabled={researchBusy}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                      <button
                        className="btn primary"
                        onClick={() => handleSubmitTask(task)}
                        disabled={researchBusy || !(taskCodes[task.id] || "").trim()}
                      >
                        {researchBusy ? "Evaluating…" : "Submit & Grade Solution"}
                      </button>
                    </div>
                  </div>

                  {/* Grader Result Banner */}
                  {result && (
                    <div style={{
                      marginTop: "16px",
                      padding: "14px",
                      borderRadius: "6px",
                      background: result.passed ? "#f0fdf4" : "#fef2f2",
                      border: result.passed ? "1px solid #86efac" : "1px solid #fca5a5"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, color: result.passed ? "#166534" : "#991b1b" }}>
                          {result.passed ? "✓ Passed Unit Tests" : "✕ Unit Tests Failed"} (Score: {(result.score * 100).toFixed(0)}%)
                        </span>
                      </div>
                      {result.feedback && result.feedback.length > 0 && (
                        <ul style={{ margin: "8px 0 0", paddingLeft: "20px", fontSize: "13px", color: result.passed ? "#166534" : "#991b1b" }}>
                          {result.feedback.map((f, idx) => (
                            <li key={idx}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Controlled AI Tutor Chat Box (Supported Task only) */}
                  {isControlledAi && task.type === "supported" && isTaskActive && (
                    <div style={{
                      marginTop: "20px",
                      paddingTop: "16px",
                      borderTop: "1px dashed var(--border)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontWeight: 600, fontSize: "14px" }}>Controlled AI Study Tutor</span>
                        <span className="pill" style={{ fontSize: "11px" }}>
                          Interactions remaining: {remainingAi ?? "N/A"}
                        </span>
                      </div>

                      {aiMessages.length > 0 && (
                        <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                          {aiMessages.map((m, i) => (
                            <div key={i} style={{
                              padding: "8px 12px",
                              borderRadius: "6px",
                              fontSize: "13px",
                              background: m.role === "user" ? "var(--primary)" : "var(--bg)",
                              color: m.role === "user" ? "#ffffff" : "var(--text)",
                              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                              maxWidth: "85%"
                            }}>
                              {m.text}
                            </div>
                          ))}
                        </div>
                      )}

                      {aiError && (
                        <p className="error" role="alert" style={{ fontSize: "12px", margin: "6px 0" }}>
                          {aiError}
                        </p>
                      )}

                      <form onSubmit={e => handleAskAi(e, task.attempt_id)} style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="Ask the study tutor a question…"
                          value={aiPrompt}
                          onChange={e => setAiPrompt(e.target.value)}
                          disabled={aiBusy || (remainingAi !== null && remainingAi <= 0)}
                          style={{ flex: 1, padding: "8px 12px", fontSize: "13px", borderRadius: "6px", border: "1px solid var(--border)" }}
                        />
                        <button
                          type="submit"
                          className="btn"
                          disabled={aiBusy || !aiPrompt.trim() || (remainingAi !== null && remainingAi <= 0)}
                          style={{ fontSize: "13px" }}
                        >
                          {aiBusy ? "Sending…" : "Ask Tutor"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Delayed Assessment Scheduler Status */}
      {learnerStatus?.has_future_assessments && (
        <section className="panel" style={{ background: "var(--bg)", textAlign: "center", padding: "24px" }}>
          <p style={{ fontWeight: 600, fontSize: "15px", margin: "0 0 6px" }}>
            Subsequent Assessment Scheduled
          </p>
          <p className="note" style={{ margin: 0 }}>
            Your delayed retention assessment is scheduled for{" "}
            <b>{learnerStatus.next_assessment_at ? new Date(learnerStatus.next_assessment_at).toLocaleString() : "24 hours after practice"}</b>.
            Return at that time to complete the retention measurement.
          </p>
        </section>
      )}
    </div>
  );
}
