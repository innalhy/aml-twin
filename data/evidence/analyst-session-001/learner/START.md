# Analyst investigation exercise

You are a junior analyst at a fictional financial institution. At 11:12 UTC on 15 April 2026, six alerts are waiting for review. Two new accounts have each received a large project payment and submitted two outgoing orders. Your task is to investigate the records and explain what action the available evidence supports.

All people, businesses, accounts, watchlist entries, documents, and amounts are invented for this exercise. SCU means fictional scenario currency units. The supplied course policy governs this exercise.

## Records to examine

- [Customer profiles](customers.json) describe declared activity.
- [Accounts](accounts.csv) identify the holders and opening balances.
- [Transactions](transactions.csv) contain 126 transfers, including four pending orders.
- [Alerts](alerts.csv) give the review queue.
- [Evidence index](evidence-index.csv) links the twelve records available at the start.
- [Request catalog](request-catalog.csv) lists further checks and their simulated service times.
- [Course policy](course-policy.md) explains verification, provisional controls, and documentation.

The ledger is a snapshot. A pending order has not reduced the account balance. A blank execution timestamp is intentional. Previous-institution statement excerpts are separate evidence and are not additional rows in this bank’s ledger.

## Investigation tasks

1. Prioritise the alerts and explain your order of review.
2. Compare each customer’s declared activity with the account and payment records.
3. Identify which statements are claims, which have independent support, and which facts are still missing.
4. Ask the instructor for checks using a customer ID and a request ID. The instructor supplies responses after their service time and prerequisites are satisfied.
5. Record the evidence IDs you relied on, your decision, any provisional control, and the simulated time at which you acted.
6. Explain when you would revisit your decision and what additional evidence could change it.

## Case note template

Alert and customer:

Review time:

Payment status at decision time:

Observed activity and expected activity:

Evidence IDs examined:

Unverified claims and remaining gaps:

Recommended action and reason:

Hold start or release time, if applicable:

Next review or escalation:

No video file is included. The KYC records contain a transcript and authored observations for a text-based exercise.
