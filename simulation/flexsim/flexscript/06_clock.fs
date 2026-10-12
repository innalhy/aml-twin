// ============================================================================
// TwinAML FlexSim edition - the twin clock and the three phases
//                           (CONTRACT 1.1, 3, 4.7, "End of run")
// ATTACHMENT POINT : Toolbox > User Commands, one block each: twinPhase1,
//                    twinPhase3, twinLeaveMinute, twinNextScheduled, advanceTo,
//                    advanceToNextEvent, advanceByMinutes, advanceClick,
//                    finishRun, onOrderDue, onRequestComplete.
// INPUTS           : run_header, run_orders, run_requests, run_evidence.
// SIDE EFFECTS     : run_header.now / due_checks_pending / ended; everything
//                    twinPhase1 and twinCheckOrder write; events evidence_released,
//                    order_*, clock_advanced (written only by advanceClick, which
//                    advanceToNextEvent and advanceByMinutes route through), run_end;
//                    3D redraw and clock label.
// ADVANCE RULE (CONTRACT 4.7): every learner advance - "to next event", "by work
//                    duration" and a scenario `advance` action - is advanceClick():
//                    target capped at run_until_minute; if target > now, exactly
//                    ONE clock_advanced (detail to_minute=<capped target>) at the
//                    current minute, then the clock moves; if target <= now
//                    (d <= 0, already passed, run ended) nothing is written and
//                    nothing moves. Two clock moves are NOT advances and are
//                    silent: finishRun() (writes run_end only) and replayScenario()
//                    reaching an action's at_minute through advanceTo() directly.
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// ============================================================================
//
// HOW EQUAL-TIMESTAMP ORDERING IS GUARANTEED (CONTRACT 3; policy tie rule
// "an accepted hold is applied before an order's due check")
//
//   The twin clock is run_header.now. FlexSim's event list is NOT used in guided
//   mode: the model stays stopped, so FlexSim never runs anything on its own and
//   Model.time stays 0. All three phases of a minute are executed by FlexScript
//   loops below, in code order, inside one synchronous call chain:
//
//   advanceTo(target):
//     1. twinLeaveMinute()            -> phase 3 of the OLD now (deferred until the
//                                        clock leaves it; guarded by due_checks_pending)
//     2. for each scheduled minute m in (now, target), ascending:
//            now = m; twinPhase1(m); twinPhase3(m)
//     3. now = target; twinPhase1(target); due_checks_pending = 1
//        (phase 3 of target is NOT run: the learner gets phase 2 first)
//
//   Phase 2 is the learner's clicks. A dashboard button's OnPress runs
//   synchronously while the model is stopped, at run_header.now, strictly after
//   phase 1 of now (already run in step 3) and strictly before phase 3 of now
//   (deferred to the next advance or to finishRun). A hold accepted at minute 18
//   is therefore applied before the minute-18 due check, which is exactly
//   example F of the contract. No two FlexSim events ever share a timestamp
//   here because there are no FlexSim events.
//
// HOW EXACTLY-ONCE IS GUARANTEED
//   * due_checks_pending is set to 1 only by advanceTo()/resetRun() and cleared by
//     twinLeaveMinute() after phase 3 ran, so phase 3 of a minute runs once.
//   * twinCheckOrder() refuses any order whose status is not pending (terminal
//     statuses), so even a repeated call is harmless (CONTRACT 4.9).
//   * Requests complete only when status == requested and are set to completed in
//     the same statement block, so one release per accepted request.
//   * The optional free-run mode (11_model_triggers.fs) re-enters through
//     onOrderDue()/onRequestComplete(), which only call advanceTo()/
//     twinLeaveMinute() and therefore inherit both guards. If FlexSim's event
//     list delivered the same due minute twice, the second call finds
//     due_checks_pending == 0 and the order already terminal: no second event.
//
// Documentation support: the mechanism needs no FlexSim scheduling API, only
// that a User Command / OnPress trigger runs to completion before control
// returns to the GUI (synchronous FlexScript), which is how every FlexSim trigger
// behaves (secondary source: Dashboard Widgets page snippet "OnPress trigger that
// fires when they are pressed"; Autodesk Help page could not be opened). Marked
// UNCONFIRMED against the official manual in API-REFERENCES.md.

