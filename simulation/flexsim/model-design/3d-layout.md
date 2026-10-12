# 3D layout: four queues and case tokens

Status: design document, contract version 1.0. UNVERIFIED in FlexSim. No model file exists; the
coordinates, object names and trigger names below are a build specification for the Windows
session (`../flexscript/ASSEMBLY.md`; `../windows/` holds the assembly steps and validation
checklist), not a description of something that has run. FlexSim API names are
"where supported": the official manual could not be retrieved from the authoring machine (see
the last section), so every FlexSim-specific claim here must be checked against the installed
version's help before it is relied on.

## Purpose of the 3D view

The 3D view is a status board. It shows which **workflow state** each alert is in and lets the
learner pick a case by clicking its token. It owns nothing: no balance, no clock, no evidence
timer lives in a 3D object. Everything drawn is a function of `run_events` and the current
`customer_id` selection, recomputed after every event and every selection change.

**No 3D travel, processing, setup or conveyor time affects payments or evidence timing.** Order
execution happens only in phase 3 of a due minute or in a release re-check (CONTRACT §3, §4.3,
§4.4). Evidence is released only in phase 1 of a request's `due_minute` (CONTRACT §4.5). A token
moving between queues is a redraw, not a flow-item transfer with a duration; the Queues have no
downstream ports, no batching and no maximum-content limit that could block anything. If the
token's visual move is implemented with an animated travel, the animation must be purely
cosmetic and must not be an event the engine waits on.

## Objects (built-in FlexSim assets only)

| Name in model | Asset | Role |
| --- | --- | --- |
| `Q_Incoming` | Queue (Fixed Resource) | alerts not yet opened |
| `Q_Review` | Queue | the analyst is working the case (reading, deciding) |
| `Q_AwaitingEvidence` | Queue | at least one accepted request has not completed |
| `Q_Completion` | Queue | latest decision is `closure` or `escalation` |
| `Token_AL-001` … `Token_AL-006` | flow item, default Box shape | one per alert; 2 for the MVP (`AL-001`, `AL-002`), 6 with `background-alerts-extension.md` |
| `Label_Q_*` | Text (Visual) | queue captions |
| `Label_Clock` | Text (Visual) | `minute 18 · 11:30Z · paused` |
| `Label_Hold_AL-00n` | Text (Visual), one per main token | shows `HOLD since 6` above a held case; hidden otherwise |

Queue documentation (search-indexed title only, page content not retrievable from this machine):
"Queue" at `https://docs.flexsim.com/en/21.2/Reference/3DObjects/FixedResources/Queue/Queue.html`
and "The Queue Panel" at
`https://docs.flexsim.com/en/23.1/Reference/PropertiesPanels/FixedResourcePanels/Queue/Queue.html`.
The search snippet lists `Maximum Content`, `Item Placement` (Stack Vertically, Horizontal Line,
Stack inside Queue, Do Nothing), `LIFO` and batching options. The design needs: `Maximum Content`
large (≥ 6), `Item Placement` = Horizontal Line, batching off, LIFO off, no output connections.

## ASCII plan (metres, FlexSim model units; x right, y up on the plan, z = 0)

```
 y
 6 ┼  [Label_Clock @ (0.0, 5.5)]  "minute 0 · 11:12Z · paused"
   │
 4 ┼  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  │Q_Incoming│    │ Q_Review │    │Q_Awaiting│    │Q_Complet.│
 2 ┼  │  ■ ■ ■   │    │          │    │ Evidence │    │          │
   │  │  ■ ■ ■   │    │          │    │          │    │          │
 0 ┼  └──────────┘    └──────────┘    └──────────┘    └──────────┘
   │  (0,0)-(4,3)     (6,0)-(10,3)    (12,0)-(16,3)   (18,0)-(22,3)
-1 ┼  "Incoming"      "Analyst review" "Awaiting evidence" "Escalation / completion"
   └──┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼─── x
      0    2    4    6    8   10   12   14   16   18   20   22
```

