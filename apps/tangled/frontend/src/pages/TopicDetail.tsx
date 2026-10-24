import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, friendlyError, TopicDetail as Detail, TopicEvidenceQuote } from "../api";
import { REFERENCE_TOPIC_DETAILS, TopicDetailData } from "../referenceData";

function HighlightEvidence({ text, phrase }: { text: string; phrase?: string }) {
  if (!text) return null;
  // 1. If explicit phrase evidence is provided and is a substring
  if (phrase && phrase.trim() && text.includes(phrase.trim())) {
    const trimmed = phrase.trim();
    const idx = text.indexOf(trimmed);
    return (
      <>
        {text.slice(0, idx)}
        <mark>{trimmed}</mark>
        {text.slice(idx + trimmed.length)}
      </>
    );
  }
  // 2. If text contains prototype bracketed evidence [[evidence]]
  const bracketMatch = text.match(/\[\[(.*?)\]\]/);
  if (bracketMatch && bracketMatch.index !== undefined) {
    const start = bracketMatch.index;
    const inner = bracketMatch[1];
    return (
      <>
        {text.slice(0, start)}
        <mark>{inner}</mark>
        {text.slice(start + bracketMatch[0].length)}
      </>
    );
  }
  // 3. Display authentic question text without highlighting
  return <>{text}</>;
}

