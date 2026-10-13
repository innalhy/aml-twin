# 1. Deepfake executive impersonation

The playable script stays at [`data/cases/01-deepfake-hk-001.example.json`](../cases/01-deepfake-hk-001.example.json). Its `case_id` is `deepfake-001`. This page is for human review. It sets out the real-world flow and the platform teaching flow for that deepfake case.

## Real-world flow

Method and logic: fraudsters combine social engineering with digital synthesis. They persuade an employee who can authorise payments to complete a transfer that looks legitimate. They do not need to break into the bank or the IT system.

```mermaid
flowchart TD
  email["Fraudster impersonates the CFO or another senior officer and sends the first email or message"]
  claim["The message claims a confidential, urgent, or non-public acquisition or investment"]
  doubt["The employee doubts it at first, so the fraudster arranges a video meeting"]
  video["The video shows a digitally generated image of the CFO, a colleague, or management"]
  pressure["Authority, urgency, secrecy, and familiarity lead the employee to believe the payment is authorised"]
  pay["The employee transfers the funds as instructed, often in several payments to several named accounts"]
  mule["Mule accounts controlled by the fraudster receive the funds and move them on quickly"]
  email --> claim --> doubt --> video --> pressure --> pay --> mule
```

## Platform teaching flow

Trainee role: finance officer or payment approver.

Training goal: a video image is not proof that a payment was authorised. A high-risk payment must be checked on an independent channel that was set up in advance, such as a callback to a reserved phone number, or dual sign-off.

```mermaid
flowchart TD
  mail["Trainee receives an urgent payment email from the CFO"]
  meeting["Trainee joins a video meeting and sees the amount and the payee"]
  choice{"Trainee decision"}
  approve["A. Approve immediately: high risk, wrong handling"]
  docs["B. Ask for more documents: medium risk, no live verification"]
  callback["C. Verify with the CFO on an independent known channel or by phone: correct handling"]
  escalate["D. Escalate to compliance or the finance head for a second review: correct handling"]
  outcome["The system shows whether the funds were lost or stopped, and a risk analysis"]
  mail --> meeting --> choice
  choice --> approve --> outcome
  choice --> docs --> outcome
  choice --> callback --> outcome
  choice --> escalate --> outcome
```
