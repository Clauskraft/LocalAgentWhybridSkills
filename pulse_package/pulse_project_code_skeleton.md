# Pulse+ Project – Code Skeleton & Drafts

Dette dokument giver et overblik over den tekniske struktur og kode‑skeletter, der svarer til den detaljerede backlog. Målet er at give et udgangspunkt for udviklere, så de hurtigt kan begynde implementeringen af hver hovedkomponent. Koden er illustrativ – den skal tilpasses og udvides efter behov.

---

## 1. Foundation & Setup

### 1.1 Docker Compose

```yaml
version: "3.8"
services:
  neo4j:
    image: neo4j:5
    environment:
      - NEO4J_AUTH=neo4j/password
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - ./graph/init.cypher:/docker-entrypoint-initdb.d/init.cypher

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=pulse
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=pulse
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    env_file: .env
    depends_on:
      - neo4j
      - postgres
      - redis
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    env_file: .env
    depends_on:
      - backend
    ports:
      - "3000:3000"
```

### 1.2 Base Python Project

**`backend/main.py`** – FastAPI app med webhook endepunkter og routing:

```python
from fastapi import FastAPI, Request
from .routes import webhooks, decisions, insights

app = FastAPI()

app.include_router(webhooks.router)
app.include_router(decisions.router)
app.include_router(insights.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

### 1.3 Outbox & Ingestion Pattern

**`backend/models.py`** – SQLAlchemy modeller for Postgres:

```python
from sqlalchemy import Column, Integer, String, JSON, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class IngestLog(Base):
    __tablename__ = "ingest_log"
    id = Column(Integer, primary_key=True)
    source = Column(String, index=True)
    external_id = Column(String, index=True, unique=True)
    ingested_at = Column(DateTime, default=datetime.utcnow)

class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    id = Column(Integer, primary_key=True)
    source = Column(String)
    kind = Column(String)
    external_id = Column(String)
    payload = Column(JSON)
    status = Column(String, default="pending")
    attempts = Column(Integer, default=0)
    next_run_at = Column(DateTime, default=datetime.utcnow)
```

**Worker skeleton** (Celery/RQ omitted for brevity):

```python
from .pipeline.engine import run_pipeline
from .graph.driver import write_graph
from .models import OutboxEvent, IngestLog

async def process_event(event_row):
    # Convert DB row to Event object
    event = Event(
        source=event_row.source,
        kind=event_row.kind,
        id=event_row.external_id,
        occurred_at=event_row.payload.get("occurred_at"),
        payload=event_row.payload,
    )
    ctx = Context(flags=get_active_flags())
    result = run_pipeline(event, ctx)
    # Write to Neo4j
    write_graph(result.writes)
    # Mark ingest log
    log = IngestLog(source=event.source, external_id=event.id)
    session.add(log)
    session.commit()
```

---

## 2. Data Ingestion & Connectors

### 2.1 GitHub Webhook Handler

**`backend/routes/webhooks.py`**

```python
from fastapi import APIRouter, Request, HTTPException
from ..services import outbox_service

router = APIRouter(prefix="/webhook")

@router.post("/github")
async def github_webhook(request: Request):
    payload = await request.json()
    event_type = request.headers.get("X-GitHub-Event")
    delivery_id = request.headers.get("X-GitHub-Delivery")
    # TODO: verify signature
    await outbox_service.enqueue_event(
        source="github",
        kind=event_type,
        external_id=delivery_id,
        payload=payload,
    )
    return {"status": "queued"}
```

### 2.2 Commit Parsing Module (F2)

**`backend/modules/f2_normalize_commits.py`**

```python
import re
from ..pipeline.types import Event, PipelineResult, GraphWrite

COMMIT_RE = re.compile(r"^(feat|fix|chore|docs|refactor)\(([^)]+)\):\s(.+)$")

