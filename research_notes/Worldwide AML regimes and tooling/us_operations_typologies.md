# US AML operations, technology and typologies (as of October 2026)

Research date: 13 October 2026. Scope: the day-to-day US AML operation, from onboarding to SAR filing. Legal-framework items (CTA rollback, the April 2026 program NPRM, STREAMLINE Act thresholds, TD Bank, the 2025 SAR volume) and global vendor rankings are already covered in `us_eu_uk_regimes.md` and `software_data_infrastructure.md` and are not repeated here except where an operational detail is needed. Primary FinCEN PDFs (SAR FAQs, advisories, alerts, Year in Review FY2025) were downloaded and read in full this session. eCFR and the FFIEC manual site blocked automated access, so regulation text comes from Cornell LII copies. Vendor statements are labelled **[vendor claim]**.

## 1. US CDD/KYC in practice: CIP, the 2016 CDD Rule, risk rating, EDD, periodic review, and the 2025-2026 beneficial ownership changes

### Takeaway
US onboarding rests on two rules. The bank **CIP rule** (31 CFR 1020.220) sets four minimum data points, verified by documentary or non-documentary means, plus a check against government lists. The **CDD Rule** (31 CFR 1010.230, applicable since May 2018) requires the bank to identify and verify the beneficial owners of a legal entity: up to four 25% owners plus one control person. The CTA's BOI database is now effectively dead for US companies. That leaves the bank-collected CDD certification as the main US beneficial ownership control. FinCEN's February 2026 exceptive relief also cut it back: banks now collect at first account opening and not again for every new account. Customer risk rating, EDD and periodic-review cycles are risk-based. No regulation fixes the review frequency.

