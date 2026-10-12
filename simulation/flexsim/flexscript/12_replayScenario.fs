// ============================================================================
// TwinAML FlexSim edition - replayScenario()   (CONTRACT 6 replay)
// ATTACHMENT POINT : Toolbox > User Commands > replayScenario() -> str.
//                    Run from the Script Console or a "Replay scenario" button
//                    after importing one flattened scenario CSV into the Global
//                    Table scenario_actions (see flatten_scenario.py in this
//                    folder for the CSV flattening the contract leaves to us).
// INPUTS           : Global Table scenario_actions, columns:
//                    scenario_id, run_until_minute, at_minute, customer_id,
//                    action, p1, p2, p3   (rows already stable-sorted by at_minute
//                    by flatten_scenario.py; the FlexScript applies them in row order)
//                    action: hold(p1=reason) | release(p1=note) |
//                            request(p1=request_id) |
//                            decide(p1=decision, p2=evidence_ids "a|b", p3=note) |
//                            advance(p1=to_minute) | none (empty scenario marker)
// SIDE EFFECTS     : resetRun(); every action's effects; finishRun();
//                    exportEvents() to <model folder>\<scenario_id>.events.csv.
//                    Overwrites ui_inputs.scenario_id and run_until_minute.
//                    A refused scenario (see RETURN) changes nothing before
//                    reset, or stops mid-run without finishRun()/export.
// RETURN           : the exported file path, or an error string starting with
//                    "refused:" (CONTRACT 6; mirrors reference scenario.py):
//                    - a hold/release/request/decide row whose customer_id is
//                      not a known customer (twinKnownCustomer == 0), named by
//                      row number, checked for every row BEFORE resetRun();
//                    - an action whose at_minute is already behind the clock
//                      (an earlier `advance` jumped past it), detected when the
//                      row is reached, like ScenarioError in run_scenario().
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// ============================================================================
//
// Same machinery as guided mode with the clicks pre-recorded (CONTRACT 1.1):
// for each action, advanceTo(at_minute) if the clock is behind (the runner's own
// silent move: phases of every scheduled minute on the way, phase 3 of at_minute
// deferred, no clock_advanced; CONTRACT 4.7), then the action as phase 2 in row
// order, then finishRun(). The `advance` action is a pre-recorded click:
// advanceClick() writes clock_advanced (capped target) and moves the clock, the
// same rows a learner's button produces. This reproduces
// reference/traces/*.events.csv byte-for-byte after whitespace trimming when the
// FlexScript is correct; diff with reference/compare_trace.py.
//
// flatten_scenario.py already refuses the two malformed shapes below on the Mac;
// the checks are repeated here so a hand-edited scenario_actions table cannot
// replay something the reference runner would refuse.

// ===== USER COMMAND: replayScenario() -> str =================================
Table sc = Table("scenario_actions");
Table ui = Table("ui_inputs");
if (sc.numRows < 1) {
	return "scenario_actions is empty";
}
// Validation before replay (CONTRACT 6 customer_id rule; scenario.py load_scenario).
for (int i = 1; i <= sc.numRows; i++) {
	string action = twinText(sc[i]["action"]);
	if (action == "hold" || action == "release" || action == "request" || action == "decide") {
		string cust = twinText(sc[i]["customer_id"]);
		if (twinKnownCustomer(cust) == 0) {
			return "refused: scenario_actions row " + twinIntText(i) + " (" + action
				+ " at minute " + twinFmtMinute(twinNum(sc[i]["at_minute"]))
				+ ") names unknown customer_id \"" + cust
				+ "\" (not in customers.csv with an internal account); nothing was run";
		}
	}
}
ui[1]["scenario_id"] = twinText(sc[1]["scenario_id"]);
ui[1]["run_until_minute"] = twinNum(sc[1]["run_until_minute"]);
resetRun();
for (int i = 1; i <= sc.numRows; i++) {
	string action = twinText(sc[i]["action"]);
	if (action != "none" && action != "") {
		double at = twinNum(sc[i]["at_minute"]);
		if (at < twinNow() - 0.0000001) {   // scenario.py run_scenario: ScenarioError, run abandoned
			return "refused: scenario_actions row " + twinIntText(i) + " (" + action
				+ ") is stamped at_minute " + twinFmtMinute(at) + " but the clock already reached "
				+ twinFmtMinute(twinNow()) + " (an earlier advance jumped past it); run abandoned, nothing exported";
		}
		if (at > twinNow()) {
			advanceTo(at);                  // the runner advances on its own, silently (CONTRACT 4.7)
		}
		string cust = twinText(sc[i]["customer_id"]);
		string p1 = twinText(sc[i]["p1"]);
		string p2 = twinText(sc[i]["p2"]);
		string p3 = twinText(sc[i]["p3"]);
		if (action == "hold") { placeHold(cust, p1); }
		else if (action == "release") { releaseHold(cust, p1); }
		else if (action == "request") { requestCheck(cust, p1); }
		else if (action == "decide") { recordDecision(cust, p1, p2, p3); }
		else if (action == "advance") { advanceClick(twinNum(sc[i]["p1"])); }   // pre-recorded click: one clock_advanced if ahead
	}
}
finishRun();
return exportEvents("");
