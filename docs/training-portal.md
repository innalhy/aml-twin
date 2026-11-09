# TwinAML training portal

The portal uses the navy-and-white learning-center layout from the supplied dashboard and simulation-gallery references in the existing React/Vite client. It uses the existing Node/SQLite case engine and Clerk accounts. It does not create a second twin model or a new deployment service.

| Route | What a trainee can do |
| --- | --- |
| `/` | Choose a professional role, view the role-based learning path and progress, launch recommended courses and open public resources. |
| `/simulations` | Filter three 3D environments by setting, difficulty or skill, then enter or resume an exercise. |
| `/tools` | Open the AML operations workbench, Second Ledger and timed investigation. |
| `/simulation` | Work from a 3D monitoring room to investigate an evolving bank account with timed checks, payments, controls, assessments and a simulated reviewer. |
| `/training`, `/cases` | Choose one of eleven topic workflows, continue the selected session or open related original scripts. |
| `/reports` | Review session outcomes, resume a run and export the visible summary as CSV or current session as JSON. |
| `/intro`, `/help` | Read the training introduction and practical guidance. |
| `/settings` | Choose light/dark appearance and open existing Clerk account management when signed in. |
| `/operations`, `/aml` | Use the existing Hong Kong monitoring and investigation workbench. |
| `/investigation` | Use the original Second Ledger investigation exercise. |

The primary Topic 01 case is `project-meridian-001`: Brief → Email → Video transcript → Pay → Outcome → teaching notes. Reporting or independently verifying a suspicious instruction produces a different authored outcome from confirming the simulated payment. The video stage uses an explicitly labelled text transcript; this checkout has no video recording.

The primary Topic 02 entry now opens the [AML investigation simulation](aml-simulation.md). The original `mule-mixer-001` guided script and its saved sessions remain available through saved-run resume. The simulation has a guided clock, evidence checks with provenance, pending payments and explicit control approval/application. No action submits a real STR or controls a live account.

Both new scripts use schema 0.1 and the existing decision/event replay engine. Original scripts and choice IDs are preserved for saved sessions. Evidence arrives in the current server node; rationales and teaching notes arrive only after a terminal outcome. Browser navigation between topics and the dashboard preserves the selected server session. Decisions include the server revision; a stale decision refreshes the session without resubmitting.

Dashboard and report metrics are calculated from the selected server run and, for signed-in users, `/api/account/runs`. Progress counts distinct topics with a completed session; it is a practice completion measure, not a certification. No reaction time is measured. Anonymous practice shows the current browser session; account-enabled environments retain cross-device history in My progress. Role and theme choices are local preferences, separate from case state. The selected role is account-scoped and personalizes recommendations; it does not change account permissions or the simulation practice role.

## Reference-inspired learning center

The top navigation is **My Learning**, **Courses**, **Simulations**, **Compliance Tools** and **Progress**. Help, light/dark appearance, settings and the existing account-progress control remain accessible in the header.

Five professional roles reorder the existing topic workflows: frontline/onboarding, KYC/due diligence, transaction monitoring/investigations, compliance/management, and product/technology. **Open this role path** opens `/training?role=…`; the course filter can return to the full library. Read-only topics open their existing overview with `?topic=…`. These preferences survive refresh without creating a second case state model. Role progress counts only playable modules, excluding read-only overviews without a completion event. Topic 02 includes completion and in-progress state from the timed investigation.

The simulation gallery launches three WebGL scenes built from procedural models. Drag to look around, and select marked objects to open the related work. The scene also provides keyboard controls and a list of the same actions. When WebGL is unavailable, the exercise remains playable through those actions and its standard panels.

| 3D environment | Exercise and interactions |
| --- | --- |
| Private banking office | `bank-cdd-001`: examine the customer file, make a due diligence decision and review the saved activity. |
| Retail bank branch | `mule-rent-001`: investigate the branch alert, examine its evidence and decide how to respond. |
| Transaction monitoring room | `/simulation`: use the workstations to open the alert, evidence, assessment and reviewer panels. The clock advances through the existing exercise controls. |

The renderer loads on demand. Scene interactions open the same evidence and submit through the same server-backed decision controls as the standard exercises. Guided launches add `view=3d` to the selected run URL so a refresh restores the scene and session. The course library also provides the standard case player. The gallery's [image thumbnails](learning-center-assets.md) are illustrative previews.

The layout adapts to desktop, tablet and mobile. On small phones, the role choices become a labelled select, course and simulation cards stack vertically, and the top navigation can scroll. Filters and selections have accessible labels and focus styles. Dark mode and reduced-motion preferences are supported.

## Local verification exercise

1. Start the local development environment with `npm run dev` and open `/`.
2. Switch professional roles and confirm the header, recommendations and course list change. Refresh to check the role preference is retained. Open the KYC path and its read-only synthetic-identity overview.
3. Open **Simulations**, combine environment/difficulty/skill filters, check the empty state and reset filters. Enter each 3D scene, move the camera and use the marked objects to open the intended exercise panels. Confirm the action list still works with WebGL unavailable.
4. Save a decision in a guided case, return to the gallery and continue it. Refresh the player and confirm it restores the same 3D scene and server session. Completed exercises must offer replay.
5. Open the timed investigation, start or resume an assignment, advance the clock and return to My Learning. The monitoring path should show Topic 02 in progress. Ended simulations count toward completion.
6. Inspect **Progress**, export the summary, open **Settings**, change theme, and follow the workbench and Second Ledger links from **Compliance Tools**.
7. Check 1440px desktop, 768px tablet and 390px mobile layouts. In a Clerk-enabled environment, separately verify sign-in and account-owned history; anonymous development intentionally bypasses sign-in.

Checks: frontend `npm run build` and `node --test tests/account-api.test.mjs tests/training-cases.test.mjs tests/aml-simulation.test.mjs`. The existing engines and case schemas drive both the scene interactions and the standard exercise panels.
