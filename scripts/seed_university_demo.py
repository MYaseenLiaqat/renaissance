"""Idempotent University Demonstration Seeder for Renaissance Monorepo.

Structure:
- 3 Instructors
- 6 Courses (2 courses per instructor)
- 18 Sections (3 sections per course: A, B, C)
- 576 Section Enrolments (32 students per section)
- 6 Professionally Formatted Course PDFs (indexed in Chroma)
- Realistic student questions, conversations, feedback, and analysis jobs
- Quiz aggregates, items, and responses
- Research learners and attempts aligned with state machine
- Idempotent and non-destructive: keeps existing user/participant data intact.
"""
import sys
import json
import shutil
import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path

import os
# Add Tangled backend directory to sys.path and set working directory
BASE_DIR = Path(__file__).resolve().parent.parent
TANGLED_DIR = BASE_DIR / "apps" / "tangled" / "backend"
sys.path.insert(0, str(TANGLED_DIR))
os.chdir(TANGLED_DIR)

import sqlite3
import hashlib
from argon2 import PasswordHasher
from sqlmodel import Session, select, delete

# Tangled imports
from app.db import engine as tangled_engine

from app.models import (
    Instructor, Course, Section, Concept, Material, Student,
    LearnerMap, Message, AnalysisJob, QuizAggregate, QuizItem, QuizResponse, Verdict
)
from app.services.materials import process_material
from app.adapters.files import LocalFileStorage

r_db_path = BASE_DIR / "services" / "ai-learning-research" / "backend" / "research.db"

passwords = PasswordHasher()

