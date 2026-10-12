// ============================================================================
// TwinAML FlexSim edition - shared helpers (CONTRACT.md 1.0)
// ATTACHMENT POINT : Toolbox > User Commands. One User Command per block below
//                    (name, parameters and return type are given on the marker
//                    line). Paste the block body into the command's Code field.
//                    Parameters are read with param(1), param(2), ... in the order
//                    given on the marker line.
// INPUTS           : Global Tables run_header, run_accounts, run_events,
//                    run_evidence, customers, alerts, ui_inputs (see ASSEMBLY.md).
// SIDE EFFECTS     : twinEmit appends to run_events and increments
//                    run_header.next_seq; twinRejectUnknown emits action_rejected
//                    through it. twinKeepFirstRow / twinAppendRow change row
//                    counts. Everything else is read-only.
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// Intended version: FlexSim 2027 (Autodesk Help current); assumed minimum 22.0.
// API status per call: see API-REFERENCES.md. Calls marked [U] are unconfirmed.
// ============================================================================
//
// Conventions used by every file in this folder
//   * Snapshot tables (imported CSVs) are never written after importTables().
//   * Run tables use -1 for "empty" in numeric columns (hold_since_minute,
//     executed_minute, available_from_minute, requested_minute, due_minute of a
//     request that was never made) and 1/0 for booleans. The contract's "empty"
//     is an internal representation choice; the exported trace never prints
//     these columns.
//   * Run tables never drop to zero rows (a FlexSim table with zero rows may
//     lose its column headers [U]). twinKeepFirstRow() deletes rows 2..n and the
//     caller overwrites row 1; twinAppendRow() reuses a blank row 1.
//   * Row order of the snapshot tables IS the contract order (verified with
//     Python against data/tables on 2026-10-07):
//       evidence_catalog rows  = (customer_id, evidence_id) order   -> phase 1
//       due_events rows        = (due_minute, from_account, transaction_id) -> phase 3
//       due_events per account = (due_minute, transaction_id)       -> release re-check
//     so the code iterates rows and never sorts strings in FlexScript.
//   * The twin clock is run_header.now, not Model.time. In guided mode the
//     FlexSim run button is never pressed; advanceTo() moves run_header.now.
//     Payment timing comes only from the scheduled minutes stored in run_orders
//     and run_requests (CONTRACT 1.1, 3), never from travel or processing time.

// ===== USER COMMAND: twinNum(var v) -> num ===================================
// Variant -> double. Snapshot cells may have been imported as text; run-table
// numeric cells are numbers. Empty text counts as 0.
Variant v = param(1);
if (v.type == VariantType.Number) {        // [U] VariantType enum / Variant.type
	return v;
}
if (v.type == VariantType.String) {
	string s = v;
	if (s == "") {
		return 0;
	}
	return s.toNum();                      // string.toNum (secondary source)
}
return 0;

// ===== USER COMMAND: twinText(var v) -> str ==================================
// Variant -> string for ID / text columns. A numeric 0 (how an empty CSV cell may
// import) is treated as empty text. Used only when copying snapshot cells into
// run tables, so the run tables hold clean strings afterwards.
Variant v = param(1);
if (v.type == VariantType.String) {        // [U] VariantType
	return v;
}
if (v.type == VariantType.Number) {
	if (v == 0) {
		return "";
	}
	return twinIntText(v);
}
return "";

// ===== USER COMMAND: twinIntText(num n) -> str ===============================
// Integer formatting for seq, amount, balance_after: "480000", never "480000.0".
double n = param(1);
return string.fromNum(Math.round(n), 0);   // [U] string.fromNum(num, precision)
// Fallback if fromNum has no precision parameter: return numtostring(Math.round(n), 0, 0);
// Last-resort arithmetic fallback (0-based substr assumed [U]):
//   int x = Math.round(n); if (x == 0) return "0"; string out = ""; string neg = "";
//   if (x < 0) { neg = "-"; x = -x; }
//   while (x > 0) { int d = x - 10 * Math.floor(x / 10); out = "0123456789".substr(d, 1) + out; x = Math.floor(x / 10); }
//   return neg + out;

