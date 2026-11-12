import os
import subprocess
import sys
from collections.abc import Generator
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import Settings
from app.core.database import get_session
from app.core.passwords import hash_password, verify_password
from app.main import app
from app.modules.academic.models import Cohort, Course, Enrollment, Identity, UserRole
from app.modules.identity import content
from app.modules.identity.models import ContentAsset

pytestmark = pytest.mark.integration
CSRF = {"X-Kairos-CSRF": "1"}
PASSWORD = "A test-only passphrase 482!"


@pytest.fixture
def accounts(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> Generator[tuple[Session, dict[str, Identity]]]:
    url = os.environ.get("SCHOOL_TEST_DATABASE_URL")
    if not url:
        pytest.skip("PostgreSQL exclusivo de teste necessário.")
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        check=True,
        cwd=Path(__file__).resolve().parents[1],
        env={**os.environ, "SCHOOL_DATABASE_URL": url},
    )
    engine = create_engine(url)
    session = Session(engine)
    created: dict[str, Identity] = {}
    for role in ("admin", "coordinator", "student", "outsider"):
        user_id = uuid4()
        user = Identity(
            id=user_id,
            auth_issuer="kairos-local",
            auth_subject=str(user_id),
            display_name=f"Test {role}",
            email=f"{uuid4().hex}@school.example.org",
            password_hash=hash_password(PASSWORD),
            account_status="active",
            must_change_credentials=role == "coordinator",
        )
        session.add(user)
        session.flush()
        session.add(UserRole(user_id=user.id, role="student" if role == "outsider" else role))
        created[role] = user
    session.commit()
    app.dependency_overrides[get_session] = lambda: session
    monkeypatch.setattr(security, "get_engine", lambda: engine)
    monkeypatch.setattr(content, "get_engine", lambda: engine)
    monkeypatch.setattr(
        content,
        "get_settings",
        lambda: Settings(
            upload_directory=tmp_path,
            max_upload_bytes=1024 * 1024,
            upload_quota_bytes=1024 * 1024 * 100,
            _env_file=None,
        ),
    )
    yield session, created
    app.dependency_overrides.clear()
    session.close()
    engine.dispose()


def client() -> TestClient:
    return TestClient(app, client=(f"client-{uuid4().hex}", 50000))


def sign_in(browser: TestClient, user: Identity, password: str = PASSWORD) -> dict[str, object]:
    response = browser.post(
        "/api/v1/auth/login", json={"email": user.email, "password": password}, headers=CSRF
    )
    assert response.status_code == 200, response.text
    assert "httponly" in response.headers["set-cookie"].lower()
    assert "strict" in response.headers["set-cookie"].lower()
    assert "token" not in response.json()
    return response.json()


def test_password_hash_cookie_and_revocable_logout(
    accounts: tuple[Session, dict[str, Identity]],
) -> None:
    session, users = accounts
    assert users["admin"].password_hash != PASSWORD
    assert verify_password(PASSWORD, users["admin"].password_hash)
    assert not verify_password("incorrect", users["admin"].password_hash)
    with client() as browser:
        sign_in(browser, users["admin"])
        assert browser.get("/api/v1/dashboard").status_code == 200
        assert browser.post("/api/v1/auth/logout").status_code == 403  # CSRF header required.
        assert browser.post("/api/v1/auth/logout", headers=CSRF).status_code == 200
        assert browser.get("/api/v1/auth/me").status_code == 401


def test_coordinator_is_blocked_until_credentials_are_approved(
    accounts: tuple[Session, dict[str, Identity]],
) -> None:
    session, users = accounts
    with client() as coordinator, client() as admin:
        response = sign_in(coordinator, users["coordinator"])
        assert response["must_change_credentials"] is True
        assert coordinator.get("/api/v1/dashboard").status_code == 403
        assert (
            coordinator.post(
                "/api/v1/content",
                data={"title": "Test upload"},
                files={"file": ("lesson.pdf", b"%PDF-1.7\ntest", "application/pdf")},
                headers=CSRF,
            ).status_code
            == 403
        )
        real_email = f"{uuid4().hex}@real-school.org"
        new_password = "New secure test-only password 73!"
        pending = coordinator.post(
            "/api/v1/auth/onboarding",
            json={"email": real_email, "password": new_password},
            headers=CSRF,
        )
        assert pending.status_code == 200
        assert pending.json()["account_status"] == "pending"
        assert coordinator.get("/api/v1/content").status_code == 403
        sign_in(admin, users["admin"])
        approved = admin.post(
            f"/api/v1/governance/users/{users['coordinator'].id}/approve", headers=CSRF
        )
        assert approved.status_code == 200
        assert approved.json()["must_change_credentials"] is False
        assert coordinator.get("/api/v1/auth/me").status_code == 401
        relogin = coordinator.post(
            "/api/v1/auth/login", json={"email": real_email, "password": new_password}, headers=CSRF
        )
        assert relogin.status_code == 200
        assert coordinator.get("/api/v1/dashboard").status_code == 200
        uploaded = coordinator.post(
            "/api/v1/content",
            data={"title": "Coordinator draft lesson"},
            files={"file": ("lesson.pdf", b"%PDF-1.7\ncoordinator", "application/pdf")},
            headers=CSRF,
        )
        assert uploaded.status_code == 201
        assert coordinator.get("/api/v1/governance/users").status_code == 403


