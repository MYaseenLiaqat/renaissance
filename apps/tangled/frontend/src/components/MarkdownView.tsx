import React, { ReactNode } from "react";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

/**
 * Safely decodes known HTML entities without double-decoding or corrupting code.
 */
function decodeEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&#x0*A;/gi, "\n")
    .replace(/&#0*10;/g, "\n")
    .replace(/&#x0*D;/gi, "\r")
    .replace(/&#0*13;/g, "\r")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Converts common LaTeX and mathematical notations (e.g. \text{base}, \times, \[0, N)$, \frac{a}{b})
 * into clean, readable plain text and unicode mathematical symbols.
 */
export function cleanLatex(input: string): string {
  if (!input) return "";
  let text = input;

  // 1. \textbf{word} -> **word**, \textit{word} -> *word*, \text{word} -> word
  text = text.replace(/\\textbf\{([^}]+)\}/g, "**$1**");
  text = text.replace(/\\textit\{([^}]+)\}/g, "*$1*");
  text = text.replace(/\\(?:text|mathrm|mathbf|mathit)\{([^}]+)\}/g, "$1");

  // 2. Fractions: \frac{a}{b} -> (a / b)
  text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)");

  // 3. Square roots: \sqrt{x} -> √(x)
  text = text.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");

  // 4. Mathematical and comparison symbols
  const latexSymbols: [RegExp, string][] = [
    [/\\times/g, "×"],
    [/\\cdot/g, "·"],
    [/\\pm/g, "±"],
    [/\\mp/g, "∓"],
    [/\\div/g, "÷"],
    [/\\leq?/g, "≤"],
    [/\\geq?/g, "≥"],
    [/\\neq?/g, "≠"],
    [/\\approx/g, "≈"],
    [/\\equiv/g, "≡"],
    [/\\sim/g, "~"],
    [/\\in/g, "∈"],
    [/\\notin/g, "∉"],
    [/\\subset(?:eq)?/g, "⊆"],
    [/\\cup/g, "∪"],
    [/\\cap/g, "∩"],
    [/\\emptyset/g, "∅"],
    [/\\forall/g, "∀"],
    [/\\exists/g, "∃"],
    [/\\rightarrow/g, "→"],
    [/\\to\b/g, "→"],
    [/\\leftarrow/g, "←"],
    [/\\Rightarrow/g, "⇒"],
    [/\\Leftarrow/g, "⇐"],
    [/\\sum/g, "∑"],
    [/\\prod/g, "∏"],
    [/\\infty/g, "∞"],
    [/\\partial/g, "∂"],
    [/\\nabla/g, "∇"],
    [/\\ldots/g, "…"],
    [/\\cdots/g, "…"],
    [/\\dots/g, "…"],
    [/\\alpha/g, "α"],
    [/\\beta/g, "β"],
    [/\\gamma/g, "γ"],
    [/\\delta/g, "δ"],
    [/\\epsilon/g, "ε"],
    [/\\theta/g, "θ"],
    [/\\lambda/g, "λ"],
    [/\\mu/g, "μ"],
    [/\\pi/g, "π"],
    [/\\sigma/g, "σ"],
    [/\\omega/g, "ω"],
    [/\\Delta/g, "Δ"],
    [/\\Sigma/g, "Σ"],
    [/\\Omega/g, "Ω"],
    [/\\_/g, "_"],
  ];

  for (const [pattern, replacement] of latexSymbols) {
    text = text.replace(pattern, replacement);
  }

  // 5. Clean up bracket delimiters: \[0, N)$ or \[ 0, N ) -> [0, N)
  text = text.replace(/\\\[\s*/g, "[");
  text = text.replace(/\s*\\\]/g, "]");
  text = text.replace(/\\\(\s*/g, "(");
  text = text.replace(/\s*\\\)/g, ")");

  // 6. Strip isolated dollar signs around math phrases: $base + i * 4$ -> base + i * 4
  text = text.replace(/\$\$([^\n$]+)\$\$/g, "$1");
  text = text.replace(/(?<!\$)\$(?!\$)([^\n$]+)\$/g, "$1");

  return text;
}

/**
 * Renders inline markdown formatting (**bold**, *italic*, `code`) and math safely into React nodes.
 */