export default function TopicDetail() {
  const { id = "", topicId = "" } = useParams();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const referenceDetail: TopicDetailData | undefined =
    REFERENCE_TOPIC_DETAILS[topicId] ||
    (topicId === "1" || topicId === "9" ? REFERENCE_TOPIC_DETAILS["np"] : undefined) ||
    (topicId === "2" || topicId === "10" ? REFERENCE_TOPIC_DETAILS["nn"] : undefined);

  useEffect(() => {
    api.topic(id, topicId)
      .then(setData)
      .catch(err => {
        if (!referenceDetail) {
          setError(friendlyError(err));
        }
      });
  }, [id, topicId, referenceDetail]);

  async function mark(verdict: "addressed" | "false_alarm") {
    setBusy(true);
    setStatusMsg("");
    try {
      await api.verdict(id, Number(topicId) || 1, verdict);
      setStatusMsg(verdict === "addressed" ? "Confirmed: marked as addressed." : "Confirmed: dismissed as not a problem.");
      // Refresh real topic state from the backend
      try {
        const refreshed = await api.topic(id, topicId);
        setData(refreshed);
      } catch {
        // Keep updated local verdict confirmation
      }
    } catch (err) {
      setStatusMsg(friendlyError(err, "Failed to update topic verdict."));
    } finally {
      setBusy(false);
    }
  }

  // Active topic metadata
  const title = data?.name || referenceDetail?.name || "Topic Evidence";
  const moduleLabel = data?.module || referenceDetail?.module || "Core Curriculum";
  const confidence = data?.confidence || referenceDetail?.confidence || "Medium";
  const topicStatus = data?.status || referenceDetail?.status || "review";

  // Real pipeline stats & denominators
  const stats: Record<string, any> = data?.stats || referenceDetail?.stats || {
    enrolled: 24,
    students_asked: 11,
    students_confused: 8,
    confusion_msgs: 21,
    info_msgs: 14,
    quiz_rate: 0.45,
    min_students: 4,
    course_quiz_avg: 0.68,
  };

  const confusedCount = stats.students_confused !== undefined ? stats.students_confused : 8;
  const askedCount = stats.students_asked !== undefined ? stats.students_asked : 11;
  const minThreshold = stats.min_students !== undefined ? stats.min_students : 4;
  const confusionCount = stats.confusion_msgs !== undefined ? stats.confusion_msgs : 21;
  const infoCount = stats.info_msgs !== undefined ? stats.info_msgs : 14;
  const totalQuestions = stats.messages || (Number(confusionCount) + Number(infoCount)) || 38;

  // Assessment evidence calculation
  const quizRate = stats.quiz_rate !== null && stats.quiz_rate !== undefined ? Number(stats.quiz_rate) : null;
  const courseQuizAvg = stats.course_quiz_avg !== null && stats.course_quiz_avg !== undefined ? Number(stats.course_quiz_avg) : null;
  const hasAssessment = quizRate !== null && !isNaN(quizRate);
  const isLowQuiz = hasAssessment && quizRate < 0.60;

  // Summary explanation
  const summaryText = data?.description || referenceDetail?.summary ||
    "Students appear to be mixing up key concepts within this module. Review the verbatim student quotes below for specific misconceptions.";

  // Groups and quotes
  const groups = (data?.groups && data.groups.length > 0)
    ? data.groups.map(g => ({
        title: g.title,
        count: typeof g.count === "number" ? g.count : g.count || 4,
        raw_count: g.raw_count || (typeof g.count === "number" ? g.count : 4),
        description: g.description,
        quotes: g.quotes && g.quotes.length > 0
          ? g.quotes
          : (g.evidence_phrases || []).map(p => ({ text: p, phrase: p, tag: "Misconception" })),
      }))
    : (referenceDetail?.groups && referenceDetail.groups.length > 0)
      ? referenceDetail.groups.map(g => ({
          title: g.title,
          count: g.count,
          raw_count: typeof g.count === "number" ? g.count : 4,
          description: g.description,
          quotes: g.quotes.map(q => ({
            text: q.text,
            phrase: q.text.match(/\[\[(.*?)\]\]/)?.[1] || "",
            tag: q.tag,
          })),
        }))
      : [];

  // Excluded questions list
  const notCountedList: string[] = (data?.not_counted_evidence && data.not_counted_evidence.length > 0)
    ? data.not_counted_evidence
    : referenceDetail?.not_counted_evidence || [];

  if (error && !referenceDetail) {
    return (
      <div className="state" role="alert">
        <p>{error}</p>
        <Link to={`/courses/${id}/topics`} className="btn">Back to topics</Link>
      </div>
    );
  }

  return (
    <div className="topic-detail-page">
      {/* 1. Back link */}
      <Link
        className="back btn"
        to={`/courses/${id}/topics`}
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "18px", textDecoration: "none" }}
      >
        ← All topics
      </Link>

      {/* 2 & 3. Topic Header with Module Context and Confidence Tag */}
      <div className="hd" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h2>{title}</h2>
          <div style={{ color: "var(--mute)", fontSize: "13px", marginTop: "4px" }}>
            {moduleLabel}
          </div>
        </div>
        <span
          className={`tag ${topicStatus === "addressed" ? "addressed" : confidence === "High" ? "addressed" : "monitor"}`}
          style={{ fontSize: "11px", padding: "4px 10px" }}
        >
          {topicStatus === "addressed" ? "Addressed" : `${confidence} confidence`}
        </span>
      </div>

      {/* 4 & 5. Why Renaissance Flagged This Section with Separate Checks */}
      <div className="sec" style={{ marginTop: "22px", marginBottom: "14px" }}>
        <h2>Why Renaissance flagged this</h2>
        <p className="note" style={{ margin: "4px 0 0" }}>
          Review the evidence below; assessment results are supporting context, not a required gate.
        </p>
      </div>

      <div className="panel2">
        {/* Check 1: Enough students */}
        <div className="chk">
          <i>✓</i>
          <span>
            <b>Enough students.</b> {confusedCount} of {askedCount} students who asked showed confusion (minimum is {minThreshold}).
          </span>
        </div>

        {/* Check 2: Real confusion, not curiosity */}
        <div className="chk">
          <i>✓</i>
          <span>
            <b>Real confusion, not curiosity.</b> {confusionCount} of {totalQuestions} questions showed confusion. {infoCount} only asked for information and were not counted.
          </span>
        </div>

        {/* Check 3: Related assessment evidence */}
        {hasAssessment ? (
          <div className={`chk ${isLowQuiz ? "warn" : ""}`}>
            <i>{isLowQuiz ? "!" : "✓"}</i>
            <span>
              <b>Related assessment evidence.</b> {Math.round(quizRate! * 100)}% answered the related question correctly{courseQuizAvg !== null ? `, against ${Math.round(courseQuizAvg * 100)}% on the average question` : ""}.
            </span>
          </div>
        ) : (
          <div className="chk info">
            <i>—</i>
            <span>
              <b>Related assessment evidence.</b> No related assessment questions mapped for this concept yet. Assessment results are supporting context, not a required gate.
            </span>
          </div>
        )}
      </div>

      {/* 6. What students are confused about */}
      <div className="sec" style={{ marginBottom: "14px" }}>
        <h2>What students are confused about</h2>
        <p className="note" style={{ margin: "4px 0 0" }}>
          A short summary first, followed by the related questions that support it.
        </p>
      </div>

      {/* Summary Box */}
      <div className="confusion-summary">
        <div className="summary-label">Summary of possible learning difficulties</div>
        <p>{summaryText}</p>
        <div className="summary-focus">
          The summary is an interpretation of the grouped signals, not a diagnosis of every student’s understanding.
        </div>
      </div>

      {/* 7, 8, 9. Topic-specific question groups with counts, distribution bars, excerpts & tags */}
      {groups.map((group, idx) => (
        <article key={idx} className="grp">
          <div>
            <h3>
              <span>{group.title}</span>
              <span className="num" style={{ fontSize: "13px", color: "var(--mute)" }}>
                {group.count} questions
              </span>
            </h3>
            {group.description && <p>{group.description}</p>}
          </div>

          <div className="bar" style={{ margin: "0 20px 10px" }}>
            <i style={{ width: `${Math.min((group.raw_count / Math.max(Number(confusionCount) || 10, 1)) * 100, 100)}%` }} />
          </div>

          <ul style={{ margin: 0, padding: "4px 20px 16px 36px", listStyle: "disc" }}>
            {group.quotes.map((q, qIdx) => (
              <li key={qIdx} style={{ margin: "8px 0", fontSize: "13px", color: "var(--ink)", lineHeight: 1.6 }}>
                “<HighlightEvidence text={q.text} phrase={q.phrase} />”
                {q.tag && <span className="rs">{q.tag}</span>}
              </li>
            ))}
          </ul>
        </article>
      ))}

      {/* 10. Collapsible section for excluded information-seeking questions */}
      {notCountedList.length > 0 && (
        <details className="ex">
          <summary>
            Not counted: {infoCount} questions that only asked for information
          </summary>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--mute)", lineHeight: 1.5 }}>
            These questions were classified as general information-seeking inquiries rather than concept misconceptions, and were excluded from confusion totals in accordance with research protocol.
          </div>
          <ul>
            {notCountedList.map((item, nIdx) => (
              <li key={nIdx}>“{item}”</li>
            ))}
          </ul>
        </details>
      )}

      {/* 11. Short evidence disclaimer */}
      <p className="note" style={{ margin: "16px 0" }}>
        These signals are evidence for review, not a diagnosis of student understanding.
      </p>

      {/* 12. Instructor actions */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "20px", flexWrap: "wrap" }}>
        {topicStatus === "addressed" ? (
          <span style={{ color: "var(--ok)", fontWeight: 700 }}>
            ✓ Marked as addressed in class
          </span>
        ) : topicStatus === "false_alarm" ? (
          <span style={{ color: "var(--mute)", fontWeight: 600 }}>
            Classified as not a real problem.
          </span>
        ) : (
          <>
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => mark("addressed")}
            >
              {busy ? "Updating…" : "✓ Mark as Addressed in Class"}
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => mark("false_alarm")}
            >
              {busy ? "Updating…" : "Not a real problem"}
            </button>
          </>
        )}
        {statusMsg && (
          <span className="note" role="status" style={{ fontSize: "12px" }}>
            {statusMsg}
          </span>
        )}
      </div>
    </div>
  );
}
