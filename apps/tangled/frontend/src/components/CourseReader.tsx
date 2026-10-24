import React, { useEffect, useState } from "react";
import { api, MaterialContent, StudentMaterial } from "../api";
import MarkdownView from "./MarkdownView";

interface CourseReaderProps {
  material: StudentMaterial | null;
  materials?: StudentMaterial[];
  onSelectMaterial?: (materialId: number) => void;
  className?: string;
}

export default function CourseReader({
  material,
  materials = [],
  onSelectMaterial,
  className = "",
}: CourseReaderProps) {
  const [mode, setMode] = useState<"text" | "pdf">("text");
  const [content, setContent] = useState<MaterialContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!material?.id) {
      setContent(null);
      return;
    }
    setLoading(true);
    setError("");
    api.materialContent(material.id)
      .then(res => {
        setContent(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : "Unable to load document text.");
        setLoading(false);
      });
  }, [material?.id]);

  if (!material) {
    return (
      <div className={`panel ${className}`} style={{ padding: "40px 20px", textAlign: "center" }}>
        <p className="note">Select a course material from the list to begin reading.</p>
      </div>
    );
  }

  const matName = material.filename || "Course Reading";
  const fileUrl = content?.file_url || material.file_url;

  return (
    <div
      className={`course-reader-card ${className}`}
      style={{
        background: "var(--card-bg, #ffffff)",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Document Header & Selector Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border, #e2e8f0)",
          background: "#fafafa",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ minWidth: "200px" }}>
          <span className="pill" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
            Course Document
          </span>
          <h2 style={{ margin: "4px 0 0", fontSize: "17px", fontWeight: 700, color: "var(--text, #0f172a)" }}>
            {matName}
          </h2>
        </div>

        {materials.length > 1 && onSelectMaterial && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label htmlFor="material-picker" style={{ fontSize: "12px", color: "var(--muted, #64748b)", fontWeight: 600 }}>
              Switch:
            </label>
            <select
              id="material-picker"
              value={material.id}
              onChange={(e) => onSelectMaterial(Number(e.target.value))}
              style={{
                padding: "4px 8px",
                fontSize: "13px",
                borderRadius: "6px",
                border: "1px solid var(--border, #cbd5e1)",
                background: "#ffffff",
              }}
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.filename}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Reader Controls Bar: Text / PDF Toggle + Direct Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
          borderBottom: "1px solid var(--border, #e2e8f0)",
          background: "var(--bg, #f8fafc)",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Mode Toggle Buttons */}
        <div
          role="tablist"
          aria-label="Document View Mode"
          style={{
            display: "inline-flex",
            borderRadius: "6px",
            border: "1px solid var(--border, #cbd5e1)",
            padding: "2px",
            background: "#ffffff",
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "text"}
            onClick={() => setMode("text")}
            style={{
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: mode === "text" ? 600 : 500,
              border: "none",
              borderRadius: "4px",
              background: mode === "text" ? "var(--acc)" : "transparent",
              color: mode === "text" ? "#ffffff" : "var(--mute)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Text Reader
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "pdf"}
            onClick={() => setMode("pdf")}
            style={{
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: mode === "pdf" ? 600 : 500,
              border: "none",
              borderRadius: "4px",
              background: mode === "pdf" ? "var(--acc)" : "transparent",
              color: mode === "pdf" ? "#ffffff" : "var(--mute)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Embedded PDF
          </button>
        </div>

        {/* External Actions */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {fileUrl && (
            <>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-small"
                style={{ fontSize: "12px", textDecoration: "none", padding: "4px 10px" }}
              >
                Open Original PDF in New Tab ↗
              </a>
              <a
                href={fileUrl}
                download={material.filename}
                className="btn btn-small"
                style={{ fontSize: "12px", textDecoration: "none", padding: "4px 10px" }}
              >
                Download
              </a>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {mode === "text" ? (
        <div
          className="course-reader-scrollable"
          style={{
            height: "calc(100vh - 220px)",
            minHeight: "560px",
            overflowY: "auto",
            padding: "24px 28px",
            background: "#ffffff",
          }}
        >
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 16px" }}>
              <p className="note" style={{ fontSize: "14px" }}>Loading authentic document text…</p>
            </div>
          ) : error ? (
            <div style={{ padding: "24px", color: "var(--error, #dc2626)" }}>
              <p style={{ margin: "0 0 12px" }}>Failed to extract document text: {error}</p>
              {fileUrl && (
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => setMode("pdf")}
                >
                  Switch to Embedded PDF
                </button>
              )}
            </div>
          ) : content && content.sections && content.sections.length > 0 ? (
            <div>
              {content.sections.map((sec, idx) => (
                <article
                  key={`sec-${idx}`}
                  style={{
                    marginBottom: idx < content.sections.length - 1 ? "28px" : "0",
                    paddingBottom: idx < content.sections.length - 1 ? "24px" : "0",
                    borderBottom: idx < content.sections.length - 1 ? "1px solid var(--border, #e2e8f0)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <span
                      className="pill"
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        background: "var(--bg, #f1f5f9)",
                        color: "var(--text, #334155)",
                        border: "1px solid var(--border, #cbd5e1)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {sec.label}
                    </span>
                  </div>
                  <div style={{ lineHeight: 1.7, fontSize: "14px", color: "var(--text, #1e293b)" }}>
                    <MarkdownView content={sec.content} />
                  </div>
                </article>
              ))}
            </div>
          ) : content?.full_text ? (
            <div style={{ lineHeight: 1.7, fontSize: "14px", color: "var(--text, #1e293b)" }}>
              <MarkdownView content={content.full_text} />
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "48px 16px" }}>
              <p className="note">
                Document text indexed into semantic vector database for grounded course Q&A.
              </p>
              {fileUrl && (
                <button
                  type="button"
                  className="btn btn-small primary"
                  onClick={() => setMode("pdf")}
                  style={{ marginTop: "12px" }}
                >
                  View Embedded PDF
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Embedded PDF Viewer Mode */
        <div
          style={{
            height: "calc(100vh - 220px)",
            minHeight: "560px",
            display: "flex",
            flexDirection: "column",
            background: "#525659",
          }}
        >
          {fileUrl ? (
            <iframe
              src={fileUrl}
              title={`Embedded Document - ${matName}`}
              width="100%"
              style={{
                flex: 1,
                border: "none",
                minHeight: "560px",
              }}
            />
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#ffffff" }}>
              <p>No preview file URL available for this material.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