class Module:
    flag_name = "F2_NORMALIZE"
    fail_fast = True

    def handle(self, event: Event, ctx) -> PipelineResult:
        res = PipelineResult()
        if event.kind != "push":
            return res
        commits = event.payload.get("commits", [])
        for commit in commits:
            msg = commit.get("message")
            match = COMMIT_RE.match(msg)
            if not match:
                continue
            type_, scope, title = match.groups()
            component = scope.split(":")[0]
            feature_key = f"{component}:{title.lower().replace(' ', '-') }"
            res.writes.append(GraphWrite(
                cypher="CALL autogrow.upsert_change($sha,$msg,$date,$type,$feature_key,$feature_title,$component)",
                params={
                    "sha": commit["id"],
                    "msg": msg,
                    "date": event.occurred_at,
                    "type": type_,
                    "feature_key": feature_key,
                    "feature_title": title,
                    "component": component,
                },
            ))
        return res
```

### 2.3 WidgeTDC Pulse Connector Skeleton

```python
class WidgeTDCPulseConnector:
    def __init__(self, base_url: str):
        self.base_url = base_url

    async def poll_events(self):
        # Example: fetch events from /api/pulse/stream
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/api/pulse/stream")
            events = response.json()
            for event in events:
                yield {
                    "source": "widge_pulse",
                    "kind": event.get("type"),
                    "external_id": event.get("id"),
                    "payload": event,
                }

    async def run_polling(self):
        async for event in self.poll_events():
            await outbox_service.enqueue_event(**event)
```

---

## 3. Context & Memory Services

### 3.1 ContextService (Pseudo‑implementation)

```python
class ContextService:
    def __init__(self, calendar_connector, mail_connector, memory_connector):
        self.calendar = calendar_connector
        self.mail = mail_connector
        self.memory = memory_connector

    async def gather_context(self, permissions: dict) -> dict:
        context = {}
        if permissions.get("calendar"):
            context["calendar"] = await self.calendar.fetch_upcoming_events()
        if permissions.get("email"):
            context["email"] = await self.mail.fetch_recent_emails()
        if permissions.get("memory"):
            context["memory"] = await self.memory.fetch_recent_items()
        # ... add more sources
        return context
```

### 3.2 CloneProfileService

```python
class CloneProfileService:
    def __init__(self, neo4j_driver):
        self.driver = neo4j_driver

    def load_profile(self, profile_hash: str) -> dict:
        query = "MATCH (c:CloneProfile {profileHash: $hash}) RETURN c"
        result = self.driver.session().run(query, hash=profile_hash)
        record = result.single()
        return dict(record["c"]) if record else {}

    def generate_in_voice(self, message: str, recipient: str) -> str:
        profile = self.load_profile(profile_hash)
        system_prompt = f"You are {profile.get('tone', 'an AI assistant')}..."
        # TODO: call LLM with system_prompt + message
        return "draft email"
```

---

## 4. Insight Generation & Scheduling

### 4.1 InsightService Skeleton

```python
class InsightService:
    def __init__(self, context_service, profile_service):
        self.context_service = context_service
        self.profile_service = profile_service

    async def generate_daily_insights(self, user_id: str):
        # Load permissions & preferences from DB
        permissions = await self.get_permissions(user_id)
        preferences = await self.get_preferences(user_id)
        context = await self.context_service.gather_context(permissions)
        # Example: generate meeting preparation insight
        calendar_events = context.get("calendar", [])
        insights = []
        for event in calendar_events:
            if self.is_today(event["start"]):
                insights.append({
                    "type": "meeting_prep",
                    "title": f"Forbered dig til {event['subject']}",
                    "summary": f"Møde med {', '.join(event['participants'])} kl. {event['start']}",
                })
        # TODO: generate other types (email digest, news, memory recall)
        return insights
```

### 4.2 Scheduling Job

```python
async def daily_job():
    users = await get_all_active_users()
    for user in users:
        insights = await insight_service.generate_daily_insights(user.id)
        await insight_service.persist_insights(user.id, insights)
        await notification_service.send_daily_summary(user.id, insights)
