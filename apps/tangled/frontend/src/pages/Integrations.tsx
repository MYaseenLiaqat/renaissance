import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, friendlyError, IntegrationOverview } from "../api";

export default function Integrations() {
  const { id } = useParams<{ id?: string }>();
  const [integrations, setIntegrations] = useState<IntegrationOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingName, setTestingName] = useState<string | null>(null);
  const [syncingName, setSyncingName] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  function loadStatuses() {
    api.integrationsStatus()
      .then(res => {
        setIntegrations(res);
        setLoading(false);
      })
      .catch(err => {
        setError(friendlyError(err, "Unable to load integration health statuses."));
        setLoading(false);
      });
  }

  useEffect(() => {
    loadStatuses();
  }, []);

  async function handleTest(name: string) {
    setTestingName(name);
    setActionMessage(null);
    setError("");
    try {
      const res = await api.testIntegration(name);
      if ((res as any).mode === "live") {
        setActionMessage(`${name.toUpperCase()}: Live connection verified (${(res as any).latency_ms}ms latency).`);
      } else {
        setActionMessage(`${name.toUpperCase()}: Mock contract schema validated. (No live upstream server configured).`);
      }
      loadStatuses();
    } catch (err) {
      setError(friendlyError(err, `Connection test for ${name} failed.`));
    } finally {
      setTestingName(null);
    }
  }

  async function handleSync(name: string) {
    setSyncingName(name);
    setActionMessage(null);
    setError("");
    try {
      const res = await api.syncIntegration(name, id ? Number(id) : undefined);
      setActionMessage(`${name.toUpperCase()}: Contract execution simulated (${(res as any).roster_sync?.status || "OK"}). No live data written.`);
      loadStatuses();
    } catch (err) {
      setError(friendlyError(err, `Sync with ${name} failed.`));
    } finally {
      setSyncingName(null);
    }
  }

  return (
    <div className="integrations-page" style={{ maxWidth: "1080px", margin: "0 auto" }}>
      <div className="page-heading" style={{ marginBottom: "24px" }}>
        <div>
          <p className="eyebrow">Enterprise LMS & SIS Connectors</p>
          <h1>Institutional Integrations</h1>
          <p className="lead">Architectural connectors for student rosters, gradebook exports, and institutional LMS curricula.</p>
        </div>
      </div>

      <div className="callout" style={{ marginBottom: "24px" }}>
        <span className="callout-icon">ℹ️</span>
        <div>
          <b>Audit Transparency Notice:</b>
          <p className="note" style={{ margin: "2px 0 0" }}>
            The connectors below implement verified schema and API payload contracts. They operate in <b>Contract Verification Mode</b> until live institutional server endpoints (such as university Moodle Web Services or SAP S/4HANA SLcM gateways) and institutional credentials are configured in the environment.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert" style={{ marginBottom: "20px", padding: "12px 16px", borderRadius: "6px", background: "#fee2e2", color: "#991b1b" }}>
          {error}
        </div>
      )}

      {actionMessage && (
        <div className="panel" role="status" style={{ marginBottom: "20px", background: "#f0fdf4", color: "#166534", border: "1px solid #86efac", padding: "14px 18px", borderRadius: "6px" }}>
          <b>Diagnostic Result: </b>{actionMessage}
        </div>
      )}

      {loading ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <p className="lead">Loading institutional connectors…</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "24px", marginBottom: "32px" }}>
          {integrations.map(adapter => (
            <article key={adapter.name} className="panel" style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "8px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <span className="pill" style={{ textTransform: "uppercase", fontSize: "11px", fontWeight: 700 }}>
                      {adapter.category} Connector
                    </span>
                    <h2 style={{ margin: "6px 0 0", fontSize: "18px" }}>{adapter.display_name}</h2>
                  </div>
                  <span className="tag" style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "11px",
                    background: adapter.health === "healthy" ? "#dcfce7" : "#fef3c7",
                    color: adapter.health === "healthy" ? "#166534" : "#92400e"
                  }}>
                    {adapter.health === "healthy" ? "● Live Host Active" : "◌ Mock Contract Ready"}
                  </span>
                </div>

                <p className="note" style={{ lineHeight: "1.5", margin: "0 0 16px" }}>
                  {adapter.description}
                </p>

                <div style={{ background: "var(--bg)", padding: "12px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "var(--muted)" }}>API Specification:</span>
                    <span style={{ fontWeight: 600 }}>{adapter.version}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "var(--muted)" }}>Live Host Status:</span>
                    <span style={{ fontWeight: 600, color: adapter.health === "healthy" ? "var(--ok)" : "var(--muted)" }}>
                      {adapter.health === "healthy" ? "Connected" : "Not configured in env"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Last Health Check:</span>
                    <span>{new Date(adapter.last_checked).toLocaleTimeString()}</span>
                  </div>
                </div>

                {adapter.details && (
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 16px" }}>
                    {adapter.details}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                <button
                  className="btn"
                  onClick={() => handleTest(adapter.name)}
                  disabled={testingName === adapter.name || syncingName === adapter.name}
                  style={{ flex: 1, fontSize: "13px" }}
                >
                  {testingName === adapter.name ? "Testing…" : "Test Contract"}
                </button>
                <button
                  className="btn"
                  onClick={() => handleSync(adapter.name)}
                  disabled={testingName === adapter.name || syncingName === adapter.name}
                  style={{ flex: 1, fontSize: "13px" }}
                >
                  {syncingName === adapter.name ? "Simulating…" : "Simulate Sync"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Standards & Enterprise Contracts */}
      <section className="panel" style={{ padding: "24px" }}>
        <h2>LTI 1.3 Advantage & Standards Compliance</h2>
        <p className="note" style={{ marginBottom: "16px" }}>
          Renaissance specifies 1EdTech LTI 1.3 Core and Assignment and Grade Services (AGS) contract interfaces for integration with Canvas, Blackboard, Moodle, and Brightspace.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          <div style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "14px" }}>Names and Role Provisioning (NRPS)</h3>
            <p className="note" style={{ margin: 0, fontSize: "12px" }}>
              Designed to provision pseudonymous student accounts while preserving institutional privacy guarantees.
            </p>
          </div>
          <div style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "14px" }}>Assignment and Grade Services (AGS)</h3>
            <p className="note" style={{ margin: 0, fontSize: "12px" }}>
              Specification for transferring formative mastery and retention evaluation scores into the native institutional gradebook.
            </p>
          </div>
          <div style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: "6px", background: "var(--bg)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "14px" }}>SAP SLcM OData Gateway</h3>
            <p className="note" style={{ margin: 0, fontSize: "12px" }}>
              Specifically targets SAP S/4HANA Higher Education & Research SLcM OData service (<code>SLCM_ACADEMIC_SERVICES_SRV</code>).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