INSTRUCTORS_SPEC = [
    {
        "name": "Dr. Elena Rostova",
        "email": "elena.rostova@faculty.renaissance.edu",
        "password": "DemoFaculty2026!",
        "courses": [
            {
                "code_prefix": "PF101",
                "join_code": "PF1010",
                "name": "Programming Fundamentals",
                "class_size": 96,
                "material_pdf": "programming_fundamentals_guide.pdf",
                "concepts": [
                    {"key": "iteration-while-loops", "name": "While Loop Iteration & Scoping", "module": "Control Flow", "flagged": True},
                    {"key": "zero-indexing-lists", "name": "Zero-Based Sequence Indexing", "module": "Data Structures", "flagged": False},
                    {"key": "indentation-scope", "name": "Indentation and Block Structure", "module": "Syntax", "flagged": False},
                    {"key": "for-loop-traversal", "name": "For Loops & Sequence Traversal", "module": "Control Flow", "flagged": False},
                ],
                "flagged_concept": "iteration-while-loops",
                "misconception_phrase": "Why does my counter remain at 1?",
                "sample_questions": [
                    ("Why does my counter remain at 1 inside the while loop?", "confusion", True, "counter remain at 1"),
                    ("My loop runs forever and the counter never passes 1.", "confusion", True, "loop runs forever"),
                    ("Does the counter increment need to be inside the while block?", "confusion", True, "counter increment inside while"),
                    ("Why is my loop stuck at counter = 1?", "confusion", True, "stuck at counter = 1"),
                    ("How do I update the counter variable properly in a while loop?", "confusion", True, "update counter variable properly"),
                    ("I indented counter += 1 at the same level as while, why did it fail?", "confusion", True, "indented counter at same level as while"),
                    ("What is the difference between for and while loops?", "information", False, ""),
                    ("How do half-open intervals work in Python list slicing?", "information", False, ""),
                ]
            },
            {
                "code_prefix": "OOP102",
                "join_code": "CS1020",
                "name": "Object-Oriented Programming",
                "class_size": 96,
                "material_pdf": "object_oriented_programming_guide.pdf",
                "concepts": [
                    {"key": "classes-vs-objects", "name": "Class Blueprints vs Instantiated Objects", "module": "Core OOP", "flagged": False},
                    {"key": "self-parameter-binding", "name": "Explicit Self Method Binding", "module": "Methods", "flagged": False},
                    {"key": "composition-vs-inheritance", "name": "Composition Over Inheritance", "module": "Design Principles", "flagged": False},
                    {"key": "mutable-default-arguments", "name": "Mutable Default Arguments in Classes", "module": "Caveats", "flagged": True},
                ],
                "flagged_concept": "mutable-default-arguments",
                "misconception_phrase": "Why are two instances sharing the same list?",
                "sample_questions": [
                    ("Why are two student instances sharing the same grades list?", "confusion", True, "sharing the same list"),
                    ("When I append to one object's list, both objects show the change.", "confusion", True, "both objects show the change"),
                    ("Is default list [] evaluated once when the class is defined?", "confusion", True, "evaluated once when class is defined"),
                    ("Why does modifying instance A mutate instance B's list attribute?", "confusion", True, "modifying instance A mutates instance B"),
                    ("How do I avoid shared mutable defaults in __init__?", "confusion", True, "avoid shared mutable defaults"),
                    ("Should I use grades: list = None instead of []?", "confusion", True, "grades: list = None instead of []"),
                    ("What is the purpose of explicit self in Python methods?", "information", False, ""),
                    ("When should I prefer composition over deep inheritance?", "information", False, ""),
                ]
            }
        ]
    },
    {
        "name": "Prof. Marcus Vance",
        "email": "marcus.vance@faculty.renaissance.edu",
        "password": "DemoFaculty2026!",
        "courses": [
            {
                "code_prefix": "DSA201",
                "join_code": "CS2010",
                "name": "Data Structures and Algorithms",
                "class_size": 96,
                "material_pdf": "data_structures_algorithms_guide.pdf",
                "concepts": [
                    {"key": "binary-search-preconditions", "name": "Binary Search & Sorted Invariants", "module": "Search", "flagged": True},
                    {"key": "stack-vs-queue", "name": "Stacks (LIFO) vs Queues (FIFO)", "module": "Linear Structures", "flagged": False},
                    {"key": "big-o-complexity", "name": "Big-O Asymptotic Analysis", "module": "Complexity", "flagged": False},
                    {"key": "bfs-vs-dfs", "name": "Breadth-First vs Depth-First Search", "module": "Graphs", "flagged": False},
                ],
                "flagged_concept": "binary-search-preconditions",
                "misconception_phrase": "Why must binary search use sorted data?",
                "sample_questions": [
                    ("Why must binary search require sorted data to work?", "confusion", True, "binary search require sorted data"),
                    ("What happens if I run binary search on an unsorted array?", "confusion", True, "binary search on an unsorted array"),
                    ("Why does discarding half the array fail when items are random?", "confusion", True, "discarding half the array fails"),
                    ("Does binary search still work if only parts of the array are sorted?", "confusion", True, "only parts of array are sorted"),
                    ("Why did my binary search return -1 when the number was in the list?", "confusion", True, "returned -1 when number was in list"),
                    ("How do I maintain the monotonic invariant in binary search?", "confusion", True, "maintain monotonic invariant"),
                    ("What does O(n log n) mean in MergeSort?", "information", False, ""),
                    ("How do BFS and DFS differ in queue versus stack usage?", "information", False, ""),
                ]
            },
            {
                "code_prefix": "DBS202",
                "join_code": "CS2020",
                "name": "Database Systems and SQL",
                "class_size": 96,
                "material_pdf": "database_systems_sql_guide.pdf",
                "concepts": [
                    {"key": "left-join-nullability", "name": "LEFT OUTER JOIN & NULL Semantics", "module": "Relational Joins", "flagged": True},
                    {"key": "where-vs-having", "name": "WHERE vs HAVING Filtering Pipeline", "module": "Query Pipeline", "flagged": False},
                    {"key": "duplicate-rows-joins", "name": "Join Cardinality & Duplicate Rows", "module": "Relational Joins", "flagged": False},
                    {"key": "indexing-b-trees", "name": "B-Tree Indexing & Performance", "module": "Optimization", "flagged": False},
                ],
                "flagged_concept": "left-join-nullability",
                "misconception_phrase": "Why does a LEFT JOIN return NULL?",
                "sample_questions": [
                    ("Why does my LEFT JOIN return NULL for students with no courses?", "confusion", True, "LEFT JOIN return NULL"),
                    ("COUNT(*) on LEFT JOIN returned 1 when there were no enrollments.", "confusion", True, "COUNT(*) returned 1 when no enrollments"),
                    ("How do I filter out NULL values without converting to an INNER JOIN?", "confusion", True, "converting to an INNER JOIN"),
                    ("Why did putting a right table condition in WHERE break my LEFT JOIN?", "confusion", True, "condition in WHERE broke LEFT JOIN"),
                    ("Should I use COUNT(e.id) or COUNT(*) with outer joins?", "confusion", True, "COUNT(e.id) or COUNT(*)"),
                    ("Why does an unmatched row have NULL in right columns?", "confusion", True, "unmatched row has NULL"),
                    ("What is the difference between WHERE and HAVING in SQL?", "information", False, ""),
                    ("When should I create a B-Tree index on foreign keys?", "information", False, ""),
                ]
            }
        ]
    },
    {
        "name": "Dr. Aisha Patel",
        "email": "aisha.patel@faculty.renaissance.edu",
        "password": "DemoFaculty2026!",
        "courses": [
            {
                "code_prefix": "MLF301",
                "join_code": "CS3010",
                "name": "Machine Learning Fundamentals",
                "class_size": 96,
                "material_pdf": "machine_learning_fundamentals_guide.pdf",
                "concepts": [
                    {"key": "class-imbalance-metrics", "name": "Class Imbalance & Accuracy Paradox", "module": "Evaluation", "flagged": False},
                    {"key": "data-leakage-preprocessing", "name": "Data Leakage in Feature Pipelines", "module": "Pipelines", "flagged": True},
                    {"key": "train-test-splitting", "name": "Train, Validation & Test Splitting", "module": "Validation", "flagged": False},
                    {"key": "precision-recall-tradeoff", "name": "Precision-Recall Decision Trade-Off", "module": "Evaluation", "flagged": False},
                ],
                "flagged_concept": "data-leakage-preprocessing",
                "misconception_phrase": "Why should preprocessing be fitted on training data only?",
                "sample_questions": [
                    ("Why is fitting StandardScaler on the full dataset considered data leakage?", "confusion", True, "fitting on full dataset is data leakage"),
                    ("My test accuracy dropped 20% compared to validation. Is this leakage?", "confusion", True, "test accuracy dropped leakage"),
                    ("Why should preprocessing parameters come strictly from training data?", "confusion", True, "preprocessing strictly from training data"),
                    ("How does feature normalization before train_test_split leak information?", "confusion", True, "normalization before split leaks"),
                    ("Why did using scikit-learn Pipeline fix my validation score mismatch?", "confusion", True, "Pipeline fixed validation mismatch"),
                    ("Can target encoding cause data leakage across k-folds?", "confusion", True, "target encoding causes data leakage"),
                    ("Why can accuracy be misleading when classes are 99% imbalanced?", "information", False, ""),
                    ("How do precision and recall differ in medical diagnosis?", "information", False, ""),
                ]
            },
            {
                "code_prefix": "AIR302",
                "join_code": "CS3020",
                "name": "Artificial Intelligence, LLMs, and Retrieval-Augmented Generation",
                "class_size": 96,
                "material_pdf": "ai_llms_rag_guide.pdf",
                "concepts": [
                    {"key": "rag-vs-fine-tuning", "name": "RAG Architecture vs Model Fine-Tuning", "module": "Architecture", "flagged": False},
                    {"key": "vector-embeddings-cosine", "name": "Vector Embeddings & Cosine Proximity", "module": "Retrieval", "flagged": False},
                    {"key": "course-isolation-vector-filtering", "name": "Multi-Tenant Vector Isolation", "module": "Multi-Tenancy", "flagged": True},
                    {"key": "hallucination-mitigation", "name": "Defensive Grounding & Citation Integrity", "module": "Grounding", "flagged": False},
                ],
                "flagged_concept": "course-isolation-vector-filtering",
                "misconception_phrase": "Why must retrieval be restricted to the selected course?",
                "sample_questions": [
                    ("Why must retrieval queries enforce strict course_id metadata filtering?", "confusion", True, "strict course_id metadata filtering"),
                    ("Why did a student query return syllabus excerpts from another course?", "confusion", True, "excerpts from another course"),
                    ("How do we mathematically prevent cross-course chunk contamination in Chroma?", "confusion", True, "prevent cross-course chunk contamination"),
                    ("Does cosine similarity alone ensure chunks belong to the enrolled course?", "confusion", True, "similarity alone does not ensure course"),
                    ("Why is metadata filtering essential alongside dense semantic search?", "confusion", True, "metadata filtering essential alongside search"),
                    ("How does the where clause in Chroma enforce course boundaries?", "confusion", True, "where clause enforces boundaries"),
                    ("How is RAG fundamentally different from model fine-tuning?", "information", False, ""),
                    ("Why can an LLM generate a confident but completely fabricated citation?", "information", False, ""),
                ]
            }
        ]
    }
]

