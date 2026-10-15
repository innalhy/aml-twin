# COMP3424 mapping

Subject: [COMP3424 Digital Twins: Simulation and Case Studies](https://www.polyu.edu.hk/comp/docdrive/ug/subject/COMP3424.pdf) (The Hong Kong Polytechnic University, 3 credits). The subject asks students to understand digital twins, simulation, and how to connect a twin to artificial intelligence. Application settings include government and other non-factory examples. TwinAML uses **AML simulation training** as the case, not a FlexSim production line.

The three terms below are the teaching contract for this demo. Chan Level 1 and Level 2 here mean two delivery stages: first build the mirror, then let one training session follow it. That is the assignment scope. It is not a wholesale import of a factory digital-twin maturity model. Mirroring, shadowing, and threading follow the three capabilities commonly described for industrial digital twins (Jiang, Yin, Li, Luo, Kaynak, *Industrial applications of digital twins*, 2021; Saracco's mirror / shadow / thread). All three live in the same simplified Worker. They do not justify a separate enterprise architecture.

## Chan Level 1 — script mirror

**This repository is at this level.**

Level 1 is the digital model of one case. The physical world in this demo is not a factory. It is a synthetic investigation: a customer, KYC signals, an account, transactions, and risk flags.

- The mirror is `initial_twin_state` plus `nodes` in `data/cases/01-deepfake-hk-001.example.json`.
- There is no session runtime yet. A person can read the JSON and say what the twin believes before any decision.
- Branches are a written script, not live sensing.

Level 1 is done when a case file validates against `packages/schemas/script.schema.json` and the rules are written in that file, not in a chat transcript.

## Chan Level 2 — training shadow

**Next stage, still inside the same Worker (`workers/api`). Not built yet.**

Level 2 lets one session shadow the trainee. The trainee's choices become events, events update the twin, and the dashboard only reads that state. The optional FastAPI app is a local stand-in for the same routes. It is not a second twin.

- Data direction: trainee action → decision event → twin state → web.
- The twin does not reach back and control a real bank system. Without that reverse control it remains a shadow, not a bidirectional twin wired into production.
- Two different choice paths must produce two different state snapshots.

Level 2 is done when the same case can end as "onboarding refused" and as "opened, then cleared as a false positive", the dashboard shows different `disposition` values and flags, and the ordered events can be replayed.

Anything beyond that (bidirectional control of a real system, autonomous agents, a Unity client on the Worker API) is outside this Worker demo. An Editor training room now lives under [`unity/`](../unity/UNITY.md). It plays two scripts locally. It does not shadow a live session on the Worker.

## Mirroring, shadowing, threading

| Capability | In TwinAML | In this scaffold |
| --- | --- | --- |
| **Mirroring** | Project the investigation world into an offline model: customer, signals, account, rules, script nodes | Present, in the example JSON |
| **Shadowing** | When the trainee decides, the twin follows. The dashboard shows current state, not a hand-edited copy of the numbers | Not built. Level 2 |
| **Threading** | String the script version, decision order, overrides, and outcome into one replayable record. To explain why a flag appeared, read that line. Do not rely on memory | Not built. The event log is the thread. It is not a cross-system data lake |

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
| Discrete-event simulation, FlexSim | No production-line simulation. The simulation is a branching script plus a state machine. |
| IoT sensing | The trainee's decision is the input event. There is no sensor. |
| NVIDIA Omniverse, VR, metaverse | Not in scope. The web app is the face. |
| Unity | Optional later client, calling the same API. |
| Artificial intelligence / machine learning | Considered only after rules, and it cannot replace the rules. |

## How a trainee can describe the assignment

TwinAML Level 1 turns one Hong Kong deepfake onboarding case into a readable digital mirror. Level 2 will let a training session shadow that mirror and use an event thread to explain each risk flag. Judgment follows R1 and R2, not a model score.
