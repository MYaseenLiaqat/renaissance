import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarkdownView, { renderInline } from "../components/MarkdownView";

describe("MarkdownView component", () => {
  it("renders semantic headings correctly", () => {
    const content = "# Lesson 1: Introduction\n\n## Subheading\n\n### Details";
    render(<MarkdownView content={content} />);

    expect(screen.getByRole("heading", { level: 2, name: "Lesson 1: Introduction" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Subheading" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Details" })).toBeInTheDocument();
  });

  it("renders bold, italic, and inline code correctly", () => {
    const content = "This is **bold text** and this is *italic text* and `result = 0`.";
    const { container } = render(<MarkdownView content={content} />);

    const strong = container.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe("bold text");

    const em = container.querySelector("em");
    expect(em).not.toBeNull();
    expect(em?.textContent).toBe("italic text");

    const code = container.querySelector("code");
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe("result = 0");
  });

  it("renders fenced Python examples as code blocks", () => {
    const pythonCode = "numbers = [10, 20, 30]\nfor n in numbers:\n    print(n)";
    const content = "```python\n" + pythonCode + "\n```";
    const { container } = render(<MarkdownView content={content} />);

    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre?.className).toContain("language-python");
    expect(pre?.textContent).toContain("for n in numbers:");
  });

  it("renders Markdown tables as actual HTML tables", () => {
    const tableContent =
      "| iteration | current value | condition | result |\n" +
      "| --- | --- | --- | --- |\n" +
      "| 1 | 28 | False | 0 |\n" +
      "| 2 | 32 | True | 1 |";

    render(<MarkdownView content={tableContent} />);

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    const columnHeaders = screen.getAllByRole("columnheader");
    expect(columnHeaders).toHaveLength(4);
    expect(columnHeaders[0].textContent).toBe("iteration");
    expect(columnHeaders[1].textContent).toBe("current value");
    expect(columnHeaders[2].textContent).toBe("condition");
    expect(columnHeaders[3].textContent).toBe("result");

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3); // 1 header row + 2 data rows
    expect(screen.getByText("28")).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
  });

  it("decodes escaped newline sequences without corrupting content", () => {
    const contentWithEscapes =
      "# Lesson 1&#xA;&#xA;Line 1&#xA;Line 2&#10;Line 3";
    render(<MarkdownView content={contentWithEscapes} />);

    expect(screen.getByRole("heading", { level: 2, name: "Lesson 1" })).toBeInTheDocument();
    expect(screen.getByText(/Line 1 Line 2 Line 3/)).toBeInTheDocument();
  });

  it("prevents unsafe HTML injection while preserving text", () => {
    const xssContent = "Hello <script>alert('xss')</script> <img src=x onerror=alert(1)> world";
    const { container } = render(<MarkdownView content={xssContent} />);

    // Script tags or onerror attributes must not be rendered into the DOM as active executable elements
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<script>alert('xss')</script>");
  });

  it("converts raw LaTeX expressions into readable mathematical text", () => {
    const content =
      "In zero-based indexing, the offset is calculated as $\\text{base} + i \\times \\text{element\\_size}$, spanning the index interval \\[0, N)$. Also check \\frac{a}{b} and \\le.";
    const { container } = render(<MarkdownView content={content} />);

    expect(container.textContent).toContain("base + i × element_size");
    expect(container.textContent).toContain("[0, N)");
    expect(container.textContent).toContain("(a / b)");
    expect(container.textContent).toContain("≤");
    expect(container.textContent).not.toContain("\\text");
    expect(container.textContent).not.toContain("\\times");
    expect(container.textContent).not.toContain("\\[");
  });
});
