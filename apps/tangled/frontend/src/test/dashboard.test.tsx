import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, friendlyError } from "../api";
import Topics from "../pages/Topics";
import TopicDetail from "../pages/TopicDetail";
import Quiz from "../pages/Quiz";
import TopicsSetup from "../pages/TopicsSetup";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    api: {
      insights: vi.fn(),
      topic: vi.fn(),
      verdict: vi.fn().mockResolvedValue({ ok: true }),
      quiz: vi.fn(),
      importQuiz: vi.fn(),
      topicList: vi.fn(),
      createTopic: vi.fn(),
      updateTopic: vi.fn(),
      deleteTopic: vi.fn(),
      courseSections: vi.fn().mockResolvedValue([]),
    },
  };
});

describe("dashboard", () => {
  beforeEach(() => { cleanup(); vi.clearAllMocks(); });

  it("turns API detail errors into friendly text", () => {
    expect(friendlyError(new Error('{"detail":"The CSV is invalid"}'))).toBe("The CSV is invalid");
    expect(friendlyError(new Error('{"detail":[{"msg":"row 2 is invalid"}]}'))).toBe("row 2 is invalid");
  });

  it("displays API masking such as fewer than 5 without calculating a smaller count", async () => {
    vi.mocked(api.insights).mockResolvedValue({ summary: { questions: "fewer than 5", students_asking: "fewer than 5", enrolled: 20, needs_attention: 1 }, flagged: [{ id: 1, name: "Foundations", module: "Module 1", share: .2, confidence: "Medium", students_confused: "fewer than 5", confusion_messages: "fewer than 5", status: "review", signals: [], evidence_phrases: [] }], not_flagged: [] });
    render(<MemoryRouter initialEntries={["/courses/1/topics"]}><Routes><Route path="/courses/:id/topics" element={<Topics />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("fewer than 5")).toBeInTheDocument());
    expect(screen.queryByText("4")).not.toBeInTheDocument();
  });

  it("renders the empty topics state", async () => {
    vi.mocked(api.insights).mockResolvedValue({ summary: { questions: 0, students_asking: 0, enrolled: 20, needs_attention: 0 }, flagged: [], not_flagged: [] });
    render(<MemoryRouter initialEntries={["/courses/1/topics"]}><Routes><Route path="/courses/:id/topics" element={<Topics />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("No topics need attention yet.")).toBeInTheDocument();
  });

  it("renders loaded topic cards and detail highlights", async () => {
    vi.mocked(api.insights).mockResolvedValue({ summary: { questions: 8, students_asking: 6, enrolled: 20, needs_attention: 1 }, flagged: [{ id: 1, name: "Foundations", module: "Module 1", share: .3, confidence: "High", students_confused: 6, confusion_messages: 8, status: "review", signals: ["quiz correct rate below threshold"], evidence_phrases: [] }], not_flagged: [] });
    vi.mocked(api.topic).mockResolvedValue({ id: 1, name: "Foundations", module: "Module 1", confidence: "High", tier: "needs_attention", status: "review", stats: { confusion_msgs: 8 }, share: .3, share_lower: .2, signals: ["quiz correct rate below threshold"], groups: [{ title: "Core idea", count: 3, evidence_phrases: ["I am confused about this foundation"] }], not_counted_evidence: [] });
    render(<MemoryRouter initialEntries={["/courses/1/topics/1"]}><Routes><Route path="/courses/:id/topics/:topicId" element={<TopicDetail />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("I am confused about this foundation")).toBeInTheDocument();
  });

  it("renders quiz results", async () => {
    vi.mocked(api.quiz).mockResolvedValue([{ item: "Q1", topic: "Foundations", correct_rate: .5, responses: 10, options: {}, top_wrong: "B" }]);
    render(<MemoryRouter initialEntries={["/courses/1/quiz"]}><Routes><Route path="/courses/:id/quiz" element={<Quiz />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Foundations")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders the topic setup list and empty state", async () => {
    vi.mocked(api.topicList).mockResolvedValueOnce([{ id: 1, name: "Foundations", module_label: "Module 1", description: "Core foundations." }]);
    render(<MemoryRouter initialEntries={["/courses/1/setup"]}><Routes><Route path="/courses/:id/setup" element={<TopicsSetup />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Foundations")).toBeInTheDocument();
    vi.mocked(api.topicList).mockResolvedValueOnce([]);
    cleanup();
    render(<MemoryRouter initialEntries={["/courses/1/setup"]}><Routes><Route path="/courses/:id/setup" element={<TopicsSetup />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("No topics yet.")).toBeInTheDocument();
  });

  it("renders evidence checks, highlighted phrases, tags, excluded questions, and instructor actions", async () => {
    vi.mocked(api.topic).mockResolvedValue({
      id: 9,
      name: "While Loop Iteration",
      module: "Control Flow",
      description: "Students confuse loop scope and accumulator updates.",
      confidence: "High",
      tier: "needs_attention",
      status: "review",
      stats: {
        enrolled: 96,
        students_asked: 7,
        students_confused: 6,
        confusion_msgs: 6,
        info_msgs: 1,
        quiz_rate: 0.37,
        min_students: 4,
        course_quiz_avg: 0.69,
      },
      share: 0.062,
      share_lower: 0.03,
      signals: ["quiz correct rate below threshold"],
      groups: [
        {
          title: "While Loop Counter Issues",
          count: 6,
          raw_count: 6,
          description: "Variable increments omitted or misplaced.",
          evidence_phrases: ["counter remain at 1"],
          quotes: [
            {
              id: 13,
              text: "Why does my counter remain at 1 inside the while loop?",
              phrase: "counter remain at 1",
              tag: "Misconception",
            },
            {
              id: 14,
              text: "My loop runs forever and the counter never passes 1.",
              phrase: "loop runs forever",
              tag: "Asked again after an answer",
            },
          ],
        },
      ],
      not_counted_evidence: ["How do half-open intervals work in Python list slicing?"],
    });

    render(
      <MemoryRouter initialEntries={["/courses/4/topics/9"]}>
        <Routes>
          <Route path="/courses/:id/topics/:topicId" element={<TopicDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("While Loop Iteration")).toBeInTheDocument();
    expect(screen.getByText("Control Flow")).toBeInTheDocument();
    expect(screen.getByText("High confidence")).toBeInTheDocument();

    expect(screen.getByText(/Enough students\./)).toBeInTheDocument();
    expect(screen.getByText(/6 of 7 students who asked showed confusion/)).toBeInTheDocument();
    expect(screen.getByText(/Real confusion, not curiosity\./)).toBeInTheDocument();
    expect(screen.getByText(/6 of 7 questions showed confusion/)).toBeInTheDocument();
    expect(screen.getByText(/Related assessment evidence\./)).toBeInTheDocument();
    expect(screen.getByText(/37% answered the related question correctly/)).toBeInTheDocument();

    expect(screen.getByText("While Loop Counter Issues")).toBeInTheDocument();
    expect(screen.getByText("counter remain at 1")).toBeInTheDocument();
    expect(screen.getByText("Misconception")).toBeInTheDocument();
    expect(screen.getByText("Asked again after an answer")).toBeInTheDocument();

    expect(screen.getByText(/Not counted: 1 questions that only asked for information/)).toBeInTheDocument();
    expect(screen.getByText(/How do half-open intervals work in Python list slicing\?/)).toBeInTheDocument();

    const markBtn = screen.getByText("✓ Mark as Addressed in Class");
    expect(markBtn).toBeInTheDocument();
  });
});
