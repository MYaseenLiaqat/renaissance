from datetime import datetime, timedelta


def test_valid_due_attempt_can_be_submitted_and_graded(
    client, db_session, make_learner, make_task, make_attempt
):
    learner = make_learner()
    task = make_task("supported")
    # An active Supported session is required for a valid submission.
    attempt = make_attempt(learner, task, started_at=datetime.utcnow())

    resp = client.post(
        f"/tasks/{task.id}/submit",
        params={"learner_id": learner.id},
        json={"code": "def add(a,b):\n    return a+b\n"},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["attempt_id"] == attempt.id
    assert data["score"] == 1.0
    assert data["passed"] is True

    db_session.refresh(attempt)
    assert attempt.completed_at is not None
    assert attempt.score == 1.0


def test_future_task_submission_is_rejected(
    client, db_session, make_learner, make_task, make_attempt
):
    learner = make_learner()
    task = make_task("delayed")
    attempt = make_attempt(
        learner, task, scheduled_for=datetime.utcnow() + timedelta(days=7)
    )

    resp = client.post(
        f"/tasks/{task.id}/submit",
        params={"learner_id": learner.id},
        json={"code": "def add(a,b):\n    return a+b\n"},
    )

    assert resp.status_code == 409

    db_session.refresh(attempt)
    assert attempt.completed_at is None


def test_unassigned_learner_task_submission_is_rejected(
    client, db_session, make_learner, make_task, make_attempt
):
    learner = make_learner()
    task = make_task("immediate")
    make_attempt(learner, task)

    other_learner = make_learner()

    resp = client.post(
        f"/tasks/{task.id}/submit",
        params={"learner_id": other_learner.id},
        json={"code": "def add(a,b):\n    return a+b\n"},
    )

    assert resp.status_code == 404

def test_completed_attempt_cannot_be_resubmitted(
    client, db_session, make_learner, make_task, make_attempt
):
    learner = make_learner()
    task = make_task("immediate")
    attempt = make_attempt(learner, task, completed_at=datetime.utcnow())

    resp = client.post(
        f"/tasks/{task.id}/submit",
        params={"learner_id": learner.id},
        json={"code": "def add(a,b):\n    return a+b\n"},
    )

    assert resp.status_code == 409


def test_nonexistent_learner_submission_is_rejected(
    client, db_session, make_task, make_attempt
):
    task = make_task("immediate")

    resp = client.post(
        f"/tasks/{task.id}/submit",
        params={"learner_id": 9999},
        json={"code": "def add(a,b):\n    return a+b\n"},
    )

    assert resp.status_code == 404


def test_temperature_count_task_valid_submission_and_progress(
    client, db_session, make_learner, make_attempt
):
    from app.models import Concept, Task

    concept = db_session.query(Concept).filter_by(name="Loops").first()
    if not concept:
        concept = Concept(name="Loops", order=1)
        db_session.add(concept)
        db_session.commit()

    temp_task = Task(
        concept_id=concept.id,
        type="supported",
        version="0.5.0",
        prompt_text=(
            "The platform already provides a variable named `temperatures` containing:\n"
            "[28, 32, 35, 29, 31, 27]\n\n"
            "Do not redefine `temperatures`.\n\n"
            "Write Python code that sets `result` to the number of temperatures "
            "strictly greater than 30."
        ),
        grading_spec={
            "mode": "exec_result",
            "result_var": "result",
            "tests": [
                {"inputs": {"temperatures": [28, 32, 35, 29, 31, 27]}, "expected": 3},
                {"inputs": {"temperatures": []}, "expected": 0},
                {"inputs": {"temperatures": [30, 30]}, "expected": 0},
                {"inputs": {"temperatures": [31, 31]}, "expected": 2},
                {"inputs": {"temperatures": [10, 20, 29]}, "expected": 0},
                {"inputs": {"temperatures": [40, 50]}, "expected": 2},
            ],
        },
        scheduled_offset_days=0,
    )
    db_session.add(temp_task)
    db_session.commit()

    learner = make_learner(condition="controlled_ai")
    attempt = make_attempt(learner, temp_task, started_at=datetime.utcnow())

    valid_solution = (
        "result = 0\n"
        "for temp in temperatures:\n"
        "    if temp > 30:\n"
        "        result += 1\n"
    )

    resp = client.post(
        f"/tasks/{temp_task.id}/submit",
        params={"learner_id": learner.id},
        json={"code": valid_solution},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["attempt_id"] == attempt.id
    assert data["score"] == 1.0
    assert data["passed"] is True
    assert all("passed" in f for f in data["feedback"])

    db_session.refresh(attempt)
    assert attempt.score == 1.0
    assert attempt.completed_at is not None
    assert attempt.supported_end_reason == "completed"

    # Resubmitting completed attempt must return 409
    resubmit = client.post(
        f"/tasks/{temp_task.id}/submit",
        params={"learner_id": learner.id},
        json={"code": valid_solution},
    )
    assert resubmit.status_code == 409


def test_temperature_count_task_invalid_submission(
    client, db_session, make_learner, make_attempt
):
    from app.models import Concept, Task

    concept = db_session.query(Concept).filter_by(name="Loops").first()
    if not concept:
        concept = Concept(name="Loops", order=1)
        db_session.add(concept)
        db_session.commit()

    temp_task = Task(
        concept_id=concept.id,
        type="supported",
        version="0.5.0",
        prompt_text="Count temperatures > 30",
        grading_spec={
            "mode": "exec_result",
            "result_var": "result",
            "tests": [
                {"inputs": {"temperatures": [28, 32, 35, 29, 31, 27]}, "expected": 3},
                {"inputs": {"temperatures": [31, 31]}, "expected": 2},
            ],
        },
        scheduled_offset_days=0,
    )
    db_session.add(temp_task)
    db_session.commit()

    learner = make_learner(condition="controlled_ai")
    attempt = make_attempt(learner, temp_task, started_at=datetime.utcnow())

    wrong_solution = "result = 0\n"

    resp = client.post(
        f"/tasks/{temp_task.id}/submit",
        params={"learner_id": learner.id},
        json={"code": wrong_solution},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["attempt_id"] == attempt.id
    assert data["score"] == 0.0
    assert data["passed"] is False
    assert any("failed" in f for f in data["feedback"])