// ===== USER COMMAND: twinFmtMinute(num m) -> str =============================
// CONTRACT 1 trace formatting: integral minutes without a fractional part ("18"),
// otherwise the shortest decimal ("17.5"). Must be exact text because it is also
// embedded in detail strings (hold_since=18, due_minute=8, final_minute=30).
double m = param(1);
double r = Math.round(m);
if (Math.fabs(m - r) < 0.0000001) {
	return twinIntText(r);
}
string s = string.fromNum(m, 6);           // [U] precision parameter; e.g. "17.500000"
while (s.length > 1 && s.endsWith("0")) {  // [U] string.endsWith
	s = s.substr(0, s.length - 1);         // [U] 0-based substr(start, length)
}
if (s.endsWith(".")) {
	s = s.substr(0, s.length - 1);
}
return s;

// ===== USER COMMAND: twinWallClock(num m) -> str =============================
// Display only (CONTRACT 1): 2026-04-15T11:12:00Z + m minutes -> "HH:MM:SSZ".
// Computed arithmetically to avoid the DateTime class. No day roll-over needed
// (run_until_minute is minutes, the pack ends well before midnight).
double m = param(1);
double totalMinutes = 11 * 60 + 12 + m;
int hh = Math.floor(totalMinutes / 60);
int mm = Math.floor(totalMinutes - hh * 60);
int ss = Math.floor((totalMinutes - Math.floor(totalMinutes)) * 60 + 0.5);
if (ss >= 60) { ss = 59; }
string h = twinIntText(hh); if (hh < 10) { h = "0" + h; }
string mi = twinIntText(mm); if (mm < 10) { mi = "0" + mi; }
string s = twinIntText(ss); if (ss < 10) { s = "0" + s; }
return h + ":" + mi + ":" + s + "Z";

// ===== USER COMMAND: twinFindRow(str tableName, str col, var value) -> num ===
// First row whose cell in column `col` equals `value`; 0 when none. Keying is by
// value, never by row number (data/README.md), so re-ordering a CSV cannot
// change behaviour. Tables are tiny (<= 126 rows); a loop is enough.
string tableName = param(1);
string col = param(2);
Variant value = param(3);
Table t = Table(tableName);
for (int i = 1; i <= t.numRows; i++) {
	if (t[i][col] == value) {              // column-name indexing needs column headers
		return i;
	}
}
return 0;

// ===== USER COMMAND: twinFindRow2(str tableName, str col1, var v1, str col2, var v2) -> num
// Composite key lookup, e.g. run_requests by (customer_id, request_id).
string tableName = param(1);
string col1 = param(2);
Variant v1 = param(3);
string col2 = param(4);
Variant v2 = param(5);
Table t = Table(tableName);
for (int i = 1; i <= t.numRows; i++) {
	if (t[i][col1] == v1 && t[i][col2] == v2) {
		return i;
	}
}
return 0;

// ===== USER COMMAND: twinAccountOf(str customerId) -> str ====================
// CONTRACT 4: the customer's single internal account, via customers.account_id.
// Returns "" for an unknown customer.
string customerId = param(1);
int r = twinFindRow("customers", "customer_id", customerId);
if (r == 0) {
	return "";
}
return twinText(Table("customers")[r]["account_id"]);

// ===== USER COMMAND: twinKnownCustomer(str customerId) -> num ================
// CONTRACT 4 "Unknown customer": 1 iff customerId is in customers.csv AND its
// account_id has a run_accounts row. run_accounts is built 1:1 from
// initial_state by resetRun(), so the snapshot table is checked here; that keeps
// the test valid before the first reset (replayScenario() refuses a scenario
// before it resets). Mirrors Tables.known_customers in the Python reference.
string customerId = param(1);
if (customerId == "") {
	return 0;
}
string acctId = twinAccountOf(customerId);
if (acctId == "") {
	return 0;
}
if (twinFindRow("initial_state", "account_id", acctId) == 0) {
	return 0;
}
return 1;