```

---

## 5. Privacy & Permissions

### 5.1 DataPermissions Model

```python
class DataPermissions(Base):
    __tablename__ = "data_permissions"
    id = Column(Integer, primary_key=True)
    user_id = Column(String, unique=True)
    calendar = Column(Boolean, default=False)
    email = Column(Boolean, default=False)
    memory = Column(Boolean, default=False)
    browser = Column(Boolean, default=False)
    # add more fields as needed
```

**API endpoints**

```python
@router.get("/permissions")
async def get_permissions(user_id: str):
    return db.query(DataPermissions).filter_by(user_id=user_id).first()

@router.put("/permissions")
async def update_permissions(user_id: str, perms: DataPermissionsSchema):
    # Validate & persist changes
    # Enqueue audit log entry
    ...
    return {"status": "updated"}
```

### 5.2 Audit Logging

```python
class AuditEntry(Base):
    __tablename__ = "audit_entries"
    id = Column(Integer, primary_key=True)
    user_id = Column(String)
    source = Column(String)
    resource_id = Column(String)
    purpose = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
```

Whenever data is accessed:

```python
def log_access(user_id, source, resource_id, purpose):
    entry = AuditEntry(user_id=user_id, source=source, resource_id=resource_id, purpose=purpose)
    session.add(entry)
    session.commit()
```

---

## 6. Analytics & Governance Modules

### 6.1 Early Warning (F4) Job

```python
def compute_churn_signals():
    q = """
    MATCH (cmp:Component)<-[:TOUCHES]-(f:Feature)<-[:IMPLEMENTS]-(c:Change)
    WITH cmp,
         sum(CASE WHEN datetime(c.date) >= datetime() - duration({days:14}) THEN 1 ELSE 0 END) AS churn14,
         sum(CASE WHEN datetime(c.date) < datetime() - duration({days:14}) AND datetime(c.date) >= datetime() - duration({days:28}) THEN 1 ELSE 0 END) AS churnPrev14
    WITH cmp, churn14, churnPrev14, (churn14 - churnPrev14) AS delta
    WHERE churn14 >= 10 OR delta >= 5
    MERGE (s:Signal {key: "cmp-churn:" + cmp.name})
    SET s.kind = "component_churn",
        s.churn14 = churn14,
        s.churnPrev14 = churnPrev14,
        s.delta = delta,
        s.updated_at = datetime()
    MERGE (s)-[:ABOUT]->(cmp)
    """
    run_cypher(q, {})
```

### 6.2 Decision Recording (F5)

```python
@router.post("/decisions")
async def record_decision(decision: DecisionIn):
    event = Event(
        source="internal",
        kind="decision",
        id=str(uuid.uuid4()),
        occurred_at=datetime.utcnow().isoformat(),
        payload=decision.dict(),
    )
    await outbox_service.enqueue_event(
        source=event.source,
        kind=event.kind,
        external_id=event.id,
        payload=event.payload,
    )
    return {"id": event.id}
```

### 6.3 Sovereignty Mapping (F6)

```python
def load_sovereignty_config(path="config/sovereignty.yaml"):
    with open(path) as f:
        cfg = yaml.safe_load(f)
    return cfg

def create_sovereignty_relations(cfg):
    for component, data in cfg.get("components", {}).items():
        for svc in data.get("services", []):
            params = {
                "component": component,
                "service_key": svc["key"],
                "vendor": svc["vendor"],
                "jurisdiction": svc["jurisdiction"],
                "jur_title": cfg.get("jurisdictions", {}).get(svc["jurisdiction"], svc["jurisdiction"]),
            }
            run_cypher("""
            MERGE (cmp:Component {name:$component})
            MERGE (svc:Service {key:$service_key}) SET svc.vendor = $vendor, svc.jurisdiction = $jurisdiction
            MERGE (v:Vendor {name:$vendor})
            MERGE (j:Jurisdiction {code:$jurisdiction}) SET j.title = $jur_title
            MERGE (cmp)-[:DEPENDS_ON]->(svc)
            MERGE (svc)-[:PROVIDED_BY]->(v)
            MERGE (v)-[:SUBJECT_TO]->(j)
            """, params)
