# COMP3424 mapping

Subject: [COMP3424 Digital Twins: Simulation and Case Studies](https://www.polyu.edu.hk/comp/docdrive/ug/subject/COMP3424.pdf) (The Hong Kong Polytechnic University, 3 credits). The subject asks students to understand digital twins, simulation, and how to connect a twin to artificial intelligence. Application settings include government and other non-factory examples. TwinAML uses **AML simulation training** as the case, not a FlexSim production line.

The three terms below are the teaching contract for this demo. DT Level 1 is the scripted mirror, and the Learning Center session log is that record. DT Level 2 and Level 3 for this demo are the Behavioral Sandbox: the ledger follows the amount line, and Bloom is the graph. That reading matches the root README. It is not a wholesale import of a factory digital-twin maturity model. Mirroring, shadowing, and threading follow the three capabilities commonly described for industrial digital twins (Jiang, Yin, Li, Luo, Kaynak, *Industrial applications of digital twins*, 2021; Saracco's mirror / shadow / thread). On the Learning Center they live in one API on the rented Linux VPS. The Behavioral Sandbox is the other classroom piece and does not write that session store. They do not justify a separate enterprise architecture. FlexSim is out of scope for this demo.

## DT Level 1 — script mirror

**This repository is at this level.**

Level 1 is the digital model of one case. The physical world in this demo is not a factory. It is a synthetic investigation: a customer, KYC signals, an account, transactions, and risk flags.

- The mirror is `initial_twin_state` plus `nodes` in a script under `data/cases/`. `01-deepfake-hk-001.example.json` is the worked example. The index names 13 scripts.
- The Learning Center API opens a session on that mirror, applies the rules and the state machine, and stores events. That session log is the DT Level 1 record. A person can still read the JSON and say what the twin believes before any decision.
- Branches are a written script, not live sensing.

Level 1 is done when a case file validates against `packages/schemas/script.schema.json` and the rules are written in that file, not in a chat transcript.

## DT Level 2 — training shadow

**The Behavioral Sandbox in `demo/neo4j/` is this demo's Level 2 and Level 3 piece.** The ledger follows the amount line, and Neo4j Bloom on the presenter's machine is the graph. The root README states that reading.

The Learning Center session is the Level 1 record, and that session already runs. FastAPI in `backend/` loads the script, stores the trainee's choices as events, and the player and dashboard read that twin. It is not a second twin.

- Data direction for a Learning Center run: trainee action → decision event → twin state → web.
- The twin does not reach back and control a real bank system. Without that reverse control it remains a shadow, not a bidirectional twin wired into production.
- Two different choice paths produce two different state snapshots. The same deepfake script can end as onboarding refused or as opened and then cleared as a false positive. The dashboard shows the different `disposition` values, flags, and ordered events.

Anything beyond that (bidirectional control of a real system, autonomous agents) is outside this demo. The live in-browser 3D Simulation Center is Three.js inside the Learning Center web client. It is not Unity, and it is not the Behavioral Sandbox. The Unity Editor project is only on branch [`unity`](https://github.com/innalhy/aml-twin/tree/unity) and is outside the current demo path.

## Mirroring, shadowing, threading

| Capability | In TwinAML | In this scaffold |
| --- | --- | --- |
| **Mirroring** | Project the investigation world into an offline model: customer, signals, account, rules, script nodes. The Behavioral Sandbox ledger is the same kind of mirror for one synthetic week. | Present, in the case scripts and in the bundled CSV |
| **Shadowing** | When the trainee decides, the twin follows. The dashboard shows current state, not a hand-edited copy of the numbers. On the sandbox, moving the amount line changes which payments the rule lists. | Present in a Learning Center session, and present as the sandbox amount line |
| **Threading** | String the script version, decision order, overrides, and outcome into one replayable record. To explain why a flag appeared, read that line. Do not rely on memory | Present as the ordered events on a Learning Center session. `GET /sessions/{id}/evidence` is the short card. It is not a cross-system data lake |

A media file is not the twin. A video is only a `media_ref` on a node. Large files stay in local `data/media/`.

## Rules before AI

Compliance outcomes are produced by rules and the state machine first.

In the example:

- **R1**: two liveness failures in a row means the account must not be opened. A trainee may override, but `R1_OVERRIDDEN` must remain on the state.
- **R2**: an existing deepfake signal plus a sudden third-party inflow means the case must be reported or subject to enhanced review. Clearing it straight to a false positive is the weaker path (`false_positive_cleared`).

If a language model is added later, it may explain or draft narrative only after a rule has fired. It is not the score of record, and it must not rewrite `disposition` without an override event. That matches the subject's learning outcome of connecting a twin to AI: connect it, and do not skip the rules.

## Boundary with other subject topics

| Common subject tool or topic | This demo |
| --- | --- |
| Discrete-event simulation, FlexSim | No production-line simulation. The classroom simulation is the Learning Center script and state machine, the in-browser Three.js scenes on the live site, and the Behavioral Sandbox ledger. |
| IoT sensing | The trainee's decision is the input event. There is no sensor. |
| NVIDIA Omniverse, VR, metaverse | Not the 3D path. The live in-browser 3D is Three.js inside the Learning Center web client. |
| Unity | Editor project on branch `unity` only. Outside the current demo path. The Simulation Center is not a Unity WebGL build. |
| Artificial intelligence / machine learning | Considered only after rules, and it cannot replace the rules. |

## How a trainee can describe the assignment

TwinAML Level 1 is the scripted mirror, played as a Learning Center session. The event thread on that session explains each risk flag. Level 2 and Level 3 for this demo are the Behavioral Sandbox: the amount line and the Bloom graph. Judgment follows the written rules, not a model score. The live 3D Simulation Center is Three.js in the browser. It is not Unity, and it is not a workplace geometric twin.
