import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import Consent from "../pages/Consent";
import Integrations from "../pages/Integrations";
import { api } from "../api";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    api: {
      ...actual.api,
      studentConsent: vi.fn(),
      withdrawConsent: vi.fn(),
      integrationsStatus: vi.fn(),
      testIntegration: vi.fn(),
      syncIntegration: vi.fn(),
    },
  };
});

describe("Renaissance Institutional Readiness & UX", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders role toggle on auth page switching between instructor and student", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Instructor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Student" })).toBeInTheDocument();
    expect(screen.getByText("Instructor Workspace")).toBeInTheDocument();

    // Click Student toggle
    fireEvent.click(screen.getByRole("button", { name: "Student" }));
    expect(screen.getByText("Student Learning Portal")).toBeInTheDocument();
  });

  it("renders Consent page with voluntary safeguards and withdrawal option", async () => {
    vi.mocked(api.studentConsent).mockResolvedValue({
      student_id: 42,
      consent_version: "v1.0",
      consented_at: "2026-03-01T10:00:00Z",
      research_participation_status: "active",
      is_participating: true,
      study_name: "Cognitive Load and Generative AI Study",
      protocol_version: "v0.4-pilot-protocol-draft",
      can_withdraw: true,
    });

    vi.mocked(api.withdrawConsent).mockResolvedValue({
      ok: true,
      participation_status: "withdrawn",
    });

    render(
      <MemoryRouter initialEntries={["/consent"]}>
        <Consent />
      </MemoryRouter>
    );

    expect(await screen.findByText("Participant Consent & Research Transparency")).toBeInTheDocument();
    expect(screen.getByText("Active Participant (Enrolled)")).toBeInTheDocument();

    const withdrawBtn = screen.getByRole("button", { name: /Withdraw from research study/i });
    expect(withdrawBtn).toBeInTheDocument();

    fireEvent.click(withdrawBtn);
    expect(screen.getByText("Confirm Research Withdrawal")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /Yes, Withdraw from Study/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/You have successfully withdrawn/i)).toBeInTheDocument();
    });
  });

  it("renders Integrations dashboard with Moodle and SAP SLcM cards", async () => {
    vi.mocked(api.integrationsStatus).mockResolvedValue([
      {
        name: "moodle",
        display_name: "Moodle LMS",
        description: "Enterprise learning management system synchronization.",
        version: "4.3+ (REST Web Services)",
        category: "LMS",
        status: "ready",
        health: "healthy",
        latency_ms: 18,
        details: "Moodle REST API endpoint active.",
        last_checked: "2026-03-01T12:00:00Z",
      },
      {
        name: "sap",
        display_name: "SAP Student Lifecycle Management (SLcM)",
        description: "Enterprise SIS integration for academic registration.",
        version: "S/4HANA 2023",
        category: "SIS",
        status: "ready",
        health: "healthy",
        latency_ms: 24,
        details: "SAP Gateway connected.",
        last_checked: "2026-03-01T12:00:00Z",
      },
    ]);

    render(
      <MemoryRouter initialEntries={["/courses/1/integrations"]}>
        <Integrations />
      </MemoryRouter>
    );

    expect(await screen.findByText("Institutional Integrations")).toBeInTheDocument();
    expect(screen.getByText("Moodle LMS")).toBeInTheDocument();
    expect(screen.getByText("SAP Student Lifecycle Management (SLcM)")).toBeInTheDocument();
    expect(screen.getAllByText("● Live Host Active")).toHaveLength(2);
  });
});