def test_private_upload_student_denial_and_enrollment_scope(
    accounts: tuple[Session, dict[str, Identity]],
) -> None:
    session, users = accounts
    course = Course(title="Private upload course", slug=uuid4().hex, status="published")
    session.add(course)
    session.flush()
    cohort = Cohort(course_id=course.id, title="Enrolled students")
    session.add(cohort)
    session.flush()
    session.add(Enrollment(cohort_id=cohort.id, student_id=users["student"].id, status="active"))
    session.commit()
    body = {"title": "Private lesson PDF", "course_id": str(course.id), "status": "published"}
    files = {"file": ("lesson.pdf", b"%PDF-1.7\nprivate content", "application/pdf")}
    with client() as admin, client() as student, client() as outsider:
        sign_in(admin, users["admin"])
        sign_in(student, users["student"])
        sign_in(outsider, users["outsider"])
        assert (
            student.post("/api/v1/content", data=body, files=files, headers=CSRF).status_code == 403
        )
        response = admin.post("/api/v1/content", data=body, files=files, headers=CSRF)
        assert response.status_code == 201, response.text
        asset_id = response.json()["id"]
        record = session.scalar(
            select(ContentAsset).where(
                ContentAsset.title == body["title"], ContentAsset.owner_id == users["admin"].id
            )
        )
        assert record is not None and record.storage_key != "lesson.pdf"
        assert len(record.sha256) == 64
        assert student.get(f"/api/v1/content/{asset_id}/file").content == files["file"][1]
        assert outsider.get(f"/api/v1/content/{asset_id}/file").status_code == 404
        assert student.get("/api/v1/governance/users").status_code == 403
        archived = admin.put(
            f"/api/v1/content/{asset_id}",
            json={"title": body["title"], "course_id": str(course.id), "status": "archived"},
            headers=CSRF,
        )
        assert archived.status_code == 200
        assert student.get(f"/api/v1/content/{asset_id}/file").status_code == 404


def test_governance_reset_cancel_and_self_protection(
    accounts: tuple[Session, dict[str, Identity]],
) -> None:
    session, users = accounts
    with client() as admin, client() as student:
        sign_in(admin, users["admin"])
        sign_in(student, users["student"])
        assert (
            admin.post(
                f"/api/v1/governance/users/{users['admin'].id}/cancel", headers=CSRF
            ).status_code
            == 409
        )
        reset = admin.post(
            f"/api/v1/governance/users/{users['student'].id}/reset-password", headers=CSRF
        )
        assert reset.status_code == 200
        assert len(reset.json()["temporary_password"]) >= 12
        assert student.get("/api/v1/auth/me").status_code == 401
        temporary = student.post(
            "/api/v1/auth/login",
            json={"email": users["student"].email, "password": reset.json()["temporary_password"]},
            headers=CSRF,
        )
        assert temporary.status_code == 200 and temporary.json()["must_change_credentials"]
        assert student.get("/api/v1/dashboard").status_code == 403
        assert (
            admin.post(
                f"/api/v1/governance/users/{users['student'].id}/cancel", headers=CSRF
            ).status_code
            == 200
        )
        assert (
            student.post(
                "/api/v1/auth/login",
                json={
                    "email": users["student"].email,
                    "password": reset.json()["temporary_password"],
                },
                headers=CSRF,
            ).status_code
            == 403
        )


def test_invalid_file_and_csrf_origin_are_rejected(
    accounts: tuple[Session, dict[str, Identity]],
) -> None:
    session, users = accounts
    with client() as admin:
        sign_in(admin, users["admin"])
        fake = {"file": ("lesson.pdf", b"<html>not a pdf</html>", "application/pdf")}
        assert (
            admin.post(
                "/api/v1/content", data={"title": "Invalid PDF"}, files=fake, headers=CSRF
            ).status_code
            == 422
        )
        assert (
            admin.post(
                "/api/v1/content",
                data={"title": "Script"},
                files={"file": ("bad.html", b"<script>", "text/html")},
                headers=CSRF,
            ).status_code
            == 422
        )
        assert (
            admin.post(
                "/api/v1/auth/logout", headers={**CSRF, "Origin": "https://attacker.example"}
            ).status_code
            == 403
        )


def test_signup_is_pending_and_has_no_upload_role(
    accounts: tuple[Session, dict[str, Identity]],
) -> None:
    session, users = accounts
    email = f"{uuid4().hex}@signup.example.org"
    with client() as browser:
        registration = browser.post(
            "/api/v1/auth/register",
            json={"name": "New student", "email": email, "password": PASSWORD},
            headers=CSRF,
        )
        assert registration.status_code == 201
        login = browser.post(
            "/api/v1/auth/login", json={"email": email, "password": PASSWORD}, headers=CSRF
        )
        assert login.status_code == 200
        assert login.json()["roles"] == ["student"]
        assert login.json()["account_status"] == "pending"
        assert browser.get("/api/v1/content").status_code == 403


def test_login_rate_limit(accounts: tuple[Session, dict[str, Identity]]) -> None:
    with client() as browser:
        email = f"{uuid4().hex}@absent.example.org"
        for _ in range(5):
            assert (
                browser.post(
                    "/api/v1/auth/login", json={"email": email, "password": "wrong"}, headers=CSRF
                ).status_code
                == 401
            )
        assert (
            browser.post(
                "/api/v1/auth/login", json={"email": email, "password": "wrong"}, headers=CSRF
            ).status_code
            == 429
        )
