"""
Samling af specifikke enhedstests for Pulse+ projektet. Hver test dækker et centralt område:
1. Commit parser (Data ingestion)
2. ContextService (Context & Memory)
3. Insight generation (Insight & Feedback)
4. Data permission enforcement (Privacy)
5. Early warning signal computation (Analytics)
"""

import pytest

from backend.modules.f2_normalize_commits import Module as CommitParser
from backend.services.context_service import ContextService
from backend.services.insight_service import InsightService

# Dummy connectors for testing ContextService
class DummyCalendar:
    async def fetch_upcoming_events(self):
        return [ {"subject": "Demo", "start": "2026-01-10T09:00:00Z", "participants": ["Alice"]} ]

class DummyMail:
    async def fetch_recent_emails(self):
        return [ {"subject": "Welcome", "from": "noreply@example.com"} ]

class DummyMemory:
    async def fetch_recent_items(self):
        return []

# 1. Test commit parser normaliserer commits efter konvention

def test_commit_parser_parses_valid_commit():
    parser = CommitParser()
    event = Event(
        source="github",
        kind="push",
        id="1",
        occurred_at="2026-01-05T00:00:00Z",
        payload={"commits": [{"id": "abc", "message": "feat(app:billing): Add invoice logic"}]},
    )
    ctx = Context(flags={"F2_NORMALIZE": True})
    result = parser.handle(event, ctx)
    # Forvent ét GraphWrite objekt
    assert len(result.writes) == 1
    write = result.writes[0]
    assert write.params["type"] == "feat"
    assert write.params["component"] == "app"
    assert write.params["feature_key"].startswith("app:")

# 2. Test ContextService respekterer permissions

@pytest.mark.asyncio
def test_context_service_permissions():
    context_service = ContextService(DummyCalendar(), DummyMail(), DummyMemory())
    permissions = {"calendar": True, "email": False, "memory": False}
    context = await context_service.gather_context(permissions)
    assert "calendar" in context
    assert "email" not in context
    assert "memory" not in context

# 3. Test InsightService genererer mødeforberedelse

@pytest.mark.asyncio
def test_insight_generation_meeting_prep(monkeypatch):
    # Stub dependencies
    context_service = ContextService(DummyCalendar(), DummyMail(), DummyMemory())
    profile_service = object()  # ikke brugt i dette test
    insight_service = InsightService(context_service, profile_service)

    # Stub get_permissions & get_preferences
    async def dummy_perms(user_id): return {"calendar": True}
    async def dummy_prefs(user_id): return {}
    monkeypatch.setattr(InsightService, "get_permissions", dummy_perms)
    monkeypatch.setattr(InsightService, "get_preferences", dummy_prefs)
    monkeypatch.setattr(InsightService, "is_today", lambda self, dt: True)

    insights = await insight_service.generate_daily_insights("user1")
    assert len(insights) >= 1
    assert insights[0]["type"] == "meeting_prep"

# 4. Test at data ikke hentes hvis permission er falsk

@pytest.mark.asyncio
def test_data_permission_enforcement(monkeypatch):
    context_service = ContextService(DummyCalendar(), DummyMail(), DummyMemory())
    permissions = {"calendar": False, "email": True, "memory": False}
    context = await context_service.gather_context(permissions)
    assert "calendar" not in context
    assert "email" in context

# 5. Test beregning af churn signal (simplificeret)

def test_churn_signal_calculation():
    # Da compute_churn_signals kører Cypher mod Neo4j, kan vi her
    # teste at funktionen kører uden at kaste fejl og (teoretisk) opdaterer Signal-noder.
    # I en rigtig test ville man bruge en Neo4j test container og verificere noder.
    from backend.analytics.early_warning import compute_churn_signals
    try:
        compute_churn_signals()
    except Exception as exc:
        pytest.fail(f"Early warning job failed: {exc}")
