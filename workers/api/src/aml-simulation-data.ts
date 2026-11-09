import type { AmlAccount, AmlEntity, AmlEvidence, AmlRelationship, AmlTransaction } from "../../../packages/aml/types";

export type SimulationVariant = "suspicious" | "legitimate" | "unresolved";
export interface SimulationDataEvidence extends AmlEvidence {
  release: "initial" | "request";
  requestId?: string;
  reliability: string;
}
export interface SimulationDataCheck {
  id: string;
  title: string;
  source: string;
  description: string;
  delayMinutes: number;
  evidenceIds: string[];
  prerequisiteEvidenceId?: string;
  reliability: string;
}
export interface SimulationData {
  datasetVersion: string;
  policyVersion: string;
  rubricVersion: string;
  variant: SimulationVariant;
  startAt: string;
  accountId: string;
  openingBalanceHkd: number;
  briefing: string;
  entities: AmlEntity[];
  accounts: AmlAccount[];
  transactions: AmlTransaction[];
  relationships: AmlRelationship[];
  evidence: SimulationDataEvidence[];
  checks: SimulationDataCheck[];
  payments: { transactionId: string; dueMinute: number }[];
  context: string;
  limitations: string[];
}

const START_AT = "2026-11-02T02:00:00Z";
const ACCOUNT_ID = "SIM-A100";
const CUSTOMER_ID = "SIM-C100";

function entity(id: string, name: string, business: string, sourceOfFunds: string, expectedMonthlyHkd: number, kind: AmlEntity["kind"] = "company"): AmlEntity {
  return { id, name, kind, aliases: [], jurisdiction: "Hong Kong", identifier: `SYNTHETIC-${id}`, address: `Fictional address ${id}`, business, sourceOfFunds, expectedMonthlyHkd, risk: "medium" };
}
function account(id: string, entityId: string, internal = false): AmlAccount {
  return { id, entityId, bank: internal ? "Harbour Training Bank (fictional)" : "External institution (fictional)", jurisdiction: "Hong Kong", currency: "HKD", internal, openedAt: internal ? "2026-10-14T01:00:00Z" : "2025-01-01T00:00:00Z" };
}
function transaction(id: string, minute: number, fromAccount: string, toAccount: string, amount: number, reference: string, channel: AmlTransaction["channel"] = "CHATS", status: AmlTransaction["status"] = "executed"): AmlTransaction {
  return { id, at: new Date(Date.parse(START_AT) + minute * 60_000).toISOString(), fromAccount, toAccount, amount, currency: "HKD", hkdAmount: amount, channel, reference, status };
}
function evidence(id: string, title: string, source: string, body: string, reliability: string, requestId?: string): SimulationDataEvidence {
  return { id, entityIds: [CUSTOMER_ID], title, source, body, reliability, release: requestId ? "request" : "initial", ...(requestId ? { requestId } : {}) };
}

