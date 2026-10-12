// ============================================================================
// TwinAML FlexSim edition - requestCheck(customerId, requestId)  (CONTRACT 4.5)
// ATTACHMENT POINT : Toolbox > User Commands > requestCheck(str customerId,
//                    str requestId) -> num. Called from the "Request check"
//                    dashboard button (10_ui_buttons.fs) while the model is
//                    stopped (phase 2), and from replayScenario().
// INPUTS           : run_requests (one row per catalog pair), run_evidence,
//                    run_header.now.
// SIDE EFFECTS     : run_requests.requested_minute/due_minute/status; events
//                    request_accepted or request_rejected, or action_rejected
//                    for an unknown customer (CONTRACT 4); 3D redraw.
//                    Completion itself happens in twinPhase1() (06_clock.fs) at
//                    due_minute = now + service_minutes; nothing here schedules
//                    a FlexSim event. Evidence timing comes only from that
//                    stored due_minute.
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// ============================================================================
// Returns 1 accepted, 0 rejected (request_rejected written), -1 unknown customer
// (action_rejected reason=unknown_customer written, nothing else happens).

// ===== USER COMMAND: requestCheck(str customerId, str requestId) -> num ======
string customerId = param(1);
string requestId = param(2);
if (twinRejectUnknown("request", customerId) == 1) {   // CONTRACT 4: checked BEFORE 4.5's list
	return -1;
}
Table req = Table("run_requests");
int rr = twinFindRow2("run_requests", "customer_id", customerId, "request_id", requestId);
if (rr == 0) {                              // 1. KNOWN customer, pair not in request_catalog:
	// unknown_request. This covers every background customer (SYN-003 .. SYN-006
	// have no catalog rows), e.g. golden trace rejections.events.csv row 2.
	twinEmit("request_rejected", customerId, requestId, "", "reason=unknown_request");
	return 0;
}
if (req[rr]["status"] != "") {              // 2. already requested or completed
	twinEmit("request_rejected", customerId, requestId, "", "reason=duplicate");
	return 0;
}
string prereq = req[rr]["prerequisite_evidence_id"];
if (prereq != "" && twinIsVisible(prereq) == 0) {   // 3. prerequisite not learner-visible now
	twinEmit("request_rejected", customerId, requestId, "", "reason=prerequisite_missing:" + prereq);
	return 0;
}
double now = twinNow();
double due = now + twinNum(req[rr]["service_minutes"]);
req[rr]["requested_minute"] = now;
req[rr]["due_minute"] = due;                // the scheduled completion minute (phase 1 of `due`)
req[rr]["status"] = "requested";
// The acceptance event does not name the evidence record (CONTRACT 4.5).
twinEmit("request_accepted", customerId, requestId, "", "due_minute=" + twinFmtMinute(due));
updateCaseVisuals(customerId);
return 1;
