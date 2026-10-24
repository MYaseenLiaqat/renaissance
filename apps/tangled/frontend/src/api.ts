export type Course = { id: number; name: string; join_code: string; join_link: string; joining_open: boolean; class_size?: number | null };
export type TopicCard = { id: number; name: string; module?: string; share: number; confidence: string | null; students_confused: number | string; confusion_messages: number | string; status?: string; signals: string[]; evidence_phrases: string[] };
export type TopicSummary = { summary: { questions: number | string; students_asking: number | string; enrolled: number | string; needs_attention: number }; flagged: TopicCard[]; not_flagged: { id: number; name: string; reason: string }[] };
export type TopicEvidenceQuote = { id?: number; text: string; phrase?: string; tag?: string };
export type TopicGroup = { title: string; count: number | string; raw_count?: number; description?: string; evidence_phrases: string[]; quotes?: TopicEvidenceQuote[] };
export type TopicDetail = { id: number; name: string; module?: string; description?: string; confidence: string | null; tier: string; status: string | null; stats: Record<string, number | string | null>; share: number; share_lower: number; signals: string[]; groups: TopicGroup[]; not_counted_evidence: string[] };
export type QuizRow = { item: string; topic: string; correct_rate: number; responses: number; options: Record<string, number>; top_wrong: string | null };
export type Material = { id: number; filename: string; kind: string; size_kb: number; chunks: number; status: string; error: string };
export type Topic = { id: number; name: string; module_label: string; description: string; key: string };
export type TopicListItem = { id: number; name: string; module_label: string; description: string };
export type QuizImport = { imported: number; unmatched_concepts: { row: number; concept: string }[] };
export type StudentMaterial = { id: number; filename: string; kind?: string; size_kb?: number; status: string; file_url?: string };
export type MaterialSection = { label: string; content: string };
export type MaterialContent = {
  id: number;
  filename: string;
  kind?: string;
  size_kb?: number;
  sections: MaterialSection[];
  full_text: string;
  file_url?: string;
};
export type StudentMessage = { message_id: number; question?: string; answer?: string; feedback?: string; session_id?: string; material_id?: number | null; sources?: { n: number; material: string; section: string }[] };
export type JoinInfo = { name: string };
export type StudentMe = { id: number; email: string | null; course_id: number; course_name: string; section_id?: number | null; section_name?: string | null };
export type CourseSection = { id: number; course_id: number; name: string; section_code: string; enrolled: number; created_at: string };

export type StudentEnrolledCourse = {
  id: number;
  name: string;
  join_code: string;
  is_current: boolean;
  materials_count: number;
  questions_count: number;
  joined_at?: string | null;
};

export type ConversationSummary = {
  session_id: string;
  last_message_at: string | null;
  snippet: string;
  count: number;
  material_id?: number | null;
};

export type ConsentStatus = {
  student_id: number;
  consent_version: string;
  consented_at: string | null;
  research_participation_status: string;
  is_participating: boolean;
  study_name: string;
  protocol_version: string;
  can_withdraw: boolean;
};

export type LearnerStatus = {
  learner_id: number;
  participation_status: string;
  has_future_assessments: boolean;
  next_assessment_at: string | null;
};

export type IntegrationOverview = {
  name: string;
  display_name: string;
  description: string;
  version: string;
  category: string;
  status: string;
  health?: "healthy" | "unhealthy" | "error";
  latency_ms?: number;
  details?: string;
  last_checked: string;
};

export type ResearchLearner = {
  id: number;
  condition: string;
  ai_interaction_cap?: number | null;
  supported_phase_minutes?: number;
  participation_status: string;
};
export type ResearchTask = {
  id: number;
  attempt_id: number;
  concept_id: number;
  type: string;
  prompt_text: string;
  scheduled_for: string;
  remaining_interactions: number;
  started_at?: string | null;
  expires_at?: string | null;
};
export type SubmitOut = {
  attempt_id: number;
  score: number;
  passed: boolean;
  feedback: string[];
};
export type ResearchAIChatOut = {
  sequence_num: number;
  response: string;
  remaining_interactions: number;
};