// ===== USER COMMAND: twinPhase1(num m) -> num ================================
// CONTRACT 3 phase 1: every request with due_minute == m and status requested
// completes, in (customer_id, evidence_id) order = row order of run_evidence
// (verified). Returns the number of records released.
double m = param(1);
Table evr = Table("run_evidence");
Table req = Table("run_requests");
int released = 0;
for (int i = 1; i <= evr.numRows; i++) {
	if (evr[i]["release"] == "on_request") {
		string cust = evr[i]["customer_id"];
		string reqId = evr[i]["request_id"];
		int rr = twinFindRow2("run_requests", "customer_id", cust, "request_id", reqId);
		if (rr > 0 && req[rr]["status"] == "requested"
			&& Math.fabs(twinNum(req[rr]["due_minute"]) - m) < 0.0000001) {
			req[rr]["status"] = "completed";
			evr[i]["available_from_minute"] = m;
			string evId = evr[i]["evidence_id"];
			string title = evr[i]["title"];      // learner-visible from this event on
			twinEmit("evidence_released", cust, evId, "", "request_id=" + reqId + ";title=" + title);
			released++;
			updateCaseVisuals(cust);
		}
	}
}
return released;

// ===== USER COMMAND: twinPhase3(num m) -> num ================================
// CONTRACT 3 phase 3: every order with due_minute == m and status pending, in
// (due_minute, from_account, transaction_id) order = row order of run_orders
// (verified: TX-2 before TX-L-2, SYN-A001 before SYN-A002).
double m = param(1);
Table ord = Table("run_orders");
int checked = 0;
for (int i = 1; i <= ord.numRows; i++) {
	if (ord[i]["status"] == "pending"
		&& Math.fabs(twinNum(ord[i]["due_minute"]) - m) < 0.0000001) {
		string txId = ord[i]["transaction_id"];
		twinCheckOrder(txId, "due");         // payment timing: only this scheduled minute
		checked++;
	}
}
return checked;

// ===== USER COMMAND: twinLeaveMinute() -> num ================================
// Run the deferred phase 3 of the current minute exactly once (CONTRACT 1.1).
Table hdr = Table("run_header");
if (twinNum(hdr[1]["due_checks_pending"]) == 1) {
	twinPhase3(twinNow());
	hdr[1]["due_checks_pending"] = 0;
	return 1;
}
return 0;

// ===== USER COMMAND: twinNextScheduled() -> num ==============================
// Smallest scheduled minute strictly greater than now among pending request
// completions and due minutes of still-pending orders; -1 when none.
double now = twinNow();
double best = -1;
Table req = Table("run_requests");
for (int i = 1; i <= req.numRows; i++) {
	if (req[i]["status"] == "requested") {
		double d = twinNum(req[i]["due_minute"]);
		if (d > now && (best < 0 || d < best)) { best = d; }
	}
}
Table ord = Table("run_orders");
for (int i = 1; i <= ord.numRows; i++) {
	if (ord[i]["status"] == "pending") {
		double d = twinNum(ord[i]["due_minute"]);
		if (d > now && (best < 0 || d < best)) { best = d; }
	}
}
return best;

// ===== USER COMMAND: advanceTo(num target) -> num ============================
// CONTRACT 1.1 / 4.7 / 4.9. Processes (now, target] and leaves the clock paused
// at target with phase 3 of target deferred. No event of its own: this is the
// silent clock move used by finishRun() and by replayScenario() to reach an
// action's at_minute (engine.py proceed_to). Learner advances never call it
// directly; they go through advanceClick(). Returns the new now.
double target = param(1);
Table hdr = Table("run_header");
double runUntil = twinNum(hdr[1]["run_until_minute"]);
if (target > runUntil) {
	target = runUntil;                      // capped at run_until_minute
}
double now = twinNow();
if (target <= now || twinNum(hdr[1]["ended"]) == 1) {
	return now;                             // clock never moves backward; nothing after run_end
}
twinLeaveMinute();                          // phase 3 of the minute we are leaving
double m = twinNextScheduled();
while (m >= 0 && m < target) {
	hdr[1]["now"] = m;
	twinPhase1(m);
	twinPhase3(m);
	m = twinNextScheduled();                // recomputed from state: completed requests and
}                                           // executed orders drop out, held orders are not > now
hdr[1]["now"] = target;
twinPhase1(target);                         // evidence due at target is visible on arrival
hdr[1]["due_checks_pending"] = 1;           // due checks of target wait for the next move
updateCaseVisuals("");
return target;