| Object | Location (x, y, z) | Size (sx, sy, sz) | Notes |
| --- | --- | --- | --- |
| `Q_Incoming` | (0, 0, 0) | (4, 3, 0.1) | flat; tokens sit on top |
| `Q_Review` | (6, 0, 0) | (4, 3, 0.1) | |
| `Q_AwaitingEvidence` | (12, 0, 0) | (4, 3, 0.1) | |
| `Q_Completion` | (18, 0, 0) | (4, 3, 0.1) | |
| `Label_Q_Incoming` … | (x of queue, -1, 0) | text height 0.4 | captions as in the plan |
| `Label_Clock` | (0, 5.5, 0) | text height 0.6 | updated after every advance |
| `Token_AL-00n` | inside its current queue, slot `k` at `(qx + 0.5 + 1.2·k, qy + 1.5, 0.1)` | (0.8, 0.8, 0.8) | slot order = `alert_id` order among tokens in that queue |
| `Label_Hold_AL-00n` | directly above its token, `z = 1.1` | text height 0.3 | `HOLD since <minute>` while `held == true`, empty otherwise |

Spacing of 6 m between queue origins leaves a 2 m aisle so captions and tokens do not overlap at
the default camera. The default view is a top-down orthographic camera centred on (11, 2).

## Workflow state → location

Workflow state is computed per customer from run state (itself derived from events). It uses only
the four states below; payment state (`held`, `executed`, `overdue`) is **not** a workflow state
and never moves a token.

| Workflow state | Definition (evaluated in this order; first match wins) | Queue |
| --- | --- | --- |
| `completed` | latest accepted decision for the customer is `closure` or `escalation` | `Q_Completion` |
| `awaiting_evidence` | any `run_requests` row for the customer has `status == requested` | `Q_AwaitingEvidence` |
| `in_review` | the customer has at least one event (hold, release, request, decision, including rejected attempts), or is the current selection | `Q_Review` |
| `new` | none of the above | `Q_Incoming` |

Consequences worth stating:

- A `continue_review` decision does not complete the case; the token stays in (or returns to)
  review, or in awaiting-evidence if requests are outstanding.
- A later decision can move a token out of `Q_Completion` again (for example `escalation` then
  `continue_review`); the latest decision is current (CONTRACT §2.5).
- A completed case whose request later completes stays in `Q_Completion`: `completed` is tested
  first. The arriving record still appears in the evidence list; the debrief shows that it arrived
  after the decision.
- Selecting a case moves its token from `Q_Incoming` to `Q_Review` even before any action. This
  is a display convention (selection produces no event, `learner-flow.md` Step 1), so after a
  reset the token returns to `Q_Incoming` regardless of what was selected before.
- Background alerts (`AL-003` … `AL-006`) can only ever be `new`, `in_review` or `completed`
  (they have no catalog rows, so no requests; `background-alerts-extension.md`).

## Workflow state → colour

Colour is a function of workflow state only. Hold status is shown by `Label_Hold_*`, never by
colour, so that a learner cannot read "red = suspicious" into the board; the colour reflects the
learner's own progress, not the case.

| Workflow state | Colour (FlexSim `Color` static, where supported) | Fallback RGB (0–1) |
| --- | --- | --- |
| `new` | `Color.gray` | (0.60, 0.60, 0.60) |
| `in_review` | `Color.blue` | (0.20, 0.45, 0.85) |
| `awaiting_evidence` | `Color.yellow` | (0.95, 0.80, 0.20) |
| `completed` | `Color.green` | (0.25, 0.65, 0.35) |

`completed` is one colour whether the decision was `closure` or `escalation`: the queue caption
"Escalation / completion" already says both land here, and giving escalation a distinct (for
example red) colour would hint at a verdict the board must not express. The decision type is
readable in the token's label text (`AL-001 · escalation (D1)`), which is the learner's own entry.

Colour API (search-indexed; page content not retrievable from this machine): "FlexScript Class -
Color" at
`https://docs.flexsim.com/en/20.0/Reference/CodingInFlexSim/FlexScriptAPIReference/Data/Color.html`
(snippet: `Color(double r, double g, double b, double a = 1)`, statics such as `gray`, `blue`,
`yellow`, `green`) and "FlexScript Class - Object" at
`https://docs.flexsim.com/en/22.1/Reference/CodingInFlexSim/FlexScriptAPIReference/Tree/Object.html`
(snippet: `Object.color` get/set; `setColor()` deprecated). Version dependence: the snippet says
`setColor()` is deprecated in favour of `obj.color = Color.red;`, so any FlexSim release that still
only has `setColor()` would need the fallback RGB values. The `../flexscript/` agent owns the final
call.

