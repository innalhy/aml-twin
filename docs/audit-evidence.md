# Audit evidence for one training run

This note is for COMP3424. It says what a TwinAML session mirrors, and which events prove the run.

The twin is not a bank account. Each session starts as a deep clone of that script's `initial_twin_state`. Later steps write the clone. They do not write the script file, and they do not call a core banking system. Customer identifiers in the scripts use the `SYN-` prefix.

## What the events prove

`GET /sessions/{id}` returns the events in order. Each event has `seq`, `type`, and `at`.

| Event | When it is written |
| --- | --- |
| `session_started` | The session is opened for a `case_id`. |
| `node_entered` | A scene, decision, or outcome is entered, after that node's `twin_patch`. |
| `decision_made` | The trainee submits a `choice_id`. The choice effects are already on the twin. |
| `rule_flagged` | A patch appended a flag whose name starts with `R` and a digit, such as `R1_BLOCK` or `R2_IGNORED`. |
| `override` | The choice id contains `override`, or a new flag contains `OVERRIDDEN`. The rule stays in the script. |
| `session_closed` | An outcome node was entered. The payload includes the disposition and whether it is a teaching poor path. |

`rules[].when` stays a sentence. The machine does not evaluate it. The disposition string is the one the outcome `twin_patch` wrote.

## How the dashboard marks the run

`teaching` on the session compares `twin.disposition` with that script:

- `acceptable_dispositions` → rule follow **yes**
- `poor_dispositions` → rule follow **no**, and `poor_path` is true (`false_positive_cleared`, `exit_without_str`, or `monitoring_backdated` on the scripts that list them)
- `incomplete_dispositions` → rule follow **no** (`str_drafted` on `hk-triad-cashflow-001` when the freeze recommendation was skipped)

## One-call card

`GET /sessions/{id}/evidence` returns the same facts in a short card: `case_id`, disposition, rule follow, flags, event types, and how many overrides were stored. It reads the session. It does not keep a second copy.

A closed deepfake run that overrode R1 and then drafted an STR includes `override`, `rule_flagged`, and `session_closed`, with disposition `str_drafted` and rule follow yes. Clearing that alert as a false positive closes on `false_positive_cleared` and marks the poor path.

## What a classmate can run

From the repo root, start the API and the web app as in the root [README](../README.md). Open the case list, finish one branch, then open Dashboard. The session row shows the `case_id`, the disposition, the flags, and rule follow. The detail page lists the events in `seq` order.
