/**
 * Reference prototype demonstration dataset.
 * Matches the canonical Tangled / Renaissance reference prototype content,
 * questions, frequencies, and metrics.
 */

export interface ReferenceTopic {
  key: string;
  id: string | number;
  name: string;
  module: string;
  questions_count: number;
  signals_count: number;
  share: number;
  confidence: "High" | "Medium" | null;
  status: "review" | "monitor" | "addressed" | "";
}

export const REFERENCE_SUMMARY = {
  topics_covered: 9,
  students_asking: "20 of 24",
  students_asking_count: 20,
  enrolled: 24,
  questions: 160,
  needs_attention: 2,
  active_sections: 3,
};

export const REFERENCE_TOPICS: ReferenceTopic[] = [
  { key: "np", id: "np", name: "NumPy arrays", module: "Module 1 · Unit 3", questions_count: 38, signals_count: 8, share: 0.33, confidence: "High", status: "review" },
  { key: "ed", id: "ed", name: "EDA with Pandas", module: "Module 3 · Unit 1", questions_count: 29, signals_count: 4, share: 0.12, confidence: null, status: "monitor" },
  { key: "nn", id: "nn", name: "Neural networks", module: "Module 4 · Unit 3", questions_count: 27, signals_count: 5, share: 0.21, confidence: "Medium", status: "review" },
  { key: "bv", id: "bv", name: "Bias–variance", module: "Module 4 · Unit 4", questions_count: 17, signals_count: 3, share: 0.08, confidence: null, status: "" },
  { key: "pp", id: "pp", name: "Data preprocessing", module: "Module 3 · Unit 1", questions_count: 14, signals_count: 2, share: 0.08, confidence: null, status: "" },
  { key: "gd", id: "gd", name: "Gradient descent", module: "Module 1 · Unit 1", questions_count: 13, signals_count: 2, share: 0.08, confidence: null, status: "" },
  { key: "em", id: "em", name: "Evaluation metrics", module: "Module 4 · Unit 4", questions_count: 9, signals_count: 1, share: 0.04, confidence: null, status: "" },
  { key: "rg", id: "rg", name: "Regularization", module: "Module 5 · Unit 2", questions_count: 8, signals_count: 1, share: 0.04, confidence: null, status: "" },
  { key: "cl", id: "cl", name: "Clustering", module: "Module 6 · Unit 1", questions_count: 5, signals_count: 1, share: 0.04, confidence: null, status: "" },
];

export interface TopicEvidenceGroup {
  title: string;
  count: number;
  description: string;
  quotes: { text: string; tag: string }[];
}

export interface TopicDetailData {
  id: string | number;
  key: string;
  name: string;
  module: string;
  confidence: "High" | "Medium" | null;
  status: "review" | "addressed";
  share: number;
  share_lower: number;
  stats: {
    enrolled: number;
    students_asked: number;
    students_confused: number | string;
    confusion_msgs: number | string;
    info_msgs: number | string;
    quiz_rate: string;
  };
  checks: string[];
  summary: string;
  groups: TopicEvidenceGroup[];
  not_counted_evidence: string[];
}