// ===== USER COMMAND: twinRejectUnknown(str action, str customerId) -> num ====
// CONTRACT 4 intro / 4.9 / 5: the first check of hold, release, request and
// decide. Returns 0 for a known customer (caller continues). Otherwise writes the
// run-level event action_rejected (customer_id, account_id, ref_id, amount and
// balance_after all empty; the typed id is echoed in detail) and returns 1.
// detail text is exactly engine.py's:
//   reason=unknown_customer;action=<hold|release|request|decide>;customer_id=<id>
string action = param(1);
string customerId = param(2);
if (twinKnownCustomer(customerId) == 1) {
	return 0;
}
twinEmit("action_rejected", "", "", "",
	"reason=unknown_customer;action=" + action + ";customer_id=" + customerId);
return 1;

// ===== USER COMMAND: twinNow() -> num ========================================
// The twin clock (CONTRACT 1). Not Model.time.
return twinNum(Table("run_header")[1]["now"]);

// ===== USER COMMAND: twinKeepFirstRow(str tableName) -> num ==================
// Delete rows n..2 so the table has exactly one row (which the caller overwrites).
string tableName = param(1);
Table t = Table(tableName);
while (t.numRows > 1) {
	t.deleteRow(t.numRows);                // Table.deleteRow (secondary source)
}
if (t.numRows == 0) {
	t.addRow();                            // Table.addRow (secondary source)
}
return t.numRows;

// ===== USER COMMAND: twinAppendRow(str tableName, str keyCol) -> num =========
// Returns the index of a fresh row: row 1 if it is still the blank placeholder
// left by twinKeepFirstRow (keyCol == ""), else a newly added last row.
string tableName = param(1);
string keyCol = param(2);
Table t = Table(tableName);
if (t.numRows == 1 && t[1][keyCol] == "") {
	return 1;
}
t.addRow();
return t.numRows;

// ===== USER COMMAND: twinEmit(str eventType, str customerId, str refId, var amount, str detail) -> num
// CONTRACT 5: append one event row with the next seq; returns the seq used.
// sim_minute is stored as a number and formatted by exportEvents().
// account_id / balance_after are derived here, never passed in, so every event
// type prints them the same way (empty for run-level events). Storage of the
// two optional numeric columns: amount holds the number for order_executed /
// order_held / order_failed and "" otherwise; balance_after holds the number
// whenever account_id != "" and "" otherwise. exportEvents() does not inspect
// these cells' Variant types; it decides emptiness from event_type and
// account_id, which is exactly the rule above (CONTRACT 5 column table).
string eventType = param(1);
string customerId = param(2);
string refId = param(3);
Variant amount = param(4);                 // number, or "" when not an order event
string detail = param(5);
Table hdr = Table("run_header");
int seq = twinNum(hdr[1]["next_seq"]);
string accountId = "";
Variant balanceAfter = "";
if (customerId != "") {
	accountId = twinAccountOf(customerId);
	int ar = twinFindRow("run_accounts", "account_id", accountId);
	if (ar > 0) {
		balanceAfter = Table("run_accounts")[ar]["balance"];
	}
}
Table ev = Table("run_events");
int r = twinAppendRow("run_events", "event_type");
ev[r]["seq"] = seq;
ev[r]["sim_minute"] = twinNow();
ev[r]["customer_id"] = customerId;
ev[r]["account_id"] = accountId;
ev[r]["event_type"] = eventType;
ev[r]["ref_id"] = refId;
ev[r]["amount"] = amount;
ev[r]["balance_after"] = balanceAfter;
ev[r]["detail"] = detail;
hdr[1]["next_seq"] = seq + 1;
return seq;

