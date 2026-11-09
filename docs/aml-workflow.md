# Hong Kong AML software workflow

The web workbench at `/operations` is a functional training workflow inspired by SAS Anti-Money Laundering and Visual Investigator. The default `/` page is now the [training portal](training-portal.md). The workbench uses TwinAML's own interface and fictional Hong Kong banking records. It is not SAS software, an authorised SAS training product, or a connection to a bank or the JFIU.

The existing Second Ledger exercise remains at `/investigation`, and the eleven scripted teaching workflows remain at `/cases`. Their sessions and data are separate. Starting a new AML workflow run preserves earlier runs.

## Workspace screens

| Screen | Learner operation |
| --- | --- |
| Alerts | Filter and sort generated alerts, claim or release work, and close a resolved alert with a reason. |
| Challenge | Play a five-file duty-analyst shift with a limited action clock, two referral slots, committed decisions and a pass or fail result. |
| Alert details | Inspect the rule version, time window, calculated trigger values, contributing transactions and activity history. Create a case or attach the alert to an existing case. |
| Customers and entities | Search customer records, inspect accounts and transactions, and follow relationships with their source and confirmation status. |
| Cases | Keep several alerts in one investigation, record findings with transaction or document citations, save a narrative and prepare a closure recommendation or training STR draft. |
| Review | Review submitted cases, return them with questions, approve a closure recommendation or approve a training STR draft. |
| Monitoring | Configure a versioned detection rule, add synthetic transactions and inspect monitoring run history. |
| Compare rules | Run two configurations against the fixed five-scenario benchmark, inspect evidence and explicitly reveal a scored debrief. |

Alert, case and report are distinct concepts. A monitoring match is a reason to investigate. It does not establish suspicion, require a report solely because of its amount, or prove criminality. A reviewer approving a training draft does not submit an STR, freeze an account, reverse a payment, or trigger a law-enforcement outcome.

## Monitoring is executable

`workers/api/src/aml-data.ts` supplies synthetic entities, accounts, transactions, relationships and source documents. `workers/api/src/aml.ts` owns monitoring, alert generation, the case lifecycle and the audit history. No authored alert list is loaded for this workflow.

The initial session runs the default new-account rapid-fan-out rule. Each executed incoming credit anchors a window. The account must be no more than 30 days old at that credit. Total executed credits in the following 30 minutes must reach at least HKD100,000, and executed outgoing payments in that window must total at least 80 percent of those credits. Window ends are capped at the snapshot. The scan is bounded to the seven days ending at that snapshot. The limits are authored classroom parameters, not Hong Kong legal thresholds or a real bank's monitoring policy.

Each generated alert preserves its rule parameters and version, window, aggregate amounts and contributing transaction IDs. Repeating an identical scan does not duplicate the alert. New transactions or a new rule version can generate new alerts; historical alerts and their trigger evidence remain available. Monitoring runs record their matched and newly created alert IDs, so changing a rule can reduce current matches without deleting earlier investigations.

Administrator mode can change parameters, add a validated transaction and rerun monitoring. Analyst mode receives the resulting queue. Parameter tuning is separate from an analyst's case disposition.

## Duty analyst challenge

**Challenge** turns the five benchmark episodes into a shift that can be won or lost. The player is the duty analyst, with five account files to resolve before the review desk closes. The senior reviewer can accept only two referrals. The ordinary investigation desk and **Compare rules** exercise remain available; a challenge owns an isolated server snapshot and never replaces their ledger, cases or comparisons.

1. Open **Challenge** in an AML training run. Any training role can play. Choose the starting monitoring configuration, then start the shift. The default uses the 60-minute window; the configuration is fixed for that attempt.
2. Inspect the queue, customer profiles and transfers. Every file is visible, including activity that the selected rule did not flag. Rule matches are leads, not answers.
3. Request verification when the supporting source document is worth the time. A check consumes **two simulated minutes** and releases only that file's document. Other documents stay on the server.
4. Write a reason of 20–4,000 characters and commit **Escalate for review** or **Clear file**. Each disposition consumes **one simulated minute**. Decisions cannot be changed after commitment; each escalation occupies one of the two referral slots.
5. Resolve all five files within **12 simulated minutes**. The fifth decision automatically ends the shift. Ending the shift early also produces a result, including any unfinished files.

The clock advances only when the player requests a check or commits a decision. Reading, choosing a file, refreshing and resuming are free. This is an action budget, not a wall-clock countdown; leaving the page does not spend the remaining shift. There is enough time to request three checks and make five decisions (11 minutes), but checking all five documents leaves time for only two decisions. If a requested check cannot finish before the deadline, the shift ends without completing that check.

The mission passes only when every file has a decision, every seeded suspicious episode is escalated, no authored legitimate episode is unnecessarily escalated, and the player stays within time and referral capacity. These are deterministic training objectives. Several losing strategies are possible:

| Player action | Consequence |
| --- | --- |
| Clear suspicious activity, including an unflagged file | The result records missed suspicious episodes and the shift fails. |
| Escalate every file | The third referral overloads the review desk and ends the shift immediately. |
| Spend the shift checking every source | The deadline can arrive with unresolved files, producing a failure. |
| End the shift with unfinished work | The unfinished backlog is scored and the shift fails. |