### Cited Findings
**CIP (31 CFR 1020.220)**
- Before opening an account the bank must obtain at minimum name, date of birth (individuals), address and an identification number. US persons give a TIN. Non-US persons may give a TIN, a passport number and issuing country, an alien ID number, or another government photo ID number. An applied-for TIN is allowed if obtained within a reasonable time. — [31 CFR 1020.220 (Cornell LII)](https://www.law.cornell.edu/cfr/text/31/1020.220)
- Verification happens "within a reasonable time" after opening. It can be documentary (unexpired government photo ID; articles of incorporation, business licence or trust instrument for entities) or non-documentary (contacting the customer, consumer-reporting or public databases, references from other institutions, financial statements). Procedures must cover remote or non-face-to-face opening. — [Cornell LII 1020.220](https://www.law.cornell.edu/cfr/text/31/1020.220)
- When verification fails, the CIP must state when not to open, what limited use is allowed while verification is pending, when to close, and when to file a SAR. — [Cornell LII 1020.220](https://www.law.cornell.edu/cfr/text/31/1020.220)
- Other CIP requirements:
  - customers are checked against federal lists of known or suspected terrorists
  - customers get adequate notice (lobby sign, website or application form)
  - records are kept 5 years after account closure (identifying data) or 5 years after the record is made (verification records)
  - the bank may rely on another regulated institution if that institution certifies annually

  — [Cornell LII 1020.220](https://www.law.cornell.edu/cfr/text/31/1020.220)

**CDD Rule / beneficial ownership certification (31 CFR 1010.230)**
- **Ownership prong:** every individual who directly or indirectly owns 25% or more of the equity of a legal entity customer (corporation, LLC, general partnership or foreign equivalent).
- **Control prong:** one individual with significant management responsibility (CEO, CFO, COO, managing member, general partner, president, VP, treasurer).
- At most four ownership-prong individuals plus one control person. One person can satisfy both prongs.

  — [31 CFR 1010.230 (Cornell LII)](https://www.law.cornell.edu/cfr/text/31/1010.230)
- The bank may use the Appendix A certification form, or collect the same data another way if the person opening the account certifies its accuracy. The bank may rely on the customer's data unless it knows facts that call its reliability into question. Verification must at least match the CIP elements, and photocopies are acceptable. — [Cornell LII 1010.230](https://www.law.cornell.edu/cfr/text/31/1010.230)
- Exclusions and limits:
  - **Excluded entirely:** regulated financial institutions, SEC/CFTC registrants, public accounting firms, bank holding companies, state-regulated insurers, and listed companies.
  - **Control prong only:** nonprofits and some pooled vehicles.
  - **Exempt products:** point-of-sale credit up to $50k, plus postage, insurance-premium and equipment-finance accounts.

  — [Cornell LII 1010.230](https://www.law.cornell.edu/cfr/text/31/1010.230)
- **[IN FORCE, exceptive relief]** On 13 February 2026, FinCEN ordered that banks, mutual funds and broker-dealers need only identify and verify beneficial owners (i) when a legal entity first opens an account, (ii) later, if information calls existing BO data into question, or (iii) when their own risk-based ongoing CDD procedures call for it. This ends re-certification at every new account. The statutory CTA-mandated revision of the CDD Rule (due by 1 January 2025) had still not been proposed at the time of the alert. — [DLA Piper, 2 Mar 2026](https://www.dlapiper.com/en/insights/publications/2026/03/fincen-issues-exceptive-relief-from-cdd-rule-requirements) (single secondary source; FinCEN order text not retrieved)
- The bank CDD beneficial ownership requirement remains separate from the CTA and still applies after the August 2026 final rule that ended BOI reporting for domestic companies. — [Winston Taylor (via us_eu_uk_regimes.md)](https://www.winstontaylor.com/insights/the-final-nail-in-the-corporate-transparency-act-coffin-fincen-finalizes-permanent-rollback-of-beneficial-ownership-reporting-for-domestic-companies-and-u-s-persons)

**Risk rating, EDD, periodic review in vendor and consultancy practice**
- A KPMG managed-services product sheet (Germany, 2025) cites average handling times of up to 15 hours per KYC review and costs above €2,000 per customer for onboarding or remediation. These are non-US figures, but they indicate the scale of the remediation and periodic-review workload. — [KPMG product sheet 2025](https://assets.kpmg.com/content/dam/kpmgsites/de/pdf/Themen/2025/12/kpmg-produktblatt-managed-services-kyc-bei-finanzinstituten.pdf.coredownload.inline.pdf) **[vendor claim]**
- FinCEN advisories tie onboarding data directly to later detection. The 2025 CMLN advisory's first red flags are onboarding facts: a Chinese passport and a visa carrying the same photo despite being issued years apart, and a declared occupation of "student, retiree, housewife" with unexplained wealth. This shows CIP/CDD data feeding the customer risk rating (CRR) and monitoring. — [FinCEN FIN-2025-A003 (PDF)](https://www.fincen.gov/system/files/2025-08/FinCEN-Advisory-CMLN-508.pdf)

### Inferences
- An onboarding flow for a twin: CIP data capture → documentary or non-documentary verification → list screening → (for entities) BO certification with 25% and control prongs → initial CRR (low/medium/high) → EDD if high (source of funds/wealth, expected activity, site visit) → periodic refresh on a risk-based cycle. The industry convention is roughly 1 year for high, 2-3 years for medium and 3-5 years for low, plus event-driven review after alerts or SARs. That cycle is practitioner convention and is **not** cited above.
- Since the August 2026 CTA rollback and the February 2026 relief, US banks depend almost entirely on customer self-certification of beneficial ownership, with no government registry to cross-check domestic entities. This is a realistic "trust but verify" teaching point for a trainee.

### Gaps
- The FFIEC manual's CDD/EDD sections and any 2025-2026 exam-procedure changes could not be fetched (bsaaml.ffiec.gov returned 403).
- No primary source gave US bank periodic-review frequencies or CRR model designs. These are bank-internal.
- FinCEN's 13 February 2026 order text was not retrieved. Only one law-firm summary was found.

## 2. The SAR process: deadlines, narrative, confidentiality, continuing activity, E-Filing and form, CTR aggregation and exemptions, structuring

### Takeaway
A bank must file a SAR within 30 calendar days of "initial detection of facts that may constitute a basis for filing". If no suspect is identified it may take 30 more days, but never more than 60 in total. SARs are confidential: disclosing a SAR or anything that reveals its existence is prohibited, which is the US equivalent of a tipping-off ban. The October 2025 interagency SAR FAQs removed three operational habits:
1. separate continuing-activity reviews (the 90/120-day cycle is now optional)
2. automatic SARs for near-$10k cash with no evasion indicia
3. mandatory "no-SAR" documentation

CTRs aggregate cash in or out above $10,000 per business day. Phase I/II exemptions remove routine filers. Structuring is a crime in its own right under 31 USC 5324, carrying up to 5 years, or 10 years if aggravated.

### Cited Findings
**Deadlines and thresholds**
- Bank SAR: required for transactions of at least $5,000 that the bank knows, suspects or has reason to suspect involve illegal proceeds, are designed to evade the BSA, lack apparent lawful purpose, or use the bank to facilitate crime. Due 30 calendar days after initial detection. If no suspect is identified, up to 30 more days, but never more than 60 days after detection. For violations needing immediate attention (for example ongoing laundering), the bank must also telephone law enforcement. — [31 CFR 1020.320 (Cornell LII)](https://www.law.cornell.edu/cfr/text/31/1020.320); [FinCEN SAR FAQs Oct 2025, fn 11](https://www.fincen.gov/system/files/2025-10/SAR-FAQs-October-2025.pdf)
- The $25,000 no-suspect threshold and the insider-abuse "any amount" rule come from the banking agencies' own SAR regulations (12 CFR 21.11 OCC, 12 CFR 208.62 Fed, 12 CFR part 353 FDIC, 12 CFR 748.1(d) NCUA), which the FAQs cross-reference. They are not in FinCEN's 1020.320. — [FinCEN SAR FAQs fn 1](https://www.fincen.gov/system/files/2025-10/SAR-FAQs-October-2025.pdf); see also us_eu_uk_regimes.md
- Exceptions: no SAR is needed for robberies or burglaries already reported to law enforcement, or for lost, stolen or counterfeit securities reported under 17 CFR 240.17f-1. — [Cornell LII 1020.320](https://www.law.cornell.edu/cfr/text/31/1020.320)
- Retention: a copy of the SAR plus supporting documentation is kept 5 years from filing and produced on request to FinCEN, law enforcement or supervisors. Institutions should verify the identity of anyone requesting supporting documentation, for example by calling the requester's field office. — [Cornell LII 1020.320](https://www.law.cornell.edu/cfr/text/31/1020.320); [FinCEN FIN-2025-A003, p.10-11](https://www.fincen.gov/system/files/2025-08/FinCEN-Advisory-CMLN-508.pdf)

**Confidentiality / tipping off, and safe harbor**
- A SAR, and any information that would reveal its existence, may not be disclosed. Exceptions: FinCEN, law enforcement and supervisors; sharing underlying facts with another institution for a joint SAR; certain employment references; and sharing within the corporate structure (parent/affiliates) for BSA purposes. Government agencies face similar restrictions. Safe harbor from civil liability applies under 31 USC 5318(g)(3). — [Cornell LII 1020.320](https://www.law.cornell.edu/cfr/text/31/1020.320)

**October 2025 interagency SAR FAQs (FinCEN + Fed, FDIC, NCUA, OCC, 9 Oct 2025)**
- **Q1 (structuring):** transactions at or near $10,000 are not, on their own, enough to require a SAR. A SAR is required only where the institution knows, suspects or has reason to suspect they are designed to evade CTR reporting. Structuring is defined in 31 CFR 1010.100(xx) as cash transactions "in any amount, at one or more financial institutions, on one or more days, in any manner" for the purpose of evading CTRs. — [FinCEN SAR FAQs](https://www.fincen.gov/system/files/2025-10/SAR-FAQs-October-2025.pdf)
- **Q2 (continuing activity):** no separate post-SAR review, "manual or otherwise", is required. FinCEN explains that its October 2000 "rule of thumb" of filing every 90 days had hardened into a perceived requirement. — [FinCEN SAR FAQs](https://www.fincen.gov/system/files/2025-10/SAR-FAQs-October-2025.pdf)
- **Q3 (timeline):** institutions that still use the continuing-activity cycle follow this sequence:

  | Day | Suspect identified | No suspect identified |
  |---|---|---|
  | Detection | 0 | 0 |
  | Initial SAR | 30 | 60 |
  | End of 90-day period | 120 | 150 |
  | Continuing SAR | 150 | 180 |

  Item 30 (activity date range) of the continuing SAR covers the whole 90-day period. — [FinCEN SAR FAQs](https://www.fincen.gov/system/files/2025-10/SAR-FAQs-October-2025.pdf)
- **Q4 (no-SAR decisions):** there is "no requirement or expectation" to document a decision not to file. "A short, concise statement" usually suffices if a bank chooses to document. — [FinCEN SAR FAQs](https://www.fincen.gov/system/files/2025-10/SAR-FAQs-October-2025.pdf)

**Narrative ("5 Ws + How"), form and BSA E-Filing**
- FinCEN guidance says the narrative should give the five essential elements (who, what, when, where, why) and the "how" (method of operation). The narrative is the only free-text field and is "critical". Attachments do not replace it. — [FinCEN, Suggestions for Addressing Common Errors](https://www.fincen.gov/resources/statutes-regulations/guidance/suggestions-addressing-common-errors-noted-suspicious); [FFIEC Manual Appendix (search snippet)](https://bsaaml.ffiec.gov/manual/Appendices/13); [FinCEN "New FinCEN SAR" presentation](https://www.fincen.gov/sites/default/files/shared/TheNewFinCENSAR-RecordedPresentation.pdf)
- The FinCEN SAR (Form 111) is filed electronically through BSA E-Filing. E-filing replaced paper for most BSA forms from 1 April 2013. Critical fields cannot be left blank (an "Unknown" box exists). A .csv attachment can carry transaction lists too long for the narrative. FinCEN recommends that file names not contain subject names. — [FinCEN SAR Electronic Filing Requirements (PDF)](https://bsaefiling.fincen.treas.gov/docs/FinCENSARElectronicFilingRequirements.pdf); [FinCEN technical specs release](https://fincen.gov/news/news-releases/updated-technical-specifications-fincens-new-sar-ctr-and-doep)
- Advisory key terms are how FinCEN routes SARs to typology analysts. Filers put a key term in **field 2** ("Filing Institution Note to FinCEN") and in the narrative, and tick a specific activity-type box:

  | Key term | Activity-type box |
  |---|---|
  | `FIN-2023-PIGBUTCHERING` | 34(z) Fraud-Other, "Pig Butchering" |
  | `FIN-2025-BULKCASH` | 36(z) ML-Other |
  | `CMLN-2025-A003` | 38(n) IVTS, 38(s) unlicensed MSB, 36(l) TBML |
  | `FIN-2026-HTWORLDCUP` | 38(h) human trafficking |
  | `FIN-2023-MAILTHEFT` | check-fraud box |

  — [FIN-2023-Alert005](https://www.fincen.gov/system/files/shared/FinCEN_Alert_Pig_Butchering_FINAL_508c.pdf); [FIN-2025-Alert001](https://www.fincen.gov/sites/default/files/shared/BCS-Alert-FINAL-508C.pdf); [FIN-2025-A003](https://www.fincen.gov/system/files/2025-08/FinCEN-Advisory-CMLN-508.pdf); [FIN-2026-NTC1](https://www.fincen.gov/system/files/2026-05/FinCEN-WCHT-Notice.pdf); [Moneylaunderingnews on mail-theft alert](https://www.moneylaunderingnews.com/2023/03/fincen-and-usps-issue-alert-on-mail-theft-check-fraud-and-sar-filing-instructions/)
- Form layout: Part I subject information, Part II suspicious activity information, Part III institution where the activity occurred, Part IV filing institution contact, Part V narrative. This layout comes from a search-tool summary based on model knowledge and was **not** confirmed against FinCEN's spec in this session. — [FinCEN SAR e-filing requirements](https://bsaefiling.fincen.treas.gov/docs/FinCENSARElectronicFilingRequirements.pdf) (not parsed)

**CTR aggregation, exemptions, structuring**
- A CTR is required for currency transactions "by or on behalf of any person" resulting in cash in or cash out totalling more than $10,000 in any one business day. Cash-in and cash-out are aggregated separately across branches. — [FinCEN SAR FAQs Q1 (citing 31 CFR 1010.310-315)](https://www.fincen.gov/system/files/2025-10/SAR-FAQs-October-2025.pdf)
- **Phase I exemptions** (31 CFR 1020.315(b)(1)-(5)): banks, government agencies and authorities, exchange-listed companies and their 51%-owned subsidiaries.
- **Phase II exemptions** ((b)(6)-(7)): non-listed businesses and payroll customers. Conditions: an account held at least 2 months (shortenable on a documented risk basis) and at least 5 reportable cash transactions a year (lowered from 8 in 2012). Biennial renewal for Phase II was eliminated in 2012. A Designation of Exempt Person (DOEP) is filed electronically.

  — [FinCEN FIN-2012-G003](https://www.fincen.gov/sites/default/files/shared/FIN-2012-G003.pdf); [FFIEC manual, exempt persons (search snippet)](https://bsaaml.ffiec.gov/manual/AssessingComplianceWithBSARegulatoryRequirements/06); [77 FR 33638 (2012)](https://www.govinfo.gov/content/pkg/FR-2012-06-07/pdf/2012-13781.pdf)
- **Structuring (31 USC 5324(a))** covers three acts done for the purpose of evading BSA reporting or recordkeeping: causing an institution not to file, causing a filing with material omissions, or structuring (or assisting or attempting to structure) transactions. Penalties: up to 5 years. If committed while violating another federal law, or as part of a pattern of illegal activity over $100,000 in 12 months, up to 10 years and doubled fines. — [31 USC 5324 (Cornell LII)](https://www.law.cornell.edu/uscode/text/31/5324)

**Volumes (FinCEN official, FY2025)**

| Report type | FY2022 | FY2023 | FY2024 | FY2025 |
|---|---|---|---|---|
| SARs | 4.3m | 4.6m | 4.7m | 4.8m |
| CTRs | 20.6m | 20.9m | 20.5m | 21.5m |

About 335,000 registered institutions and other filers file BSA reports. — [FinCEN Year in Review FY2025 (PDF)](https://www.fincen.gov/system/files/2026-05/FinCEN-Year-in-Review-2025.pdf)
- Value to law enforcement in FY2025: 88.6% of IRS-CI cases opened had a BSA filing on the primary subject, and 11.7% of all IRS-CI investigations originated from a BSA filing (89.3% of those from a SAR). The FBI arrested 5,957 subjects tied to BSA reports. In FY25 more than 7,200 institutions were 314(b)-registered and more than 65,480 SARs referenced 314(b). — [FinCEN Year in Review FY2025](https://www.fincen.gov/system/files/2026-05/FinCEN-Year-in-Review-2025.pdf)

### Inferences
- A twin should model the SAR clock as starting at "initial detection of facts". In practice banks usually equate this with the point an investigator concludes activity is suspicious, not the alert date. The FAQs did not change that. A trainee scenario can test whether an investigator "stops the clock" correctly at 30 or 60 days.
- The October 2025 FAQs shift the operating model from defensive filing (near-$10k SARs, 90-day continuing reviews, documented no-SAR memos) to risk-based judgement. Expect banks to retire the continuing-activity review queue and shorten no-SAR closure notes. This is a good "before/after policy" variable for the simulation.
- The key-term table is directly reusable as a TwinAML schema field (`sar.key_terms[]`, `sar.activity_types[]`).

### Gaps
- FinCEN's 2003 "SAR Narrative Guidance Package" was not fetched. The 5W wording comes via FinCEN's common-errors page and secondary sources.
- No primary confirmation was found of current SAR Part I–V field numbering (the e-filing spec PDF was not parsed).
- FinCEN no longer publishes average days-to-file or SAR quality metrics publicly.

## 3. US AML operations model: tiers, offshoring, volumes and KPIs, QA, cost, managed services, BSA officer accountability

### Takeaway
US banks run a funnel. Automated alerts go to L1 analysts, who clear or escalate in minutes. L2 investigators spend hours and build cases. L3 or the SAR committee and BSA Officer make the file/no-file decision. QA/QC samples closed work. L1/L2 work is widely offshored to captive centres in India (and the Philippines) or to managed-services firms. Public, verifiable US productivity numbers are almost non-existent. The best public cost figure is still LexisNexis/Forrester's US$61bn (US + Canada, fieldwork 2023). Personal liability for BSA officers is rare but established (Haider/MoneyGram, LaFontaine/US Bank).

### Cited Findings
**Tiers and handling times (vendor-sourced)**
- One vendor workflow guide: L1 identifies why the alert fired, gathers basic client context, checks known false-positive patterns and documents the result, "like five to ten minutes". L2 does "real digging" into transaction history, profiles and counterparties, taking 2-8 hours. — [Sanction Scanner](https://www.sanctionscanner.com/blog/aml-alert-investigation-workflow-from-alert-to-sar-decision-1376) **[vendor claim]**
- KPIs commonly tracked:
  - alert volume (monthly, quarterly, year on year)
  - false-positive rate (above 85% suggests miscalibration)
  - alerts per analyst per day (normalised for shift and alert type)
  - time to escalate to L2/L3
  - SAR timeliness against the 30/60-day clock

  — [Alessa](https://alessa.com/blog/key-kpis-for-aml-compliance/) **[vendor]**; [Elliptic KPI corpus](https://www.elliptic.co/corpus/gen-3821/business-process/compliance-kpis-and-operational-metrics-for-crypto-aml-investigation-workflows.html) **[vendor]**
- An illustrative scenario from another vendor: 2,000 alerts a week at 45 minutes each is still an operational problem even with good tuning. — [Tookitaki](https://www.tookitaki.com/compliance-hub/aml-case-management-ai-alert-handling) **[vendor, illustrative]**
- Alert-to-SAR and false-positive heuristics (90-95% FP, 1-5% conversion) are covered in software_data_infrastructure.md §1.

**Offshoring and managed services**
- Bank job postings confirm offshore tiering. Deutsche Bank advertises an L2 AML investigations role "based in India" in an "offshore hub", reviewing alerts escalated from Level 1, and a VP leading L2 investigators at the "India Offshore Hub". BNP Paribas describes the L1 job as closing an alert as not suspicious or escalating it to Compliance. — [ACFCS careers (DB)](https://careers.acfcs.org/job/ipb-aml-investigations-officer-avp/80502168); [ACAMS careers (DB)](https://careers.acams.org/job/ipb-aml-investigations-asia-pacific-vp/81014434); [BNP Paribas](https://group.bnpparibas/emploi-carriere/offre-emploi/anti-money-laundering-level-1-investigator-6-months-contract-1)
- KPMG India notes that India hosts global operations of major financial institutions that run their global AML operations there, because of the availability of trained AML professionals. — [KPMG India](https://kpmg.com/in/en/services/advisory/consulting/risk-and-integrity-advisory/forensic-services/anti-money-laundering-aml-services.html)
- Deloitte runs large remediation programmes (CDD/KYC and transaction-monitoring alert clearing) through local and offshore "Financial Crime Competency Centres". — [Deloitte](https://www.deloitte.com/mt/en/services/consulting-risk/services/fincrime-remediation.html)
- KPMG offers a "KYC Workforce" managed service, including follow-the-sun delivery. — [KPMG 2025](https://assets.kpmg.com/content/dam/kpmgsites/de/pdf/Themen/2025/12/kpmg-produktblatt-managed-services-kyc-bei-finanzinstituten.pdf.coredownload.inline.pdf)
- Model distinction: offshore outsourcing is labour arbitrage, with the bank keeping QC and ownership. Managed services take on day-to-day operations under SLAs (turnaround, false-positive rates). Lucinity argues rework and oversight can erase the savings. — [Lucinity](https://lucinity.com/blog/choosing-aml-support-managed-services-vs-offshore-outsourcing-vs-in-house-teams) **[vendor]**
- Chartis's 2025 "Managed Services: Financial Crime" category winner was Nasdaq (Verafin). — [Chartis](https://www.chartis-research.com/risk-tech100/winners)

**Cost (LexisNexis Risk Solutions / Forrester, US + Canada)**
- Released 21 Feb 2024: financial crime compliance cost US$61bn in the US and Canada, and costs rose at 99% of institutions. Labour is the largest cost category: 78% of small institutions (under $10bn assets) and 63% of mid/large institutions reported higher labour costs. 79% reported higher compliance/KYC software costs, and 79% of mid/large institutions reported higher outsourcing costs. Screening alerts rose at 83% of mid/large and 87% of small institutions. 70% prioritise cost cutting. Method: 1,181 respondents globally, of whom only 160 were US/Canada, fielded May-June 2023. — [LexisNexis press release](https://risk.lexisnexis.com/about-us/press-room/press-release/20240221-true-cost-of-compliance-us-ca)
- Earlier editions: about $49.9bn (2021) and about $56.7bn (2022) for US + Canada. 2020 projected $35.2bn for the US alone. Methodology changed between years. — [LexisNexis 2021](https://risk.lexisnexis.com/about-us/press-room/press-release/20210927-tcoc-fcc-us-ca); [LexisNexis 2022](https://risk.lexisnexis.com/about-us/press-room/press-release/20220929-report-reveals-the-yearly-cost-of-financial-crime-compliance); [LexisNexis 2020](https://risk.lexisnexis.com/about-us/press-room/press-release/20201021-tcof-study-us-canada)
- No 2025 or 2026 US/Canada edition was found.

**BSA officer accountability**
- In 2014 FinCEN assessed a $1m penalty against former MoneyGram CCO Thomas Haider for failing to implement an effective AML program and file timely SARs. The D. Minn. court held FinCEN can pursue individuals for willful BSA program violations. The case settled in 2017 for $250,000. — [WilmerHale](https://www.wilmerhale.com/en/insights/client-alerts/fincen-assesses-1-million-civil-penalty-against-former-chief-compliance-officer-and-partners-with-sdny-to-initiate-injunctive-action); [Crowell](https://www.crowell.com/en/insights/client-alerts/former-chief-compliance-officer-can-be-held-personally-liable-for-aml-violations); [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/fincen-assesses-penalty-former-moneygram-compliance-officer)
- On 4 March 2020 FinCEN imposed a $450,000 penalty on Michael LaFontaine, former Chief Operational Risk Officer of U.S. Bank. — [MoFo](https://www.mofo.com/resources/insights/200310-fincen-anti-money-laundering)
- The inflation adjustment of 17 January 2025 moved the willful BSA violation range for "any person" to $71,545–$286,184 per violation. — [Federal Register 2025-01374](https://www.federalregister.gov/documents/2025/01/17/2025-01374/financial-crimes-enforcement-network-inflation-adjustment-of-civil-monetary-penalties)
- The April 2026 whistleblower NPRM would make compliance staff eligible only after 120 days (see us_eu_uk_regimes.md). This adds internal-escalation pressure on BSA teams.

### Inferences
- A defensible model for the twin:
  - **L1** clears or escalates, minutes per alert, often offshore.
  - **L2** investigates, hours per case, onshore or offshore.
  - **L3, the SAR decision-maker or committee chaired by the BSA Officer**, makes the file/no-file call and signs the SAR, always onshore.
  - **QA** samples a percentage of closures. Some banks reportedly sample 5-10%; that figure is uncited practitioner lore.
- Because the BSA Officer is personally exposed (Haider) and the bank cannot outsource accountability, managed services typically stop at a recommendation, and the bank files. That matches TwinAML's rule: humans decide, and overrides are events.

### Gaps
- No primary or survey source with US alerts-per-FTE, cost per alert or per SAR, QA sample rates, or Philippines-specific AML operations was found.
- No firm-specific evidence for Genpact, Accenture, EY or Protiviti AML managed services was retrieved. Searches returned nothing on them.
- No individual BSA-officer penalties dated 2023–2026 were found.

## 4. Technology at US institutions: vendor split, BaaS/partner-bank model and consent orders, regulator positions on AI

### Takeaway
The US market splits by size:
- **Tier-1 and large banks** run enterprise suites (NICE Actimize, Oracle FCCM, SAS, plus in-house builds).
- **Community banks and credit unions** cluster on Nasdaq Verafin (cloud, with cross-institution consortium data) and Abrigo BAM+.
- **Fintechs and their sponsor banks** assemble API stacks: Alloy or Persona or Socure for identity/KYB, Sardine for device and behavioural signals, Unit21 or Hummingbird for monitoring and case management.

The BaaS model came under heavy enforcement in 2023–2024 (Cross River, Blue Ridge, Sutton, Piermont, Lineage, Evolve, Thread). The Synapse collapse (2024) exposed a $65–95m ledger shortfall. Enforcement continues in 2026 (OCC v. Community Federal Savings Bank). US regulators are pro-innovation in tone: the April 2026 NPRM says responsible experimentation adds no supervisory risk "solely from use of the technology". But the April 2026 model-risk guidance excludes GenAI and agentic AI.

### Cited Findings
**Vendors by segment**
- Nasdaq bought Verafin for $2.75bn (2020). Customer counts conflict:

  | Figure | Source |
  |---|---|
  | >2,500 institutions, >$8tn assets | Nasdaq boilerplate (2025) |
  | >3,800 | Verafin site (via third-party profile) |
  | >2,750, >$11tn | Wikipedia, citing a 2026 report |

  In Texas, 52% of institutions with $500m–$1bn assets use Verafin. — [Verafin news](https://verafin.com/news/over-200-additional-banks-and-credit-unions-choose-verafin-to-meet-their-financial-crime-fighting-needs/); [Wikipedia](https://en.wikipedia.org/wiki/Verafin); [Verafin Texas case study](https://verafin.com/uresource/verafin-used-across-texas) **[vendor claim]**
- Verafin launched an "Entity Research Copilot", its first integrated GenAI copilot. — [Silicon UK press release](https://www.silicon.co.uk/press-release/verafin-enhances-financial-crime-management-solutions-suite-with-launch-of-entity-research-copilot-first-of-its-integrated-copilot-capabilities) **[vendor claim]**
- Abrigo serves "2,400+" US institutions company-wide. BAM+ is its suspicious-activity monitoring and case product, used by banks and credit unions (for example Envista FCU from Nov 2020). No BAM+-specific count is published. — [Abrigo success story](https://www.abrigo.com/success-stories/credit-union-centralizes-aml-risk-management-with-abrigo-bam/); [Envista case PDF](https://abrigo.com/wp-content/uploads/2024/10/Envista-Federal-CU-BAM-2.pdf) **[vendor]**
- Unit21 markets transaction monitoring, case management, payment and sanctions screening, CRR and regulatory filings. In March 2026 it partnered with Helix by Q2 (a core for BaaS programs) to give sponsor banks a "consolidated view" of their own and fintech partners' risk data, with "shared alert visibility". — [Business Wire 23 Mar 2026](https://www.businesswire.com/news/home/20260323835434/en/Unit21-Announces-Partnership-to-Power-AI-Driven-AML-Workflows-and-Sponsor-Bank-Oversight-for-BaaS-Programs); [Unit21 AML](https://unit21.ai/category/aml) **[vendor claim]**
- Typical fintech layering per stack guides: Alloy (orchestrates many KYC, KYB, AML, credit and fraud data sources at onboarding), Persona (document and identity verification), Sardine (device and behavioural signals upstream of the decision engine), Unit21 or Hummingbird (monitoring and SAR case management). — [Sacra on Unit21](https://sacra.com/chat/h/f7d5e122-5bb4-4c21-ae0a-d90194d3202e/); [PulseRevOps stack guide](https://pulserevops.com/knowledge/tk0127) (low-quality, speculative source)
- FIS + Anthropic Financial Crimes AI Agent (with BMO and Amalgamated Bank): see software_data_infrastructure.md §5.

**BaaS / sponsor-bank enforcement**

| Bank | Regulator / date | Issue | Status / note |
|---|---|---|---|
| Cross River | FDIC, dated 8 Mar 2023 (public Apr/May 2023) | Fair lending, oversight of fintech lending partners | FDIC non-objection needed for new partners |
| Blue Ridge | OCC, Jan 2024 | BSA/AML; OCC non-objection before new fintech relationships | Terminated 13 Nov 2025 |
| Lineage | FDIC, signed 30 Jan 2024 | Third-party risk management of fintech partners | Synapse partner; later rebranded Harpeth Bank & Trust |
| Sutton | FDIC, 1 Feb 2024 | BSA/AML, BaaS oversight | — |
| Piermont | FDIC, 26 Feb 2024 | BSA/AML, BaaS oversight | — |
| Evolve | Fed + Arkansas, 14 Jun 2024 | AML, risk management, consumer compliance for fintech partnerships | Prior approval for new fintech partners or products; no termination found |
| Thread | FDIC, effective 21 May (2024 likely) | Oversight of BaaS programme | Year unconfirmed |
| Community Federal Savings Bank | OCC, 24 Apr 2026 | Suspicious-activity monitoring, BSA/AML | No money penalty reported |

  — [ABA Banking Journal (Cross River)](https://bankingjournal.aba.com/2023/05/cross-river-bank-enters-consent-order-with-fdic-over-fair-lending-compliance-practices); [Consumer Finance Monitor](https://www.consumerfinancemonitor.com/2023/05/04/fdic-consent-order-with-cross-river-bank-indicates-heightened-scrutiny-of-bank-fintech-partnerships/); [Orrick InfoBytes (Lineage)](https://infobytes.orrick.com/wp-content/uploads/pdf/InfoBytes%20-%20FDIC%20orders%20bank%20to%20terminate%20relationships%20with%20%E2%80%9Csignificant%E2%80%9D%20fintech%20partners%202024.02.27.pdf); [PYMNTS (Lineage rebrand)](https://www.pymnts.com/?p=4194317); [Canarie (Sutton, Piermont, Blue Ridge termination, CFSB)](https://www.canarie.ai/blog/sponsor-bank-consent-orders-lessons) **[vendor blog]**; [Banking Dive (Evolve)](https://www.bankingdive.com/news/federal-reserve-synapse-partner-evolve-enforcement-action-aml-risk-fintech-baas-compliance/719027/); [BFKN](https://www.bfkn.com/newsroom/publications/bfkn-alert-evolve-bank-trust-cease-and-desist-order-key-takeaways-for-your-bank-or-fintech); [FinTech Futures (Thread)](https://fintechfutures.com/tag/federal-deposit-insurance-corporation); [Wagner Hicks (CFSB)](https://www.wagnerhicks.law/when-fintech-growth-outpaces-compliance/); Gibson Dunn via us_eu_uk_regimes.md
- In 2023, BaaS banks accounted for 13.5% of severe federal bank enforcement actions. — [S&P Global](https://www.spglobal.com/market-intelligence/en/news-insights/articles/2024/1/small-group-of-banking-as-a-service-banks-logs-big-number-of-enforcement-actions-80067110)
- One vendor blog counts 17 bank-level enforcement packages tied to sponsor or fintech businesses between March 2023 and September 2026. — [Canarie](https://www.canarie.ai/blog/sponsor-bank-consent-orders-lessons) **[vendor, unverified]**
- **Synapse:** the trustee (former FDIC chair Jelena McWilliams) estimated a $65–95m gap between Synapse's ledgers and funds held at Evolve, AMG, American Bank and Lineage. About $265m was owed to end users against about $219m held. The CFPB's complaint (filed in the bankruptcy, settled with a $1 penalty so the Civil Penalty Fund could be used) alleged Synapse failed to keep records reconciling consumer funds. The CFPB later allocated $46,248,291 from the fund to victims (reported Dec 2025). — [American Banker](https://americanbanker.com/news/evolve-bank-says-it-will-start-returning-money-to-synapse-end-users); [PYMNTS](https://www.pymnts.com/legal/2025/synapse-faces-cfpb-over-fund-reconciliation-gaps/); [Fintech Business Weekly](https://fintechbusinessweekly.substack.com/p/cfpb-allocates-46-million-to-synapseevolve); [Crowdfund Insider](https://www.crowdfundinsider.com/2025/12/256754-cfpb-allocates-46m-to-victims-of-synapse-fintech-collapse/)

**US regulator positions on AI in AML (2025–2026)**
- April 2026 AML/CFT program NPRM (91 FR 18,704):
  - enforcement factors would credit "innovative activities that produce demonstrable outputs"
  - responsible experimentation "adds no supervisory or enforcement risk solely from use of the technology"
  - "no particular technology is required"
  - FinCEN shares industry concerns about applying model risk management principles to AML and will work through them with supervisors

  Much of this sits in the preamble, and commenters asked for it to be moved into rule text. — [Napier, 18 Jun 2026](https://www.napier.ai/post/fincen-aml-ai-effectiveness) **[vendor summary; NPRM text not checked]**
- Treasury published a "Financial Services AI Risk Management Framework" (a NIST AI RMF adaptation) in February (2026 per context). — [Napier](https://www.napier.ai/post/fincen-aml-ai-effectiveness) **[secondary]**
- FinCEN has said it is "open to innovation" and plans regular discussions on emerging technology. — [ACAMS moneylaundering.com](https://md3.acams.org/en/news/fincen-open-to-innovation-plans-regular-discussions-on-emerging-technologies) (date not retrieved)
- SR 26-2 / OCC 2026-13 (April 2026) puts GenAI and agentic AI out of scope of model-risk guidance. See software_data_infrastructure.md §5.
- The December 2018 interagency joint statement on innovative BSA/AML approaches remains the baseline: pilots will not automatically draw criticism. — [JD Supra index](https://www.jdsupra.com/topics/fincen/artificial-intelligence/bsa-aml/) **[secondary]**
- The 2026 scam-center alert says transnational criminal organisations use AI tools to scale fraud. That is AI as a threat as well as a tool. — [FIN-2026-Alert005](https://www.fincen.gov/system/files/2026-08/FinCEN-Alert-Scam-Centers.pdf)

### Inferences
- In the BaaS model the bank holds the BSA obligation, but the fintech holds the customer data and often runs first-line monitoring. Consent orders consistently demanded (a) regulator non-objection before new partners, (b) bank-level visibility into partner alerts and ledgers, and (c) reconciliation. Vendors (Unit21 + Helix) now sell "sponsor oversight" as a product. Synapse shows the ledger itself is an AML/consumer-protection control. This makes a strong scenario for TwinAML: a partner-bank investigator who cannot see the end customer.
- US AI posture in October 2026: permissive in tone (NPRM preamble, 2018 statement), but with no binding safe harbour and no GenAI model-risk rules. Rules-before-AI with human sign-off remains the defensible design.

### Gaps
- No primary or independent data on which vendors specific US tier-1 banks use. Actimize and Oracle tier-1 dominance is industry knowledge, not cited here.
- Hummingbird, Sardine and Persona US customer or bank-partner facts were not retrieved from primary sources.
- Full orders for Sutton, Piermont and Thread were not read, and whether the Evolve order has been terminated is unconfirmed.
- No official FinCEN 2025–2026 standalone AI statement was found. The details of the FinCEN "innovation" initiative (hours, dates) were not retrieved.

## 5. US-specific typologies and FinCEN advisories 2023–2026, with red flags

### Takeaway
FinCEN's 2025–2026 output is dominated by:
- **Cartels and fentanyl finance:** bulk cash, Chinese money laundering networks (CMLNs), the southwest-border GTO, oil smuggling, cross-border transfers.
- **Fraud and scams:** pig butchering, scam centers, crypto kiosks, elder exploitation, check fraud.
- **Sanctions evasion:** Russia export controls, the A7 network.
- **Human trafficking:** including a 2026 FIFA World Cup notice.

Each product carries red flags plus a SAR key term. The primary texts below were read in full.

### Cited Findings
**Recent FinCEN product list (selected)**

| Date | Product | Subject |
|---|---|---|
| 8 Sep 2023 | FIN-2023-Alert005 | Pig butchering |
| 27 Feb 2023 | FIN-2023-Alert003 | Mail-theft check fraud (with USPIS) |
| 18 Dec 2024 | FIN-2024-Alert005 | FinCEN-impersonation and BOI scams |
| 31 Mar 2025 | FIN-2025-Alert001 | Bulk cash smuggling |
| 1 May 2025 | FIN-2025-Alert002 | Oil smuggling |
| 4 Aug 2025 | FIN-2025-NTC1 | Crypto kiosks |
| 28 Aug 2025 | FIN-2025-A003 | CMLNs (Spanish version 13 Jan 2026) |
| 26 Nov 2025 | FIN-2025-Alert003 | Cross-border funds transfers / smuggling |
| 9 Jan 2026 | FIN-2026-Alert001 | Minnesota child-nutrition fraud rings |
| 11 May 2026 | FIN-2026-NTC1 | Human trafficking at the World Cup |
| 3 Sep 2026 | FIN-2026-Alert005 | Scam centers |
| 1 Oct 2026 | FIN-2026-Alert007 | A7 Network |

— [FinCEN advisories search results](https://www.fincen.gov/resources/advisoriesbulletinsfact-sheets/advisories); individual PDFs linked below

**Fentanyl / Chinese money laundering networks (FIN-2025-A003, 28 Aug 2025)**
- The advisory targets laundering for CJNG, the Sinaloa and Gulf cartels, designated FTOs/SDGTs under E.O. 14157 (20 Jan 2025). CMLNs are compartmentalised and trust-based. They recruit diaspora members, increasingly Chinese students at US universities, as mules, brokers and couriers. They use mirror transactions and trade-based money laundering (buying electronics and luxury goods for export to Mexico, China, Hong Kong and the UAE). Demand comes partly from China's roughly $50,000 annual personal FX limit. — [FIN-2025-A003 (PDF)](https://www.fincen.gov/system/files/2025-08/FinCEN-Advisory-CMLN-508.pdf); [AP via KTLA](https://digital-release.ktla.com/?p=3630057)
- The companion Financial Trend Analysis covers 137,153 BSA reports (2020–2024) showing about $312bn in suspicious activity. Separately, 17,389 SARs (about $53.7bn) involved real estate. — [FinCEN news release](https://www.fincen.gov/news/news-releases/fincen-issues-advisory-and-financial-trend-analysis-chinese-money-laundering); [FinTelegram](https://fintelegram.com/fincen-warns-of-chinese-money-laundering-networks-cartels-daigou-tbml-u-s-real-estate-in-focus/)
- **Money-mule red flags (selected):**
  - a customer who presented a Chinese passport regularly receives funds not commensurate with stated occupation or income, not attributable to payroll
  - a "student" deposits cash or receives wires labelled "tuition" or "living expenses", then sends P2P or wires to unrelated people or pays cards
  - cash funds cashier's checks that are deposited at another institution
  - wire or cashier's checks to a real estate company, sometimes with the agent present
  - the customer refuses to explain source of funds or calls it "repayment of a loan"

  — [FIN-2025-A003 pp. 9-10](https://www.fincen.gov/system/files/2025-08/FinCEN-Advisory-CMLN-508.pdf)
- **TBML red flags:**
  - a business gets online-marketplace deposits or export wires (Mexico, China, HK, UAE) but never buys inventory
  - an electronics or real estate business receives wires from those countries with no nexus
  - P2P from unknown people is used to pay large credit-card bills for electronics or luxury goods
  - a luxury-goods seller pays multiple unrelated individuals' credit cards
  - shell-like HK trading companies send funds to US-resident Chinese nationals or escrow and title companies

  SAR key term: `CMLN-2025-A003`. — [FIN-2025-A003 p. 10-11](https://www.fincen.gov/system/files/2025-08/FinCEN-Advisory-CMLN-508.pdf)

**Cartel bulk cash smuggling (FIN-2025-Alert001, 31 Mar 2025)**
- Typology: cash is smuggled into Mexico, then repatriated through Mexican businesses near the border via foreign and domestic armored car services (ACS) and air transport into US banks or MSBs, then wired back to Mexico.
- **Bank red flags:**
  - large ACS cash deliveries for a Mexico-based or border business, followed by rapid wires to Mexico, transfers to the owner's other US business, or bulk goods purchases
  - ACS or passenger-vehicle cash to border MSBs, quickly sent to Mexico
  - large credits from bulk cash deposited into the bank's vault at an ACS facility
  - cross-border wires from a Canadian bank to a Mexico-business owner
- **ACS red flags:**
  - cash routed through multiple US locations before delivery
  - CMIR (FinCEN Form 105) Part II originator or destination info missing or inconsistent
  - shipment volume not commensurate with the business

  Key term: `FIN-2025-BULKCASH`. — [FIN-2025-Alert001 (PDF)](https://www.fincen.gov/sites/default/files/shared/BCS-Alert-FINAL-508C.pdf)

**Southwest border MSB Geographic Targeting Order**

| Order | Threshold | Coverage | Status |
|---|---|---|---|
| 1st (effective 14 Apr 2025) | Cash over $200 | MSBs in 30 ZIP codes in CA and TX | TRO in W.D. Tex. (TAMSB); S.D. Cal. preliminary injunction 21 May 2025 (*Novedades y Servicios v. FinCEN*); 9th Cir. affirmed 13/14 Jul 2026, split panel |
| 2nd (after Sep 2025 expiry) | $1,000 | Added Arizona | — |
| 3rd (Mar 2026) | $1,000 | Added New Mexico | — |
| Reissued 2 Sep 2026 | $1,000–$10,000 | Dropped CA and AZ; specific TX and NM ZIP codes | Runs to 1 Mar 2027 |

— [ABA Banking Journal](https://bankingjournal.aba.com/2025/04/court-orders-pause-for-southwest-border-geographic-targeting-order/); [Orrick](https://infobytes.orrick.com/2026-07-17/ninth-circuit-affirms-preliminary-injunction-of-fincens-reporting-order-for-businesses-along-the-southern-border/); [MoFo](https://www.mofo.com/resources/insights/260911-fincen-reissues-geographic-targeting-order); [FinCEN GTO FAQs](https://www.fincen.gov/system/files/2025-09/FAQs-FINAL-508C.pdf)

**Pig butchering and scam centers**
- FIN-2023-Alert005 (8 Sep 2023). IC3 2022: investment fraud losses $3.31bn, of which crypto investment fraud was $2.57bn (up 183%).
- **Behavioural red flags:**
  - a customer with no crypto history suddenly converts large fiat or wires to a crypto exchange (VASP)
  - an unsolicited online or text contact pitched the investment
  - instructions to use a crypto kiosk and a supplied wallet address
  - the customer is anxious to meet an investment deadline
- **Financial red flags:**
  - early CD liquidation, then a wire to a VASP
  - HELOC or second-mortgage proceeds sent to a VASP
  - a small "return" deposit followed by much larger outflows
  - dormant high-balance account suddenly draining to a VASP
  - transfers labelled "taxes", "fees" or "penalties" to release funds
  - small test EFTs followed by large wires to LLCs or holding companies
- **Technical red flags:**
  - logins from inconsistent IPs, devices or geographies
  - amateurish or misspelled platform sites

  Key term: `FIN-2023-PIGBUTCHERING`. — [FIN-2023-Alert005 (PDF)](https://www.fincen.gov/system/files/shared/FinCEN_Alert_Pig_Butchering_FINAL_508c.pdf)
- FIN-2026-Alert005 (3 Sep 2026): IC3-reported US losses from digital-asset investment scams rose from $907m (2021) to **$7.2bn (2025)**. Southeast Asian scam-center revenue is in the tens of billions.
- **Scam-center red flags:**
  - a customer says "law enforcement" told them to pay in crypto, wire, gold or gift cards
  - payment to a "fund recovery" firm without documentation
  - retirement funds used to buy gold handed to a courier
  - an MSB claiming to be "approved by FinCEN"
  - an exchange advertising "no KYC"
  - exposure to "guarantee marketplaces" (Telegram-based laundering markets) or to payment providers that appear to operate in Burma, Cambodia or Laos

  Key term: `FIN-2026-SCAMCENTERS`. — [FIN-2026-Alert005 (PDF)](https://www.fincen.gov/system/files/2026-08/FinCEN-Alert-Scam-Centers.pdf)

**Elder financial exploitation**
- FIN-2022-A002 (15 Jun 2022) gives 12 behavioural and 12 financial red flags. Examples: a sudden change of contact details or new overseas emails or phones; a dormant high-balance account showing constant withdrawals. It covers five scam typologies (government imposter, romance, emergency/person-in-need, lottery/sweepstakes, tech support). Victims are referred to the National Elder Fraud Hotline. — [FinCEN release](https://www.fincen.gov/news/news-releases/fincen-advisory-warns-elder-financial-exploitation); [Consumer Finance Monitor](https://www.consumerfinancemonitor.com/2022/06/26/fincen-warns-against-elder-financial-exploitation/)
- The 2024 Financial Trend Analysis found 155,415 BSA filings (15 Jun 2022–15 Jun 2023) showing about $27bn in EFE-related suspicious activity. Banks filed 72%, and two banks filed 33%. Scams were about 80% and theft by a trusted person about 20%. Account takeover was the most common typology, and adult children were the most common perpetrators. Filings averaged about 15,993 a month after June 2023. An interagency EFE statement followed in Dec 2024. — [FinCEN FTA release](https://www.fincen.gov/news/news-releases/fincen-issues-analysis-elder-financial-exploitation); [FinCEN FTA PDF](https://www.fincen.gov/system/files/shared/FTA_Elder_Financial_Exploitation_508Final.pdf); [FIN-2026-Alert005 fn 50](https://www.fincen.gov/system/files/2026-08/FinCEN-Alert-Scam-Centers.pdf)

**Mail-theft check fraud (FIN-2023-Alert003, 27 Feb 2023, with USPIS)**
- Check-fraud SARs topped 680,000 in 2022, nearly double 2021. USPIS received 299,020 mail-theft complaints, up 161%.
- **Red flags:**
  - uncharacteristic large check withdrawals to a new payee
  - a customer reports mailed checks stolen or never received
  - check stock different from the issuing bank's or the customer's known stock
  - a customer with no check history suddenly deposits checks (often mobile) and rapidly withdraws
  - faded handwriting under darker overwriting (washed checks)
  - a new account used only for check deposits and rapid withdrawals
  - a non-customer cashing large checks with a story suggesting a money mule

  Key term: `FIN-2023-MAILTHEFT`. Victims are referred to USPIS. — [FinCEN alert PDF](https://www.fincen.gov/sites/default/files/shared/FinCEN%20Alert%20Mail%20Theft-Related%20Check%20Fraud%20FINAL%20508.pdf); [Orrick](https://infobytes.orrick.com/2023-03-03/fincen-warns-financial-institutions-surge-mail-theft-related-check-fraud/)

**Human trafficking**
- FIN-2020-A008 (15 Oct 2020) adds 20 indicators to the 2014 advisory (FIN-2014-A008, still in effect).
- **Behavioural red flags:**
  - a third party speaks for the customer, insists on being present, fills out paperwork, or holds the customer's documents and money
  - a "relative" who does not know key details
  - third-party ID used to open an account
  - intimidation of the customer
- **Financial red flags:**
  - transactions across many US locations
  - spending on hotels, rideshare, fast food and similar living costs inconsistent with the business
  - night-time, cash-heavy deposits larger than the business size
  - cash deposits with no ACH payroll
  - frequent prepaid-card use
  - shared phone, email or address with escort ads
  - foreign classified-ad sites
  - crypto to or from darknet markets
  - third-party payment processors concealing parties
  - avoiding ID or reporting triggers

  — [FIN-2020-A008 (PDF)](https://www.fincen.gov/system/files/advisory/2020-10-15/Advisory%20Human%20Trafficking%20508%20FINAL_0.pdf); [FIN-2014-A008](https://www.fincen.gov/system/files/shared/FIN-2014-A008.pdf)
- FIN-2026-NTC1 (11 May 2026) covers trafficking around the 2026 FIFA World Cup. Key term `FIN-2026-HTWORLDCUP`, field 38(h). — [FinCEN notice PDF](https://www.fincen.gov/system/files/2026-05/FinCEN-WCHT-Notice.pdf)

**Russia sanctions and export-control evasion**
- FinCEN and BIS issued a joint alert in June 2022 (22 red flags) and a supplement on 19 May 2023. The supplement adds 9 red flags and 9 high-priority HS codes. Examples: dual-use or defense payments from companies formed after 24 Feb 2022 in non-coalition countries; transshipment via China, Armenia, Turkey or Uzbekistan; procurement agents splitting small orders across shells. Key term `FIN-2022-RUSSIABIS`. — [FinCEN release](https://www.fincen.gov/news/news-releases/supplemental-alert-fincen-and-us-department-commerces-bureau-industry-and); [Thompson Hine](https://www.thompsonhinesmartrade.com/2023/06/fincen-bis-issue-joint-alert-encouraging-continued-vigilance-regarding-potential-russia-export-control-evasion/)
- FIN-2026-Alert007 (1 Oct 2026): the **A7 Network** is a Russia-linked wholesale sanctions-evasion and laundering service using digital-asset channels, also used by Iran (the Central Bank of Iran and the IRGC). OFAC designated A7 entities on 14 Aug 2025. FinCEN issued a finding and NPRM under §9714(a) of the Combating Russian Money Laundering Act, naming transactions with A7-controlled non-US companies a class of primary money laundering concern. Key term `FIN-2026-A7NETWORK`. — [FIN-2026-Alert007 (PDF)](https://www.fincen.gov/system/files/2026-10/FinCEN-Alert-A7-Network.pdf)

**Real estate, shell companies, casinos**
- CMLN analysis: about $53.7bn across 17,389 real-estate SARs (2020–2024). Red flags include US escrow companies funded by unaffiliated foreign shells. — [FinCEN release](https://www.fincen.gov/news/news-releases/fincen-issues-advisory-and-financial-trend-analysis-chinese-money-laundering); [FIN-2025-A003](https://www.fincen.gov/system/files/2025-08/FinCEN-Advisory-CMLN-508.pdf)
- The residential real estate rule was vacated in March 2026, and real estate GTOs continue. See us_eu_uk_regimes.md.
- Casinos: the CMLN FTA found 108 BSA reports tying funds to healthcare fraud, elder abuse and suspicious gaming. — [FinCEN release via search](https://www.fincen.gov/news/news-releases/fincen-issues-advisory-and-financial-trend-analysis-chinese-money-laundering)

### Inferences
- Every FinCEN product has the same structure: typology narrative, then red flags in three groups (behavioural, financial, technical), then the SAR key term and field selections. A TwinAML case script can mirror this exactly: case → red flags fired (rules) → investigator decision → SAR with key term. That is rules-before-AI in its native US form.
- High-value US scenarios for a trainee:
  1. elder victim of a pig-butchering or scam-center scheme (HELOC to a crypto kiosk)
  2. CMLN "student" mule
  3. border business with armored-car cash
  4. mail-theft check deposited via mobile
  5. a sponsor-bank fintech customer with no visibility (Synapse-style)

### Gaps
- FIN-2025-Alert003 (cross-border transfers) and FIN-2025-NTC1 (crypto kiosks) were not read in detail. The 2026 National Money Laundering Risk Assessment (cited in the scam-center alert) was not retrieved.
- No 2024 FinCEN human-trafficking supplement was found. The existing set is 2014, 2020 and 2026.
- No specific 2023–2026 FinCEN casino or card-club advisory was found.

## 6. Training and certification: ACAMS/CAMS, FFIEC expectations, bank investigator training, simulations

### Takeaway
Training is one of the BSA "pillars". The FFIEC expects role-tailored training for staff whose duties need BSA knowledge, plus board training. "Annual" is examiner convention, not regulation text. CAMS (ACAMS) is the de facto US credential: more than 140,000 certified worldwide by July 2025, when ACAMS relaunched it with extended case studies and an exam simulator. Scenario and simulation training exists (Wolters Kluwer AML Virtuoso, vendor sandboxes, offshore-market courses with TM simulators), but there is no regulator-endorsed simulation standard. That is an open niche for a digital-twin product.

### Cited Findings
- **FFIEC:** the training program should cover all personnel whose duties require BSA knowledge, tailored to their role. It covers regulatory requirements and internal policies, and the board gets foundational training. The manual does not say "annual". Examiners nonetheless expect annual training and ask for per-employee logs, materials, board-training proof and role-based records. — [Wipfli](https://www.wipfli.com/insights/articles/fi-bsa-training-need-by-job-duties); [AML RightSource](https://www.amlrightsource.com/news/posts/training-a-five-pillar-requirement-that-is-always-changing); [KnowledgeCity](https://www.knowledgecity.com/blog/how-branch-operations-training-managers-use-an-lms-to-document-aml-and-bsa-training-for-examiners/) **[secondary; FFIEC page blocked]**
- FinCEN's human-trafficking advisory notes that front-line staff may be a victim's only outside contact. It asks that behavioural indicators, and the staff who witnessed them, be recorded in the SAR narrative. This is a direct training requirement for branch staff. — [FIN-2020-A008 p.5](https://www.fincen.gov/system/files/advisory/2020-10-15/Advisory%20Human%20Trafficking%20508%20FINAL_0.pdf)
- **ACAMS:** the enhanced CAMS launched 15 July 2025 with "extended case studies", more AML technology coverage, a "new exam simulator" and four self-paced core courses. More than 140,000 professionals are certified across 200+ jurisdictions in 14 languages. — [GlobeNewswire 15 Jul 2025](https://www.globenewswire.com/news-release/2025/07/15/3115455/0/en/ACAMS-Launches-Enhanced-CAMS-Certification-to-Combat-Evolving-Financial-Crime.html)
- ACAMS membership was about 100,000 in 2023 (Wikipedia) and 60,000 in Jan 2018. — [Wikipedia](https://en.wikipedia.org/wiki/Association_of_Certified_Anti-Money_Laundering_Specialists); [GlobeNewswire search summary](https://www.globenewswire.com/news-release/2025/07/15/3115455/0/en/ACAMS-Launches-Enhanced-CAMS-Certification-to-Combat-Evolving-Financial-Crime.html)
- CAMS package price is reported at $2,095 (2025) by a third-party handbook, versus a commonly quoted $1,695. Unverified. — [ACAMS India Handbook (third party)](https://mentormecareers.com/wp-content/uploads/2026/06/ACAMS_India_Handbook.pdf)
- ACAMS runs SAR-writing webinars such as "Write it Right: Drafting and Crafting Tailored SAR Narratives". — [ACAMS](https://www.acams.org/en/events/webinars/write-it-right-drafting-and-crafting-tailored-sar-narratives)
- **Simulation precedents:**
  - Wolters Kluwer **AML Virtuoso**, a game-style simulator where trainees investigate simulated laundering cases, deployed at First Interstate Bank. A BSA analyst there reported it taught more effectively than other methods. The article is old, and whether the product still exists is unknown. — [Bank Systems & Technology](https://banktech.com/management-strategies/first-interstate-bank-deploys-training-simulator/d/d-id/1292386.html)
  - Indiaforensic CAME (India) offers case studies built from real STRs plus a "Transaction Monitoring Simulator". — [Indiaforensic brochure 2026](https://www.indiaforensic.com/wp-content/uploads/2026/08/CAME-Brochure-2026-Final.pdf) **[vendor]**
  - A Saudi Financial Academy course includes a "Mega-Simulation". — [fa.gov.sa](https://fa.gov.sa/en/Services/ProgramDetails/a5bdc944-e2fb-4cdc-ac7f-b45c009e57b8)
  - Udemy TM-analyst bootcamps offer a simulation console and SAR drafting. — [Udemy](https://www.udemy.com/course/anti-money-laundering-aml-transaction-monitoring-analyst-training/) **[vendor]**

### Inferences
- How US banks appear to train investigators:
  - an annual computer-based BSA module for all staff
  - CAMS sponsorship for L2/L3 staff
  - on-the-job shadowing of alerts and QA feedback, which is the real teaching loop

  Scenario training is mostly vendor case studies. A digital twin that replays FinCEN-advisory typologies with a SAR clock, key-term selection and QA scoring would fill a visible gap. It also aligns with ACAMS's 2025 move toward case-study and simulator-based assessment.
- FFIEC training documentation expectations (per-employee, role-based records) suggest a twin should log every trainee decision as an auditable event. That matches the TwinAML event model.

### Gaps
- No primary FFIEC training text was retrieved (403).
- No public data on US bank investigator onboarding length, CAMS penetration among US investigators, or any regulator-endorsed simulation training.
- No 2025–2026 ACAMS figure for CAMS holders in the US specifically.
