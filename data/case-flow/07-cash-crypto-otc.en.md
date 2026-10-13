# 7. Cash and crypto OTC cashing-out

This page is for human review. The playable script is [`data/cases/05-justicegate-crypto-001.example.json`](../cases/05-justicegate-crypto-001.example.json). Its `case_id` is `justicegate-crypto-001`. The public-reporting note is in [`data/cases/README.md`](../cases/README.md).

## Real-world flow

Method and logic: a salary retail account collects many third-party credits, then the funds leave through large cash withdrawals and transfers to an over-the-counter crypto dealer. The aim is to cash out and move the money out of ordinary bank monitoring.

```mermaid
flowchart TD
  collect["A salary retail account collects many third-party credits of unclear origin in a short time"]
  mismatch["The amount and frequency do not match the salary on file"]
  pipes["The money then moves on two high-risk paths: large cash withdrawals, and transfers to an over-the-counter crypto dealer"]
  blank["When asked, the customer cannot give a source of funds that matches the file, and only says a friend exchanged currency"]
  out["The funds leave in cash and in crypto. The cash-out and the concealment are done"]
  collect --> mismatch --> pipes --> blank --> out
```

The public-reporting note for `justicegate-crypto-001` is the inspiration. It is not the customer file inside the script.

## Platform teaching flow

Trainee role: retail-bank AML alert reviewer.

Training goal: when the customer cannot show a source of funds that matches the file, do not accept that gap as an explanation. Cash plus an over-the-counter crypto dealer calls for a hold, a freeze recommendation, or a report.

```mermaid
flowchart TD
  show["The system shows large movements on a salary customer, including payments to an over-the-counter dealer"]
  choice1{"Decision 1"}
  invest["A. Note it as personal investment and close: a poor start, the risk is ignored"]
  edd["B. Ask for source-of-funds evidence and run enhanced due diligence, or hold outbound payments first: correct handling"]
  blank["The customer only says a friend exchanged currency and cannot prove it. Rule R1: a blank source must not be closed"]
  choice2{"Decision 2"}
  release["A. Accept the friend-exchange story and release: overrides R1, wrong handling"]
  hold["B. Keep the outbound hold, draft a suspicious transaction report, or recommend a freeze: matches R2"]
  show --> choice1
  choice1 --> invest
  choice1 --> edd --> blank --> choice2
  choice2 --> release
  choice2 --> hold
```

The check is whether the trainee refuses a blank source, and whether cash plus an over-the-counter path is held or reported.