const responses: Record<SimulationVariant, { customer: string; independent: string; channel: string; chain: string; context: string }> = {
  suspicious: {
    customer: "Jordan says the HKD 620,000 is a project advance for event MP-42 and supplies an unsigned collection mandate and a supplier schedule. The files name Harbour Civic Projects as principal, but the contact address is newly supplied by Jordan. When asked about payment purpose, Jordan says a remote coordinator wrote the instructions and will provide the final invoices later. These are customer representations awaiting independent corroboration.",
    independent: "The bank contacted Harbour Civic Projects through the previously verified company-contact directory, not the contact supplied in the new message. Its authorised representative states that MP-42 is not an active project, Jordan has no collection mandate and the attached supplier schedule was not issued by the company. The enquiry log records who responded and the contact route used. The response contradicts the stated explanation; it does not itself establish a criminal offence or the ultimate source of funds.",
    channel: "The bank's own authentication log shows that the two pending payment instructions were entered after a device-enrolment change and a newly added remote-session token. The bank cannot identify who was physically operating the device. The instruction references a conversion receipt, CONV-42, supplied by the customer. In a recorded callback to the existing account-contact number, Jordan says the coordinator instructed the transfers. Neither a device change nor a remote session alone establishes misuse, but the statements and authority need to be reconciled with the independent project response.",
    chain: "A contracted analysis provider reviewed the supplied conversion receipt CONV-42. Its report links that receipt to fictional route marker SYN-ROUTE-42 and a subsequent two-hop route toward SYN-POOL-9, a mixer-labelled service in this authored dataset. Confidence in the receipt-to-route link is moderate; the provider cannot attribute the final wallet or identify the person controlling it. This is a qualified observation based on the supplied receipt, not proof obtained from another bank or unrestricted access to a crypto account. Consider it with the documented contradictions and payment pattern.",
    context: "Authored scenario context: the project explanation cannot be corroborated and is contradicted by an independent source. The combined records support further AML investigation and a reasoned escalation assessment. The exercise does not determine a real offence, the origin of every unit of money, or an automatic legal reporting outcome.",
  },
  legitimate: {
    customer: "Jordan says the HKD 620,000 is the gross event MP-42 procurement budget, distinct from salary or personal income. A signed collection mandate, project budget and supplier schedule account for HKD 250,000 staging, HKD 260,000 venue equipment, HKD 50,000 transport and HKD 60,000 catering. The supplied authorisation permits Jordan to coordinate the payments. The bank has not yet independently verified the mandate or the supplier confirmations.",
    independent: "The bank contacted Harbour Civic Projects through the previously verified company-contact directory. Its authorised representative confirms the MP-42 mandate and the HKD 620,000 gross budget. Supplier representatives contacted through independently sourced business-contact records confirm the schedule and invoice references: staging HKD 250,000; equipment HKD 260,000; transport HKD 50,000; catering HKD 60,000. The total reconciles to the advance. This corroborates the stated purpose; the bank should still consider whether the account's expected-activity record needs updating and document its assessment.",
    channel: "The bank's own authentication log shows that Jordan entered the pending instructions using an established device. A recorded callback to the existing account-contact number confirms the MP-42 instructions and the invoice references. An attachment titled CONV-42 is a supplier currency-quotation worksheet, not evidence of a completed crypto conversion. Authentication and a customer callback support instruction provenance; they do not by themselves establish the source or legitimacy of all funds.",
    chain: "A contracted analysis provider reviewed the supplied attachment CONV-42. It is a supplier currency-quotation worksheet and contains no verifiable conversion transaction or wallet attribution. The provider cannot substantiate a link from these bank payments to a crypto route or mixer. An unrelated route marker in the search results must not be attributed to Jordan. This absence of a supported chain link is considered alongside the independently corroborated mandate and supplier records; it is not a blanket assurance about every future payment.",
    context: "Authored scenario context: independent mandate and supplier records corroborate the exceptional event budget and reconcile all four outgoing amounts. A documented closure or profile-update recommendation may be justified on those available records. A cautious referral made before corroboration arrived should be assessed using what the learner knew at that time, rather than treated as automatically wrong after the later explanation.",
  },
  unresolved: {
    customer: "Jordan says the HKD 620,000 is a project advance for event MP-42 and supplies a partially signed mandate and a budget summary. The schedule totals HKD 620,000 but two invoice pages are missing. Jordan says the principal is travelling and the suppliers will respond later. The bank has a plausible claim but has not independently corroborated the authority, source or commercial purpose.",
    independent: "The bank used the previously verified company-contact directory. Harbour Civic Projects acknowledged the enquiry but its authorised project officer has not responded within this simulated shift. One supplier acknowledged its invoice number without confirming the amount or Jordan's authority. The bank has neither corroboration nor a contradiction from an authorised project representative. No response within this exercise is an information gap, not proof that the explanation is false.",
    channel: "The bank's own log confirms valid account credentials and records a recent device replacement. The existing account-contact number went to voicemail. A payment reference mentions CONV-42, but the customer-supplied conversion receipt is incomplete and the bank cannot verify the beneficiary's downstream activity. The log cannot identify who was physically operating the device. Record the limitations and decide what further checks or proportionate interim steps are warranted.",
    chain: "A contracted analysis provider could not reliably match incomplete receipt CONV-42 to a conversion transaction. A two-hop route toward a mixer-labelled service appears in an unverified customer screenshot, but the provider cannot link it to these bank payments or attribute a wallet to Jordan. Confidence in attribution is low. The unresolved bank records and this limited observation require a documented judgement; neither an allegation of criminal conduct nor confident clearance is supplied as an answer.",
    context: "Authored scenario context: the shift ends with material gaps. The customer explanation is neither independently corroborated nor conclusively contradicted. Continued investigation or a reasoned referral can be justified; the learner should identify the missing evidence, proportionality of any interim control and follow-up owner. Uncertainty should remain visible in the assessment.",
  },
};

