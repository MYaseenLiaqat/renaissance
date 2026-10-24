import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { api } from "../api";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    api: {
      login: vi.fn(),
      register: vi.fn(),
      courses: vi.fn(),
      course: vi.fn(),
      createCourse: vi.fn(),
      insights: vi.fn(),
      topicList: vi.fn(),
      topic: vi.fn(),
      quiz: vi.fn(),
      studentMaterials: vi.fn(),
      studentMessages: vi.fn(),
      researchLearner: vi.fn(),
      researchLoops: vi.fn(),
      researchTasks: vi.fn(),
    },
  };
});

describe("Courses & Branding integration", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("displays consistent Renaissance visible branding on auth screen", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("Renaissance")).toBeInTheDocument();
    expect(screen.getByText("New to Renaissance? Create an account")).toBeInTheDocument();
    expect(screen.queryByText("Tangled")).not.toBeInTheDocument();
  });

  it("provides dedicated copy-code and student-join actions on course cards", async () => {
    const mockCourses = [
      {
        id: 1,
        name: "CS101 Python",
        join_code: "XYZ987",
        join_link: "/join/XYZ987",
        joining_open: true,
        class_size: 25,
      },
    ];

    vi.mocked(api.courses).mockResolvedValue(mockCourses);

    // Mock clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <MemoryRouter initialEntries={["/courses"]}>
        <App />
      </MemoryRouter>
    );

    // Verify course name and join code are displayed
    expect(await screen.findByText("CS101 Python")).toBeInTheDocument();
    expect(screen.getByText("XYZ987")).toBeInTheDocument();

    // Verify dedicated Copy code button
    const copyBtn = screen.getByRole("button", { name: /Copy join code for CS101 Python/i });
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);

    // Verify clipboard was called with the join code
    expect(writeTextMock).toHaveBeenCalledWith("XYZ987");

    // Verify visual confirmation appears
    await waitFor(() => {
      expect(screen.getByText("Copied! ✓")).toBeInTheDocument();
    });

    // Verify dedicated student join link
    const studentLink = screen.getByRole("link", { name: /Open student join page for CS101 Python/i });
    expect(studentLink).toBeInTheDocument();
    expect(studentLink.getAttribute("href")).toBe("/join/XYZ987");

    // Verify course title links to the instructor overview
    const courseTitleLink = screen.getByRole("link", { name: "CS101 Python" });
    expect(courseTitleLink.getAttribute("href")).toBe("/courses/1/topics");
  });
});