// ===== USER COMMAND: advanceToNextEvent() -> num =============================
// Guided control "Advance to next event" (CONTRACT 1.1): target = the smallest
// scheduled minute > now, else run_until_minute. Routed through advanceClick(),
// so it writes exactly one clock_advanced when the target is ahead of the clock
// (engine.py advance_to_next_event).
double m = twinNextScheduled();
if (m < 0) {
	m = twinNum(Table("run_header")[1]["run_until_minute"]);
}
return advanceClick(m);

// ===== USER COMMAND: advanceByMinutes(num n) -> num ==========================
// Guided control "Advance by work duration": target = now + n (default 6 in the
// UI). Routed through advanceClick(): n <= 0 gives target <= now, which is
// ignored without any event (CONTRACT 4.9; engine.py advance_by).
double n = param(1);
return advanceClick(twinNow() + n);

// ===== USER COMMAND: advanceClick(num target) -> num =========================
// The one advance action of CONTRACT 4.7 (engine.py _advance). Used by the two
// guided controls above and by the scenario `advance` action in replayScenario().
//   1. target = min(target, run_until_minute)   (the CAPPED value is what is logged)
//   2. target <= now, or the run has ended: ignored, no event, no state change (4.9)
//   3. else write clock_advanced (detail to_minute=<capped target>) at the CURRENT
//      minute as phase 2, then advanceTo(target).
// In the golden trace advance_log_only, clock_advanced at 18 precedes order_held
// at 18 because the due checks of 18 run inside advanceTo() -> twinLeaveMinute().
double target = param(1);
Table hdr = Table("run_header");
double runUntil = twinNum(hdr[1]["run_until_minute"]);
if (target > runUntil) {
	target = runUntil;
}
if (target <= twinNow() || twinNum(hdr[1]["ended"]) == 1) {
	return twinNow();
}
twinEmit("clock_advanced", "", "", "", "to_minute=" + twinFmtMinute(target));
return advanceTo(target);

// ===== USER COMMAND: finishRun() -> num ======================================
// "Finish and debrief": run to run_until_minute, run the due checks scheduled
// there (the run ends there, CONTRACT 1.1), write run_end. Idempotent. Ending is
// not an advance: the move uses advanceTo() directly and writes no clock_advanced
// (CONTRACT 4.7; engine.py end).
Table hdr = Table("run_header");
if (twinNum(hdr[1]["ended"]) == 1) {
	return twinNow();
}
advanceTo(twinNum(hdr[1]["run_until_minute"]));
twinLeaveMinute();
hdr[1]["ended"] = 1;
twinEmit("run_end", "", "", "", "final_minute=" + twinFmtMinute(twinNow()));
updateCaseVisuals("");
return twinNow();

// ===== USER COMMAND: onOrderDue(str txId) -> num =============================
// Entry point for a scheduled FlexSim event at an order's due minute (free-run
// mode only, 11_model_triggers.fs; guided mode never needs it). It does not
// check the order itself: it brings the twin clock to the due minute and runs
// the deferred phase 3 of that minute, which checks every order due then in
// contract order. Guards: status must still be pending; due_checks_pending and
// the terminal statuses make a duplicate delivery a no-op.
string txId = param(1);
Table ord = Table("run_orders");
int r = twinFindRow("run_orders", "transaction_id", txId);
if (r == 0 || ord[r]["status"] != "pending") {
	return 0;
}
double due = twinNum(ord[r]["due_minute"]);
if (due > twinNow()) {
	advanceTo(due);                         // phases of every earlier scheduled minute, phase 1 of due
}
if (Math.fabs(twinNow() - due) < 0.0000001) {
	twinLeaveMinute();                      // phase 3 of due, once
}
return 1;

// ===== USER COMMAND: onRequestComplete(str requestKey) -> num ================
// Entry point for a scheduled FlexSim event at a request's due minute (free-run
// mode only). requestKey = "<customer_id>|<request_id>". Completion happens in
// twinPhase1(due) inside advanceTo(), in contract order with any other request
// due at the same minute. Guard: status must be requested.
string requestKey = param(1);
Array parts = requestKey.split("|");
if (parts.length < 2) {
	return 0;
}
string cust = parts[1];
string reqId = parts[2];
Table req = Table("run_requests");
int rr = twinFindRow2("run_requests", "customer_id", cust, "request_id", reqId);
if (rr == 0 || req[rr]["status"] != "requested") {
	return 0;
}
double due = twinNum(req[rr]["due_minute"]);
if (due > twinNow()) {
	advanceTo(due);
}
return 1;
