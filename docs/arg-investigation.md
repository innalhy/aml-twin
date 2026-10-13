# The Second Ledger: ARG investigation pilot

The first browser investigation reuses `data/evidence/analyst-session-001`. Its six alerts, two urgent project-payment investigations, four background customers, and authored course policy remain the source material. The adapter does not add evidence or change the eleven existing case scripts.

## Player experience

The player begins a shift as a junior investigator at a fictional financial institution. The interface is a working investigation desk: a queue of alerts, a customer dossier, original source records, payment history, a request desk, and an action panel. Its visual direction uses navy navigation, restrained teal controls and warm paper-like document surfaces. Identity, project and payment information come from the authored pack rather than decorative dashboard metrics.

The core loop is **inspect → form an explanation → request a check → apply a proportionate control or record a decision → advance time → reconsider**. Players can switch customers and choose their own enquiries. This is an investigation rather than a compulsory sequence of next-scene buttons.

- **Evidence:** open the available records and select their IDs as citations. Customer statements remain distinguishable from independently checked responses by their source text.
- **Requests:** see the permitted checks, service durations, prerequisites and completion status. A response becomes readable only when the session clock reaches its completion time.
- **Payment controls:** place or release an outbound hold with a reason. Holds act on one customer's pending orders; decisions are separate and do not alter eligibility.
- **Case decisions:** close, continue review or escalate with cited evidence and a rationale. Revising a decision adds a new entry rather than deleting the earlier one.
- **Time:** reading is paused. Players advance to the next event or declare review work time; payment deadlines continue independently of checks. The shift ends at simulation minute 30.
- **Debrief:** inspect payment consequences, outstanding checks, decisions and the ordered activity history; export the learner-visible record. This is an observed-outcome review, not an automated judgement of criminality.

The first chapter deliberately starts after onboarding. KYC records let players review what happened during intake, but they do not operate a live onboarding workflow. STR submission, law-enforcement actions, supervisory assurance, multi-role collaboration and the other eleven scripts are future campaign work, not functioning controls in this pilot. No reports or messages go to real institutions.

## Why the case works as an ARG

The two urgent accounts have similar initial signals and the same payment deadlines, yet further evidence supports different conclusions. Payer verification requires supporting documents first: an 8-minute document request followed by a 20-minute check cannot finish before payments due at minutes 18 and 23. The player must make a reasoned provisional decision under uncertainty and revisit it as corroboration or contradictions emerge.

The game should reward enquiry quality, source reconciliation, timing, proportionality and revision. Capturing a villain, maximising reports or indefinitely restricting every account are not the learning objectives. A later pilot comparison should assess decisions on an unseen paired case, alongside expert review of the recorded reasoning.

## Source mapping

`scripts/export-web-investigation.py` first runs the existing FlexSim table exporter with `--check`, then reads the verified CSV tables in `simulation/flexsim/data/tables/`. It maps them to the shared `InvestigationPack` contract in `packages/investigation/types.ts`:

| Pack field | Existing source |
| --- | --- |
| `snapshotAt` | `simulation/flexsim/data/manifest.json` → `snapshot_at` |
| `briefing`, `policy` | Exact text of `learner/START.md` and `learner/course-policy.md` |
| `customers`, `accounts`, `transactions`, `alerts` | Corresponding CSV tables; all cell values stay strings |
| `requests` | `request_catalog.csv`, including service minutes and prerequisites |
| `initialState`, `dueEvents` | `initial_state.csv` and `due_events.csv` |
| `evidence` | `evidence_catalog.csv` metadata and the exact Markdown body at each indexed record path |

The generated file is `workers/api/src/investigation-pack.json`. It is **server-only** because it includes the twelve delayed responses as well as the twelve initial records. The frontend must never import this JSON or copy it into public assets. The shared investigation engine, used by the primary Node server and optional Worker adapter, releases record bodies according to the request gates and session clock and returns only the permitted view. Instructor answer keys and instructor index paths are absent from the generated pack.

The adapter validates IDs, account and transaction references, request prerequisites, release-folder boundaries, and integer amount/time/count fields. Evidence must remain within the authorised pack folder and the folder appropriate to its release mode. Request prerequisites must not form a cycle. Export order is deterministic.

## Regenerate and check

From the repository root:

```bash
python3 scripts/export-web-investigation.py
python3 scripts/export-web-investigation.py --check
python3 scripts/validate-evidence.py
```

If source tables are stale, regenerate them with `python3 simulation/flexsim/data/export_tables.py` before exporting the server pack. `--check` reads and compares; it writes nothing. It also checks that the integer and release-path guards reject invalid inputs. The existing evidence validator checks the full authored exercise, including ledger arithmetic and the instructor rubric. This adapter only packages the content for the web investigation; it does not grade a trainee against hidden answers.
