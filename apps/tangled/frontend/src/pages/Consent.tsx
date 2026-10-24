import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ConsentStatus, friendlyError } from "../api";

export default function Consent() {
  const navigate = useNavigate();
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    api.studentConsent()
      .then(res => {
        setConsent(res);
        setLoading(false);
      })
      .catch(err => {
        setError(friendlyError(err, "Unable to load consent record. Please log in to your student account."));
        setLoading(false);
      });
  }, []);

  async function handleWithdraw() {
    setBusy(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.withdrawConsent();
      if (res.ok) {
        setConsent(prev => prev ? { ...prev, research_participation_status: "withdrawn", is_participating: false, can_withdraw: false } : null);
        setSuccessMsg("You have successfully withdrawn from the research study. Your course access and materials remain fully available.");
        setShowConfirm(false);
      }
    } catch (err) {
      setError(friendlyError(err, "Could not process withdrawal. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="landing">
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <p className="lead">Loading research consent details…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="landing consent-page" style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 16px" }}>
      <div className="page-heading" style={{ marginBottom: "24px" }}>
        <div>
          <p className="eyebrow">Renaissance Pilot Evaluation · Participant Information</p>
          <h1>Participant Consent & Research Transparency</h1>
          <p className="lead">Review your voluntary research participation, privacy protections, and consent choices.</p>
        </div>
        <button className="btn" onClick={() => navigate(-1)}>
          Back to Workspace
        </button>
      </div>

      {error && (
        <div className="error-banner" role="alert" style={{ marginBottom: "20px", padding: "12px 16px", borderRadius: "6px", background: "var(--danger-bg, #fee2e2)", color: "var(--danger-text, #991b1b)" }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div className="panel" role="status" style={{ marginBottom: "20px", background: "var(--ok-bg, #dcfce7)", color: "var(--ok-text, #166534)", border: "1px solid var(--ok, #22c55e)" }}>
          <b>Status Updated: </b>{successMsg}
        </div>
      )}

      <section className="panel" style={{ marginBottom: "24px" }}>
        <h2>Research Study Details</h2>
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "16px" }}>
          <div className="info-box" style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg)" }}>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Study Title</span>
            <p style={{ margin: "4px 0 0", fontWeight: 500 }}>{consent?.study_name || "Cognitive Load and Generative AI in Introductory Computer Science Education"}</p>
          </div>
          <div className="info-box" style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg)" }}>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Protocol Draft Version</span>
            <p style={{ margin: "4px 0 0", fontWeight: 500 }}>{consent?.protocol_version || "v0.4-pilot-protocol-draft"} (Form: {consent?.consent_version || "v1.0"})</p>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Pre-registration draft for pilot evaluation; not linked to an active IRB approval.</span>
          </div>
          <div className="info-box" style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg)" }}>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Participation Status</span>
            <p style={{ margin: "4px 0 0" }}>
              {consent?.is_participating ? (
                <span className="tag" style={{ background: "#dcfce7", color: "#166534", fontWeight: 600, padding: "2px 8px", borderRadius: "4px" }}>
                  Active Participant (Enrolled)
                </span>
              ) : (
                <span className="tag" style={{ background: "#f3f4f6", color: "#4b5563", fontWeight: 600, padding: "2px 8px", borderRadius: "4px" }}>
                  Withdrawn / Non-Research Status
                </span>
              )}
            </p>
          </div>
          <div className="info-box" style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg)" }}>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Consented On</span>
            <p style={{ margin: "4px 0 0", color: "var(--text)" }}>
              {consent?.consented_at ? new Date(consent.consented_at).toLocaleString() : "Upon Account Registration"}
            </p>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: "24px" }}>
        <h2>Research Ethics, Anonymity & Safeguards</h2>
        <ul style={{ paddingLeft: "20px", lineHeight: "1.6", color: "var(--text)" }}>
          <li>
            <b>Pseudonymous Evaluation:</b> Your interactions with the learning platform are associated solely with an anonymous research learner token. Instructors and teaching assistants cannot view your experimental condition or research survey telemetry.
          </li>
          <li>
            <b>Voluntary Nature:</b> Participation in the learning science evaluation is entirely voluntary. You may withdraw at any time without penalty or loss of benefits.
          </li>
          <li>
            <b>Guaranteed Course Continuity:</b> Withdrawing from the research study does not affect your course standing, grades, or access to any course materials, lectures, notes, or normal course AI tutoring.
          </li>
          <li>
            <b>Research Integrity:</b> All study conditions adhere to pre-registered evaluation parameters to maintain research integrity and learner privacy.
          </li>
        </ul>
      </section>

      <section className="panel" style={{ border: consent?.is_participating ? "1px solid var(--border)" : "1px solid var(--border)" }}>
        <h2>Withdrawal of Consent</h2>
        <p className="note" style={{ marginBottom: "16px" }}>
          If you no longer wish to have your study telemetry included in the educational research cohort, you can withdraw below.
        </p>

        {consent?.is_participating ? (
          showConfirm ? (
            <div style={{ padding: "16px", background: "#fef2f2", border: "1px solid #f87171", borderRadius: "6px" }}>
              <p style={{ fontWeight: 600, color: "#991b1b", margin: "0 0 8px" }}>
                Confirm Research Withdrawal
              </p>
              <p style={{ fontSize: "14px", color: "#7f1d1d", margin: "0 0 16px" }}>
                Are you sure you want to withdraw from the research study? Your normal course workspace, materials, and questions will remain accessible, but all experimental tasks and logging will stop immediately.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn" style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626" }} onClick={handleWithdraw} disabled={busy}>
                  {busy ? "Processing…" : "Yes, Withdraw from Study"}
                </button>
                <button className="btn" onClick={() => setShowConfirm(false)} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="btn" onClick={() => setShowConfirm(true)}>
              Withdraw from research study
            </button>
          )
        ) : (
          <div className="callout">
            <span className="callout-icon">ℹ️</span>
            <div>
              <b>Research tracking is disabled for your account.</b>
              <p className="note" style={{ margin: "2px 0 0" }}>
                You are enrolled in normal course mode. All learning materials, documents, and general tutor features remain active.
              </p>
            </div>
          </div>
        )}
      </section>

      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <Link to="/student" className="btn primary">
          Return to Student Workspace
        </Link>
      </div>
    </main>
  );
}
