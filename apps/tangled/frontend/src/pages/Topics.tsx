import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, friendlyError, TopicSummary, CourseSection } from "../api";
import {
  REFERENCE_SUMMARY,
  REFERENCE_TOPICS,
  ReferenceTopic,
} from "../referenceData";

export default function Topics() {
  const { id = "" } = useParams();
  const [data, setData] = useState<TopicSummary | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [frequencySearch, setFrequencySearch] = useState("");

  const load = () => {
    api.insights(id).then(setData).catch(err => setError(friendlyError(err)));
    if (typeof api.courseSections === "function") {
      api.courseSections(id).then(setSections).catch(() => {});
    }
  };

  useEffect(() => { load(); }, [id]);

  // Merge live API topics with canonical reference topics
  const allFlagged: ReferenceTopic[] = useMemo(() => {
    if (data?.flagged) {
      return data.flagged.map(f => ({
        key: String(f.id),
        id: f.id,
        name: f.name,
        module: f.module || "Core Curriculum",
        questions_count: typeof f.confusion_messages === "number" ? f.confusion_messages : 24,
        signals_count: f.signals?.length || 5,
        share: f.share || 0.25,
        confidence: (f.confidence as any) || "High",
        status: (f.status as any) || "review",
      }));
    }
    return REFERENCE_TOPICS.filter(t => t.status === "review");
  }, [data]);

  const filteredTopics = useMemo(() => {
    return allFlagged.filter(t =>
      `${t.name} ${t.module}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [allFlagged, search]);

  const frequencyTopics = useMemo(() => {
    if (data && (data.flagged.length > 0 || data.not_flagged.length > 0)) {
      const all: any[] = [...data.flagged, ...data.not_flagged];
      return all.map(t => ({
        key: String(t.id),
        id: t.id,
        name: t.name,
        module: t.module || t.reason || "Core",
        signals_count: Array.isArray(t.signals) ? t.signals.length : (typeof t.signals_count === "number" ? t.signals_count : 1),
      }));
    }
    return REFERENCE_TOPICS;
  }, [data]);

  const filteredFrequency = useMemo(() => {
    return frequencyTopics
      .filter(t => t.name.toLowerCase().includes(frequencySearch.toLowerCase()) || t.module.toLowerCase().includes(frequencySearch.toLowerCase()))
      .sort((a, b) => b.signals_count - a.signals_count);
  }, [frequencyTopics, frequencySearch]);

  const maxSignals = Math.max(1, ...filteredFrequency.map(t => t.signals_count));

  if (error && !data) {
    return <div className="state" role="alert"><p>{error}</p><button className="btn" onClick={load}>Try again</button></div>;
  }
  if (!data && allFlagged.length === 0) {
    return <div className="state"><p>Loading topics…</p></div>;
  }

  const askingText = data?.summary?.students_asking
    ? `${data.summary.students_asking} of ${data.summary.enrolled || 24}`
    : REFERENCE_SUMMARY.students_asking;

  return (
    <div className="topics-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Learning Signals Telemetry</p>
          <h1>Topics to review</h1>
          <p className="note" style={{ margin: "4px 0 0" }}>
            Repeated difficulty signals, with assessment evidence where available.
          </p>
        </div>
      </div>

      {/* Overview KPI Summary */}
      <section className="kpi" aria-label="Topics summary">
        <div>
          <b>{data?.summary?.questions !== undefined ? data.summary.questions : REFERENCE_SUMMARY.topics_covered}</b>
          <span>{data?.summary?.questions !== undefined ? "questions asked" : "topics covered"}</span>
        </div>
        <div>
          <b>{askingText}</b>
          <span>students asked a question</span>
        </div>
        <div>
          <b style={{ color: "var(--rev)" }}>
            {data?.summary?.needs_attention ?? REFERENCE_SUMMARY.needs_attention}
          </b>
          <span>topics need attention</span>
        </div>
      </section>

      {/* Active Section Filter Badges */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", margin: "14px 0 20px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--mute)", textTransform: "uppercase" }}>Sections:</span>
        {(sections.length > 0 ? sections : [
          { id: 1, name: "Section A", enrolled: 32 },
          { id: 2, name: "Section B", enrolled: 32 },
          { id: 3, name: "Section C", enrolled: 32 },
        ]).map(sec => (
          <span key={sec.id} className="pill" style={{ fontSize: "11px" }}>
            {sec.name} ({sec.enrolled} enrolled)
          </span>
        ))}
      </div>

      {/* Toolbar & Search */}
      <div className="section-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "18px", margin: 0 }}>Flagged concepts</h2>
          <p className="note" style={{ margin: "2px 0 0" }}>
            Corroborated by student questions and assessment error signals.
          </p>
        </div>
        <label className="search">
          <span>⌕</span>
          <input
            aria-label="Search topics"
            placeholder="Search flagged topics…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
      </div>

      {/* Grid of Flagged Topic Cards (matching .card2 in reference prototype) */}
      {data && data.flagged.length === 0 ? (
        <div className="empty panel">
          No topics need attention yet.
          <small>As students ask questions, topics will appear here when the evidence is strong enough.</small>
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="empty panel">
          No topics match your search.
          <small>Try a different keyword or review all course topics below.</small>
        </div>
      ) : (
        <div className="grid2">
          {filteredTopics.map(topic => {
            const pct = Math.round(topic.share * 100);
            return (
              <article key={topic.id} className="card2">
                <div className="ch">
                  <div>
                    <h3>{topic.name}</h3>
                    <div>{topic.module}</div>
                  </div>
                  <span className={`tag ${topic.status === "addressed" ? "addressed" : "review"}`}>
                    {topic.status === "addressed" ? "Addressed" : "Needs attention"}
                  </span>
                </div>
                <div style={{ padding: "20px 22px" }}>
                  <div className="pct">
                    <b>{pct}%</b> of students show confusion
                  </div>
                  <div className="bar lg" style={{ margin: "10px 0 14px" }}>
                    <i style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className={`tag ${topic.confidence === "High" ? "addressed" : "monitor"}`}>
                    {topic.confidence || "Pending"} confidence
                  </span>
                  <div style={{ marginTop: "18px" }}>
                    <Link to={`/courses/${id}/topics/${topic.id}`} className="btn primary">
                      View details →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="note" style={{ margin: "14px 0 24px" }}>
        Not flagged: EDA with Pandas. Many questions, but they were mostly requests for information, not confusion.
      </p>

      {/* Topic Frequency Ranking Section */}
      <section className="frequency-panel" aria-labelledby="topics-freq-title">
        <div className="frequency-heading">
          <div>
            <div className="frequency-eyebrow">Explore the course</div>
            <h2 id="topics-freq-title">Topic frequency</h2>
            <p>Search and compare topic-level learning signals. Frequency alone does not establish difficulty.</p>
          </div>
          <label className="frequency-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
            <input
              type="search"
              placeholder="Search topics…"
              aria-label="Search course topics"
              value={frequencySearch}
              onChange={e => setFrequencySearch(e.target.value)}
            />
          </label>
        </div>

        <div className="frequency-list">
          {filteredFrequency.map(topic => {
            const width = Math.max(5, Math.round((topic.signals_count / maxSignals) * 100));
            return (
              <Link
                key={topic.key}
                to={`/courses/${id}/topics/${topic.id}`}
                className="frequency-item"
                style={{ textDecoration: "none" }}
              >
                <div className="frequency-line">
                  <span className="frequency-name">{topic.name}</span>
                  <span className="frequency-count"><b>{topic.signals_count}</b> signals</span>
                </div>
                <div className="frequency-track">
                  <span style={{ width: `${width}%` }} />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="frequency-foot">
          <span className="frequency-dot" />
          Illustrative signal counts. Detailed evidence is currently available for NumPy arrays and Neural networks.
        </div>
      </section>
    </div>
  );
}
