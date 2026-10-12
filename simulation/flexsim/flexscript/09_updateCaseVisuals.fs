// ============================================================================
// TwinAML FlexSim edition - updateCaseVisuals(customerId)  (model-design/3d-layout.md)
// ATTACHMENT POINT : Toolbox > User Commands: twinWorkflowState(str customerId)
//                    -> str, twinSetText(str objName, str text) -> num,
//                    updateCaseVisuals(str customerId) -> num. Called after every
//                    state change by the other commands; "" redraws everything.
// INPUTS           : alerts (snapshot), run_decisions, run_requests, run_events,
//                    run_accounts, run_orders, run_header, ui_inputs.current_alert_id;
//                    3D objects Q_Incoming, Q_Review, Q_AwaitingEvidence,
//                    Q_Completion, Token_AL-00n, Label_Hold_AL-00n, Label_Clock.
// SIDE EFFECTS     : 3D: token location, token colour, token labels (alert_id,
//                    customer_id, account_id, workflow_state, caption), text of
//                    the hold and clock labels. Tables: only the two UI text
//                    cells ui_inputs.visible_evidence / request_status (display
//                    copies). No run_* table is written.
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// ============================================================================
//
// DIFFERENCES FROM model-design/3d-layout.md (deliberate, display only):
//   * Separator. The design writes "AL-001 · SYN-001 · balance 480000 · 2 pending"
//     and "minute 18 · 11:30Z · paused" with a middle dot. This code uses " | "
//     (ASCII) in the caption label and the clock label, and prints the full
//     "HH:MM:SSZ" wall clock ("minute 18 | 11:30:00Z | paused") because
//     twinWallClock() already produces it. The design document is left as is.
//   * in_review is narrower than the design's wording "at least one event":
//     only LEARNER-ACTION events count (hold_placed, hold_rejected,
//     hold_released, release_rejected, request_accepted, request_rejected,
//     decision_recorded, decision_rejected) or the current selection. System
//     events (order_executed / order_held / order_failed, evidence_released)
//     never move a token out of Q_Incoming: a payment executing on an untouched
//     case is not analyst work. Run-level events have no customer anyway.
//
// The 3D view is a status board. It owns no state: everything drawn is a
// function of the run tables (themselves derived from events). Moving a token
// is a redraw (setLocation), not a flow-item transfer: the Queues have no ports,
// nothing travels, no processing time exists, and NO payment or evidence timing
// depends on anything in this file (3d-layout.md). Colour is a function of
// WORKFLOW STATE ONLY (new / in_review / awaiting_evidence / completed). Hold
// status is text above the token, never a colour, and no label or colour ever
// reflects the hidden classification of a case.
//
// Tokens are built-in Box shapes (Library > Visual > Shape, or any 3D object)
// named Token_AL-001 ... placed by hand once (ASSEMBLY.md); this code only moves
// and recolours them. Slot k inside a queue follows alerts.csv row order among
// the tokens currently in that queue: (qx + 0.5 + 1.2*k, qy + 1.5, qz + 0.1).

// ===== USER COMMAND: twinWorkflowState(str customerId) -> str ================
// 3d-layout.md table "Workflow state -> location", first match wins.
string customerId = param(1);
// completed: latest accepted decision is closure or escalation
Table dec = Table("run_decisions");
string latest = "";
for (int i = 1; i <= dec.numRows; i++) {
	if (dec[i]["decision_id"] != "" && dec[i]["customer_id"] == customerId) {
		latest = dec[i]["decision"];       // rows are in acceptance order; last wins
	}
}
if (latest == "closure" || latest == "escalation") {
	return "completed";
}
// awaiting_evidence: any request still requested
Table req = Table("run_requests");
for (int i = 1; i <= req.numRows; i++) {
	if (req[i]["customer_id"] == customerId && req[i]["status"] == "requested") {
		return "awaiting_evidence";
	}
}
// in_review: any LEARNER-ACTION event for the customer (accepted or rejected),
// or the current selection. order_* and evidence_released are system events and
// do not count (see the header).
Table ev = Table("run_events");
for (int i = 1; i <= ev.numRows; i++) {
	if (ev[i]["customer_id"] == customerId) {
		string type = ev[i]["event_type"];
		if (type == "hold_placed" || type == "hold_rejected"
			|| type == "hold_released" || type == "release_rejected"
			|| type == "request_accepted" || type == "request_rejected"
			|| type == "decision_recorded" || type == "decision_rejected") {
			return "in_review";
		}
	}
}
if (twinCurrentCustomer() == customerId) {
	return "in_review";
}
return "new";

// ===== USER COMMAND: twinSetText(str objName, str text) -> num ===============
// Set the text of a Text visual object by name; silently does nothing when the
// object is absent so the engine never depends on the 3D build.
string objName = param(1);
string text = param(2);
Object o = Model.find(objName);             // Model.find (secondary source)
if (!o) {                                   // [U] treenode truthiness; fallback: if (!objectexists(o))
	return 0;
}
o.setProperty("Text", text);                // [U] Object.setProperty("Text", ...)
// Fallback for versions without setProperty: getvarnode(o, "text").value = text;
return 1;

