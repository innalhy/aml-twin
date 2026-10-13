# 8. KOL management front company

This page is for human review. The playable script is [`data/cases/08-kol-mgmt-001.example.json`](../cases/08-kol-mgmt-001.example.json). Its `case_id` is `kol-mgmt-001`. The public-reporting note is in [`data/cases/README.md`](../cases/README.md).

## Real-world flow

Method and logic: a criminal group sets up or controls a company that looks like influencer management, public relations, or entertainment. There are no brand contracts, no real business, and no payroll. The account takes in retail third-party funds, often tied to phone, investment, or romance fraud stories, and sends them out quickly.

```mermaid
flowchart TD
  front["A shell influencer-management company declares an ordinary business"]
  retail["The account often receives credits from individual retail third parties"]
  nopapers["The company has no brand contracts and no payroll records"]
  stories["The inflows match common fraud stories: romance, investment, and phone fraud"]
  rapid["The money is sent out quickly. The group's transfer of proceeds is done"]
  front --> retail --> nopapers --> stories --> rapid
```

The public-reporting note for `kol-mgmt-001` is the inspiration. It is not the customer file inside the script.

## Platform teaching flow

Trainee role: corporate compliance officer, or a company-account reviewer.

Training goal: a front company with no contracts and no payroll must not have its retail credits, or a fraud story, relabelled as brand-cooperation income. Run enhanced due diligence, hold outbound payments, or draft a suspicious transaction report.

```mermaid
flowchart TD
  show["The system shows two influencer-management companies with similar flows, and no brand contracts or payroll"]
  choice1{"Decision 1"}
  brand["A. Follow the customer's words and record the credits as brand-cooperation income: a poor start, wrong handling"]
  edd["B. Ask for the management contracts, run enhanced due diligence on the business, or exit the relationship: correct handling"]
  mix["The flows match mixed phone, investment, and romance fraud, and the money leaves quickly. Rule R2 has fired"]
  choice2{"Decision 2"}
  close["A. Keep the brand-cooperation label and close: ignores R2, wrong handling"]
  report["B. Recommend a freeze, draft a suspicious transaction report, or exit the relationship: correct handling"]
  show --> choice1
  choice1 --> brand
  choice1 --> edd --> mix --> choice2
  choice2 --> close
  choice2 --> report
```

The check is whether the trainee runs due diligence on the front business, and refuses to dress a mixed fraud story up as commercial income.
