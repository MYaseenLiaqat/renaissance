# Renaissance — University Demonstration Dataset Manifest

**Institution**: Fictional University Computing Department  
**Dataset Version**: 1.0.0-university-demo  
**Seeding Script**: `scripts/seed_university_demo.py`  
**Safe Cleanup Command**: `python scripts/seed_university_demo.py --reset-demo`  
**Material Generation**: `scripts/generate_course_materials.py`  

---

## 1. Entity Architecture & High-Level Counts

```
+-----------------------------------------------------------------------------------+
| Faculty Instructors: 3                                                            |
| Total Courses: 6 (2 courses per instructor)                                       |
| Total Sections: 18 (3 sections per course: Section A, Section B, Section C)       |
| Total Student Enrolments: 576 (32 students per section)                           |
| Course Materials: 6 Multi-Page PDFs (1 per course, 100% indexed in Chroma)        |
| Concepts Seeded: 24 (4 per course)                                                |
| Student Questions Seeded: 48 (8 per course, realistic confusion & queries)        |
| Aggregated Quiz Responses: 48 metrics rows (calibrated for insight thresholds)    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Instructors, Courses & Section Mapping

### Faculty 1: Dr. Elena Rostova (`elena.rostova@faculty.renaissance.edu`)
* **Course 1**: `Programming Fundamentals`
  * **Join Code**: `PF1010`
  * **Class Size**: 96 students
  * **Material**: `programming_fundamentals_guide.pdf` (8 Chroma vector chunks)
  * **Sections**:
    * `Section A`: 32 enrolled students (`student.pf101.a.01` to `student.pf101.a.32`)
    * `Section B`: 32 enrolled students (`student.pf101.b.01` to `student.pf101.b.32`)
    * `Section C`: 32 enrolled students (`student.pf101.c.01` to `student.pf101.c.32`)
  * **Top Flagged Topic**: *While Loop Iteration & Scoping* (Needs Attention, Confidence: High)
* **Course 2**: `Object-Oriented Programming`
  * **Join Code**: `CS1020`
  * **Class Size**: 96 students
  * **Material**: `object_oriented_programming_guide.pdf` (7 Chroma vector chunks)
  * **Sections**:
    * `Section A`: 32 enrolled students (`student.oop102.a.01` to `student.oop102.a.32`)
    * `Section B`: 32 enrolled students (`student.oop102.b.01` to `student.oop102.b.32`)
    * `Section C`: 32 enrolled students (`student.oop102.c.01` to `student.oop102.c.32`)
  * **Top Flagged Topic**: *Mutable Default Arguments in Classes* (Needs Attention, Confidence: High)

---

### Faculty 2: Prof. Marcus Vance (`marcus.vance@faculty.renaissance.edu`)
* **Course 3**: `Data Structures and Algorithms`
  * **Join Code**: `CS2010`
  * **Class Size**: 96 students
  * **Material**: `data_structures_algorithms_guide.pdf` (6 Chroma vector chunks)
  * **Sections**:
    * `Section A`: 32 enrolled students (`student.dsa201.a.01` to `student.dsa201.a.32`)
    * `Section B`: 32 enrolled students (`student.dsa201.b.01` to `student.dsa201.b.32`)
    * `Section C`: 32 enrolled students (`student.dsa201.c.01` to `student.dsa201.c.32`)
  * **Top Flagged Topic**: *Binary Search & Sorted Invariants* (Needs Attention, Confidence: High)
* **Course 4**: `Database Systems and SQL`
  * **Join Code**: `CS2020`
  * **Class Size**: 96 students
  * **Material**: `database_systems_sql_guide.pdf` (6 Chroma vector chunks)
  * **Sections**:
    * `Section A`: 32 enrolled students (`student.dbs202.a.01` to `student.dbs202.a.32`)
    * `Section B`: 32 enrolled students (`student.dbs202.b.01` to `student.dbs202.b.32`)
    * `Section C`: 32 enrolled students (`student.dbs202.c.01` to `student.dbs202.c.32`)
  * **Top Flagged Topic**: *LEFT OUTER JOIN & NULL Semantics* (Needs Attention, Confidence: High)

---

### Faculty 3: Dr. Aisha Patel (`aisha.patel@faculty.renaissance.edu`)
* **Course 5**: `Machine Learning Fundamentals`
  * **Join Code**: `CS3010`
  * **Class Size**: 96 students
  * **Material**: `machine_learning_fundamentals_guide.pdf` (6 Chroma vector chunks)
  * **Sections**:
    * `Section A`: 32 enrolled students (`student.mlf301.a.01` to `student.mlf301.a.32`)
    * `Section B`: 32 enrolled students (`student.mlf301.b.01` to `student.mlf301.b.32`)
    * `Section C`: 32 enrolled students (`student.mlf301.c.01` to `student.mlf301.c.32`)
  * **Top Flagged Topic**: *Data Leakage in Feature Pipelines* (Needs Attention, Confidence: High)
* **Course 6**: `Artificial Intelligence, LLMs, and Retrieval-Augmented Generation`
  * **Join Code**: `CS3020`
  * **Class Size**: 96 students
  * **Material**: `ai_llms_rag_guide.pdf` (6 Chroma vector chunks)
  * **Sections**:
    * `Section A`: 32 enrolled students (`student.air302.a.01` to `student.air302.a.32`)
    * `Section B`: 32 enrolled students (`student.air302.b.01` to `student.air302.b.32`)
    * `Section C`: 32 enrolled students (`student.air302.c.01` to `student.air302.c.32`)
  * **Top Flagged Topic**: *Multi-Tenant Vector Isolation* (Needs Attention, Confidence: High)

---

## 3. Seeded Learning Materials & Verification

| Course | File Path | Extracted Pages | Chunks in Chroma | Index Status |
| :--- | :--- | :--- | :--- | :--- |
| **Programming Fundamentals** | `apps/tangled/backend/data/demo_materials/programming_fundamentals_guide.pdf` | 3 | 8 | `indexed` |
| **Object-Oriented Programming** | `apps/tangled/backend/data/demo_materials/object_oriented_programming_guide.pdf` | 4 | 7 | `indexed` |
| **Data Structures and Algorithms** | `apps/tangled/backend/data/demo_materials/data_structures_algorithms_guide.pdf` | 3 | 6 | `indexed` |
| **Database Systems and SQL** | `apps/tangled/backend/data/demo_materials/database_systems_sql_guide.pdf` | 3 | 6 | `indexed` |
| **Machine Learning Fundamentals** | `apps/tangled/backend/data/demo_materials/machine_learning_fundamentals_guide.pdf` | 3 | 6 | `indexed` |
| **AI, LLMs, and RAG** | `apps/tangled/backend/data/demo_materials/ai_llms_rag_guide.pdf` | 3 | 6 | `indexed` |

---

## 4. Idempotency & Safe Selective Reset

### Running the Seed
```bash
python scripts/seed_university_demo.py
```
- Reusable: checks for existing accounts, courses, sections, and materials before creating.
- Running repeatedly produces `created: 0` without altering or duplicating existing records.

### Selective Reset (Safe Demonstration Cleanup)
```bash
python scripts/seed_university_demo.py --reset-demo
```
- Targets **only** records matching `@*.renaissance.edu` and the 6 demo courses.
- Preserves all pre-existing user data, real student accounts, consent records, and research participant databases intact.