The result shows an unmistakable pass or fail, a diagnostic score, the reasons, missed suspicious episodes, unnecessary escalations and unresolved files. Unfinished suspicious episodes count as missed as well as unresolved. The score does not turn a failed mission into a pass. There is no correctness feedback after an individual decision: answer categories, instructor rationale and unreleased documents become available only when the shift ends. An active challenge has no answer-key reveal action.

Study mode is paused during an active shift. Comparison records, past challenge attempts and their audit entries are temporarily omitted from the public workspace and exports, so earlier answer keys, source documents or a perfect-game decision trace cannot bypass the current shift's checks. The server also rejects comparison and answer-reveal actions until the shift ends. The stored records remain intact and return when the shift is complete.

Each attempt shuffles the five source episodes and remaps their record identifiers to neutral desk-file IDs. Replays reuse the same small set of authored behaviours; they are practice attempts rather than an unseen statistical benchmark. One attempt can be active at a time, with up to 20 attempts retained in a training run. A completed attempt is immutable, and starting another preserves its result. The server persists the chosen rule, remapped records, elapsed action time, checks, decisions and outcome across refreshes and restarts. Older saved sessions without challenge history start with an empty history.

Challenge escalation and clearance are internal game dispositions. The supplied payments are historical executed transfers: a player decision does not freeze a real account, reverse a payment or submit an STR. The hidden categories describe the scenario author's teaching intent, not proof of a real offence or a bank's production reporting policy. All state transitions and outcomes are calculated by the server's rules.

## Five-scenario rule comparison

The **Compare rules** screen runs two configurations against the same versioned, fixed benchmark. The benchmark is independent of the active ledger and investigations: running a comparison does not replace customer data, change the active rule, add alerts to the case queue or remove earlier work. Both arms use the existing monitoring engine with clean alert histories. Saved results include the dataset version, snapshot time, source records, both rule configurations, calculated alert evidence and per-scenario matches. Up to 20 comparisons are retained in one training run.

1. Start an AML training run and switch the training role to **Administrator**.
2. Open **Compare rules**. Leave the baseline at HKD100,000 minimum credits, 80% minimum outbound/inbound ratio, 30-day maximum account age and a 30-minute window. The default candidate changes only the window to 60 minutes.
3. Run the comparison. Inspect which account episodes match each configuration, the contributing transfers and the source documents. Customer titles and IDs identify records; they do not disclose a scenario's answer category.
4. Open **Reveal debrief** when ready to see the authored scenario categories, rationale and detection-quality scores. This is an explicit, recorded action. Any training role can reveal a debrief. Revealing one comparison does not reveal later comparisons, and the result remains revealed after refresh or server restart.

The five independent episodes contain one incoming anchor each: a 98% outward movement within 14 minutes; a supported supplier payout of 94% within 22 minutes; a 90% outward movement at 45 minutes; a supported supplier payout of 90% at 45 minutes; and a routine salary with later ordinary spending. The first four accounts are new and receive HKD120,000; the salary control uses an older account. Evidence distinguishes unresolved payment-authority concerns from corroborated business explanations. These are authored synthetic scenarios, not real customers or established criminal findings.

The answer key and instructor rationale are kept in `workers/api/src/aml-benchmark-data.ts`, which is imported only by the server. Before reveal, API views and audit events contain neither answer categories nor quality scores; the browser receives only the benchmark records and monitoring outputs. Hiding answers until debrief is a teaching control. The existing role switch remains a classroom simulation, not instructor authentication or production access control.

With the default 30-minute versus 60-minute experiment, the debrief reports:

| Measure | Baseline | Candidate |
| --- | --- | --- |
| Seeded suspicious episodes detected | 1 of 2 | 2 of 2 |
| Seeded suspicious episodes missed | 1 | 0 |
| Legitimate episodes producing alerts | 1 | 2 |
| Legitimate episodes without alerts | 2 | 1 |
| Precision | 50% | 50% |
| Recall | 50% | 100% |
| Raw generated alerts | 2 | 4 |

Detection quality counts each **target account plus activity episode once**, based on its contributing transactions. Raw alert volume is shown separately: overlapping monitoring windows can generate multiple alerts for one episode. Precision is detected suspicious episodes divided by all alerted episodes; it is undefined when no episodes alert, so the API returns `null`. Recall is detected suspicious episodes divided by the two seeded suspicious episodes. A legitimate payment generating an alert is counted as a false positive against the authored category; it may still be reasonable to investigate based on the available information.

The longer window illustrates improved detection coverage alongside additional review work. It does not establish that the candidate is better for a real bank. This small fixed benchmark demonstrates reproducible comparisons, not statistical performance, bank calibration or an operational digital twin. Existing unresolved cases outside the benchmark are not assigned binary ground truth. Rules continue to generate investigation leads rather than legal conclusions.

## Hong Kong context and evidence

