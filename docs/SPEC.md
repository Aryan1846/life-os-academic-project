# Life OS — Consolidated Product Requirements Specification

> **Source of truth:** Six SE laboratory PDFs (Experiments 4, 6, 7, 8, 9, 10) from MediCaps University, Course CS3CO40(P).
> This document consolidates every requirement into a single reference, updated with Product Owner adjustments. SRS section numbers (e.g., FR-1.3) are preserved from the original documents.

---

## 1 · Product Overview

**Life OS** is an Integrated Personal Life-Management Platform with Intelligent AI Decision Support. It provides a single authenticated interface for managing goals, tasks, habits, health, finance, career, relationships, and scheduling — with a signature AI feature that evaluates decision alternatives using **deterministic weighted scoring** combined with **AI-generated qualitative reasoning, trade-off analysis, and pros/cons**.

### 1.1 Actors

| Actor | Type | Description |
|---|---|---|
| **User** | Primary, active | Manages all life-area modules, requests AI decision support, owns private data |
| **Administrator** | Secondary, active | System-level settings, user account lifecycle (disable/delete), audit log review. **Cannot access private user records without legitimate authorization.** |
| **AI Service** | Secondary, passive (external) | Receives decision problems and privacy-cleared context; returns reasoning, pros/cons, and criteria evaluations. Configurable provider (Gemini initial). |
| **Database** | Internal | Persistent storage for all user and system data with strict user-isolated Row-Level Security |
| **Notification Service** | Internal / External | Delivers in-app alerts and reminders in v1; external push/email in v2 |

---

## 2 · Functional Requirements

### 2.1 Authentication & Privacy (FR-1.x)

| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | User registration with email/password | Mandatory (v1) |
| FR-1.2 | User login with email/password | Mandatory (v1) |
| FR-1.3 | Credential validation against database, return auth token | Mandatory (v1) |
| FR-1.4 | User logout / session termination | Mandatory (v1) |
| FR-1.5 | Manage privacy settings — granular toggles controlling which life-areas can be shared with AI service | Mandatory (v1) |
| FR-1.6 | Account deletion & full data purge (GDPR / right to be forgotten) | Mandatory (v1) |

### 2.2 Personalized Dashboard (FR-2.x)

| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | Personalized dashboard displaying summary of goals, tasks, habits, health, finance, upcoming events | Mandatory (v1) |
| FR-2.2 | Dashboard fetches aggregated data from all life-area modules | Mandatory (v1) |
| FR-2.3* | Note: Final dashboard widget layout, theme, and styling require explicit Product Owner approval | Locked |

### 2.3 Goals, Tasks & Habits (FR-2.3–2.6 / FR-3.x)

| ID | Requirement | Priority |
|---|---|---|
| FR-2.3 | Create, read, update, delete goals with deadlines and progress tracking | Mandatory (v1) |
| FR-2.4 | Create, read, update, delete tasks with priority, status, due date, goal linkage | Mandatory (v1) |
| FR-2.5 | Create, read, update, delete habits with frequency and target count | Mandatory (v1) |
| FR-2.6 | Deterministic streak calculation logic for habits (consecutive completions, preserve longest streak) | Mandatory (v1) |

### 2.4 Personal Finance (FR-3.3–3.5)

| ID | Requirement | Priority |
|---|---|---|
| FR-3.3 | Log income and expense transactions with category, amount, date | Mandatory (v1) |
| FR-3.4 | Set budget limits per category; system raises in-app alert when threshold reached | Mandatory (v1) |
| FR-3.5 | View spending summaries and budget status | Mandatory (v1) |

### 2.5 Health & Fitness (FR-3.1–3.2)

| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | Log health activities (exercise type, duration, calories) | Mandatory (v1) |
| FR-3.2 | Track fitness metrics and view health summaries | Mandatory (v1) |

### 2.6 Career, Education & Business (FR-4.1–4.4)

| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | Track career goals (skills, certifications, milestones) | Mandatory (v1) |
| FR-4.2 | Manage education records (courses, grades, study plans) | Mandatory (v1) |
| FR-4.3 | Track business ideas and projects | Mandatory (v1) |
| FR-4.4 | Link career items to goals/tasks for cross-module visibility | Mandatory (v1) |

### 2.7 Relationships (FR-5.1–5.2)

| ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | Maintain a contacts/relationships list with notes and tags | Mandatory (v1) |
| FR-5.2 | Log interactions and set relationship-nurturing reminders | Mandatory (v1) |

### 2.8 Calendar & Reminders (FR-5.3–5.4)

| ID | Requirement | Priority |
|---|---|---|
| FR-5.3 | Create, view, edit, delete calendar events with date/time/recurrence | Mandatory (v1) |
| FR-5.4 | Set in-app reminders for events, tasks, and relationship follow-ups | Mandatory (v1) |

### 2.9 Analytics & Reports (FR-6.1–6.4)

| ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | Aggregate period data (weekly/monthly/yearly) across all modules | Mandatory (v1) |
| FR-6.2 | Visual reports: charts for goal completion, spending, health trends, habit streaks | Mandatory (v1) |
| FR-6.3 | Filter reports by module, date range, category | Mandatory (v1) |
| FR-6.4 | Export report and personal data (Basic JSON format in v1; formatted CSV/PDF deferred to v2) | Mandatory (v1 JSON) |

### 2.10 AI Decision Support — Signature Feature (FR-7.1–7.8)

