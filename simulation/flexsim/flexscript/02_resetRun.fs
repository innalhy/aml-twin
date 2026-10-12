// ============================================================================
// TwinAML FlexSim edition - resetRun()   (CONTRACT 4.8, data/README.md "Reset")
// ATTACHMENT POINT : Toolbox > User Commands > resetRun (no parameters, return
//                    type num). Called by the "Reset run" dashboard button and by
//                    Toolbox > Model Triggers > OnModelReset (11_model_triggers.fs)
//                    so FlexSim's own Reset button is equivalent.
// INPUTS           : snapshot Global Tables (initial_state, due_events,
//                    request_catalog, evidence_catalog, customers, alerts);
//                    ui_inputs[1]["scenario_id"] (default "guided") and
//                    ui_inputs[1]["run_until_minute"] (default 30).
// SIDE EFFECTS     : Rebuilds run_header, run_accounts, run_orders, run_requests,
//                    run_evidence, run_decisions, run_events; writes run_start
//                    (seq 1, minute 0); redraws the 3D board. Never writes a
//                    snapshot table.
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// ============================================================================
//
// Column lists of the run tables (create them in Toolbox > Global Tables with
// exactly these headers, one row, before the first reset; see ASSEMBLY.md):
//   run_header   : scenario_id, pack_id, contract_version, now, next_seq,
//                  next_decision_number, run_until_minute, due_checks_pending, ended
//   run_accounts : account_id, customer_id, balance, account_status, held,
//                  hold_reason, hold_since_minute
//   run_orders   : transaction_id, customer_id, from_account, to_account, amount,
//                  due_minute, status, executed_minute, overdue
//   run_requests : customer_id, request_id, evidence_id, service_minutes,
//                  prerequisite_evidence_id, requested_minute, due_minute, status
//                  (one row per request_catalog pair; status "" = never requested,
//                  which is how this edition represents "accepted requests only")
//   run_evidence : evidence_id, customer_id, release, request_id, title,
//                  available_from_minute
//   run_decisions: decision_id, minute, customer_id, decision, evidence_ids, note
//   run_events   : seq, sim_minute, customer_id, account_id, event_type, ref_id,
//                  amount, balance_after, detail

// ===== USER COMMAND: resetRun() -> num =======================================
Table hdr = Table("run_header");
Table ui = Table("ui_inputs");

// --- 2.7 run header ----------------------------------------------------------
string scenarioId = twinText(ui[1]["scenario_id"]);
if (scenarioId == "") {
	scenarioId = "guided";
}
double runUntil = twinNum(ui[1]["run_until_minute"]);
if (runUntil <= 0) {
	runUntil = 30;                          // CONTRACT 1: default end of run
}
hdr[1]["scenario_id"] = scenarioId;
hdr[1]["pack_id"] = "analyst-session-001";
hdr[1]["contract_version"] = "1.0";
hdr[1]["now"] = 0;
hdr[1]["next_seq"] = 1;
hdr[1]["next_decision_number"] = 1;
hdr[1]["run_until_minute"] = runUntil;
hdr[1]["due_checks_pending"] = 1;           // phase 3 of minute 0 not yet run (CONTRACT 1.1)
hdr[1]["ended"] = 0;

// --- 2.1 run_accounts <- initial_state ---------------------------------------
Table src = Table("initial_state");
Table acc = Table("run_accounts");
twinKeepFirstRow("run_accounts");
for (int i = 1; i <= src.numRows; i++) {
	if (i > 1) { acc.addRow(); }
	acc[i]["account_id"] = twinText(src[i]["account_id"]);
	acc[i]["customer_id"] = twinText(src[i]["customer_id"]);
	acc[i]["balance"] = twinNum(src[i]["snapshot_balance"]);   // 480000 / 480000 / 70977 / ...
	acc[i]["account_status"] = "open";
	acc[i]["held"] = 0;
	acc[i]["hold_reason"] = "";
	acc[i]["hold_since_minute"] = -1;
}