/** Server-only authored fixtures. A variant is an internal test seam, never a learner input. */
export function createSimulationData(variant?: SimulationVariant): SimulationData {
  const variants: SimulationVariant[] = ["suspicious", "legitimate", "unresolved"];
  const selected = variant ?? variants[crypto.getRandomValues(new Uint32Array(1))[0] % variants.length];
  const response = responses[selected];
  return {
    datasetVersion: "mule-investigation-1.0",
    policyVersion: "training-controls-1.0",
    rubricVersion: "evidence-reasoning-1.0",
    variant: selected,
    startAt: START_AT,
    accountId: ACCOUNT_ID,
    // Posted snapshot: HKD 8,000 carried forward + 24,000 - 9,000 - 5,000 + 620,000 - 250,000 - 260,000.
    openingBalanceHkd: 128000,
    briefing: "You are the duty AML analyst at Harbour Training Bank. A new-account rapid-outflow alert needs investigation. Review the customer's stated activity, examine the bank records, request proportionate independent checks and record a cited assessment. Two CHATS instructions are awaiting their scheduled processing times. A recommendation alone does not restrict an account: a simulated reviewer must approve it and operations must apply it. Reading pauses simulation time. All records and funds are fictional.",
    entities: [
      entity(CUSTOMER_ID, "Jordan Lee", "Office administrator; occasional event procurement coordinator declared at onboarding", "Salary; occasional project advances subject to a signed mandate and supporting records", 30000, "person"),
      entity("SIM-E110", "Cedar Office Services Limited", "Employer named in the bank's payroll record", "Operating receipts", 0),
      entity("SIM-E120", "Harbour Civic Projects Limited", "Payer named in the payment message; project role not yet independently established", "Not established by this account's payment message", 0),
      entity("SIM-E130", "North Quay Staging Limited", "Beneficiary name supplied in payment instructions", "Not established by this account's payment message", 0),
      entity("SIM-E140", "Bay Equipment Services Limited", "Beneficiary name supplied in payment instructions", "Not established by this account's payment message", 0),
      entity("SIM-E150", "Harbour Transport Services Limited", "Beneficiary name supplied in a pending instruction", "Not established by this account's payment message", 0),
      entity("SIM-E160", "Cedar Catering Services Limited", "Beneficiary name supplied in a pending instruction", "Not established by this account's payment message", 0),
      entity("SIM-E170", "Fictional Household Payments", "Aggregated rent and ordinary spending counterparty", "Synthetic routine payments", 0),
    ],
    accounts: [account(ACCOUNT_ID, CUSTOMER_ID, true), ...[110, 120, 130, 140, 150, 160, 170].map((number) => account(`SIM-X${number}`, `SIM-E${number}`))],
    transactions: [
      transaction("SIM-T001", -10080, "SIM-X110", ACCOUNT_ID, 24000, "October payroll", "FPS"),
      transaction("SIM-T002", -7200, ACCOUNT_ID, "SIM-X170", 9000, "Monthly rent", "FPS"),
      transaction("SIM-T003", -2880, ACCOUNT_ID, "SIM-X170", 5000, "Household expenses", "FPS"),
      transaction("SIM-T010", -25, "SIM-X120", ACCOUNT_ID, 620000, "MP-42 advance"),
      transaction("SIM-T011", -18, ACCOUNT_ID, "SIM-X130", 250000, "MP-42 staging", "FPS"),
      transaction("SIM-T012", -11, ACCOUNT_ID, "SIM-X140", 260000, "MP-42 equipment", "FPS"),
      transaction("SIM-T013", 12, ACCOUNT_ID, "SIM-X150", 50000, "MP-42 transport", "CHATS", "pending"),
      transaction("SIM-T014", 22, ACCOUNT_ID, "SIM-X160", 60000, "MP-42 catering", "CHATS", "pending"),
    ],
    relationships: [
      { id: "SIM-R001", fromEntity: CUSTOMER_ID, toEntity: "SIM-E110", type: "Declared employer", source: "SIM-EV001: customer profile and posted payroll record", confirmed: true },
      { id: "SIM-R002", fromEntity: CUSTOMER_ID, toEntity: "SIM-E120", type: "Payment-message project reference", source: "SIM-EV002: payment references only; commercial authority requires enquiry", confirmed: false },
    ],
    evidence: [
      evidence("SIM-EV001", "Customer profile and account mandate", "Bank CDD file, recorded at onboarding", "Jordan Lee is an office administrator with declared monthly salary of HKD 24,000 and ordinary expected monthly credits of HKD 30,000. Jordan also declared occasional event-procurement work; exceptional gross project advances could reach HKD 750,000 but require a signed collection mandate and supporting records. The account opened on 14 October 2026. A project reference or a change from routine activity is a reason to enquire, not an established explanation or finding of wrongdoing.", "Bank-held profile; identity and declared activity recorded, present project purpose unverified"),
      evidence("SIM-EV002", "Posted activity and queued payment instructions", "Bank ledger snapshot at 10:00 HKT, 2 November 2026", "Carried-forward balance before the listed history: HKD 8,000. Ordinary history: payroll +24,000; rent -9,000; household expenses -5,000. Today's MP-42 receipt is HKD 620,000, followed by HKD 250,000 staging and HKD 260,000 equipment payments. Those historical transfers are executed and cannot be undone by a later hold. Posted balance at the start of this exercise: HKD 128,000. Two additional CHATS instructions, HKD 50,000 transport and HKD 60,000 catering, are scheduled for 10:12 and 10:22 HKT. They have not reduced the posted balance. Payment references identify claims, not verified commercial purpose.", "Bank records confirm amounts and processing state; beneficiary purpose remains to be assessed"),
      evidence("SIM-EV003", "Practice controls and review procedure", "Authored training policy training-controls-1.0", "The analyst may request checks, submit a cited assessment, or recommend a temporary outbound hold or release. A simulated reviewer approves or rejects a recommendation separately. An approved instruction takes two simulated minutes for operations to apply. Holds affect only instructions not yet executed. Releasing a hold may allow overdue instructions to process if funds remain. Review decisions and reasons remain in the audit history. These delays and authorities are exercise assumptions, not statutory deadlines or a live bank policy. Customer enquiry and internal escalation do not themselves file an STR. Record what evidence is missing and when further review is needed.", "Authoritative only inside this classroom exercise"),
      evidence("SIM-EV010", "Customer explanation and supplied documents", "Recorded customer enquiry and submitted attachments", response.customer, "Customer representations; independent corroboration is a separate check", "SIM-CHECK-CUSTOMER"),
      evidence("SIM-EV011", "Independent project and supplier enquiry", "Bank verification team; independently sourced contact directory", response.independent, "Recorded contact route and response scope; availability of an authorised respondent varies", "SIM-CHECK-INDEPENDENT"),
      evidence("SIM-EV012", "Payment-authority and channel review", "Bank payment-operations logs and existing account-contact route", response.channel, "Internal log confirms technical observations; it does not establish the physical operator or commercial purpose", "SIM-CHECK-CHANNEL"),
      evidence("SIM-EV013", "Qualified conversion-path observation", "Contracted analysis provider; supplied receipt and stated attribution limits", response.chain, "Qualified third-party observation; identity and downstream attribution are not guaranteed", "SIM-CHECK-CHAIN"),
    ],
    checks: [
      { id: "SIM-CHECK-CUSTOMER", title: "Request the customer explanation and documents", source: "Customer enquiry desk", description: "Ask for the source, purpose, mandate and supplier records supporting MP-42.", delayMinutes: 6, evidenceIds: ["SIM-EV010"], reliability: "A customer response is a claim to evaluate." },
      { id: "SIM-CHECK-INDEPENDENT", title: "Verify the claimed project authority", source: "Bank independent-verification team", description: "Use independently sourced contacts to check the principal's mandate and supplier references.", delayMinutes: 9, evidenceIds: ["SIM-EV011"], prerequisiteEvidenceId: "SIM-EV010", reliability: "Records a contact route and the scope of any response; a reply is not guaranteed." },
      { id: "SIM-CHECK-CHANNEL", title: "Review payment authority and access records", source: "Bank payment operations", description: "Check the bank's authentication logs and use the existing account-contact route.", delayMinutes: 4, evidenceIds: ["SIM-EV012"], prerequisiteEvidenceId: "SIM-EV010", reliability: "Technical access observations do not identify the physical operator." },
      { id: "SIM-CHECK-CHAIN", title: "Request qualified conversion-path analysis", source: "Contracted analysis provider", description: "Review any conversion reference found in the channel enquiry, with confidence and attribution limits.", delayMinutes: 10, evidenceIds: ["SIM-EV013"], prerequisiteEvidenceId: "SIM-EV012", reliability: "Evidence is limited to the supplied receipt and defensible links; it is not unrestricted bank or exchange access." },
    ],
    payments: [{ transactionId: "SIM-T013", dueMinute: 12 }, { transactionId: "SIM-T014", dueMinute: 22 }],
    context: response.context,
    limitations: [
      "All entities, account identifiers, records, route markers and amounts are authored synthetic fixtures. SYN-ROUTE and SYN-POOL markers are not real blockchain addresses.",
      "The dataset, response times, processing delays and monitoring thresholds have not been calibrated against a bank. No AML practitioner has independently validated this version.",
      "The three variants share initial observations and differ only in later enquiry evidence. They demonstrate uncertainty; they do not establish real-world prevalence, detection accuracy or workplace competence.",
      "The analyst and reviewer are simulated practice roles. A self-entered reviewer score is not an independent professional assessment.",
      "The result records the exercise's payment states and available evidence. It does not establish criminality or automatically determine a legal STR obligation.",
    ],
  };
}