## Token labels

Each token carries labels that the FlexScript side keeps in sync; they are display copies, not
state:

| Label | Value |
| --- | --- |
| `alert_id` | `AL-001` |
| `customer_id` | `SYN-001` |
| `account_id` | `SYN-A001` |
| `workflow_state` | one of the four states |
| `caption` | `AL-001 · SYN-001 · balance 480000 · 2 pending` → after events, e.g. `AL-001 · SYN-001 · balance 250000 · 1 pending, 1 executed` |

The caption shows balance and order counts because they are learner-visible run state; it never
shows an evidence count for unreleased records.

## Click-to-select (where supported)

Desired behaviour: clicking a token in the 3D view sets the UI's current case to that token's
`alert_id` (the same effect as the `Current case` combo box in `learner-flow.md` Step 1; no event).

What the search-indexed FlexSim documentation says (content not retrievable from this machine, so
treat as a lead, not a tested fact): a "GUI Events Reference" page
(`https://docs.flexsim.com/en/19.0/Reference/DeveloperAdvancedUser/GUIs/GUIEvents`) describes an
`OnClick` event whose snippet says it "only applies to FlexSim registered controls", with access
variables `c` (the control) and `i` (click code: 2 left down, 3 left up, 4 right down, 5 right up,
1 double-click), and names `selectedobject()` as a useful command inside it. A "Triggers Panel"
page exists for 3D objects
(`https://docs.flexsim.com/en/26.0/Reference/PropertiesPanels/GeneralPanels/Triggers/Triggers.html`)
but its trigger list could not be read.

Design consequence: two implementations, chosen in the Windows session after reading the help.

1. **Preferred, where supported.** If the installed version exposes a click or selection hook on
   3D objects (an `OnClick` trigger on the Queue or flow item, or a view-level `OnClick` on the
   3D view control that can read the clicked/selected object), bind it to: read the clicked
   object's `alert_id` label (or, when the click landed on a Queue, ignore it), then call the same
   `set_current_case(alert_id)` routine the combo box calls. Fire only on left-button release
   (click code 3 per the snippet) so a drag does not select.
2. **Fallback, always available.** The dashboard `Current case` combo box. The 3D board remains
   read-only in this variant, and the token of the selected case is drawn 0.2 m taller
   (`sz = 1.0`) so the selection is visible on the board.

Either way, selection never writes an event and never changes run state (CONTRACT §2 lists no
selection field). The 3D view and the dashboard must always agree because both read the same
`current_alert_id` variable.

## Reset behaviour of the 3D view

`Reset run` (CONTRACT §4.8) redraws: all tokens to `Q_Incoming` in `alert_id` order, colour
`new`, hold labels empty, clock label `minute 0 · 11:12Z · paused`, captions with 480000 /
480000 and `2 pending`. No token is destroyed or recreated; the token set is fixed by
`alerts.csv` at model build time.

## What the 3D view never shows

- which case is which (`case_kind`, decisive evidence, rubric): not in any label or colour;
- unreleased evidence (no "3 more records available on request" counter);
- a countdown to a due minute other than what `transactions.csv.scheduled_at` already states
  (the clock label and the transfers panel suffice);
- any pending-order "progress bar" on the token: progress is not a concept in the contract.

## Documentation retrieval note

Attempted on the authoring Mac: `docs.flexsim.com` pages for versions 19.0, 20.0, 21.x, 22.1,
23.x, 25.2 and 26.0 either returned a "legacy documentation no longer available" disclaimer or a
301 redirect to `help.autodesk.com/view/FLEXSIMIN/<year>/ENU/?guid=…`, and the redirected
addresses returned "Page Not Found". Only search-result snippets were available. Every URL above
is therefore a pointer for the Windows session to open inside the installed FlexSim help, not a
citation of text read in full. Nothing in this file has been verified against a running FlexSim.