```

### 6.4 Policy & Capability Matching (F7/F8)

```python
def align_policies(themes, epics):
    for theme in themes:
        pkey = theme["key"]
        keywords = [k.lower() for k in theme.get("keywords", [])]
        for epic in epics:
            if any(k in epic.title.lower() for k in keywords):
                run_cypher(
                    """MATCH (e:Epic {key:$ekey}) MERGE (p:PolicyTheme {key:$pkey}) MERGE (e)-[:ALIGNS_TO]->(p)""",
                    {"ekey": epic.key, "pkey": pkey},
                )

def match_capabilities(capabilities, features):
    for cap in capabilities:
        ckey = cap["key"]
        kws = [k.lower() for k in cap.get("keywords", [])]
        for feature in features:
            if any(k in feature.title.lower() for k in kws):
                run_cypher(
                    """MATCH (f:Feature {key:$fkey}) MERGE (c:Capability {key:$ckey}) MERGE (f)-[:BUILDS]->(c)""",
                    {"fkey": feature.key, "ckey": ckey},
                )
```

---

## 7. Frontend Components (React/Next Skeleton)

### 7.1 PulseCard Component

```jsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
export default function PulseCard({ insight, onAction, onFeedback }) {
  return (
    <Card className={`border-l-4 ${priorityColor(insight.priority)}`}> 
      <CardHeader>
        <h3>{insight.title}</h3>
        <span>{formatDate(insight.relevantAt)}</span>
      </CardHeader>
      <CardContent>
        <p>{insight.summary}</p>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={() => onFeedback(insight.id, true)}>👍</button>
          <button onClick={() => onFeedback(insight.id, false)}>👎</button>
          {insight.actions?.map((act) => (
            <button key={act.id} onClick={() => onAction(act)}>{act.label}</button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function priorityColor(priority) {
  switch (priority) {
    case 'critical': return 'border-red-500';
    case 'high': return 'border-amber-500';
    case 'medium': return 'border-blue-500';
    default: return 'border-green-500';
  }
}
```

### 7.2 Dashboard Page

```jsx
import useSWR from 'swr'
import PulseCard from '@/components/PulseCard'

export default function Dashboard() {
  const { data: insights, error } = useSWR('/api/insights?state=today', fetcher)
  if (!insights) return <div>Loading...</div>
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {insights.map((ins) => (
        <PulseCard key={ins.id} insight={ins} onAction={handleAction} onFeedback={handleFeedback} />
      ))}
    </div>
  )
}

function handleAction(action) {
  // call backend to perform action
}

function handleFeedback(id, helpful) {
  // call backend /insights/:id/feedback
}
```

---

## 8. Summary

Dette skelet dækker de centrale komponenter: infrastrukturen (docker compose, Neo4j og Postgres), backend med event/outbox‑mønster og pipeline moduler, services til kontekst, profil og indsigt, privacy‑modeller, analytiske jobs samt et basis‑UI i React. Udviklere kan bruge disse drafts som udgangspunkt og udbygge funktionalitet efter den detaljerede backlog.

---

## 9. Test Suites & Eksempler

En robust teststrategi dækker både backend‑logik, pipeline moduler og frontend. Dette afsnit skitserer, hvordan man kan strukturere testene samt giver konkrete eksempler på enhedstests.

### 9.1 Backend: Python / pytest

**Opsætning:**

1. Installer testafhængigheder i `backend/requirements-dev.txt`, fx:

   ```
   pytest
   pytest-asyncio
   pytest-mock
   neo4j
   httpx
   ```

2. Opret en `tests/` mappe i `backend/` med `__init__.py`.

3. Brug fixtures til at spinne en midlertidig Neo4j‑database (evt. test harness) og en SQLite/Postgres in‑memory database til Outbox/permissions.

**Eksempler:**

*Test af commit‑parser (F2)*

```python
import pytest
from backend.modules.f2_normalize_commits import Module
from backend.pipeline.types import Event, Context


def test_parse_valid_commit():
    module = Module()
    event = Event(
        source="github",
        kind="push",
        id="test123",
        occurred_at="2025-12-31T12:00:00Z",
        payload={"commits": [{"id": "abc", "message": "feat(app:billing): add invoice"}]},
    )
    ctx = Context(flags={"F2_NORMALIZE": True})
    result = module.handle(event, ctx)
    assert len(result.writes) == 1
    write = result.writes[0]
    assert write.params["feature_key"] == "app:billing:add-invoice"


def test_ignore_invalid_commit():
    module = Module()
    event = Event(
        source="github",
        kind="push",
        id="test124",
        occurred_at="2025-12-31T12:00:00Z",
        payload={"commits": [{"id": "abc", "message": "update README"}]},
    )
    ctx = Context(flags={"F2_NORMALIZE": True})
    result = module.handle(event, ctx)
    assert not result.writes
```

*Test af ContextService*

```python
import pytest
from backend.services.context_service import ContextService


class DummyCalendar:
    async def fetch_upcoming_events(self):
        return [ {"subject": "Demo", "start": "2025-12-31T09:00:00Z", "participants": ["Alice"]} ]


class DummyMail:
    async def fetch_recent_emails(self):
        return [ {"subject": "Welcome", "from": "noreply@example.com"} ]


class DummyMemory:
    async def fetch_recent_items(self):
        return []


@pytest.mark.asyncio
async def test_gather_context():
    ctx_service = ContextService(DummyCalendar(), DummyMail(), DummyMemory())
    permissions = {"calendar": True, "email": True, "memory": False}
    context = await ctx_service.gather_context(permissions)
    assert "calendar" in context
    assert len(context["calendar"]) == 1
    assert "email" in context
    assert "memory" not in context
```

### 9.2 Frontend: Jest / React Testing Library

For frontend‑komponenter anbefales **Jest** og **@testing-library/react** til DOM‑test. Installer dem via npm/yarn og konfigurer jest.

*Test af PulseCard*

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import PulseCard from '@/components/PulseCard'

test('renderer titel og summary', () => {
  const insight = {
    id: '1',
    title: 'Forbered dig til demo',
    summary: 'Møde med Alice kl. 09:00',
    priority: 'high',
    actions: [],
  }
  render(<PulseCard insight={insight} onAction={() => {}} onFeedback={() => {}} />)
  expect(screen.getByText('Forbered dig til demo')).toBeInTheDocument()
  expect(screen.getByText('Møde med Alice kl. 09:00')).toBeInTheDocument()
})

test('feedback knapper kalder callback', () => {
  const insight = {
    id: '1',
    title: 'Forbered dig',
    summary: '...',
    priority: 'medium',
    actions: [],
  }
  const onFeedback = jest.fn()
  render(<PulseCard insight={insight} onAction={() => {}} onFeedback={onFeedback} />)
  fireEvent.click(screen.getAllByRole('button')[0]) // thumbs up
  expect(onFeedback).toHaveBeenCalledWith('1', true)
})
```

### 9.3 Integration & End‑to‑End Tests

Til at sikre, at backend, database og frontend fungerer sammen, kan **Cypress** eller **Playwright** bruges til end‑to‑end tests. Et eksempel på E2E‑test kan være:

1. Opret en testbruger og seed testdata via API.
2. Åbn dashboardet i browseren og log ind.
3. Verificér, at dagens indsigter vises.
4. Klik på en feedback‑knap, og tjek at responsen gemmes (fx via API‑kald eller opdateret UI).

### 9.4 Kontinuerlig integration

Tilføj følgende step til jeres GitHub Actions eller CI‑workflow:

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      neo4j:
        image: neo4j:5
        ports: [7687:7687]
        options: --health-cmd="cypher-shell -u neo4j -p password 'RETURN 1'" --health-interval=10s --health-timeout=5s --health-retries=5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt -r backend/requirements-dev.txt
      - name: Run backend tests
        run: pytest backend/tests
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm install && npm test
```

---