export function renderInline(rawText: string): ReactNode[] {
  if (!rawText) return [];
  // Tokenize code spans first so inline code is preserved verbatim
  const codeRegex = /(`[^`]+`)/g;
  const parts = rawText.split(codeRegex);
  const nodes: ReactNode[] = [];

  parts.forEach((part, partIdx) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code
          key={`code-${partIdx}`}
          style={{
            background: "var(--bg, #f1f5f9)",
            border: "1px solid var(--border, #e2e8f0)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontFamily: "monospace",
            fontSize: "0.88em",
            wordBreak: "break-word",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
      return;
    }

    // Apply LaTeX math cleaning to non-code prose
    const cleanedText = cleanLatex(part);

    // Now tokenize bold (**text**) and italic (*text*)
    const formatRegex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = formatRegex.exec(cleanedText)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(cleanedText.slice(lastIndex, match.index));
      }
      const token = match[0];
      const key = `${partIdx}-${match.index}-${token.length}`;
      if (token.startsWith("**") && token.endsWith("**")) {
        nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith("*") && token.endsWith("*")) {
        nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
      }
      lastIndex = match.index + token.length;
    }

    if (lastIndex < cleanedText.length) {
      nodes.push(cleanedText.slice(lastIndex));
    }
  });

  return nodes.length > 0 ? nodes : [rawText];
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  const rawCells = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|");
  return rawCells.map(c => c.trim());
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|") || !trimmed.includes("-")) return false;
  const cells = parseTableRow(trimmed);
  return cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c));
}

type Block =
  | { type: "code"; lang: string; code: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "heading"; level: number; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "paragraph"; text: string };

function parseBlocks(rawContent: string): Block[] {
  const normalized = decodeEntities(rawContent).replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code Block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing fence
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      continue;
    }

    // Markdown Table
    if (
      line.trim().startsWith("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headers = parseTableRow(line);
      i += 2; // skip header and separator
      const rows: string[][] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        !isTableSeparator(lines[i])
      ) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // Headings: #, ##, ###
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Unordered or Ordered List items
    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const isOrdered = /^\d+\./.test(listMatch[2]);
      const items: string[] = [listMatch[3].trim()];
      i++;
      while (i < lines.length) {
        const nextList = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        if (nextList && /^\d+\./.test(nextList[2]) === isOrdered) {
          items.push(nextList[3].trim());
          i++;
        } else if (lines[i].trim() === "") {
          break;
        } else {
          break;
        }
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].match(/^#{1,6}\s+/) &&
      !(lines[i].trim().startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) &&
      !lines[i].match(/^(\s*)([-*]|\d+\.)\s+/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  return blocks;
}

export default function MarkdownView({ content, className }: MarkdownViewProps) {
  if (!content) return null;
  const blocks = parseBlocks(content);

  return (
    <div className={`markdown-view ${className || ""}`} style={{ color: "var(--ink)", lineHeight: 1.6 }}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "code":
            return (
              <pre
                key={idx}
                className={`code-block language-${block.lang || "python"}`}
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "14px 16px",
                  overflowX: "auto",
                  margin: "14px 0",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  lineHeight: 1.45,
                }}
              >
                <code>{block.code}</code>
              </pre>
            );

          case "table":
            return (
              <div
                key={idx}
                style={{
                  overflowX: "auto",
                  margin: "16px 0",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                }}
              >
                <table
                  className="table markdown-table"
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                    fontSize: "13px",
                  }}
                >
                  <thead style={{ background: "var(--bg)" }}>
                    <tr>
                      {block.headers.map((h, i) => (
                        <th
                          key={i}
                          style={{
                            padding: "8px 12px",
                            borderBottom: "1px solid var(--line)",
                            fontWeight: 600,
                          }}
                        >
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        style={{
                          borderBottom: ri < block.rows.length - 1 ? "1px solid var(--line)" : "none",
                        }}
                      >
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding: "8px 12px" }}>
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "heading": {
            const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
            return (
              <Tag
                key={idx}
                style={{
                  marginTop: block.level === 1 ? "20px" : "16px",
                  marginBottom: "8px",
                  color: "var(--ink)",
                }}
              >
                {renderInline(block.text)}
              </Tag>
            );
          }

          case "list": {
            const ListTag = block.ordered ? "ol" : "ul";
            return (
              <ListTag key={idx} style={{ paddingLeft: "22px", margin: "10px 0" }}>
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} style={{ marginBottom: "4px" }}>
                    {renderInline(item)}
                  </li>
                ))}
              </ListTag>
            );
          }

          case "paragraph":
            return (
              <p key={idx} style={{ margin: "10px 0" }}>
                {renderInline(block.text)}
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
