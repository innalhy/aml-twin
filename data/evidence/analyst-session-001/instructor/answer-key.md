# Instructor guide to the paired investigation

Keep this folder and its release records outside the learner’s initial bundle. The exercise compares two cases that share low-quality video observations, a 480000 SCU credit, and two pending orders of 230000 and 240000 SCU. Follow-up evidence should drive the different decisions.

## Authored scenario facts

Mira Solen, SYN-001, is the deepfake and unexplained pass-through case. The underlying story follows the existing deepfake-001 branch in which onboarding proceeded despite a verification problem. The instructor’s hidden fact is that an impersonator uses manipulated video and a fabricated equipment explanation. The learner should identify justified concern from the verification log, the unconfirmed invoice relationship, and the recipient-purpose mismatch; the learner cannot prove the hidden deepfake fact from the supplied text.

Nika Vale, SYN-002, is the legitimate lookalike. The first capture was inconclusive, the repeat verification passed, and independently checked commercial records reconcile the payment and supplier split. Project turnover is not the same as personal income. A provisional hold while checks are outstanding can be reasonable; continuing it without an unresolved concern after corroboration is the customer-impact problem.

The screening matches in both cases concern different people. Resolving them should neither settle the whole investigation nor be ignored when assessing unnecessary restrictions.

## Decisive records

| Question | SYN-001 | SYN-002 |
| --- | --- | --- |
| What happened in the KYC retry? | EV-005: two recorded failures and an exception | EV-015: inconclusive first capture and a successful repeat |
| Does the project explanation hold up? | EV-006 and EV-007: supplied invoice has no independently confirmed client or collection authority | EV-016 and EV-017: contract, authority, payer, and amount are independently confirmed |
| Who receives the split payments? | EV-009: settlement services do not reconcile to the claimed equipment purpose | EV-019: verified suppliers and invoice accounts reconcile |
| Does prior activity support the story? | EV-010: no corroborating statement supplied | EV-020: earlier project receipts and supplier payments have the same fee pattern |
| What does name screening tell us? | EV-008 resolves this match only | EV-018 resolves this match only |

The four background alerts reconcile through EV-021 to EV-024. They create review work and give learners ordinary records to compare with the paired cases. Their internal account histories contain 30 transfers each.

## Release evidence progressively

Use evidence-index.csv as the instructor’s release schedule. Twelve records are initially available; twelve require requests. Start the service clock when a request is accepted. Payer verification also requires the submitted invoice or contract to have been released. Customer-supplied documents take 8 minutes; a subsequent independent payer check takes another 20 minutes. That check cannot complete before the first order’s due time if requested at the start without a provisional control.

Both cases have the same request options and service durations. A request name or filename must not reveal which case is legitimate. In a manual exercise, release only the requested record when its gate is satisfied. The complete release folder is for the instructor.

## Timed payment variant

The snapshot is 11:12 UTC. Each account has a completed 480000 SCU credit and an available balance of 480000 SCU. Its first outgoing order is due at session minute 18 and its second at minute 23. If both execute, total outflow is 470000 SCU and the residual balance is 10000 SCU. An outbound hold effective by the due check prevents that order from executing. A hold placed after minute 18 can still prevent the second order but cannot reverse the first.

An overdue held order can execute when the hold is released, subject to the eligibility checks. Record delays to the verified project suppliers as customer impact in the legitimate case. A report by itself does not change payment eligibility.

This variant adds pending orders to the authored narrative. The original deepfake script’s n_burst patches all three transactions before the decision. Keep that original scripted path unchanged; do not present its retrospective hold as prevention of those already displayed transfers.

## Decisions and assessment

Use the 100-point rubric in answer-key.json: evidence use 30, reconciliation 25, reasoned action 25, and timing with customer impact 20. Keep the result separate from any customer risk score. Cite the learner’s record IDs and decision times when giving feedback.

For SYN-001, a documented enhanced review and provisional control or a reasoned escalation is supported by the unresolved contradictions. For SYN-002, closure and release are supported after the identity, payer, and recipient checks reconcile. Score the action against the information available at the time rather than punishing a reasonable provisional decision with hindsight. Continuing a specific unresolved check is different from retaining a blanket restriction because the amount is large.

Useful debrief questions are: Which facts were shared by both cases? Which independent checks changed your view? Did an invoice’s correct total establish its purpose? What happened before your intervention? Which restriction became unnecessary and when?

## Simulation assumptions

The JSON key contains illustrative analyst capacities of one and two and six minutes of review work per item. External checks have separate service delays and do not occupy an analyst continuously. These are synthetic inputs for a future workload experiment. The case documents, CSV due times, and release gates are ready to use manually; a session runtime, automated scorer, and FlexSim adapter are not implemented by this pack.