// ===== USER COMMAND: updateCaseVisuals(str customerId) -> num ================
// Redraw every token (slots depend on all tokens in a queue) and the clock label.
// The customerId parameter documents which case changed; "" = full redraw.
string changed = param(1);
Table al = Table("alerts");
Table acc = Table("run_accounts");
Table hdr = Table("run_header");
Array slotCount = [0, 0, 0, 0];             // tokens placed so far per queue (1..4)
Array queueNames = ["Q_Incoming", "Q_Review", "Q_AwaitingEvidence", "Q_Completion"];
for (int i = 1; i <= al.numRows; i++) {     // alerts.csv order = AL-001 .. AL-006
	string alertId = twinText(al[i]["alert_id"]);
	string cust = twinText(al[i]["customer_id"]);
	string state = twinWorkflowState(cust);
	int qi = 1;
	if (state == "in_review") { qi = 2; }
	else if (state == "awaiting_evidence") { qi = 3; }
	else if (state == "completed") { qi = 4; }
	Object q = Model.find(queueNames[qi]);
	Object tok = Model.find("Token_" + alertId);
	if (q && tok) {                         // [U] treenode truthiness
		int k = slotCount[qi];
		slotCount[qi] = k + 1;
		Vec3 ql = q.location;               // Object.location (secondary source); Vec3 members [U]
		tok.setLocation(ql.x + 0.5 + 1.2 * k, ql.y + 1.5, ql.z + 0.1);   // Object.setLocation (secondary source)
		// Colour by workflow state only (3d-layout.md); Color statics (secondary source)
		if (state == "new") { tok.color = Color.gray; }                 // fallback Color(0.60, 0.60, 0.60)
		else if (state == "in_review") { tok.color = Color.blue; }      // fallback Color(0.20, 0.45, 0.85)
		else if (state == "awaiting_evidence") { tok.color = Color.yellow; }   // fallback Color(0.95, 0.80, 0.20)
		else { tok.color = Color.green; }                               // fallback Color(0.25, 0.65, 0.35)
		// Display copies, not state (3d-layout.md "Token labels"): the five labels
		// of the design. The caption shows balance and order counts (learner-visible
		// run state); it never counts unreleased evidence.
		string acctId = twinAccountOf(cust);
		int ar = twinFindRow("run_accounts", "account_id", acctId);
		int nPending = 0;
		int nExecuted = 0;
		int nFailed = 0;
		Table ord = Table("run_orders");
		for (int o = 1; o <= ord.numRows; o++) {
			if (ord[o]["from_account"] == acctId) {
				string st = ord[o]["status"];
				if (st == "pending") { nPending++; }
				else if (st == "executed") { nExecuted++; }
				else if (st == "failed_insufficient") { nFailed++; }
			}
		}
		string caption = alertId + " | " + cust;
		if (ar > 0) { caption = caption + " | balance " + twinIntText(twinNum(acc[ar]["balance"])); }
		caption = caption + " | " + twinIntText(nPending) + " pending";
		if (nExecuted > 0) { caption = caption + ", " + twinIntText(nExecuted) + " executed"; }
		if (nFailed > 0) { caption = caption + ", " + twinIntText(nFailed) + " failed"; }
		tok.labels.assert("alert_id").value = alertId;                  // [U] labels.assert(name).value
		tok.labels.assert("customer_id").value = cust;
		tok.labels.assert("account_id").value = acctId;
		tok.labels.assert("workflow_state").value = state;
		tok.labels.assert("caption").value = caption;
		// Hold label: text only, never colour
		string holdText = "";
		if (ar > 0 && twinNum(acc[ar]["held"]) == 1) {
			holdText = "HOLD since " + twinFmtMinute(twinNum(acc[ar]["hold_since_minute"]));
		}
		Object lbl = Model.find("Label_Hold_" + alertId);
		if (lbl) {
			lbl.setLocation(ql.x + 0.5 + 1.2 * k, ql.y + 1.5, ql.z + 1.1);
			twinSetText("Label_Hold_" + alertId, holdText);
		}
	}
}
// Learner-safe text panels for the current case (dashboard text widgets linked
// to these two ui_inputs cells; see 00_helpers.fs for what they may show).
string current = twinCurrentCustomer();
Table("ui_inputs")[1]["visible_evidence"] = twinVisibleEvidenceText(current);
Table("ui_inputs")[1]["request_status"] = twinRequestStatusText(current);
// Clock label: "minute 18 | 11:30:00Z | paused" (format differs from the design
// document's "minute 18 · 11:30Z · paused"; see the header)
double now = twinNow();
string status = "paused";
if (twinNum(hdr[1]["ended"]) == 1) { status = "ended"; }
twinSetText("Label_Clock", "minute " + twinFmtMinute(now) + " | " + twinWallClock(now) + " | " + status);
return 1;
