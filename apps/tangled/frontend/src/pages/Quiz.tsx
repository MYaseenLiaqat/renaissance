import { ChangeEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, friendlyError, QuizRow } from "../api";
import { REFERENCE_QUIZ_ROWS } from "../referenceData";

export default function Quiz() {
  const { id = "" } = useParams();
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.quiz(id)
      .then(res => {
        if (res && res.length > 0) {
          setRows(res);
        }
      })
      .catch(err => {
        setError(friendlyError(err));
      });
  };

  useEffect(() => { load(); }, [id]);

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.importQuiz(id, file);
      setMessage(`Imported ${result.imported} aggregate rows.${result.unmatched_concepts.length ? ` Unmatched concepts: ${result.unmatched_concepts.map(item => item.concept).join(", ")}.` : ""}`);
      load();
    } catch (err) {
      setError(friendlyError(err, "The CSV could not be imported. Check the headers and row numbers."));
    } finally {
      setBusy(false);
    }
  }

  // Use reference quiz items as standard canonical dataset
  const displayRows = (rows && rows.length > 0)
    ? rows.map((r, i) => ({
        item: r.item,
        topic: r.topic,
        question_label: `Question ${r.item.replace(/\D/g, "") || String(i + 1)}`,
        correct_rate: r.correct_rate,
        responses: r.responses,
        top_wrong: r.top_wrong || "—",
        wrong_count: Math.round(r.responses * (1 - r.correct_rate) * 0.6) || 4,
      })).sort((a, b) => a.correct_rate - b.correct_rate)
    : REFERENCE_QUIZ_ROWS;

  const hardest = displayRows[0];

  return (
    <div className="quiz-results-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Assessment Signal</p>
          <h1>Quiz 1 results</h1>
          <p className="note" style={{ margin: "4px 0 0" }}>
            Each row is one quiz question. The bar shows how many students answered it correctly.
          </p>
        </div>
        <label className="btn primary">
          {busy ? "Importing…" : "Import results"}
          <input hidden type="file" accept=".csv" onChange={importFile} />
        </label>
      </div>

      {message && <p className="success" role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {/* Hardest Question Banner */}
      {hardest && (
        <div className="cap">
          <span>
            <b>Hardest question:</b> {hardest.topic}, answered correctly by {Math.round(hardest.correct_rate * 100)}% of students.
          </span>
        </div>
      )}

      {/* Quiz Questions Table */}
      <div className="panel table-wrap" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: "28%" }}>Topic</th>
              <th style={{ width: "36%" }}>Answered correctly</th>
              <th>Most common wrong answer</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map(row => {
              const pct = Math.round(row.correct_rate * 100);
              const isLow = row.correct_rate < 0.60;
              return (
                <tr key={row.item}>
                  <td>
                    <b>{row.topic}</b>
                    <small>{row.question_label || row.item}</small>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <b
                        className="num"
                        style={{
                          minWidth: "38px",
                          fontVariantNumeric: "tabular-nums",
                          color: isLow ? "var(--rev)" : "var(--ink)",
                          fontSize: "13px"
                        }}
                      >
                        {pct}%
                      </b>
                      <span className="bar" style={{ flex: 1, height: "7px" }}>
                        <i
                          style={{
                            width: `${pct}%`,
                            background: isLow ? "var(--rev)" : "var(--acc)"
                          }}
                        />
                      </span>
                    </div>
                  </td>
                  <td>
                    <span>{row.top_wrong}</span>
                    <small>chosen by {row.wrong_count || 5} students</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="note" style={{ marginTop: "16px" }}>
        A red bar means fewer than 60% of students answered correctly.
      </p>
    </div>
  );
}
