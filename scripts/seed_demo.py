#!/usr/bin/env python3
"""Renaissance Demo Data Seed & Teardown Script.

Idempotently provisions demonstration records across both Tangled and
AI Learning Research services for live academic presentations.

Usage:
    python scripts/seed_demo.py [--action seed|unseed|status]
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TANGLED_DIR = ROOT / "apps" / "tangled" / "backend"
RESEARCH_DIR = ROOT / "services" / "ai-learning-research" / "backend"

sys.path.insert(0, str(TANGLED_DIR))

from argon2 import PasswordHasher
from sqlmodel import Session as TangledSession, create_engine, select
import app.db as tangled_db
from app.models import (
    Concept as TangledConcept,
    Course,
    Instructor,
    LearnerMap,
    Material,
    Message,
    QuizAggregate,
    Student,
)
from app.routers.courses import new_join_code
from app.services.ingest import ingest
from app.services.insights import topics

TANGLED_DB_FILE = TANGLED_DIR / "data" / "tangled.db"
tangled_engine = create_engine(f"sqlite:///{TANGLED_DB_FILE}")

passwords = PasswordHasher()

DEMO_INSTRUCTOR_EMAIL = "demo-instructor@example.com"
DEMO_INSTRUCTOR_PASSWORD = "DemoPassword2026!"
DEMO_COURSE_NAME = "Introduction to Python Programming"
DEMO_COURSE_SIZE = 30
DEMO_STUDENT_PASSWORD = "DemoStudent2026!"

DEMO_STUDENTS = [
    {
        "email": "student01@example.com",
        "name": "Alice Walker",
        "condition": "controlled_ai",
        "prior_ability": 0.85,
        "state": "both_completed",
    },
    {
        "email": "student02@example.com",
        "name": "Bob Chen",
        "condition": "no_ai",
        "prior_ability": 0.65,
        "state": "supported_done_immediate_progress",
    },
    {
        "email": "student03@example.com",
        "name": "Clara Diaz",
        "condition": "controlled_ai",
        "prior_ability": 0.70,
        "state": "supported_done_immediate_unlocked",
    },
    {
        "email": "student04@example.com",
        "name": "David Kim",
        "condition": "controlled_ai",
        "prior_ability": 0.50,
        "state": "supported_in_progress",
    },
    {
        "email": "student05@example.com",
        "name": "Emma Watson",
        "condition": "no_ai",
        "prior_ability": 0.60,
        "state": "not_started",
    },
    {
        "email": "student06@example.com",
        "name": "Frank Miller",
        "condition": "controlled_ai",
        "prior_ability": 0.75,
        "state": "not_started",
    },
]

DEMO_MODULES = [
    {
        "module": "Python Fundamentals",
        "topics": [
            {
                "name": "Syntax, Indentation, and Output",
                "key": "demo-syntax-indentation",
                "description": "Python uses clean indentation instead of braces to define code blocks.",
            },
            {
                "name": "Comments and Documentation",
                "key": "demo-comments-docs",
                "description": "Comments help explain code logic and document assumptions.",
            },
        ],
    },
    {
        "module": "Variables and Data Types",
        "topics": [
            {
                "name": "Numbers, Strings, and Booleans",
                "key": "demo-numbers-strings",
                "description": "Variables store typed data including integers, floats, and text.",
            },
            {
                "name": "Lists and Sequences",
                "key": "demo-lists-sequences",
                "description": "Lists hold ordered collections of values that can be iterated over.",
            },
        ],
    },
    {
        "module": "Conditions and Loops",
        "topics": [
            {
                "name": "If-Else Branching",
                "key": "demo-if-else",
                "description": "Conditional statements direct program flow based on Boolean logic.",
            },
            {
                "name": "For Loops and Iteration",
                "key": "demo-for-loops",
                "description": "For loops repeat operations across each element in a sequence.",
            },
        ],
    },
    {
        "module": "Functions and Problem Solving",
        "topics": [
            {
                "name": "Defining Functions and Return Values",
                "key": "demo-defining-functions",
                "description": "Functions package reusable logic that accepts parameters and returns results.",
            },
            {
                "name": "Accumulator and Counter Patterns",
                "key": "demo-accumulator-counter",
                "description": "Accumulators aggregate data while counters track occurrences matching criteria.",
            },
        ],
    },
]


def seed_demo():
    print("=" * 65)
    print("Renaissance Demo Environment — Idempotent Seeding")
    print("=" * 65)

    created_counts = {"instructor": 0, "course": 0, "topics": 0, "students": 0, "messages": 0, "quizzes": 0}
    reused_counts = {"instructor": 0, "course": 0, "topics": 0, "students": 0, "messages": 0, "quizzes": 0}

    with TangledSession(tangled_engine) as t_sess:
        # 1. Instructor
        inst = t_sess.exec(select(Instructor).where(Instructor.email == DEMO_INSTRUCTOR_EMAIL)).first()
        if not inst:
            inst = Instructor(
                email=DEMO_INSTRUCTOR_EMAIL,
                password_hash=passwords.hash(DEMO_INSTRUCTOR_PASSWORD),
            )
            t_sess.add(inst)
            t_sess.commit()
            t_sess.refresh(inst)
            created_counts["instructor"] += 1
            print(f"[+] Created Demo Instructor: {inst.email} (ID: {inst.id})")
        else:
            reused_counts["instructor"] += 1
            print(f"[*] Reused Demo Instructor: {inst.email} (ID: {inst.id})")

        # 2. Course
        course = t_sess.exec(
            select(Course).where(Course.instructor_id == inst.id, Course.name == DEMO_COURSE_NAME)
        ).first()
        if not course:
            code = new_join_code(t_sess)
            course = Course(
                instructor_id=inst.id,
                name=DEMO_COURSE_NAME,
                class_size=DEMO_COURSE_SIZE,
                join_code=code,
                joining_open=True,
            )
            t_sess.add(course)
            t_sess.commit()
            t_sess.refresh(course)
            created_counts["course"] += 1
            print(f"[+] Created Demo Course: '{course.name}' (Join Code: {course.join_code})")
        else:
            reused_counts["course"] += 1
            print(f"[*] Reused Demo Course: '{course.name}' (Join Code: {course.join_code})")

        # 3. Topics (Modules)
        topic_map = {}
        for mod in DEMO_MODULES:
            for top in mod["topics"]:
                concept = t_sess.exec(
                    select(TangledConcept).where(
                        TangledConcept.course_id == course.id, TangledConcept.key == top["key"]
                    )
                ).first()
                if not concept:
                    concept = TangledConcept(
                        course_id=course.id,
                        key=top["key"],
                        name=top["name"],
                        module=mod["module"],
                        description=top["description"],
                    )
                    t_sess.add(concept)
                    t_sess.commit()
                    t_sess.refresh(concept)
                    created_counts["topics"] += 1
                else:
                    reused_counts["topics"] += 1
                topic_map[top["name"]] = concept

        print(f"[*] Topics: {created_counts['topics']} created, {reused_counts['topics']} reused across 4 modules.")

        # 4. Tangled Students
        students_payload = []
        seeded_students = []
        for s_data in DEMO_STUDENTS:
            email = s_data["email"]
            student = t_sess.exec(select(Student).where(Student.email == email)).first()
            if not student:
                student = Student(
                    course_id=course.id,
                    email=email,
                    password_hash=passwords.hash(DEMO_STUDENT_PASSWORD),
                    consent_version="v0.4",
                )
                t_sess.add(student)
                t_sess.commit()
                t_sess.refresh(student)
                created_counts["students"] += 1
            else:
                reused_counts["students"] += 1

            seeded_students.append(student)
            students_payload.append({
                "id": student.id,
                "email": student.email,
                "condition": s_data["condition"],
                "prior_ability": s_data["prior_ability"],
                "state": s_data["state"],
            })

        print(f"[*] Tangled Students: {created_counts['students']} created, {reused_counts['students']} reused.")

        # 5. Delegate Research Seeding to research backend process
        proc = subprocess.run(
            [sys.executable, str(RESEARCH_DIR / "scripts" / "seed_demo_cohort.py"), "seed"],
            cwd=str(RESEARCH_DIR),
            input=json.dumps(students_payload),
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            print("[-] Research seeding failed:", proc.stderr)
            sys.exit(1)

        research_results = json.loads(proc.stdout)

        # 6. Synchronize LearnerMap in Tangled
        for r in research_results:
            sid = r["student_id"]
            mapping = t_sess.exec(select(LearnerMap).where(LearnerMap.user_id == sid)).first()
            if not mapping:
                mapping = LearnerMap(
                    user_id=sid,
                    research_learner_id=r["research_learner_id"],
                    research_learner_token=r["provisioning_token"],
                    research_participation_status="active",
                )
                t_sess.add(mapping)
                t_sess.commit()
            else:
                mapping.research_learner_id = r["research_learner_id"]
                mapping.research_learner_token = r["provisioning_token"]
                t_sess.add(mapping)
                t_sess.commit()

        print(f"[+] Synchronized {len(research_results)} LearnerMap links between Tangled and Research services.")

        # 7. Seed Student Inquiry Messages for Instructor Insights
        loop_concept = topic_map.get("For Loops and Iteration")
        list_concept = topic_map.get("Lists and Sequences")
        syntax_concept = topic_map.get("Syntax, Indentation, and Output")

        # Ensure For Loops and Iteration crosses confusion threshold (min_students=4, persist_students>=3)
        existing_msgs = t_sess.exec(select(Message).where(Message.course_id == course.id)).all()
        loop_msgs = [m for m in existing_msgs if m.concept_id == (loop_concept.id if loop_concept else None)]
        if (len(loop_msgs) < 7) and len(seeded_students) >= 6 and loop_concept:
            # Refresh messages for this course to ensure clean, coherent distribution
            for m in existing_msgs:
                t_sess.delete(m)
            t_sess.commit()

            sample_messages = [
                # Alice (student01) - 2 confusion messages
                Message(
                    course_id=course.id,
                    student_id=seeded_students[0].id,
                    session_id="sess-001",
                    text="How do I update my counter inside a for loop without resetting it to zero?",
                    answer="Initialize your counter variable before the loop statement begins. Then increment it inside the loop body.",
                    concept_id=loop_concept.id,
                    intent="confusion",
                    intent_conf=0.92,
                    phrase="counter inside a for loop",
                    feedback="clear",
                    created_at=datetime.now(timezone.utc) - timedelta(hours=4),
                ),
                Message(
                    course_id=course.id,
                    student_id=seeded_students[0].id,
                    session_id="sess-001",
                    text="My loop counter keeps returning 1 instead of counting all matching items in the list.",
                    answer="Ensure you are not initializing your result variable inside the for loop body, which resets it on each iteration.",
                    concept_id=loop_concept.id,
                    intent="confusion",
                    intent_conf=0.90,
                    phrase="counter keeps returning 1",
                    feedback="unclear",
                    created_at=datetime.now(timezone.utc) - timedelta(hours=3, minutes=30),
                ),
                # Bob (student02) - 2 confusion messages
                Message(
                    course_id=course.id,
                    student_id=seeded_students[1].id,
                    session_id="sess-002",
                    text="Why do I get an IndentationError on the line right after my for loop?",
                    answer="In Python, any block of code inside a for loop must be indented consistently with 4 spaces.",
                    concept_id=loop_concept.id,
                    intent="confusion",
                    intent_conf=0.88,
                    phrase="IndentationError on loop body",
                    feedback="clear",
                    created_at=datetime.now(timezone.utc) - timedelta(hours=3),
                ),
                Message(
                    course_id=course.id,
                    student_id=seeded_students[1].id,
                    session_id="sess-002",
                    text="Should the result return statement be indented under the for loop body or outside it?",
                    answer="The return statement or final assignment should be indented outside the for loop so it runs after all iterations complete.",
                    concept_id=loop_concept.id,
                    intent="confusion",
                    intent_conf=0.86,
                    phrase="indented under the for loop",
                    feedback="clear",
                    created_at=datetime.now(timezone.utc) - timedelta(hours=2, minutes=30),
                ),
                # Clara (student03) - 2 confusion messages
                Message(
                    course_id=course.id,
                    student_id=seeded_students[2].id,
                    session_id="sess-003",
                    text="Does range(len(temperatures)) include the last index or does the loop stop one item early?",
                    answer="range() stops one index before the upper bound, which matches Python's zero-indexed sequences.",
                    concept_id=loop_concept.id,
                    intent="confusion",
                    intent_conf=0.89,
                    phrase="loop stop one item early",
                    feedback="clear",
                    created_at=datetime.now(timezone.utc) - timedelta(hours=2),
                ),
                Message(
                    course_id=course.id,
                    student_id=seeded_students[2].id,
                    session_id="sess-003",
                    text="I am confused why iterating over range(5) only visits numbers 0 through 4.",
                    answer="range(n) generates numbers from 0 up to n - 1. To include 5, you would write range(6).",
                    concept_id=loop_concept.id,
                    intent="confusion",
                    intent_conf=0.91,
                    phrase="iterating over range(5)",
                    feedback="clear",
                    created_at=datetime.now(timezone.utc) - timedelta(hours=1, minutes=30),
                ),
                # David (student04) - 1 confusion message (distinct 4th student)
                Message(
                    course_id=course.id,
                    student_id=seeded_students[3].id,
                    session_id="sess-004",
                    text="Can I modify list elements while iterating through them with a for loop?",
                    answer="Modifying a sequence while iterating over it can cause skipped items or unexpected behavior; iterate over a copy or accumulate into a new variable instead.",
                    concept_id=loop_concept.id,
                    intent="confusion",
                    intent_conf=0.87,
                    phrase="modify list while iterating",
                    feedback="clear",
                    created_at=datetime.now(timezone.utc) - timedelta(hours=1),
                ),
                # Emma (student05) - information on Syntax (unrelated topic stays quiet)
                Message(
                    course_id=course.id,
                    student_id=seeded_students[4].id,
                    session_id="sess-005",
                    text="What is the difference between single and double quotes for Python strings?",
                    answer="In Python, single quotes ('...') and double quotes (\"...\") work identically for strings.",
                    concept_id=syntax_concept.id if syntax_concept else None,
                    intent="information",
                    intent_conf=0.95,
                    phrase="single and double quotes",
                    feedback="clear",
                    created_at=datetime.now(timezone.utc) - timedelta(minutes=40),
                ),
                # Frank (student06) - information on Lists (unrelated topic stays quiet)
                Message(
                    course_id=course.id,
                    student_id=seeded_students[5].id,
                    session_id="sess-006",
                    text="What is the index of the first item in a Python list?",
                    answer="Python lists use zero-based indexing, so the first element is at index 0.",
                    concept_id=list_concept.id if list_concept else None,
                    intent="information",
                    intent_conf=0.96,
                    phrase="index of the first item",
                    feedback="clear",
                    created_at=datetime.now(timezone.utc) - timedelta(minutes=20),
                ),
            ]
            for m in sample_messages:
                t_sess.add(m)
            t_sess.commit()
            created_counts["messages"] = len(sample_messages)
            print(f"[+] Seeded {len(sample_messages)} student inquiry messages (crossing confusion threshold for 'For Loops and Iteration').")
        else:
            reused_counts["messages"] = len(existing_msgs)
            print(f"[*] Reused {len(existing_msgs)} existing student questions.")

        # 8. Seed Quiz Aggregates with Low Correct Rate to Trigger quiz_flag
        existing_quizzes = t_sess.exec(select(QuizAggregate).where(QuizAggregate.course_id == course.id)).all()
        # Correct rate must be < quiz_low (0.60): 11 correct / 30 total = 36.7%
        if (len(existing_quizzes) == 0 or any(q.count == 19 for q in existing_quizzes)) and loop_concept:
            for q in existing_quizzes:
                t_sess.delete(q)
            t_sess.commit()

            quiz_records = [
                QuizAggregate(
                    course_id=course.id,
                    item="quiz-loops-q1",
                    concept_id=loop_concept.id,
                    concept_name="For Loops and Iteration",
                    option="A (4 spaces)",
                    count=11,
                    correct=True,
                ),
                QuizAggregate(
                    course_id=course.id,
                    item="quiz-loops-q1",
                    concept_id=loop_concept.id,
                    concept_name="For Loops and Iteration",
                    option="B (Curly braces)",
                    count=12,
                    correct=False,
                ),
                QuizAggregate(
                    course_id=course.id,
                    item="quiz-loops-q1",
                    concept_id=loop_concept.id,
                    concept_name="For Loops and Iteration",
                    option="C (Tabs only)",
                    count=7,
                    correct=False,
                ),
            ]
            for q in quiz_records:
                t_sess.add(q)
            t_sess.commit()
            created_counts["quizzes"] = len(quiz_records)
            print(f"[+] Seeded {len(quiz_records)} Quiz Aggregate distributions (correct_rate = 36.7% < 60%).")
        else:
            reused_counts["quizzes"] = len(existing_quizzes)
            print(f"[*] Reused {len(existing_quizzes)} existing quiz distributions.")

        # 9. Verify Instructor Insights immediately
        insight_summary = topics(t_sess, course.id)
        flagged_topics = insight_summary.get("flagged", [])
        print(f"[+] Insights Verification: {insight_summary['summary']['needs_attention']} topic(s) needing attention.")
        for f in flagged_topics:
            print(f"    - Flagged: '{f['name']}' (Signals: {', '.join(f.get('signals', []))})")

        course_join_code = course.join_code

    print("\n" + "=" * 65)
    print("DEMONSTRATION SEEDING COMPLETE & VERIFIED")
    print(f"Course: {DEMO_COURSE_NAME} (Join Code: {course_join_code})")
    print(f"Instructor Login: {DEMO_INSTRUCTOR_EMAIL}  |  Password: {DEMO_INSTRUCTOR_PASSWORD}")
    print("Student Logins: student01@example.com - student06@example.com")
    print(f"Student Password: {DEMO_STUDENT_PASSWORD}")
    print("=" * 65)


def unseed_demo():
    print("=" * 65)
    print("Renaissance Demo Environment — Safe Unseeding")
    print("=" * 65)

    with TangledSession(tangled_engine) as t_sess:
        inst = t_sess.exec(select(Instructor).where(Instructor.email == DEMO_INSTRUCTOR_EMAIL)).first()
        if not inst:
            print("[*] No demo instructor found. Nothing to unseed.")
            return

        course = t_sess.exec(
            select(Course).where(Course.instructor_id == inst.id, Course.name == DEMO_COURSE_NAME)
        ).first()

        if course:
            for q in t_sess.exec(select(QuizAggregate).where(QuizAggregate.course_id == course.id)).all():
                t_sess.delete(q)

            for m in t_sess.exec(select(Message).where(Message.course_id == course.id)).all():
                t_sess.delete(m)

            demo_emails = [s["email"] for s in DEMO_STUDENTS]
            students = t_sess.exec(select(Student).where(Student.email.in_(demo_emails))).all()
            student_ids = [s.id for s in students]

            # Tell research service to unseed learners
            subprocess.run(
                [sys.executable, str(RESEARCH_DIR / "scripts" / "seed_demo_cohort.py"), "unseed"],
                cwd=str(RESEARCH_DIR),
                input=json.dumps(student_ids),
                capture_output=True,
                text=True,
            )

            for s in students:
                mapping = t_sess.exec(select(LearnerMap).where(LearnerMap.user_id == s.id)).first()
                if mapping:
                    t_sess.delete(mapping)
                t_sess.delete(s)

            for c in t_sess.exec(select(TangledConcept).where(TangledConcept.course_id == course.id)).all():
                t_sess.delete(c)

            t_sess.delete(course)
            t_sess.delete(inst)
            t_sess.commit()
            print("[✓] Successfully unseeded all demonstration records.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Renaissance Demo Seed Utility")
    parser.add_argument("--action", choices=["seed", "unseed", "status"], default="seed")
    args = parser.parse_args()

    if args.action == "seed":
        seed_demo()
    elif args.action == "unseed":
        unseed_demo()
    elif args.action == "status":
        print("Checking demo environment status...")
        with TangledSession(tangled_engine) as t_sess:
            inst = t_sess.exec(select(Instructor).where(Instructor.email == DEMO_INSTRUCTOR_EMAIL)).first()
            print("Demo Instructor:", bool(inst))
            if inst:
                course = t_sess.exec(select(Course).where(Course.instructor_id == inst.id)).first()
                print("Demo Course:", course.name if course else "None", f"(Code: {course.join_code})" if course else "")
