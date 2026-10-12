// ============================================================================
// TwinAML FlexSim edition - dashboard control bodies (learner-flow.md section 3)
// ATTACHMENT POINT : Dashboard > Model Input > Button widgets. Each block below
//                    is the OnPress trigger code of ONE button (Properties >
//                    Triggers > OnPress > custom code). Text inputs are Model
//                    Input "Edit" widgets linked (eye-dropper) to cells of the
//                    Global Table ui_inputs; the buttons read those cells.
// INPUTS           : Global Table ui_inputs, one row, columns:
//                    scenario_id, run_until_minute, tables_dir, current_alert_id,
//                    hold_reason, release_note, request_id, decision,
//                    evidence_ids, note, advance_minutes, export_path, message,
//                    visible_evidence, request_status, debrief_text
//                    (the last three are display cells written by
//                    updateCaseVisuals / exportDebrief and shown by text widgets;
//                    no button reads them).
// SIDE EFFECTS     : as the called User Command; plus ui_inputs.message, a
//                    one-line status shown by a text widget linked to that cell.
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// ============================================================================
//
// Every click runs while the model is STOPPED (guided mode). The click is phase
// 2 of run_header.now by construction (06_clock.fs). Nothing here touches
// Model.time or the run button. Selection (current case) writes no event.
//
// Return codes of placeHold / releaseHold / requestCheck / recordDecision:
// 1 accepted, 0 rejected (the specific *_rejected event names the reason),
// -1 unknown customer: the engine wrote action_rejected reason=unknown_customer
// (CONTRACT 4). From the dashboard this happens when no case is selected
// (twinCurrentCustomer() returns "") or current_alert_id names no alert; the
// engine, not the button, decides, so the trace shows the malformed click.
//
// Widget notes (secondary source: Dashboard Widgets page snippet): buttons have
// OnPress; edit fields linked to a table cell show and write that cell (OnApply
// on Enter / focus loss); a combo box's values "must be numeric", so the current
// case and the decision kind are typed as text or chosen by radio buttons mapped
// in code (see ASSEMBLY.md step 6 for each widget).

// ===== BUTTON "Import tables" (build-time only) =============================
importTables();
Table("ui_inputs")[1]["message"] = "Snapshot tables imported.";

// ===== BUTTON "Reset run" ====================================================
resetRun();
Table("ui_inputs")[1]["message"] = "New run at minute 0 (" + twinText(Table("run_header")[1]["scenario_id"]) + ").";

// ===== BUTTON "Place outbound hold" ==========================================
Table ui = Table("ui_inputs");
string cust = twinCurrentCustomer();
string reason = twinText(ui[1]["hold_reason"]);
int rc = placeHold(cust, reason);
if (rc == 1) { ui[1]["message"] = "Hold placed at minute " + twinFmtMinute(twinNow()) + "."; }
else if (rc == 0) { ui[1]["message"] = "Already held (hold_rejected)."; }
else { ui[1]["message"] = "Unknown or unselected customer \"" + cust + "\": action_rejected logged (reason=unknown_customer). Select a case first."; }

// ===== BUTTON "Release hold" =================================================
Table ui = Table("ui_inputs");
string cust = twinCurrentCustomer();
string note = twinText(ui[1]["release_note"]);
int rc = releaseHold(cust, note);
if (rc == 1) { ui[1]["message"] = "Hold released; overdue orders re-checked."; }
else if (rc == 0) { ui[1]["message"] = "No hold in place (release_rejected)."; }
else { ui[1]["message"] = "Unknown or unselected customer \"" + cust + "\": action_rejected logged (reason=unknown_customer). Select a case first."; }