export const REFERENCE_TOPIC_DETAILS: Record<string, TopicDetailData> = {
  np: {
    id: "np",
    key: "np",
    name: "NumPy arrays",
    module: "Module 1 · Unit 3",
    confidence: "High",
    status: "review",
    share: 0.33,
    share_lower: 0.18,
    stats: {
      enrolled: 24,
      students_asked: 11,
      students_confused: 8,
      confusion_msgs: 21,
      info_msgs: 14,
      quiz_rate: "45%",
    },
    checks: [
      "Enough students: 8 of 11 students who asked showed confusion (minimum is 4).",
      "Real confusion, not curiosity: 21 of 38 questions showed confusion. 14 only asked for information and were not counted.",
      "Related assessment evidence: 45% answered the related question correctly, against 68% on the average question.",
    ],
    summary: "Students appear to be mixing up when array shapes are compatible, what axis=0 and axis=1 mean, and whether reshaping or slicing changes the original data.",
    groups: [
      {
        title: "When shapes can be broadcast",
        count: 9,
        description: "Students believe shapes must match exactly.",
        quotes: [
          { text: "I thought both arrays need the same shape, so why does (3,) + (2,3) work?", tag: "Misconception" },
          { text: "Wait, why does it give (5,3) when I added (5,1) and (1,3)? I don’t get it.", tag: "Said they are confused" },
          { text: "Still confused: what happens when the shapes don’t match?", tag: "Asked again after an answer" },
        ],
      },
      {
        title: "Which axis a function acts on",
        count: 7,
        description: "Students mix up axis=0 and axis=1.",
        quotes: [
          { text: "I assumed axis=0 means across the columns, is that wrong?", tag: "Misconception" },
          { text: "np.sum(a, axis=1) gave one number per row, I expected one per column.", tag: "Misconception" },
        ],
      },
      {
        title: "reshape and views",
        count: 5,
        description: "Students are surprised that slices share memory.",
        quotes: [
          { text: "I changed a slice and the original array changed too. I don’t understand why.", tag: "Said they are confused" },
          { text: "Does reshape(-1, 1) copy my data? I thought it made a new array.", tag: "Misconception" },
        ],
      },
    ],
    not_counted_evidence: [
      "Which function creates an array of zeros?",
      "Is there a shortcut for the mean of each row?",
      "How do I stack two arrays side by side?",
    ],
  },
  nn: {
    id: "nn",
    key: "nn",
    name: "Neural networks",
    module: "Module 4 · Unit 3",
    confidence: "Medium",
    status: "review",
    share: 0.21,
    share_lower: 0.09,
    stats: {
      enrolled: 24,
      students_asked: 8,
      students_confused: 5,
      confusion_msgs: 14,
      info_msgs: 11,
      quiz_rate: "50%",
    },
    checks: [
      "Enough students: 5 of 8 students who asked showed confusion (minimum is 4).",
      "Real confusion, not curiosity: 14 of 27 questions showed confusion. 11 only asked for information and were not counted.",
      "Related assessment evidence: 50% answered the related question correctly, against 68% on the average question.",
    ],
    summary: "Students appear to need a clearer explanation of how a model updates its weights, why activation functions such as ReLU are needed, and what a flat loss curve means.",
    groups: [
      {
        title: "How weights get updated",
        count: 7,
        description: "Students cannot trace the error back to individual weights.",
        quotes: [
          { text: "I still don’t get how it knows which weight caused the error.", tag: "Said they are confused" },
          { text: "So every weight gets the same update, right?", tag: "Misconception" },
        ],
      },
      {
        title: "Why activation functions exist",
        count: 5,
        description: "Students believe more linear layers add power on their own.",
        quotes: [
          { text: "But more linear layers should make it more powerful, shouldn’t they?", tag: "Misconception" },
          { text: "Still unclear why ReLU is needed at all.", tag: "Asked again after an answer" },
        ],
      },
      {
        title: "Loss not decreasing",
        count: 2,
        description: "Students assume the network itself is broken.",
        quotes: [
          { text: "My loss is flat, so the network must be wrong?", tag: "Misconception" },
        ],
      },
    ],
    not_counted_evidence: [
      "How many hidden layers should I use?",
      "Which optimizer do you recommend?",
      "Is more data always better?",
    ],
  },
};

export interface ReferenceQuizRow {
  item: string;
  topic: string;
  question_label: string;
  correct_rate: number;
  responses: number;
  top_wrong: string;
  wrong_count: number;
}

export const REFERENCE_QUIZ_ROWS: ReferenceQuizRow[] = [
  { item: "Q3", topic: "NumPy arrays", question_label: "Question 3", correct_rate: 0.45, responses: 22, top_wrong: "An error, because the shapes must match exactly", wrong_count: 7 },
  { item: "Q6", topic: "Neural networks", question_label: "Question 6", correct_rate: 0.50, responses: 22, top_wrong: "More capacity to fit curved patterns", wrong_count: 6 },
  { item: "Q8", topic: "Regularization", question_label: "Question 8", correct_rate: 0.64, responses: 22, top_wrong: "Permanently removes neurons", wrong_count: 6 },
  { item: "Q4", topic: "Bias–variance", question_label: "Question 4", correct_rate: 0.68, responses: 22, top_wrong: "High bias", wrong_count: 4 },
  { item: "Q5", topic: "Gradient descent", question_label: "Question 5", correct_rate: 0.73, responses: 22, top_wrong: "Raise the learning rate", wrong_count: 3 },
  { item: "Q1", topic: "Data preprocessing", question_label: "Question 1", correct_rate: 0.77, responses: 22, top_wrong: "Scale the whole dataset first", wrong_count: 3 },
  { item: "Q7", topic: "Evaluation metrics", question_label: "Question 7", correct_rate: 0.82, responses: 22, top_wrong: "Accuracy only counts the majority label", wrong_count: 2 },
  { item: "Q2", topic: "EDA with Pandas", question_label: "Question 2", correct_rate: 0.86, responses: 22, top_wrong: "Outliers must be removed", wrong_count: 2 },
];

export interface ReferenceMaterialRow {
  id: number;
  filename: string;
  kind: string;
  size_kb: number;
  chunks: number;
  status: string;
}

export const REFERENCE_MATERIALS: ReferenceMaterialRow[] = [
  { id: 101, filename: "AI_ML_Course_Outline.pdf", kind: "PDF", size_kb: 412, chunks: 14, status: "Indexed" },
  { id: 102, filename: "Week1_NumPy_Slides.pptx", kind: "PowerPoint", size_kb: 3100, chunks: 26, status: "Indexed" },
  { id: 103, filename: "Week2_Pandas_EDA.ipynb", kind: "Notebook", size_kb: 880, chunks: 18, status: "Indexed" },
  { id: 104, filename: "Week3_Preprocessing_Notes.docx", kind: "Word", size_kb: 210, chunks: 8, status: "Indexed" },
  { id: 105, filename: "Week4_Neural_Networks.pptx", kind: "PowerPoint", size_kb: 5400, chunks: 32, status: "Indexed" },
  { id: 106, filename: "Week5_Model_Selection.pdf", kind: "PDF", size_kb: 1200, chunks: 16, status: "Indexed" },
];
