// ============================================================================
// TwinAML FlexSim edition - recordDecision(customerId, kind, citedEvidenceIds, note)
//                           (CONTRACT 4.6, 2.5)
// ATTACHMENT POINT : Toolbox > User Commands > recordDecision(str customerId,
//                    str kind, str citedEvidenceIds, str note) -> num.
//                    citedEvidenceIds is a pipe-separated string ("EV-002|EV-003"),
//                    the same form the trace prints, because built-in dashboard
//                    widgets have no multi-select (ASSEMBLY.md). "" = cites nothing.
// INPUTS           : run_evidence, run_header, run_decisions.
// SIDE EFFECTS     : appends to run_decisions; increments
//                    run_header.next_decision_number; events decision_recorded or
//                    decision_rejected, or action_rejected for an unknown customer
//                    (CONTRACT 4); 3D redraw. Never touches holds or orders
//                    (a decision never changes payment state).
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// ============================================================================
// Returns 1 accepted, 0 rejected (decision_rejected written), -1 unknown customer
// (action_rejected reason=unknown_customer written, nothing else happens).

// ===== USER COMMAND: recordDecision(str customerId, str kind, str citedEvidenceIds, str note) -> num
string customerId = param(1);
string kind = param(2);
string cited = param(3);
string note = param(4);
if (twinRejectUnknown("decide", customerId) == 1) {   // CONTRACT 4: checked BEFORE 4.6's list
	return -1;
}
if (kind != "closure" && kind != "continue_review" && kind != "escalation") {   // 1.
	twinEmit("decision_rejected", customerId, "", "", "reason=unknown_decision;decision=" + kind);
	return 0;
}
Array ids = [];                             // [U] array literal; alternative: Array ids = Array();
if (cited != "") {
	ids = cited.split("|");                 // string.split -> Array (secondary source)
}
Table evr = Table("run_evidence");
string joined = "";
for (int i = 1; i <= ids.length; i++) {     // 2. every cited record: known, own, visible now
	string id = ids[i];
	int er = twinFindRow("run_evidence", "evidence_id", id);
	int ok = 1;
	if (er == 0) { ok = 0; }
	else if (evr[er]["customer_id"] != customerId) { ok = 0; }
	else if (twinIsVisible(id) == 0) { ok = 0; }
	if (ok == 0) {                          // reject on the first offending id (CONTRACT: "reject, not flag")
		twinEmit("decision_rejected", customerId, "", "",
			"reason=evidence_not_available:" + id + ";decision=" + kind);
		return 0;
	}
	if (i > 1) { joined = joined + "|"; }
	joined = joined + id;
}
Table hdr = Table("run_header");
int n = twinNum(hdr[1]["next_decision_number"]);
string did = "D" + twinIntText(n);
hdr[1]["next_decision_number"] = n + 1;
Table dec = Table("run_decisions");
int r = twinAppendRow("run_decisions", "decision_id");
dec[r]["decision_id"] = did;
dec[r]["minute"] = twinNow();
dec[r]["customer_id"] = customerId;
dec[r]["decision"] = kind;
dec[r]["evidence_ids"] = joined;
dec[r]["note"] = note;
twinEmit("decision_recorded", customerId, did, "",
	"decision=" + kind + ";cites=" + joined + ";note=" + note);
updateCaseVisuals(customerId);              // completed <-> in_review by workflow state only
return 1;