// ===== USER COMMAND: twinIsVisible(str evidenceId) -> num ====================
// CONTRACT 2.4: learner-visible iff available_from_minute is set (>= 0 here)
// and <= now. Unknown IDs are not visible.
string evidenceId = param(1);
int r = twinFindRow("run_evidence", "evidence_id", evidenceId);
if (r == 0) {
	return 0;
}
double avail = twinNum(Table("run_evidence")[r]["available_from_minute"]);
if (avail < 0) {
	return 0;
}
if (avail <= twinNow()) {
	return 1;
}
return 0;

// ===== USER COMMAND: twinCurrentCustomer() -> str ============================
// UI convenience (learner-flow.md Step 1): ui_inputs.current_alert_id -> the
// alert's customer_id via alerts.csv. No event, no run state.
string alertId = twinText(Table("ui_inputs")[1]["current_alert_id"]);
int r = twinFindRow("alerts", "alert_id", alertId);
if (r == 0) {
	return "";
}
return twinText(Table("alerts")[r]["customer_id"]);

// ===== USER COMMAND: twinVisibleEvidenceText(str customerId) -> str ==========
// Learner-safe evidence list for a dashboard text widget (CONTRACT 2.4, 7-I):
// one line per record that is visible NOW, nothing at all for unreleased rows
// (no title, no count, no placeholder). Built-in widgets cannot filter a Global
// Table, so the filtered view is text in ui_inputs.visible_evidence.
string customerId = param(1);
Table evr = Table("run_evidence");
string out = "";
for (int i = 1; i <= evr.numRows; i++) {
	if (evr[i]["customer_id"] == customerId) {
		string evId = evr[i]["evidence_id"];
		if (twinIsVisible(evId) == 1) {
			string title = evr[i]["title"];
			double since = twinNum(evr[i]["available_from_minute"]);
			out = out + evId + "  " + title + "  (available from minute " + twinFmtMinute(since) + ")\n";
		}
	}
}
if (out == "") {
	out = "(select a case)";
}
return out;

// ===== USER COMMAND: twinRequestStatusText(str customerId) -> str ============
// Learner-safe request panel text: catalog title, service minutes, prerequisite
// ID (all learner-visible in request_catalog.csv) and the run status. Never the
// evidence_id column of run_requests (CONTRACT 2.3).
string customerId = param(1);
Table req = Table("run_requests");
string out = "";
for (int i = 1; i <= req.numRows; i++) {
	if (req[i]["customer_id"] == customerId) {
		string reqId = req[i]["request_id"];
		string status = req[i]["status"];
		string line = reqId + "  (" + twinIntText(twinNum(req[i]["service_minutes"])) + " min";
		string prereq = req[i]["prerequisite_evidence_id"];
		if (prereq != "") { line = line + ", needs " + prereq; }
		line = line + "): ";
		if (status == "") { line = line + "not requested"; }
		else if (status == "requested") { line = line + "requested, completes at minute " + twinFmtMinute(twinNum(req[i]["due_minute"])); }
		else { line = line + "completed at minute " + twinFmtMinute(twinNum(req[i]["due_minute"])); }
		out = out + line + "\n";
	}
}
if (out == "") {
	out = "No further checks are offered for this alert.";
}
return out;

// ===== USER COMMAND: twinCsvQuote(str s) -> str ==============================
// RFC 4180: quote when the text contains a comma, a quote or a line break;
// double any embedded quotes. Free text (reasons, notes) is copied verbatim.
string s = param(1);
int needs = 0;
if (s.indexOf(",") >= 0) { needs = 1; }    // [U] string.indexOf (fallback: stringsearch(s, ",", 0))
if (s.indexOf("\"") >= 0) { needs = 1; }
if (s.indexOf("\n") >= 0) { needs = 1; }
if (s.indexOf("\r") >= 0) { needs = 1; }
if (needs == 0) {
	return s;
}
return "\"" + s.replace("\"", "\"\"") + "\"";   // [U] string.replace replaces every occurrence