// --- 2.2 run_orders <- due_events (row order = phase 3 order) ----------------
src = Table("due_events");
Table ord = Table("run_orders");
twinKeepFirstRow("run_orders");
for (int i = 1; i <= src.numRows; i++) {
	if (i > 1) { ord.addRow(); }
	ord[i]["transaction_id"] = twinText(src[i]["transaction_id"]);
	ord[i]["customer_id"] = twinText(src[i]["customer_id"]);
	ord[i]["from_account"] = twinText(src[i]["from_account"]);
	ord[i]["to_account"] = twinText(src[i]["to_account"]);
	ord[i]["amount"] = twinNum(src[i]["amount"]);
	ord[i]["due_minute"] = twinNum(src[i]["due_minute"]);     // 18 or 23: the only payment timing source
	ord[i]["status"] = "pending";
	ord[i]["executed_minute"] = -1;
	ord[i]["overdue"] = 0;
}

// --- 2.3 run_requests <- request_catalog (+ the record each pair releases) --
src = Table("request_catalog");
Table evc = Table("evidence_catalog");
Table req = Table("run_requests");
twinKeepFirstRow("run_requests");
for (int i = 1; i <= src.numRows; i++) {
	if (i > 1) { req.addRow(); }
	string cust = twinText(src[i]["customer_id"]);
	string reqId = twinText(src[i]["request_id"]);
	req[i]["customer_id"] = cust;
	req[i]["request_id"] = reqId;
	// Engine-side field (CONTRACT 2.3): never bound to a learner widget.
	string evId = "";
	for (int e = 1; e <= evc.numRows; e++) {
		if (twinText(evc[e]["release"]) == "on_request"
			&& twinText(evc[e]["customer_id"]) == cust
			&& twinText(evc[e]["request_id"]) == reqId) {
			evId = twinText(evc[e]["evidence_id"]);
		}
	}
	req[i]["evidence_id"] = evId;
	req[i]["service_minutes"] = twinNum(src[i]["service_minutes"]);
	req[i]["prerequisite_evidence_id"] = twinText(src[i]["prerequisite_evidence_id"]);
	req[i]["requested_minute"] = -1;
	req[i]["due_minute"] = -1;
	req[i]["status"] = "";                  // "" -> requested -> completed
}

// --- 2.4 run_evidence <- evidence_catalog (row order = phase 1 order) --------
Table evr = Table("run_evidence");
twinKeepFirstRow("run_evidence");
for (int i = 1; i <= evc.numRows; i++) {
	if (i > 1) { evr.addRow(); }
	string rel = twinText(evc[i]["release"]);
	evr[i]["evidence_id"] = twinText(evc[i]["evidence_id"]);
	evr[i]["customer_id"] = twinText(evc[i]["customer_id"]);
	evr[i]["release"] = rel;
	evr[i]["request_id"] = twinText(evc[i]["request_id"]);
	evr[i]["title"] = twinText(evc[i]["title"]);     // shown only once visible (learner UI filters on available_from_minute)
	if (rel == "initial") {
		evr[i]["available_from_minute"] = 0;
	} else {
		evr[i]["available_from_minute"] = -1;        // not available
	}
}

// --- 2.5 run_decisions: empty (blank placeholder row) ------------------------
Table dec = Table("run_decisions");
twinKeepFirstRow("run_decisions");
dec[1]["decision_id"] = "";
dec[1]["minute"] = -1;
dec[1]["customer_id"] = "";
dec[1]["decision"] = "";
dec[1]["evidence_ids"] = "";
dec[1]["note"] = "";

// --- 2.6 run_events: empty, then run_start as seq 1 --------------------------
Table ev = Table("run_events");
twinKeepFirstRow("run_events");
ev[1]["seq"] = 0;
ev[1]["sim_minute"] = 0;
ev[1]["customer_id"] = "";
ev[1]["account_id"] = "";
ev[1]["event_type"] = "";                   // blank marker reused by twinAppendRow
ev[1]["ref_id"] = "";
ev[1]["amount"] = "";
ev[1]["balance_after"] = "";
ev[1]["detail"] = "";
twinEmit("run_start", "", "", "", "scenario_id=" + scenarioId + ";pack=analyst-session-001;contract=1.0");

// --- 3D board: every token back to Q_Incoming, colour "new" ------------------
updateCaseVisuals("");
return 1;
