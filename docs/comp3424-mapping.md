# COMP3424 mapping

Subject: COMP3424 Digital Twins: Simulation and Case Studies (PolyU, 3 credits). The subject asks students to understand digital twins, simulation, and how to connect a twin to artificial intelligence. Application settings include government and other non-factory examples. TwinAML uses **AML simulation training** as the case, not a FlexSim production line.

The three terms below are the teaching contract for this demo. Chan Level 1 and Level 2 here mean two delivery stages: first build the mirror, then let one training session follow it. That is the assignment scope. It is not a wholesale import of a factory digital-twin maturity model. Mirroring, shadowing, and threading follow the three capabilities commonly described for industrial digital twins (Jiang, Yin, Li, Luo, Kaynak, *Industrial applications of digital twins*, 2021; Saracco's mirror / shadow / thread). The Node API and its file-backed SQLite own authoritative state; the optional Worker adapter uses the same engines with its own storage. These terms do not justify a separate enterprise architecture.

## Chan Level 1 — script mirror

**Implemented, alongside the Level 2 training runtime below.**

Level 1 is the digital model of one case. The physical world in this demo is not a factory. It is a synthetic investigation: a customer, KYC signals, an account, transactions, and risk flags.

- The mirror is `initial_twin_state` plus `nodes` in `data/cases/01-deepfake-hk-001.example.json`.
- The script player at `/cases` runs the eleven example cases. A person can also read the JSON and describe the twin before any decision.
- Branches are a written script, not live sensing.

The default [Hong Kong AML workflow](aml-workflow.md) also mirrors synthetic customers, accounts, transactions, relationships and source documents. An executable monitoring rule produces alerts from those records. The Second Ledger at `/investigation` retains its separate paired-evidence model and guided simulation clock.

Level 1 is done when a case file validates against `packages/schemas/script.schema.json` and the rules are written in that file, not in a chat transcript.

## Chan Level 2 — training shadow

**Implemented for synthetic training sessions.**

Level 2 lets one session shadow the trainee. Actions update the authoritative backend state and append ordered events; the web interface reads that state. The optional FastAPI app is a health-only stub and cannot run an investigation session.

- Data direction: trainee action → decision event → twin state → web.
- The twin does not reach back and control a real bank system. Without that reverse control it remains a shadow, not a bidirectional twin wired into production.
- Different choices produce different saved state snapshots. In the AML workflow, a case can be returned for more investigation, closed after review, or approved as a training STR draft. These statuses do not assert a crime or a live report submission.

The scripted case library replays its decision events to rebuild the twin. The AML workflow and Second Ledger persist authoritative snapshots plus audit histories; they do not claim to reconstruct every state solely by replaying events. Each exercise has one server-side state owner and separate sessions.

Anything beyond that (bidirectional control of a real system, autonomous agents, Unity) is outside this demo.

## Mirroring, shadowing, threading

| Capability | In TwinAML | In this scaffold |
| --- | --- | --- |
| **Mirroring** | Project the investigation world into an offline model: customer, signals, accounts, transactions and rules | Present in scripts, evidence packs and the synthetic Hong Kong dataset |
| **Shadowing** | When the trainee acts, the twin follows. The web interface shows authoritative current state | Implemented in the AML workflow, Second Ledger and script player |
| **Threading** | Preserve rule version, source transactions, decisions, role changes and outcomes so a reviewer can explain the sequence | Implemented as ordered audit events; scripted case decisions can also be replayed |

A media file is not the twin. A video is only a `media_ref` on a node. Large files stay in local `data/media/`.

## Rules before AI

Executable rules produce monitoring matches and validate workflow transitions. Analysts and reviewers provide the recorded assessment. An alert is not a conclusion that a crime occurred or that a report must be filed solely because a numeric threshold was crossed.

In the example:

- **R1**: the authored course policy stops onboarding after two liveness failures. A trainee may override, but `R1_OVERRIDDEN` remains on the scripted state.
- **R2**: the authored deepfake script treats an existing deepfake signal and a sudden third-party inflow as requiring reporting or enhanced review. Its teaching dispositions are classroom assumptions, not Hong Kong statutory thresholds.

No language model is required by the implemented workflow. A later model could explain a fired rule or draft a cited summary for review, but it must not silently rewrite a disposition or become the record of truth. The implementation supports modelling and simulation outcomes; completing an AI integration would require additional work.

## Reproducible simulation comparison

Use the same synthetic ledger with two documented monitoring-rule versions. Compare matched and newly generated alerts, inspect their triggering transactions, and preserve the subsequent case findings and reviewer decisions. Alternatively, add a controlled transaction and explain why it changes detection. The recorded parameters, transaction IDs and audit events make this comparison inspectable. Assess reasoning using the evidence available when a decision was made; alert or STR counts alone are not measures of success.

## Boundary with other subject topics

| Common subject tool or topic | This demo |
| --- | --- |
| Discrete-event simulation, FlexSim | The Second Ledger has timed evidence and payment events. The AML workflow has deterministic monitoring and case transitions. A separately authored FlexSim edition has its own validation status in `simulation/flexsim/README.md`. |
| IoT sensing | The trainee's decision is the input event. There is no sensor. |
| NVIDIA Omniverse, VR, metaverse | Not in scope. The web app is the face. |
| Unity | Optional later client, calling the same API. |
| Artificial intelligence / machine learning | No decision-making model implemented. Any later assistance remains subordinate to validated rules and human review. |

## How a trainee can describe the assignment

TwinAML models a fictional Hong Kong bank's AML monitoring and investigation process. Rules generate alerts from a synthetic ledger. Learner actions and reviewer decisions change server-owned case state and leave an audit thread. Controlled runs show how data and rule changes affect detection, while cited findings explain why an investigation was closed, returned or escalated to a training STR draft.
