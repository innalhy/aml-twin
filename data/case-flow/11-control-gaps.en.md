# 11. Insurer and bank control gaps

This page is for human review. It joins the control-review teaching of two playable scripts: [`data/cases/10-ia-fwd-controls-001.example.json`](../cases/10-ia-fwd-controls-001.example.json) (`hk-ia-fwd-controls-001`) and [`data/cases/11-hkma-cdd-001.example.json`](../cases/11-hkma-cdd-001.example.json) (`hk-hkma-cdd-001`). It is not a third script. The public-reporting notes are in [`data/cases/README.md`](../cases/README.md).

## Real-world flow

Method and logic: a firm, such as an insurer or a bank, leaves systematic gaps in its own controls. Ongoing monitoring stays off. Politically exposed person screening is blank. Suspicious-transaction worksheets stay open. An unverified third party pays a large premium or credits an account. A high-risk customer uses those gaps to place funds or to keep a relationship open.

```mermaid
flowchart TD
  gaps["An application or a policy file is missing pieces: no beneficial owner, a stale address, or blank politically exposed person screening"]
  third["A premium or a credit is paid by an unverified third party, with no clear link to the holder"]
  backlog["Monitoring was switched off, so alerts piled up, or a suspicious-transaction worksheet was left open"]
  convenience["A member of staff or a relationship manager raises a limit, accepts the premium, or closes the gap as a historical exception"]
  fine["A later supervisory review finds the control failures. The firm is fined"]
  gaps --> third --> backlog --> convenience --> fine
```

The public-reporting notes for `hk-ia-fwd-controls-001` and `hk-hkma-cdd-001` are the inspiration. The scripts use a fictional insurer and a fictional bank. They are not those firms' customer files.

## Platform teaching flow

Trainee role: senior compliance reviewer at an insurer or a bank.

Training goal: hold the control line. An unverified third-party payment, blank screening, and an open monitoring worksheet cannot be closed as a historical exception or as a note written after the fact. The fix is to rerun the checks and to escalate.

```mermaid
flowchart TD
  show["The system shows an unverified third-party premium, blank politically exposed person screening, and an open worksheet"]
  choice1{"Decision 1"}
  history["A. Close it as a historical exception: a poor start, a serious breach"]
  verify["B. Verify the payer's link to the holder, or refuse the premium. This matches rule R1"]
  r2["Blank politically exposed person screening and an open monitoring worksheet are still on the file. Rule R2 has fired"]
  choice2{"Decision 2"}
  backdate["A. Note afterwards that the file was already reviewed, and close: breaches the control rule"]
  fix["B. Rerun screening, escalate the worksheet, and draft a suspicious transaction report or complete the control fix: the exit that matches R2"]
  show --> choice1
  choice1 --> history
  choice1 --> verify --> r2 --> choice2
  choice2 --> backdate
  choice2 --> fix
```

The check is whether the trainee refuses a note written after the fact, and whether screening is rerun and the worksheet is escalated.

## Training matrix for cases 10 and 11

| Case | Trainee role | Decision question | What is marked |
| --- | --- | --- | --- |
| 10. Organised-crime cashflow | Senior compliance officer | Large cash flows have no commercial papers, and an organised-crime indicator is on the file. Can this be closed as an ordinary cash business? | Whether the oral excuse was refused, and whether payments were held and a freeze was recommended |
| 11. Firm control gaps, CDD and premiums | Senior compliance reviewer | A third-party premium, blank screening, and an open monitoring worksheet are on the file. Can this be closed as a historical exception? | Whether a note written after the fact was refused, and whether screening was rerun and the worksheet was escalated |
