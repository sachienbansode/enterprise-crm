# NIYTRI CRM — Enterprise Financial Services Platform

## Overview

NIYTRI CRM is a comprehensive enterprise CRM designed for NIYTRI Financial Services, covering five key business verticals: Retail Broking, Corporate Broking, Investment Banking, AIF, and Institutional Equities. Its primary purpose is to streamline financial service operations, enhance client management, and provide robust administrative tools.

Key capabilities include:
- Secure authentication with optional MFA and Microsoft 365 SSO. Users with `mfa_enabled=false` skip OTP and get a direct session token. M365 users can fall back to email+password when SSO is misconfigured.
- Comprehensive client registry with KYC/FATCA compliance.
- Dedicated modules for Service Requests, Leads, and Deals across all business verticals.
- An AI Assistant for SQL query generation and data synthesis with double-pass PII masking.
- Integration with Microsoft Teams for meeting management.
- Configurable PII masking: partial-visibility format (first 2 + last 4 chars), admin-configurable who can reveal PII (admin view and owner view toggles in the admin panel).
- An extensive Admin Panel for managing users, roles, SLAs, AI settings, M365 integration, and auditing. User management and role mapping load live from the DB.
- Vertical dashboards show real counts (clients, leads, deals, SRs) from the DB — no hardcoded KPI values.

The project aims to provide a unified, efficient, and secure platform to manage client interactions and financial processes across NIYTRI's diverse business lines, improving operational efficiency and compliance.

## User Preferences

I prefer iterative development. Ask before making major changes. I prefer detailed explanations.

## System Architecture

The project utilizes a monorepo structure managed by `pnpm workspaces`, built on Node.js 24 and TypeScript 5.9.

**UI/UX Decisions:**
- **Theming:** Defaults to a light theme system-wide, with specific branding elements like a blue-to-violet gradient globe favicon.
- **Data Masking:** PII fields are masked by default, with an eye icon to reveal sensitive information based on user permissions.
- **Notifications:** Polling every 30 seconds for real-time updates.
- **Interactive Components:** Features like `UserSearchDropdown`, `CreateSrModal`, `SrDetailModal`, `CreateDealModal` are designed for intuitive data entry and management.
- **Tooltips:** Extensive use of `Tip` wrapper components and `title` attributes for clear user guidance.

**Technical Implementations:**
- **API Framework:** Express 5 handles all backend API services.
- **Database:** PostgreSQL with Drizzle ORM for data persistence and schema management.
- **Validation:** Zod is used for robust request and response validation, integrated with `drizzle-zod`.
- **API Codegen:** Orval generates client-side React Query hooks and Zod schemas from an OpenAPI specification, ensuring type safety and consistency between frontend and backend.
- **Authentication:** Implements Email OTP and Microsoft 365 SSO via Azure AD OAuth2, with strict MFA enforcement.
- **MS Teams Integration:** Leverages Microsoft Graph API for creating meetings, managing availability, and sending emails. Includes graceful fallbacks for missing permissions.
- **NIYTRI AI:** An SQL Agent that uses an LLM to generate, execute, and synthesize SQL queries, with strict vertical access filters and full DB schema context. PII masking (PAN, mobile, email, demat, DOB) is enabled by default and configurable in Admin → AI Settings.
- **Notifications System:** Manages and displays user notifications with read/clear functionalities.
- **Service Request Module:** Comprehensive lifecycle management for service requests, including SLA tracking, audit logs, and status transitions.
- **Client Ownership:** Ensures data access control with `owner_id` and role-based PII revelation.

**Feature Specifications:**
- **Admin Panel:** Centralized control for user and role management (14 configurable roles with granular permissions), SLA/TAT configuration, LLM/NIYTRI AI settings (including PII masking toggle), AI prompt management, M365 integration, audit logging, dropdown values config, pipeline stages config, and system configuration.
- **Dropdown Config:** Admin-configurable dropdown options for leads (source, product, deal_type) and clients (category). Stored in `dropdown_config` table, managed via Admin → Operations → Dropdown Values.
- **Pipeline Stages:** Admin-configurable lead/deal stages per vertical. Stored in `pipeline_stages` table, managed via Admin → Operations → Pipeline Stages. 53 default stages seeded across all 5 verticals × lead/deal entities.
- **Client Form (5-tab modal):** Full create/edit modal (ClientForm.tsx) covering Basic Info, KYC/Compliance, Banking & Demat, multiple Contacts, and Assignment. Accessible from every vertical's Clients view via "New Client" button.
- **Lead/Deal Modals:** Full-featured create/edit modals (LeadDealModals.tsx) with pipeline stage dropdowns (from DB), source/product dropdowns, searchable client picker, RM assignment, and expected close date.
- **Business Verticals:** Each of the five verticals has dedicated dashboards, lead pipelines, deal management, client views, and document management.
- **Data Fetching:** All data is fetched dynamically from `/api/*` endpoints, with server-side pagination, search, and filtering capabilities.
- **Monorepo Structure:** Organizes the codebase into `artifacts` (deployable apps), `lib` (shared libraries), and `scripts` (utilities), promoting code reuse and maintainability.