// ===== BUTTON "Request check" ================================================
// request_id typed or picked from the request panel; the six ids are in
// request_catalog.csv (learner-visible).
Table ui = Table("ui_inputs");
string cust = twinCurrentCustomer();
string reqId = twinText(ui[1]["request_id"]);
int rc = requestCheck(cust, reqId);
if (rc == 1) { ui[1]["message"] = "Request accepted."; }
else if (rc == 0) { ui[1]["message"] = "Request rejected; see the history panel for the reason."; }
else { ui[1]["message"] = "Unknown or unselected customer \"" + cust + "\": action_rejected logged (reason=unknown_customer). Select a case first."; }

// ===== BUTTON "Record decision" ==============================================
// decision: "closure" | "continue_review" | "escalation" (radio buttons linked to
// a numeric cell can be mapped: 1/2/3 -> text, see ASSEMBLY.md).
// evidence_ids: pipe-separated IDs taken from the visible evidence panel only.
Table ui = Table("ui_inputs");
string cust = twinCurrentCustomer();
string kind = twinText(ui[1]["decision"]);
Variant kv = ui[1]["decision"];
if (kv.type == VariantType.Number) {        // [U] radio-button numeric mapping
	if (kv == 1) { kind = "closure"; }
	else if (kv == 2) { kind = "continue_review"; }
	else if (kv == 3) { kind = "escalation"; }
}
string cites = twinText(ui[1]["evidence_ids"]);
string note = twinText(ui[1]["note"]);
int rc = recordDecision(cust, kind, cites, note);
if (rc == 1) { ui[1]["message"] = "Decision recorded. Reminder: a decision never holds or releases."; }
else if (rc == 0) { ui[1]["message"] = "Decision rejected; see the history panel for the reason."; }
else { ui[1]["message"] = "Unknown or unselected customer \"" + cust + "\": action_rejected logged (reason=unknown_customer). Select a case first."; }

// ===== BUTTON "Advance to next event" ========================================
// Both advance buttons are the same CONTRACT 4.7 action (06_clock.fs): the
// command caps the target at run_until_minute, writes one clock_advanced at the
// current minute when the target is ahead, then processes (now, target]. A
// target <= now (nothing scheduled and the run is already at its end) writes
// nothing and the message says so.
Table ui = Table("ui_inputs");
double before = twinNow();
advanceToNextEvent();
if (twinNow() > before) { ui[1]["message"] = "Now minute " + twinFmtMinute(twinNow()) + " (" + twinWallClock(twinNow()) + ")."; }
else { ui[1]["message"] = "Nothing ahead of minute " + twinFmtMinute(before) + "; clock unchanged, no event."; }

// ===== BUTTON "Advance by work duration" =====================================
Table ui = Table("ui_inputs");
double d = twinNum(ui[1]["advance_minutes"]);
if (d <= 0) { d = 6; }                      // classroom default review_work_minutes (blank field)
double before = twinNow();
advanceByMinutes(d);                        // same command family as the button above
if (twinNow() > before) { ui[1]["message"] = "Now minute " + twinFmtMinute(twinNow()) + " (" + twinWallClock(twinNow()) + ")."; }
else { ui[1]["message"] = "Run already at minute " + twinFmtMinute(before) + "; clock unchanged, no event."; }

// ===== BUTTON "Finish and debrief" ===========================================
Table ui = Table("ui_inputs");
finishRun();
string path = exportDebrief("");
ui[1]["message"] = "Run ended at minute " + twinFmtMinute(twinNow()) + ". Debrief written to " + path;

// ===== BUTTON "Export run history" ===========================================
Table ui = Table("ui_inputs");
string path = exportEvents(twinText(ui[1]["export_path"]));
ui[1]["message"] = "Events written to " + path;

// ===== OPTIONAL: OnSelect of a "Current case" combo box ======================
// Combo values are numeric (1..6) = row of alerts.csv. Map to alert_id.
// Table al = Table("alerts");
// int row = Table("ui_inputs")[1]["current_alert_row"];
// if (row >= 1 && row <= al.numRows) {
// 	Table("ui_inputs")[1]["current_alert_id"] = twinText(al[row]["alert_id"]);
// 	updateCaseVisuals(twinCurrentCustomer());   // selection moves the token to review (display only)
// }