const instructorToken = () => localStorage.getItem("instructor_token") || "";
async function req<T>(path: string, opts: RequestInit = {}, token = instructorToken()): Promise<T> {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (opts.body && !(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(`/api/v1${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  if (!response.ok) throw new Error((await response.text()) || response.statusText);
  return response.json() as Promise<T>;
}

export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed: unknown = JSON.parse(error.message);
    if (typeof parsed === "object" && parsed !== null && "detail" in parsed) {
      const detail = (parsed as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) return detail.map(item => typeof item === "object" && item !== null && "msg" in item ? String(item.msg) : "Invalid input").join(", ");
    }
  } catch { /* use the plain message below */ }
  return error.message && !error.message.startsWith("{") ? error.message : fallback;
}

export const api = {
  register: (email: string, password: string) => req<{ access_token: string }>("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => req<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  courses: () => req<Course[]>("/courses"),
  course: (id: string) => req<Course>(`/courses/${id}`),
  courseSections: (id: string | number) => req<CourseSection[]>(`/courses/${id}/sections`),
  createCourse: (name: string, class_size?: number) => req<Course>("/courses", { method: "POST", body: JSON.stringify({ name, class_size }) }),
  updateCourse: (id: string, values: Record<string, unknown>) => req<Course>(`/courses/${id}`, { method: "PATCH", body: JSON.stringify(values) }),
  regenerateCode: (id: string) => req<Course>(`/courses/${id}/join-code/regenerate`, { method: "POST" }),
  insights: (id: string) => req<TopicSummary>(`/courses/${id}/insights`),
  topic: (courseId: string, topicId: string) => req<TopicDetail>(`/courses/${courseId}/topics/${topicId}/insights`),
  verdict: (courseId: string, topicId: number, verdict: "addressed" | "false_alarm") => req<{ ok: boolean }>(`/courses/${courseId}/topics/${topicId}/verdict`, { method: "POST", body: JSON.stringify({ verdict }) }),
  topicsForCourse: (id: string) => req<Topic[] | TopicSummary>(`/courses/${id}/topics`),
  topicList: (id: string) => req<TopicListItem[]>(`/courses/${id}/topic-list`),
  createTopic: (id: string, values: { name: string; module_label: string; description: string }) => req<Topic>(`/courses/${id}/topics`, { method: "POST", body: JSON.stringify(values) }),
  updateTopic: (courseId: string, topicId: number, values: Partial<{ name: string; module_label: string; description: string }>) => req<Topic>(`/courses/${courseId}/topics/${topicId}`, { method: "PATCH", body: JSON.stringify(values) }),
  deleteTopic: (courseId: string, topicId: number) => req<{ ok: boolean }>(`/courses/${courseId}/topics/${topicId}`, { method: "DELETE" }),
  quiz: (id: string) => req<QuizRow[]>(`/courses/${id}/quiz`),
  importQuiz: (id: string, file: File) => { const form = new FormData(); form.append("file", file); return req<QuizImport>(`/courses/${id}/quiz/import`, { method: "POST", body: form }); },
  materialsForCourse: (id: string) => req<Material[]>(`/courses/${id}/materials`),
  uploadMaterials: (id: string, files: FileList) => { const form = new FormData(); Array.from(files).forEach(file => form.append("files", file)); return req<Material[]>(`/courses/${id}/materials`, { method: "POST", body: form }); },
  deleteMaterial: (courseId: string, materialId: number) => req<{ ok: boolean }>(`/courses/${courseId}/materials/${materialId}`, { method: "DELETE" }),
  joinInfo: (code: string) => req<JoinInfo>(`/student/join/${code}`, {}, ""),
  join: (code: string) => req<{ access_token: string }>("/student/join", { method: "POST", body: JSON.stringify({ code, consent: true }) }, ""),
  registerStudent: (email: string, password: string, code: string) => req<{ access_token: string }>("/student/register", { method: "POST", body: JSON.stringify({ email, password, code, consent: true }) }, ""),
  loginStudent: (email: string, password: string) => req<{ access_token: string; course_id?: number; course_name?: string }>("/student/login", { method: "POST", body: JSON.stringify({ email, password }) }, ""),
  studentMe: () => req<StudentMe>("/student/me", {}, localStorage.getItem("student_token") || ""),
  studentCourses: () => req<StudentEnrolledCourse[]>("/student/courses", {}, localStorage.getItem("student_token") || ""),
  switchCourse: (courseId: number | string) => req<{ access_token: string; token_type: string; course_id: number }>(`/student/switch-course/${courseId}`, { method: "POST" }, localStorage.getItem("student_token") || ""),
  studentMaterials: (courseId?: number | string) => req<StudentMaterial[]>(`/student/materials${courseId ? `?course_id=${courseId}` : ""}`, {}, localStorage.getItem("student_token") || ""),
  materialContent: (materialId: number | string) => req<MaterialContent>(`/student/materials/${materialId}/content`, {}, localStorage.getItem("student_token") || ""),
  chat: (text: string, sessionId: string, materialId?: number | null) => req<StudentMessage>("/student/chat", { method: "POST", body: JSON.stringify({ text, session_id: sessionId, material_id: materialId ?? null }) }, localStorage.getItem("student_token") || ""),
  feedback: (messageId: number, value: string) => req<{ ok: boolean }>("/student/feedback", { method: "POST", body: JSON.stringify({ message_id: messageId, value }) }, localStorage.getItem("student_token") || ""),
  studentMessages: (courseId?: number | string) => req<StudentMessage[]>(`/student/messages${courseId ? `?course_id=${courseId}` : ""}`, {}, localStorage.getItem("student_token") || ""),
  studentConversations: () => req<ConversationSummary[]>("/student/conversations", {}, localStorage.getItem("student_token") || ""),
  studentConsent: () => req<ConsentStatus>("/student/consent", {}, localStorage.getItem("student_token") || ""),
  withdrawConsent: () => req<{ ok: boolean; participation_status: string }>("/student/consent/withdraw", { method: "POST" }, localStorage.getItem("student_token") || ""),
  researchLearner: () => req<ResearchLearner>("/student/research/learner", {}, localStorage.getItem("student_token") || ""),
  researchLearnerStatus: () => req<LearnerStatus>("/student/research/learner/status", {}, localStorage.getItem("student_token") || ""),
  researchLoops: () => req<Record<string, unknown>>("/student/research/loops", {}, localStorage.getItem("student_token") || ""),
  startResearchLoops: () => req<Record<string, unknown>>("/student/research/loops/start", { method: "POST" }, localStorage.getItem("student_token") || ""),
  researchTasks: () => req<ResearchTask[]>("/student/research/tasks", {}, localStorage.getItem("student_token") || ""),
  startResearchTask: (taskId: number) => req<Record<string, unknown>>(`/student/research/tasks/${taskId}/start`, { method: "POST" }, localStorage.getItem("student_token") || ""),
  submitResearchTask: (taskId: number, code: string) => req<SubmitOut>(`/student/research/tasks/${taskId}/submit`, { method: "POST", body: JSON.stringify({ code }) }, localStorage.getItem("student_token") || ""),
  researchAiChat: (attempt_id: number, message: string) => req<ResearchAIChatOut>("/student/research/ai/chat", { method: "POST", body: JSON.stringify({ attempt_id, message }) }, localStorage.getItem("student_token") || ""),
  integrationsStatus: () => req<IntegrationOverview[]>("/integrations/status"),
  testIntegration: (name: string) => req<Record<string, unknown>>(`/integrations/${name}/test`, { method: "POST" }),
  syncIntegration: (name: string, courseId?: number) => req<Record<string, unknown>>(`/integrations/${name}/sync${courseId ? `?course_id=${courseId}` : ""}`, { method: "POST" }),
  materials: () => Promise.reject<Material[]>(new Error("Select a course to view materials.")),
  upload: (_files: FileList) => Promise.reject<Material[]>(new Error("Select a course to upload materials.")),
};