## Audit Log (Admin Panel)

- **Route:** `GET /api/audit-logs` (paginated, up to 200/page) and `GET /api/audit-logs/export` (full CSV, max 10,000 rows)
- **CSV export fields:** Timestamp, Entity Type, Entity Code, Record, Action, Details, User, Role, User ID, Entity ID, Changed Fields, Before (JSON), After (JSON), IP Address
- **Filters:** `search` (user/record/code/action/details ILIKE), `entity_type`, `action` (exact match), `entity_code` (ILIKE), `from_date`/`to_date` (inclusive date range)
- **entity_code column** in `audit_logs`: populated by `logAudit()` for clients (CLI-XXX), leads (RB-XXXX), deals (IB-DXXX), service_requests (SR-XXXX)
- **Frontend AdminAuditLog:** date range pickers + Apply Filters button, Download CSV button (triggers export endpoint), "ID / Code" column showing entity_code in gold, "Changed Fields" preview, clickable rows open full detail modal with always-visible side-by-side Before/After JSON snapshots

## Demo Video (NIYTRI CRM Demo Video artifact)

- **Path:** `/niytri-demo-video/` — standalone Vite+React artifact at `artifacts/niytri-demo-video/`
- **7 animated scenes** (~33s total, looping): Scene1 (logo reveal), Scene2 (fragmentation problem), Scene3 (Client Registry + PII masking), Scene4 (Pipeline Kanban), Scene5 (NIYTRI AI chatbot typewriter), Scene6 (Audit Log + Service Requests), Scene7 (closing lockup)
- **Persistent layer (outside AnimatePresence):** grid texture (`niytri-grid`), two animated ambient orbs (gold #C9933B, teal #0EA5E9) that shift position per scene, 6 floating accent particles, animated horizontal gold accent line
- **Fonts:** Space Grotesk (display), Inter (body), JetBrains Mono (code/mono)
- **Hook:** `useVideoPlayer({ durations })` from `src/lib/video/hooks.ts` — accepts `Record<string,number>`, returns `currentScene` index; calls `window.startRecording` on mount and `window.stopRecording` after last scene

## External Dependencies

- **Azure AD / Microsoft 365:** Used for SSO, MFA, Microsoft Teams integration (meeting creation, availability), and email sending via Microsoft Graph API.
- **PostgreSQL:** The primary database for all application data.
- **Drizzle ORM:** Used for database interaction and schema definition.
- **OpenAI/Anthropic/Gemini/Azure/Custom LLM Providers:** Configurable providers for the AI Assistant's language model capabilities.
- **Replit Secrets:** Stores sensitive credentials like Azure AD client ID/secret and API keys.
- **Bloomberg, AWS, OMS, SEBI API:** Listed as external integrations within the System Config section of the Admin Panel.

## Theme System Notes

- `useTheme(isDark)` generates all CSS utility classes for both light and dark mode.
- New color helpers added: `linkText`, `successText`, `errorText`, `warningText`, `codeBlue`, `codeGreen`, `activeTab`, `devBanner`, `upTrend`, `downTrend`.
- Dynamic color functions for semantic badge colors: `badgeColors(color)`, `srStatusColor(status)`, `srPriorityColor(priority)`, `entityColor(entityType)`.
- `verticalAccent(vId)` function returns correct color for deal codes/vertical identifiers based on current theme.
- Light mode uses `-600`/`-700` text variants for colored text; dark mode uses `-400` variants.
- OTP logs are always shown in API server console (`[OTP] email: code`) regardless of environment.
- All auth screens (login, OTP) and all app pages (dashboard, SR, leads, clients, admin) fully tested for light/dark mode contrast.

## Verticals Configuration

- `verticals_config` PostgreSQL table stores label, short_name, is_active, display_order per vertical_id.
- API routes: `GET /api/admin/verticals` and `PUT /api/admin/verticals/:vertical_id`.
- Frontend loads verticals from API on startup (module-level mutable `VERTICALS` array), falls back to hardcoded defaults.
- All vertical names display in UPPERCASE throughout the app (sidebar, header breadcrumb, page headings, pipeline cards, dashboard sections).
- Admin panel: Administration > Operations > "Verticals Config" — inline editable table for all 5 verticals.
- Vertical IDs (retail, corporate, ib, aif, ie) are system identifiers; labels and short names are freely configurable.
- `VERTICAL_DEFAULTS` keeps icons and colors (not configurable via UI); `getVerticalsList()` returns current active verticals.