| ID | Requirement | Priority |
|---|---|---|
| FR-7.1 | Enter decision problem in natural language | Mandatory (v1) |
| FR-7.2 | Define alternatives (≥ 2), criteria, weights (summing to 1.0), and constraints | Mandatory (v1) |
| FR-7.3 | System attaches permitted context from Life OS data strictly per privacy settings | Mandatory (v1) |
| FR-7.4 | AI evaluation with configurable provider/model (Gemini default, configurable via env) | Mandatory (v1) |
| FR-7.5a | **Deterministic Weighted Scoring Ranking:** Alternatives are ranked mathematically using normalized criteria weights and criterion score evaluations: $\text{Score}(A_i) = \sum_{j} w_j \cdot s_{ij}$ | Mandatory (v1) |
| FR-7.5b | **AI-Generated Reasoning:** Comprehensive qualitative reasoning, trade-off analysis, and pros/cons per alternative | Mandatory (v1) |
| FR-7.6 | Revise criteria/weights/alternatives and re-evaluate (full version history maintained) | Mandatory (v1) |
| FR-7.7 | Persist complete decision history (problem, criteria, scoring, reasoning, outcome) | Mandatory (v1) |
| FR-7.8 | Recommendation clearly labelled as **advisory** — user retains ultimate decision authority | Mandatory (v1) |

**AI Decision Object Lifecycle (from State Chart):**
`DRAFT` → `CRITERIA DEFINED` → `CONTEXT ATTACHED` → (info check) → `EVALUATING` → `EVALUATED` → (accept/revise) → `CLOSED`

### 2.11 Notifications & Integrations (FR-8.x)

| ID | Requirement | Priority |
|---|---|---|
| FR-8.1 | In-app notifications for budget alerts, due tasks, event reminders | Mandatory (v1) |
| FR-8.2 | Two-way calendar sync with external calendar API (Google/CalDAV) | Deferred (v2) |
| FR-8.3 | Import activity data from health/wearable API (opt-in) | Deferred (v2) |
| FR-8.4 | AI service integration via configurable HTTPS API (Gemini initial) | Mandatory (v1) |

### 2.12 Administrator Functionality (ADM-1–5) & Strict Privacy Isolation

| ID | Requirement | Priority |
|---|---|---|
| ADM-1 | Admin login (separate role-based access, protected routes) | Mandatory (v1) |
| ADM-2 | Manage user accounts (view user list, toggle active status, delete account) | Mandatory (v1) |
| ADM-3 | Configure system settings (system-wide flags, maintenance mode) | Mandatory (v1) |
| ADM-4 | Review audit logs (system events, login events, administrative actions) | Mandatory (v1) |
| ADM-5 | Basic system metrics in v1 (user count, active sessions, error rates); full monitoring deferred | Simplified (v1) |
| ADM-PRIV | **Strict Privacy Boundary:** Administrators CANNOT browse or access private user records (goals, tasks, finances, health logs, relationship notes, personal decisions) without legitimate user authorization / explicit consent | Mandatory (v1) |

---

## 3 · Non-Functional Requirements

### 3.1 Performance (NFR-P)

| ID | Requirement | Target |
|---|---|---|
| NFR-P1 | Page load time (LCP) | ≤ 3 seconds |
| NFR-P3 | API response time (CRUD operations) | ≤ 1 second |
| NFR-P4 | In-app reminder delivery latency | ≤ 1 minute of configured time |
| NFR-P5 | AI evaluation response | ≤ 30 seconds |
| NFR-P6 | Concurrent users supported | ≥ 100 |

### 3.2 Security & Privacy (NFR-SEC)

| ID | Requirement |
|---|---|
| NFR-SEC1 | Passwords hashed securely via Supabase Auth (bcrypt/argon2) |
| NFR-SEC2 | Secure, expiring JWT tokens with HTTP-only cookies |
| NFR-SEC3 | Strict Row-Level Security — user data is accessible only by the owner (`auth.uid() = user_id`) |
| NFR-SEC3a | **Admin Isolation:** Admins have NO default read access to user life-area tables via RLS |
| NFR-SEC4 | All communication over HTTPS/TLS 1.3 |
| NFR-SEC5 | AI service receives ONLY privacy-permitted context explicitly enabled by user |
| NFR-SEC6 | Rate limiting on authentication and AI decision endpoints |

### 3.3 Usability & Design Approval

| ID | Requirement |
|---|---|
| NFR-U1 | Responsive web interface built on Next.js 16 and shadcn/ui foundation |
| NFR-U2 | Final visual design, theme, colors, typography, and dashboard layout require explicit Product Owner approval |
| NFR-P7 | Native mobile apps (Android/iOS) — Deferred (v2, responsive PWA in v1) |

---

## 4 · Mandatory vs. Deferred Scope

### ✅ Preserved in v1 Scope
- Complete 11 mandatory modules
- In-app reminders and notifications (FR-5.4, FR-8.1)
- Basic JSON data export (FR-6.4)
- User account deletion & data purge (FR-1.6)
- Deterministic weighted scoring + AI qualitative reasoning for decision support (FR-7.5)
- Strict admin privacy isolation (ADM-PRIV)

### 🔜 Explicitly Deferred to v2 Scope
- External calendar sync (Google Calendar, CalDAV)
- Health/wearable API sync
- Formatted PDF/CSV report export
- Push/email external delivery channels (in-app notifications active in v1)
- Native mobile apps
- Advanced infrastructure monitoring dashboard