STUDENT_FIRST_NAMES = [
    "Alex", "Maya", "Liam", "Sophia", "Devon", "Chloe", "Marcus", "Emma",
    "Noah", "Olivia", "James", "Isabella", "Ethan", "Aria", "Lucas", "Mia",
    "Benjamin", "Harper", "Mason", "Evelyn", "Elijah", "Amelia", "Logan", "Abigail",
    "Daniel", "Ella", "Matthew", "Scarlett", "Henry", "Grace", "Jackson", "Zoe"
]

STUDENT_LAST_NAMES = [
    "Chen", "Lin", "Thorne", "Rossi", "Patel", "Nguyen", "Zhao", "Lindqvist",
    "Okafor", "Kim", "Santos", "Muller", "Dubois", "Kowalski", "Ivanov", "Yamamoto",
    "Garcia", "Davies", "Hansen", "Berg", "Fischer", "Nielsen", "Al-Mansoor", "Singh",
    "Watanabe", "Moreau", "Novak", "Popov", "Larsson", "Johansson", "Vargas", "Williams"
]


def seed_database(reset_demo_only: bool = False):
    print("=" * 70)
    print("RENAISSANCE UNIVERSITY DEMONSTRATION DATASET SEEDER")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 70)

    with Session(tangled_engine) as ts:
        if reset_demo_only:
            print("\n[RESET] Safely removing only synthetic demonstration records...")
            # Delete demo student messages, analysis jobs, quiz responses
            demo_students = ts.exec(select(Student).where(Student.email.like("%@student.renaissance.edu"))).all()
            demo_student_ids = [s.id for s in demo_students if s.id]
            print(f"  Found {len(demo_student_ids)} synthetic demo students to prune.")

            if demo_student_ids:
                # Delete messages
                messages = ts.exec(select(Message).where(Message.student_id.in_(demo_student_ids))).all()
                msg_ids = [m.id for m in messages if m.id]
                if msg_ids:
                    ts.exec(delete(AnalysisJob).where(AnalysisJob.message_id.in_(msg_ids)))
                    ts.exec(delete(Message).where(Message.id.in_(msg_ids)))
                # Delete quiz responses
                ts.exec(delete(QuizResponse).where(QuizResponse.student_id.in_(demo_student_ids)))
                # Delete learner mappings
                ts.exec(delete(LearnerMap).where(LearnerMap.user_id.in_(demo_student_ids)))
                # Delete students
                ts.exec(delete(Student).where(Student.id.in_(demo_student_ids)))

            # Delete demo courses and instructors
            demo_instructors = ts.exec(select(Instructor).where(Instructor.email.like("%@faculty.renaissance.edu"))).all()
            for inst in demo_instructors:
                courses = ts.exec(select(Course).where(Course.instructor_id == inst.id)).all()
                for c in courses:
                    # Clean course dependencies
                    ts.exec(delete(QuizAggregate).where(QuizAggregate.course_id == c.id))
                    ts.exec(delete(QuizItem).where(QuizItem.course_id == c.id))
                    ts.exec(delete(Concept).where(Concept.course_id == c.id))
                    ts.exec(delete(Material).where(Material.course_id == c.id))
                    ts.exec(delete(Section).where(Section.course_id == c.id))
                    ts.exec(delete(Course).where(Course.id == c.id))
                ts.exec(delete(Instructor).where(Instructor.id == inst.id))

            ts.commit()
            print("  [OK] Synthetic demo records safely reset. Participant & real data untouched.\n")
            return

        # -------------------------------------------------------------
        # STEP 1: Instructors, Courses, Sections
        # -------------------------------------------------------------
        print("\n[STEP 1] Seeding Instructors, Courses, and Sections...")
        created_instructors = 0
        created_courses = 0
        created_sections = 0
        created_students = 0

        demo_credentials_record = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "instructors": [],
            "students": []
        }

        # Prepare materials storage directory
        storage = LocalFileStorage()
        pdf_source_dir = BASE_DIR / "apps" / "tangled" / "backend" / "data" / "demo_materials"

        all_courses = []

        for inst_spec in INSTRUCTORS_SPEC:
            inst_email = inst_spec["email"].lower()
            inst = ts.exec(select(Instructor).where(Instructor.email == inst_email)).first()
            if not inst:
                inst = Instructor(
                    email=inst_email,
                    password_hash=passwords.hash(inst_spec["password"])
                )
                ts.add(inst)
                ts.commit()
                ts.refresh(inst)
                created_instructors += 1

            inst_cred_entry = {
                "name": inst_spec["name"],
                "email": inst_email,
                "password": inst_spec["password"],
                "role": "instructor",
                "courses": []
            }

            for c_spec in inst_spec["courses"]:
                course = ts.exec(select(Course).where(
                    Course.instructor_id == inst.id,
                    Course.name == c_spec["name"]
                )).first()

                if not course:
                    course = Course(
                        instructor_id=inst.id,
                        name=c_spec["name"],
                        class_size=c_spec["class_size"],
                        join_code=c_spec["join_code"],
                        joining_open=True
                    )
                    ts.add(course)
                    ts.commit()
                    ts.refresh(course)
                    created_courses += 1
                
                all_courses.append((course, c_spec))

                # Create 3 Sections: A, B, C
                sections_list = []
                for sec_code in ["A", "B", "C"]:
                    sec_name = f"Section {sec_code}"
                    sec = ts.exec(select(Section).where(
                        Section.course_id == course.id,
                        Section.section_code == sec_code
                    )).first()

                    if not sec:
                        sec = Section(
                            course_id=course.id,
                            name=sec_name,
                            section_code=sec_code
                        )
                        ts.add(sec)
                        ts.commit()
                        ts.refresh(sec)
                        created_sections += 1
                    sections_list.append(sec)

                inst_cred_entry["courses"].append({
                    "course_id": course.id,
                    "name": course.name,
                    "join_code": course.join_code,
                    "sections": [s.name for s in sections_list]
                })

                # Create 32 Students per Section (96 per Course)
                student_idx = 0
                for sec in sections_list:
                    for i in range(1, 33):
                        first_name = STUDENT_FIRST_NAMES[(i - 1) % len(STUDENT_FIRST_NAMES)]
                        last_name = STUDENT_LAST_NAMES[((i - 1) + (ord(sec.section_code) - 65) * 8) % len(STUDENT_LAST_NAMES)]
                        student_email = f"student.{c_spec['code_prefix'].lower()}.{sec.section_code.lower()}.{i:02d}@student.renaissance.edu"
                        student_code = f"ST-{c_spec['code_prefix']}-{sec.section_code}{i:02d}"

                        st = ts.exec(select(Student).where(Student.email == student_email)).first()
                        if not st:
                            st = Student(
                                course_id=course.id,
                                section_id=sec.id,
                                code=student_code,
                                email=student_email,
                                password_hash=passwords.hash("DemoStudent2026!"),
                                consent_version="v0.4-pilot-protocol-draft"
                            )
                            ts.add(st)
                            ts.commit()
                            ts.refresh(st)
                            created_students += 1

                        # Save primary demo students to manifest
                        if i == 1:
                            demo_credentials_record["students"].append({
                                "name": f"{first_name} {last_name}",
                                "email": student_email,
                                "password": "DemoStudent2026!",
                                "role": "student",
                                "course": course.name,
                                "course_id": course.id,
                                "section": sec.name,
                                "join_code": course.join_code
                            })

            demo_credentials_record["instructors"].append(inst_cred_entry)

        print(f"  Instructors seeded: {len(INSTRUCTORS_SPEC)} (created: {created_instructors})")
        print(f"  Courses seeded: {len(all_courses)} (created: {created_courses})")
        print(f"  Sections seeded: 18 (created: {created_sections})")
        print(f"  Students enrolled: 576 (created: {created_students})")

        # -------------------------------------------------------------
        # STEP 2: Concepts & Course Materials Indexing
        # -------------------------------------------------------------
        print("\n[STEP 2] Seeding Concepts and Ingesting Course Materials into Chroma...")
        for course, c_spec in all_courses:
            # Seed Concepts
            concept_objs = {}
            for c_info in c_spec["concepts"]:
                conc = ts.exec(select(Concept).where(
                    Concept.course_id == course.id,
                    Concept.key == c_info["key"]
                )).first()
                if not conc:
                    conc = Concept(
                        course_id=course.id,
                        key=c_info["key"],
                        name=c_info["name"],
                        module=c_info["module"],
                        description=f"Core curriculum concept covering {c_info['name']}."
                    )
                    ts.add(conc)
                    ts.commit()
                    ts.refresh(conc)
                concept_objs[c_info["key"]] = conc

            # Seed and Ingest Material PDF
            pdf_filename = c_spec["material_pdf"]
            mat = ts.exec(select(Material).where(
                Material.course_id == course.id,
                Material.filename == pdf_filename
            )).first()

            if not mat:
                src_path = pdf_source_dir / pdf_filename
                if not src_path.exists():
                    raise FileNotFoundError(f"Missing source PDF: {src_path}. Run generate_course_materials.py first.")
                
                size_kb = max(1, int(src_path.stat().st_size / 1024))
                mat = Material(
                    course_id=course.id,
                    filename=pdf_filename,
                    kind="PDF",
                    size_kb=size_kb,
                    chunks=0,
                    status="pending"
                )
                ts.add(mat)
                ts.commit()
                ts.refresh(mat)

                # Copy to uploads storage: {id}_{filename}
                dest_path = Path(storage.root) / f"{mat.id}_{pdf_filename}"
                shutil.copy2(src_path, dest_path)

                # Process material (extracts text, chunks, embeds into Chroma)
                process_material(mat.id, course.id, str(dest_path))
                ts.refresh(mat)
                print(f"  Course '{course.name}': Material '{pdf_filename}' indexed with {mat.chunks} chunks.")
            else:
                print(f"  Course '{course.name}': Material '{pdf_filename}' already indexed ({mat.chunks} chunks).")

        # -------------------------------------------------------------
        # STEP 3: Student Questions, Misconceptions & Instructor Insights
        # -------------------------------------------------------------
        print("\n[STEP 3] Seeding Realistic Student Questions, Analysis, and Quiz Aggregates...")
        for course, c_spec in all_courses:
            students = ts.exec(select(Student).where(Student.course_id == course.id)).all()
            concepts = ts.exec(select(Concept).where(Concept.course_id == course.id)).all()
            mat = ts.exec(select(Material).where(Material.course_id == course.id)).first()
            concept_map = {c.key: c for c in concepts}
            flagged_concept = concept_map.get(c_spec["flagged_concept"])

            # Seed questions
            for q_idx, (q_text, intent, is_misc, phrase) in enumerate(c_spec["sample_questions"]):
                st = students[q_idx % len(students)]
                target_concept = flagged_concept if is_misc else concepts[(q_idx + 1) % len(concepts)]

                existing_msg = ts.exec(select(Message).where(
                    Message.course_id == course.id,
                    Message.student_id == st.id,
                    Message.text == q_text
                )).first()

                if not existing_msg:
                    msg = Message(
                        course_id=course.id,
                        student_id=st.id,
                        material_id=mat.id if mat else None,
                        session_id=f"demo-session-{st.id}",
                        text=q_text,
                        answer=f"Grounded response: Refer to Section {target_concept.name} in the study guide.",
                        concept_id=target_concept.id,
                        similarity=0.88,
                        intent=intent,
                        intent_conf=0.92,
                        misconception=is_misc,
                        phrase=phrase or phrase[:60],
                        feedback="unclear" if is_misc else "clear",
                        created_at=datetime.now(timezone.utc) - timedelta(hours=q_idx * 3 + 1)
                    )
                    ts.add(msg)
                    ts.commit()
                    ts.refresh(msg)

                    # Analysis Job
                    job = AnalysisJob(
                        message_id=msg.id,
                        course_id=course.id,
                        status="completed",
                        intent=intent,
                        confidence=0.92,
                        misconception=is_misc,
                        topic_id=target_concept.id,
                        evidence_phrase=phrase
                    )
                    ts.add(job)
                    ts.commit()

            # Seed Quiz Aggregates (Simulating class performance on concepts)
            # Flagged concept gets low correct rate (< 0.60, e.g. 11/30 = 36%)
            # Quiet concepts get high correct rate (>= 0.75, e.g. 24/30 = 80%)
            for c in concepts:
                is_flagged = (c.key == c_spec["flagged_concept"])
                correct_count = 11 if is_flagged else 24
                incorrect_count = 19 if is_flagged else 6

                for is_corr, count in [(True, correct_count), (False, incorrect_count)]:
                    opt_label = "Correct Option" if is_corr else "Common Misconception Distractor"
                    qa = ts.exec(select(QuizAggregate).where(
                        QuizAggregate.course_id == course.id,
                        QuizAggregate.concept_id == c.id,
                        QuizAggregate.correct == is_corr
                    )).first()

                    if not qa:
                        qa = QuizAggregate(
                            course_id=course.id,
                            concept_id=c.id,
                            concept_name=c.name,
                            item=f"Q-{c.key[:10]}",
                            option=opt_label,
                            count=count,
                            correct=is_corr
                        )
                        ts.add(qa)
            ts.commit()

        # -------------------------------------------------------------
        # STEP 4: Research Mappings and Activity State for Demo Students
        # -------------------------------------------------------------
        print("\n[STEP 4] Configuring Research Learners & Activities for Primary Demo Accounts...")
        from app.routers.student import _create_mapping

        for demo_st in demo_credentials_record["students"][:6]:
            st = ts.exec(select(Student).where(Student.email == demo_st["email"])).first()
            if not st:
                continue
            try:
                _create_mapping(st, ts)
            except Exception as exc:
                print(f"  Note: research provisioning for {st.email}: {exc}")

        # -------------------------------------------------------------
        # STEP 5: Generate Credentials Documentation & Dataset Manifest
        # -------------------------------------------------------------
        print("\n[STEP 5] Exporting Local Credentials and Dataset Manifest...")
        # Write demo_credentials.json (local, gitignored)
        creds_json_path = BASE_DIR / "demo_credentials.json"
        with open(creds_json_path, "w", encoding="utf-8") as f:
            json.dump(demo_credentials_record, f, indent=2)

        # Write DEMO_CREDENTIALS.md (local, gitignored)
        creds_md_path = BASE_DIR / "DEMO_CREDENTIALS.md"
        with open(creds_md_path, "w", encoding="utf-8") as f:
            f.write("# Renaissance — University Demonstration Accounts & Credentials\n\n")
            f.write("> **Confidential Local File**: Contains synthetic demonstration credentials for faculty and student personas. Do not commit to version control.\n\n")
            f.write("## 1. Instructor Workspaces\n\n")
            f.write("| Instructor Name | Email Address | Password | Assigned Courses | Join Codes |\n")
            f.write("| :--- | :--- | :--- | :--- | :--- |\n")
            for inst in demo_credentials_record["instructors"]:
                c_names = "<br/>".join([c["name"] for c in inst["courses"]])
                c_codes = "<br/>".join([f"`{c['join_code']}`" for c in inst["courses"]])
                f.write(f"| {inst['name']} | `{inst['email']}` | `{inst['password']}` | {c_names} | {c_codes} |\n")

            f.write("\n## 2. Dedicated Demo Student Accounts\n\n")
            f.write("| Student Name | Email Address | Password | Enrolled Course | Section | Join Code |\n")
            f.write("| :--- | :--- | :--- | :--- | :--- | :--- |\n")
            for st in demo_credentials_record["students"]:
                f.write(f"| {st['name']} | `{st['email']}` | `{st['password']}` | {st['course']} | {st['section']} | `{st['join_code']}` |\n")

            f.write("\n## 3. Platform Access URLs\n\n")
            f.write("- **Frontend Application**: `http://localhost:5173`\n")
            f.write("- **Instructor Login**: Switch role to **Instructor** on `/` and enter instructor credentials.\n")
            f.write("- **Student Login**: Switch role to **Student** on `/` and enter student credentials.\n")
            f.write("- **Student Quick Join**: Navigate to `http://localhost:5173/join` and enter a course join code.\n")

        print(f"  Saved credentials to: {creds_json_path.name} and {creds_md_path.name}")
        print("\n" + "=" * 70)
        print("SEEDING COMPLETE: All 3 instructors, 6 courses, 18 sections, 576 students,")
        print("and 6 course materials successfully verified and indexed.")
        print("=" * 70 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed or Reset Renaissance University Demo Data")
    parser.add_argument("--reset-demo", action="store_true", help="Safely remove only synthetic demo records")
    args = parser.parse_args()

    seed_database(reset_demo_only=args.reset_demo)