The dataset uses Hong Kong retail and SME customers, FPS, CHATS and cross-border transfers. HKD is the monitoring currency. USD and RMB transactions retain their original amounts and their HKD equivalent. The fixed exercise rates are HKD1 per HKD, HKD7.8 per USD and HKD1.08 per RMB; they are fictional scenario assumptions rather than market quotes. Added transactions must use the same rounded conversion.

The web interface displays Hong Kong time while API timestamps remain ISO UTC. FPS transfers support HKD and RMB in this exercise; USD FPS rows are rejected. Executed FPS payments remain completed; pending FPS instructions are rejected in this dataset. Pending instructions on supported other channels do not contribute to a monitoring match.

Source documents and relationship provenance are visible to the trainee. A shared counterparty or address is an investigative lead and does not establish common control. The exercise supplies only its own records and does not imply universal access to other banks' transactions or private ownership registers. All identities, identifiers, documents and amounts are synthetic.

## Case lifecycle and roles

The role selector is an explicit classroom simulation of three fixed identities. It is not authentication or production access control. The server records role changes and enforces the selected role's actions. Analyst claims and dispositions, administrator monitoring operations and reviewer approvals are separate actions.

1. As analyst, claim an alert and create a case, or attach it to an existing editable case.
2. Add a finding with at least one relevant transaction or document citation. Save a case-specific narrative and recommendation.
3. For an STR recommendation, complete subjects, review period, activity, reasons for suspicion and the customer's explanation or its absence. These are training draft fields.
4. Submit the case for review. Submitted cases cannot be edited by the analyst while a decision is pending.
5. As reviewer, return it with a reason or approve the recommendation. Returned cases can be revised and resubmitted. Approved closure and approved training STR cases are terminal, with earlier findings and reviews retained.

Input and citation validation is performed on the server. Every action carries the revision the browser observed. A stale action receives HTTP 409 and must be reconsidered against the refreshed session; it is not silently replayed.

## Runtime and API

The existing Node API and file-backed SQLite remain the primary runtime. The browser holds the session ID and unsaved form drafts; it does not own a second copy of the AML world. Refresh restores saved server state, while unsaved drafts may be lost.

On Node, a verified Clerk account owns each new run and **My progress** lists saved runs for later resume, including on another device. Configure Google sign-in and the matching server keys using [account setup](accounts.md). Earlier anonymous runs can be explicitly added to an account. Training roles remain simulated within each private run.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/aml-sessions` | Start an independent synthetic run and its initial monitoring scan. |
| `GET /api/aml-sessions/:id` | Read the current authoritative view. |
| `POST /api/aml-sessions/:id/actions` | Validate and apply one action with its observed `revision`. |

Comparison uses the same action endpoint: `compare_rules` accepts validated `baseline` and `candidate` parameters and requires Administrator training role; `reveal_comparison` accepts a saved `comparisonId`. Both use the observed revision and are persisted with the session. Older saved sessions without comparison history read as an empty history and can start comparisons without changing their existing ledger or cases.

Challenge uses the same endpoint and revision check. `start_challenge` accepts a starting `rule`; `request_challenge_check` accepts `challengeId` and `scenarioId`; `decide_challenge` also accepts `decision` (`escalate` or `clear`) and a reason; `end_challenge` accepts `challengeId`. The server rejects stale actions, duplicate checks, repeated dispositions, attempts to mutate a completed shift and a second active attempt without partial writes. Active API views omit the private answer map and unrequested source documents.

AML action requests are bounded to 128 KiB so a complete narrative and structured draft fit in one save. Individual fields retain their smaller validation limits. Both declared-length and chunked oversized bodies receive HTTP 413. Existing investigation and case-library request limits remain 16 KiB. Each saved case draft is retained in the audit history, including earlier narrative and STR field values.

Start the server and frontend using the existing root README instructions. Run `node tests/aml.test.mjs` from `workers/api` for the engine checks. After `npm run build:node`, run `node --test tests/aml-api.test.mjs` for the self-contained HTTP/SQLite checks. These tests do not contact real institutions.

## Reference and deliberate limits

The reference is the documented separation of alert triage, entities, cases, enquiries, review and reporting. It is not a copy of a proprietary product layout. Public references used for the design are [SAS Transaction Monitoring with Anti-Money Laundering](https://learn.sas.com/course/view.php?id=613), the [SAS Visual Investigator User's Guide, July 2025](https://documentation.sas.com/api/collections/vicdc/v_037/docsets/visgatorug/content/visgatorug.pdf?locale=en), and the [SAS AML course transcript](https://learn.sas.com/metadata/EAMLA83search_en.htm). Product configurations and permissions vary by institution.

Hong Kong reporting context follows the [JFIU's public investigation and STR guidance](https://www.jfiu.gov.hk/en/str.html). The software prepares a clearly labelled training draft; it does not implement STREAMS 2 submission, electronic certificates, live sanctions screening or a bank's production reporting procedures. No language model decides case outcomes.

For a course comparison, keep the same synthetic transactions and compare rule versions using the recorded monitoring runs, then inspect how analyst findings and reviewer decisions differ. Assess the evidence available at decision time and the quality of the reasoning, rather than treating alert counts or STR counts as success measures.
