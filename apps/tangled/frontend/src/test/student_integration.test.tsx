import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import Join from "../pages/Join";
import Student from "../pages/Student";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    api: {
      studentMe: vi.fn(),
      loginStudent: vi.fn(),
      registerStudent: vi.fn(),
      joinInfo: vi.fn(),
      studentMaterials: vi.fn(),
      studentMessages: vi.fn(),
      researchLearner: vi.fn(),
      researchLoops: vi.fn(),
      researchTasks: vi.fn(),
      startResearchTask: vi.fn(),
      researchAiChat: vi.fn(),
      submitResearchTask: vi.fn(),
      startResearchLoops: vi.fn(),
      chat: vi.fn(),
      feedback: vi.fn(),
    },
  };
});

describe("student integration", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Join page & returning student login", () => {
    it("renders returning student login when initialMode='login'", async () => {
      render(
        <MemoryRouter initialEntries={["/student/login"]}>
          <Join initialMode="login" />
        </MemoryRouter>
      );

      expect(screen.getByRole("heading", { name: "Student login" })).toBeInTheDocument();
      expect(screen.getByPlaceholderText("you@university.edu")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Your password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    });

    it("can toggle between new registration and returning student login", async () => {
      render(
        <MemoryRouter initialEntries={["/join"]}>
          <Join initialMode="register" />
        </MemoryRouter>
      );

      expect(screen.getByRole("heading", { name: "Join course" })).toBeInTheDocument();
      const loginToggle = screen.getByRole("button", { name: /Already registered\? Log in to your course/i });
      fireEvent.click(loginToggle);

      expect(screen.getByRole("heading", { name: "Student login" })).toBeInTheDocument();
      const registerToggle = screen.getByRole("button", { name: /Register \/ Join/i });
      fireEvent.click(registerToggle);

      expect(screen.getByRole("heading", { name: "Join course" })).toBeInTheDocument();
    });

    it("authenticates returning student and stores session token", async () => {
      vi.mocked(api.loginStudent).mockResolvedValue({
        access_token: "mock-jwt-token-xyz",
        course_name: "CS101",
      });

      render(
        <MemoryRouter initialEntries={["/student/login"]}>
          <Join initialMode="login" />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText("you@university.edu"), {
        target: { value: "student@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Your password"), {
        target: { value: "mypassword123" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Log in" }));

      await waitFor(() => {
        expect(api.loginStudent).toHaveBeenCalledWith("student@example.com", "mypassword123");
        expect(localStorage.getItem("student_token")).toBe("mock-jwt-token-xyz");
      });
    });

    it("shows helpful error on invalid credentials", async () => {
      vi.mocked(api.loginStudent).mockRejectedValue(new Error('{"detail":"Invalid email or password"}'));

      render(
        <MemoryRouter initialEntries={["/student/login"]}>
          <Join initialMode="login" />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText("you@university.edu"), {
        target: { value: "student@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Your password"), {
        target: { value: "wrongpassword" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Log in" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password");
      });
    });
  });

  describe("Student workspace and research condition AI restrictions", () => {
    it("renders session prompt if no student session is present", async () => {
      render(
        <MemoryRouter initialEntries={["/student"]}>
          <Student />
        </MemoryRouter>
      );

      expect(await screen.findByText("You are not currently logged in with an active course session.")).toBeInTheDocument();
    });

    it("renders Controlled AI condition and chat panel for controlled_ai learner", async () => {
      localStorage.setItem("student_token", "valid-token");
      vi.mocked(api.studentMe).mockResolvedValue({
        id: 1,
        email: "alice@university.edu",
        course_name: "CS101",
        course_id: 10,
      });
      vi.mocked(api.studentMaterials).mockResolvedValue([]);
      vi.mocked(api.studentMessages).mockResolvedValue([]);
      vi.mocked(api.researchLearner).mockResolvedValue({
        id: 42,
        condition: "controlled_ai",
        participation_status: "active",
        ai_interaction_cap: 8,
      });
      vi.mocked(api.researchLoops).mockResolvedValue({
        id: 1,
        title: "Loops Module",
        description: "Learn Python loops",
      });
      vi.mocked(api.researchTasks).mockResolvedValue([
        {
          id: 101,
          concept_id: 1,
          type: "supported",
          prompt_text: "Write a for loop that sums 1 to 5.",
          scheduled_for: "2026-10-23T19:00:00Z",
          remaining_interactions: 8,
          attempt_id: 201,
        },
      ]);

      render(
        <MemoryRouter initialEntries={["/student"]}>
          <Student />
        </MemoryRouter>
      );

      expect(await screen.findByText("Research condition: Controlled AI")).toBeInTheDocument();
      expect(screen.getByText("8 AI interactions remaining")).toBeInTheDocument();
      expect(screen.getByText("Controlled AI Tutor")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Ask the AI tutor about loops...")).toBeInTheDocument();
    });

    it("renders No-AI condition and hides AI chat panel for no_ai participant", async () => {
      localStorage.setItem("student_token", "valid-token");
      vi.mocked(api.studentMe).mockResolvedValue({
        id: 2,
        email: "bob@university.edu",
        course_name: "CS101",
        course_id: 10,
      });
      vi.mocked(api.studentMaterials).mockResolvedValue([]);
      vi.mocked(api.studentMessages).mockResolvedValue([]);
      vi.mocked(api.researchLearner).mockResolvedValue({
        id: 43,
        condition: "no_ai",
        participation_status: "active",
        ai_interaction_cap: 0,
      });
      vi.mocked(api.researchLoops).mockResolvedValue({
        id: 1,
        title: "Loops Module",
        description: "Learn Python loops",
      });
      vi.mocked(api.researchTasks).mockResolvedValue([
        {
          id: 101,
          concept_id: 1,
          type: "supported",
          prompt_text: "Write a for loop that sums 1 to 5.",
          scheduled_for: "2026-10-23T19:00:00Z",
          remaining_interactions: 0,
          attempt_id: 202,
        },
      ]);

      render(
        <MemoryRouter initialEntries={["/student"]}>
          <Student />
        </MemoryRouter>
      );

      expect(await screen.findByText("Research condition: Independent (No-AI)")).toBeInTheDocument();
      expect(screen.queryByText("Controlled AI Tutor")).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Ask the AI tutor about loops...")).not.toBeInTheDocument();
    });

    it("displays Renaissance general course tutor branding in student workspace", async () => {
      localStorage.setItem("student_token", "valid-token");
      vi.mocked(api.studentMe).mockResolvedValue({
        id: 1,
        email: "alice@university.edu",
        course_name: "CS101",
        course_id: 10,
      });
      vi.mocked(api.studentMaterials).mockResolvedValue([]);
      vi.mocked(api.studentMessages).mockResolvedValue([]);
      vi.mocked(api.researchLearner).mockResolvedValue({
        id: 42,
        condition: "controlled_ai",
        participation_status: "active",
        ai_interaction_cap: 8,
      });
      vi.mocked(api.researchLoops).mockResolvedValue({
        id: 1,
        title: "Loops Module",
      });
      vi.mocked(api.researchTasks).mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={["/student"]}>
          <Student />
        </MemoryRouter>
      );

      expect(await screen.findByText("Renaissance answers from the course materials and cites relevant sources.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ask Renaissance" })).toBeInTheDocument();
      expect(screen.queryByText("Ask Tangled")).not.toBeInTheDocument();
    });

    it("submits valid assessment solution and renders score and feedback without 409 error", async () => {
      localStorage.setItem("student_token", "valid-token");
      vi.mocked(api.studentMe).mockResolvedValue({
        id: 1,
        email: "alice@university.edu",
        course_name: "CS101",
        course_id: 10,
      });
      vi.mocked(api.studentMaterials).mockResolvedValue([]);
      vi.mocked(api.studentMessages).mockResolvedValue([]);
      vi.mocked(api.researchLearner).mockResolvedValue({
        id: 42,
        condition: "controlled_ai",
        participation_status: "active",
        ai_interaction_cap: 8,
      });
      vi.mocked(api.researchLoops).mockResolvedValue({
        id: 1,
        title: "Loops Module",
        explanation: "# Lesson 1\n\n```python\nfor n in numbers:\n    print(n)\n```",
      });
      vi.mocked(api.researchTasks).mockResolvedValue([
        {
          id: 101,
          concept_id: 1,
          type: "supported",
          prompt_text: "Count temperatures strictly greater than 30.",
          scheduled_for: "2026-10-23T19:00:00Z",
          remaining_interactions: 8,
          attempt_id: 201,
          started_at: "2026-10-23T19:05:00Z",
        },
      ]);
      vi.mocked(api.submitResearchTask).mockResolvedValue({
        attempt_id: 201,
        score: 1.0,
        passed: true,
        feedback: ["Test 1: passed", "Test 2: passed"],
      });

      render(
        <MemoryRouter initialEntries={["/student"]}>
          <Student />
        </MemoryRouter>
      );

      expect(await screen.findByText("Supported practice")).toBeInTheDocument();

      const textarea = screen.getByLabelText("Assessment code");
      fireEvent.change(textarea, {
        target: {
          value: "result = 0\nfor t in temperatures:\n    if t > 30:\n        result += 1",
        },
      });

      const submitBtn = screen.getByRole("button", { name: "Submit assessment" });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        // Must NOT call startResearchTask for supported task
        expect(api.startResearchTask).not.toHaveBeenCalled();
        expect(api.submitResearchTask).toHaveBeenCalledWith(
          101,
          "result = 0\nfor t in temperatures:\n    if t > 30:\n        result += 1"
        );
        expect(screen.getByText("Assessment Passed ✓")).toBeInTheDocument();
        expect(screen.getByText("Score: 100%")).toBeInTheDocument();
      });
    });

    it("handles idempotent activity restart gracefully", async () => {
      localStorage.setItem("student_token", "valid-token");
      vi.mocked(api.studentMe).mockResolvedValue({
        id: 1,
        email: "alice@university.edu",
        course_name: "CS101",
        course_id: 10,
      });
      vi.mocked(api.studentMaterials).mockResolvedValue([]);
      vi.mocked(api.studentMessages).mockResolvedValue([]);
      vi.mocked(api.researchLearner).mockResolvedValue({
        id: 42,
        condition: "controlled_ai",
        participation_status: "active",
        ai_interaction_cap: 8,
      });
      vi.mocked(api.researchLoops).mockResolvedValue({
        id: 1,
        title: "Loops Module",
      });
      vi.mocked(api.researchTasks).mockResolvedValue([
        {
          id: 1,
          type: "supported",
          title: "Practice Task",
          started_at: null,
          prompt_text: "Task prompt",
        } as any,
      ]);
      // Start call fails with 409 because session has already completed or started
      vi.mocked(api.startResearchLoops).mockRejectedValue(
        new Error('{"detail":"Supported session has already completed"}')
      );

      render(
        <MemoryRouter initialEntries={["/student"]}>
          <Student />
        </MemoryRouter>
      );

      const startBtn = await screen.findByRole("button", { name: /Start activity/i });
      fireEvent.click(startBtn);

      await waitFor(() => {
        expect(api.startResearchLoops).toHaveBeenCalled();
        // Recovers by fetching latest module content
        expect(api.researchLoops).toHaveBeenCalled();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });
  });
});
