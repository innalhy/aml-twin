# 9. Multi-typology mule account

This page is for human review. The playable script is [`data/cases/04-wiseword-amlmonth-001.example.json`](../cases/04-wiseword-amlmonth-001.example.json). Its `case_id` is `hk-wiseword-amlmonth-001`. The public-reporting note is in [`data/cases/README.md`](../cases/README.md).

## Real-world flow

Method and logic: one retail mule account, inside a short window such as one month, receives proceeds from several fraud types: a part-time-job salary, a romance gift, a gambling top-up refund, a shopping refund. The payers do not know each other. When questioned, the customer offers one story, such as an online part-time job, while asking for a same-day near-full cash-out.

```mermaid
flowchart TD
  month["Inside a one-month review window, one retail account receives several fraud types: part-time work, romance, gambling, and shopping"]
  payers["The payers do not know each other, and they are not known counterparties"]
  story["When questioned, the customer offers one excuse, for example that everything is an online part-time salary, and cannot explain the other credits"]
  rush["The customer then asks for a same-day large cash withdrawal or transfer, close to the full balance, in and out quickly"]
  split["The proceeds are split and moved. The multi-typology mule task is done"]
  month --> payers --> story --> rush --> split
```

The public-reporting note for `hk-wiseword-amlmonth-001` is the inspiration. It is not the customer file inside the script.

## Platform teaching flow

Trainee role: senior transaction-monitoring analyst, or a retail risk officer.

Training goal: when one account shows several fraud types, do not close on the customer's single story. A request to move almost the full balance the same day calls for a hold, a freeze recommendation, or a report.

```mermaid
flowchart TD
  alert["An alert shows one retail account receiving four suspicious credit types inside one month"]
  choice1{"Decision 1"}
  split["A. Treat the four credits as unrelated noise, or accept the single part-time story and release: a poor start, wrong handling"]
  edd["B. Treat them as one typology on the same account, hold outbound payments, and run enhanced due diligence: correct handling"]
  rush["The customer asks to move almost the full balance out in cash the same day. Rule R2: a rapid in-and-out must not wait for another explanation"]
  choice2{"Decision 2"}
  release["A. Release and close: ignores R2, wrong handling"]
  hold["B. Recommend a freeze and draft a suspicious transaction report, or keep the enhanced-due-diligence hold: correct handling"]
  alert --> choice1
  choice1 --> split
  choice1 --> edd --> rush --> choice2
  choice2 --> release
  choice2 --> hold
```

The check is whether the trainee sees the types together, and whether a rapid in-and-out is frozen or reported.

## Training matrix for cases 7 to 9

| Case | Trainee role | Decision question | What is marked |
| --- | --- | --- | --- |
| 7. Cash and crypto OTC cashing-out | Retail-bank AML reviewer | The customer cannot show a reasonable source of funds, and the money goes to cash and an over-the-counter dealer. Can this be closed as an ordinary investment? | Whether a blank source was refused, and whether the cash plus over-the-counter path was held or reported |
| 8. KOL management front company | Corporate compliance officer | A company account with no contracts receives retail credits. Can an oral explanation turn that into brand-cooperation income? | Whether enhanced due diligence was run on the front business, and whether a mixed fraud story was refused as commercial income |
| 9. Multi-typology mule, one-month alert | Senior transaction-monitoring analyst | The account receives several fraud types at once. Can the customer's single part-time story be enough to release? | Whether the types were seen together, and whether a rapid in-and-out was frozen and reported |
