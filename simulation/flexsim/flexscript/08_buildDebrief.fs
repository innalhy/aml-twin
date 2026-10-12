// ============================================================================
// TwinAML FlexSim edition - buildDebrief(customerId), exportDebrief(path)
//                           (CONTRACT 8.1, model-design/debrief-spec.md 2)
// ATTACHMENT POINT : Toolbox > User Commands: twinDetailValue(str eventType,
//                    str detail, str key) -> str, twinHoldPosition(num m,
//                    str accountId) -> str, buildDebrief(str customerId) -> str,
//                    exportDebrief(str path) -> str.
//                    Shown in a dashboard text widget linked to
//                    ui_inputs.debrief_text after "Finish and debrief", and
//                    written to a file next to the events CSV.
// INPUTS           : run_events (the only source of facts), plus learner-visible
//                    tables: customers, alerts, run_orders (due minutes, amounts,
//                    recipients: all in transactions.csv too), request_catalog
//                    titles, and titles of records that are visible NOW.
//                    NEVER reads answer-key.json, evidence_catalog rows that are
//                    not visible, or run_requests.evidence_id.
// SIDE EFFECTS     : exportDebrief writes one text file and ui_inputs.debrief_text.
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// ============================================================================
//
// LEARNER LAYER ONLY. No score, no verdict, never the words that name the hidden
// case kind. The instructor debrief (CONTRACT 8.2) is intentionally NOT in this
// folder's learner build: it would read instructor/answer-key.json and must be
// a separate artefact (reference/run_scenario.py --instructor already produces
// one on the Mac from the exported events CSV).
//
// detail parsing (CONTRACT 5 "Detail grammar"; reference trace.py parse_detail):
// every event type has a FIXED key order; a parser consumes the known keys in
// that order, cuts each non-final value at the next ";", and takes the remainder
// verbatim as the LAST key's value, which may therefore contain ";" and "="
// (a note may even start with ";"). It must never split on every ";" and must
// never search for "<key>=" anywhere in the string: `reason` is NOT last in
// decision_rejected, order_failed and action_rejected. twinDetailValue takes the
// event type for that reason (debrief-spec.md "Contract gaps" item 3, resolved).
//
// Fixed strings. The six order outcomes, the three decision flags and the three
// consistency flags are the exact texts of CONTRACT 8.1 / debrief.py; the
// surrounding labels (order id, amount, recipient, due minute) are this
// edition's framing and may differ from the JSON summary without meaning.

// ===== USER COMMAND: twinDetailValue(str eventType, str detail, str key) -> str
// Value of `key` in `detail`, parsed by the fixed key order of `eventType`
// (trace.py DETAIL_KEYS / parse_detail). Non-final values end at the next ";";
// the final key's value is the rest of the string, verbatim. Returns "" for an
// unknown event type, a key that is not in the grammar, or a detail string that
// does not follow the grammar (where parse_detail raises ValueError).
string eventType = param(1);
string detail = param(2);
string key = param(3);
string keys = "";
if (eventType == "run_start") { keys = "scenario_id|pack|contract"; }
else if (eventType == "hold_placed" || eventType == "hold_rejected"
	|| eventType == "release_rejected" || eventType == "request_rejected") { keys = "reason"; }
else if (eventType == "hold_released") { keys = "note"; }
else if (eventType == "request_accepted") { keys = "due_minute"; }
else if (eventType == "evidence_released") { keys = "request_id|title"; }
else if (eventType == "decision_recorded") { keys = "decision|cites|note"; }
else if (eventType == "decision_rejected") { keys = "reason|decision"; }
else if (eventType == "action_rejected") { keys = "reason|action|customer_id"; }
else if (eventType == "order_executed") { keys = "to|trigger"; }
else if (eventType == "order_held") { keys = "hold_since"; }
else if (eventType == "order_failed") { keys = "reason|available"; }
else if (eventType == "clock_advanced") { keys = "to_minute"; }
else if (eventType == "run_end") { keys = "final_minute"; }
else { return ""; }
Array order = keys.split("|");              // string.split -> Array (secondary source)
string rest = detail;
for (int i = 1; i <= order.length; i++) {
	string k = order[i];
	string prefix = k + "=";
	if (!rest.startsWith(prefix)) {         // [U] string.startsWith; grammar violation -> ""
		return "";
	}
	rest = rest.substr(prefix.length, rest.length - prefix.length);   // [U] 0-based substr
	if (i == order.length) {
		if (k == key) { return rest; }      // last key: verbatim to the end (";" and "=" allowed)
		return "";
	}
	int cut = rest.indexOf(";");            // [U] string.indexOf
	string value = rest;
	if (cut >= 0) {
		value = rest.substr(0, cut);
		rest = rest.substr(cut + 1, rest.length - cut - 1);
	} else {
		rest = "";                          // later keys missing: the next iteration returns ""
	}
	if (k == key) { return value; }
}
return "";

// ===== USER COMMAND: twinHoldPosition(num m, str accountId) -> str ===========
// CONTRACT 8.1 Holds: position relative to the account's due minutes.
double m = param(1);
string accountId = param(2);
Table ord = Table("run_orders");
double first = -1;
double last = -1;
for (int i = 1; i <= ord.numRows; i++) {
	if (ord[i]["from_account"] == accountId) {
		double d = twinNum(ord[i]["due_minute"]);
		if (Math.fabs(d - m) < 0.0000001) { return "at due minute"; }
		if (first < 0 || d < first) { first = d; }
		if (d > last) { last = d; }
	}
}
if (first < 0) { return "no pending orders"; }
if (m < first) { return "before first due"; }
if (m > last) { return "after both due"; }
return "between due minutes";

// ===== USER COMMAND: buildDebrief(str customerId) -> str =====================
string customerId = param(1);
string acctId = twinAccountOf(customerId);
Table ev = Table("run_events");
Table hdr = Table("run_header");
string nl = "\n";
string out = "";
double finalMinute = twinNow();
// --- header ------------------------------------------------------------------
int cr = twinFindRow("customers", "customer_id", customerId);
string name = "";
if (cr > 0) { name = twinText(Table("customers")[cr]["display_name"]); }
string alertId = "";
int alr = twinFindRow("alerts", "customer_id", customerId);
if (alr > 0) { alertId = twinText(Table("alerts")[alr]["alert_id"]); }
out = out + "Run " + twinText(hdr[1]["scenario_id"]) + " | pack analyst-session-001 | minute "
	+ twinFmtMinute(finalMinute) + " (" + twinWallClock(finalMinute) + ")" + nl + nl;
out = out + customerId + " | " + name + " | account " + acctId + " | alert " + alertId + nl + nl;
// --- timeline ----------------------------------------------------------------
out = out + "Timeline" + nl;
int any = 0;
for (int i = 1; i <= ev.numRows; i++) {
	if (ev[i]["event_type"] != "" && ev[i]["customer_id"] == customerId) {
		any = 1;
		double m = twinNum(ev[i]["sim_minute"]);
		string type = ev[i]["event_type"];
		string ref = ev[i]["ref_id"];
		string detail = ev[i]["detail"];
		out = out + "  " + twinIntText(twinNum(ev[i]["seq"])) + "  minute " + twinFmtMinute(m)
			+ " (" + twinWallClock(m) + ")  " + type;
		if (ref != "") { out = out + " " + ref; }
		if (detail != "") { out = out + "  " + detail; }
		out = out + nl;
	}
}
if (any == 0) { out = out + "  no events for this customer" + nl; }
// --- holds -------------------------------------------------------------------
out = out + nl + "Holds" + nl;
double placedAt = -1;
string placedReason = "";
int holdLines = 0;
for (int i = 1; i <= ev.numRows; i++) {
	if (ev[i]["event_type"] != "" && ev[i]["customer_id"] == customerId) {
		string type = ev[i]["event_type"];
		double m = twinNum(ev[i]["sim_minute"]);
		string detail = ev[i]["detail"];
		if (type == "hold_placed") {
			placedAt = m;
			placedReason = twinDetailValue("hold_placed", detail, "reason");
		} else if (type == "hold_released" && placedAt >= 0) {
			out = out + "  Hold placed at minute " + twinFmtMinute(placedAt) + ", released at minute "
				+ twinFmtMinute(m) + ": " + twinFmtMinute(m - placedAt) + " minutes." + nl;
			out = out + "  Placement: " + twinHoldPosition(placedAt, acctId)
				+ ". Release: " + twinHoldPosition(m, acctId) + "." + nl;
			out = out + "  Reason: \"" + placedReason + "\"" + nl;
			out = out + "  Release note: \"" + twinDetailValue("hold_released", detail, "note") + "\"" + nl;
			if (placedReason == "") { out = out + "  Observation: empty hold reason" + nl; }
			placedAt = -1;
			holdLines++;
		} else if (type == "hold_rejected" || type == "release_rejected") {
			out = out + "  Rejected attempt at minute " + twinFmtMinute(m) + ": " + type + " (" + detail + ")" + nl;
		}
	}
}
if (placedAt >= 0) {
	out = out + "  Hold placed at minute " + twinFmtMinute(placedAt) + ", still in place at run end: "
		+ twinFmtMinute(finalMinute - placedAt) + " minutes." + nl;
	out = out + "  Placement: " + twinHoldPosition(placedAt, acctId) + "." + nl;
	out = out + "  Reason: \"" + placedReason + "\"" + nl;
	if (placedReason == "") { out = out + "  Observation: empty hold reason" + nl; }
	holdLines++;
}
if (holdLines == 0) { out = out + "  none" + nl; }
// --- orders: one of the six fixed outcome strings per order (CONTRACT 8.1) ----
// Order list = the account's rows of run_orders (= the pending rows of the
// learner-visible transactions.csv); facts come from the order_* events only.
// Outcome rule (debrief.py): failed -> "failed insufficient funds";
// executed without an earlier order_held -> "executed at <m> (due|release)";
// executed after an order_held -> "held at due minute, released and executed at <m>";
// order_held only -> "held, still pending at run end";
// no order event at all -> "pending, never checked before run end".
out = out + nl + "Orders" + nl;
Table ord = Table("run_orders");
int orderLines = 0;
for (int o = 1; o <= ord.numRows; o++) {
	if (ord[o]["from_account"] == acctId) {
		orderLines++;
		string txId = ord[o]["transaction_id"];
		string toAcct = ord[o]["to_account"];
		double amount = twinNum(ord[o]["amount"]);
		double due = twinNum(ord[o]["due_minute"]);
		int heldAtDue = 0;
		double execAt = -1;
		string trigger = "";
		int failed = 0;
		for (int i = 1; i <= ev.numRows; i++) {
			if (ev[i]["ref_id"] == txId && ev[i]["customer_id"] == customerId) {
				string type = ev[i]["event_type"];
				double m = twinNum(ev[i]["sim_minute"]);
				string detail = ev[i]["detail"];
				if (type == "order_held") { heldAtDue = 1; }
				if (type == "order_executed") { execAt = m; trigger = twinDetailValue("order_executed", detail, "trigger"); }
				if (type == "order_failed") { failed = 1; }
			}
		}
		string outcome = "";
		if (failed == 1) {
			outcome = "failed insufficient funds";
		} else if (execAt >= 0 && heldAtDue == 0) {
			outcome = "executed at " + twinFmtMinute(execAt) + " (" + trigger + ")";
		} else if (execAt >= 0) {
			outcome = "held at due minute, released and executed at " + twinFmtMinute(execAt);
		} else if (heldAtDue == 1) {
			outcome = "held, still pending at run end";
		} else {
			outcome = "pending, never checked before run end";
		}
		out = out + "  " + txId + "  " + twinIntText(amount) + " SCU to " + toAcct + ", due minute "
			+ twinFmtMinute(due) + ": " + outcome + nl;
	}
}
if (orderLines == 0) {
	out = out + "  no pending orders" + nl;
}
// Final balance = balance_after of the customer's last event (CONTRACT 8.1). Every
// customer event carries account_id, so the cell is always filled. With no event
// the contract wants the ledger balance from accounts.csv + transactions.csv; the
// snapshot balance in run_accounts is that same number (initial_state is derived
// from those two tables), so it is used as the fallback.
int ar = twinFindRow("run_accounts", "account_id", acctId);
double finalBalance = -1;
for (int i = 1; i <= ev.numRows; i++) {
	if (ev[i]["event_type"] != "" && ev[i]["customer_id"] == customerId) {
		finalBalance = twinNum(ev[i]["balance_after"]);
	}
}
if (finalBalance < 0 && ar > 0) {
	finalBalance = twinNum(Table("run_accounts")[ar]["balance"]);
}
if (finalBalance >= 0) {
	out = out + "  Final balance " + twinIntText(finalBalance) + " SCU." + nl;
}
// --- requests (accepted and rejected, from events; titles from request_catalog) ----
out = out + nl + "Requests" + nl + "  Accepted" + nl;
int accepted = 0;
for (int i = 1; i <= ev.numRows; i++) {
	if (ev[i]["event_type"] == "request_accepted" && ev[i]["customer_id"] == customerId) {
		accepted++;
		string reqId = ev[i]["ref_id"];
		double m = twinNum(ev[i]["sim_minute"]);
		string title = "";
		int rr = twinFindRow2("request_catalog", "customer_id", customerId, "request_id", reqId);
		if (rr > 0) { title = twinText(Table("request_catalog")[rr]["title"]); }
		string completion = "outstanding at run end";
		for (int j = 1; j <= ev.numRows; j++) {
			if (ev[j]["event_type"] == "evidence_released" && ev[j]["customer_id"] == customerId) {
				string d2 = ev[j]["detail"];
				if (twinDetailValue("evidence_released", d2, "request_id") == reqId) {
					string evId = ev[j]["ref_id"];
					completion = "completed " + twinFmtMinute(twinNum(ev[j]["sim_minute"])) + " -> " + evId + " " + twinDetailValue("evidence_released", d2, "title");
				}
			}
		}
		out = out + "    " + reqId + "  \"" + title + "\"  requested " + twinFmtMinute(m) + ", " + completion + nl;
	}
}
if (accepted == 0) { out = out + "    none" + nl; }
out = out + "  Rejected" + nl;
int rejected = 0;
for (int i = 1; i <= ev.numRows; i++) {
	if (ev[i]["event_type"] == "request_rejected" && ev[i]["customer_id"] == customerId) {
		rejected++;
		string reqId = ev[i]["ref_id"];
		string reason = twinDetailValue("request_rejected", ev[i]["detail"], "reason");
		string gloss = "";
		if (reason.startsWith("prerequisite_missing")) { gloss = "  (the prerequisite record had not been released yet)"; }
		out = out + "    minute " + twinFmtMinute(twinNum(ev[i]["sim_minute"])) + "  " + reqId + "  " + reason + gloss + nl;
	}
}
if (rejected == 0) { out = out + "    none" + nl; }
// --- decisions ---------------------------------------------------------------
out = out + nl + "Decisions" + nl;
int decisions = 0;
string latestDecision = "";
int flagEscalation = 0;                     // CONTRACT 8.1 consistency flags, each at most once
int flagClosureOutstanding = 0;
for (int i = 1; i <= ev.numRows; i++) {
	if (ev[i]["event_type"] == "decision_recorded" && ev[i]["customer_id"] == customerId) {
		decisions++;
		double m = twinNum(ev[i]["sim_minute"]);
		int dseq = twinNum(ev[i]["seq"]);
		string detail = ev[i]["detail"];
		string kind = twinDetailValue("decision_recorded", detail, "decision");
		string cites = twinDetailValue("decision_recorded", detail, "cites");
		string note = twinDetailValue("decision_recorded", detail, "note");
		latestDecision = kind;
		string did = ev[i]["ref_id"];
		out = out + "  " + did + " (seq " + twinIntText(dseq) + ") at minute " + twinFmtMinute(m)
			+ " (" + twinWallClock(m) + "): " + kind + nl;
		out = out + "    Cited: " + cites + " (all available at that minute: yes, the engine rejects anything else)" + nl;
		// Evidence available at minute m (debrief.py): this customer's initial records
		// plus every record released at a minute <= m (IDs from events only). Releases
		// are phase 1, so a same-minute release always precedes the decision.
		string avail = "";
		Table evr = Table("run_evidence");
		for (int e = 1; e <= evr.numRows; e++) {
			if (evr[e]["customer_id"] == customerId && evr[e]["release"] == "initial") {
				if (avail != "") { avail = avail + ", "; }
				string evId = evr[e]["evidence_id"];
				avail = avail + evId;
			}
		}
		// Requests outstanding at minute m (debrief.py): accepted at a minute <= m and
		// not completed at a minute <= m. Counted from events: every evidence_released
		// at <= m closes exactly one request accepted earlier.
		int outstanding = 0;
		for (int j = 1; j <= ev.numRows; j++) {
			if (ev[j]["customer_id"] == customerId && twinNum(ev[j]["sim_minute"]) <= m) {
				if (ev[j]["event_type"] == "evidence_released") {
					if (avail != "") { avail = avail + ", "; }
					string evId2 = ev[j]["ref_id"];
					avail = avail + evId2;
					outstanding--;
				}
				if (ev[j]["event_type"] == "request_accepted") { outstanding++; }
			}
		}
		if (outstanding < 0) { outstanding = 0; }
		out = out + "    Available at minute " + twinFmtMinute(m) + ": " + avail + nl;
		out = out + "    Requests outstanding at that minute: " + twinIntText(outstanding) + nl;
		out = out + "    Note: \"" + note + "\"" + nl;
		string flags = "";
		if (outstanding > 0) { flags = flags + " decided with " + twinIntText(outstanding) + " requests outstanding;"; }
		if (note == "") { flags = flags + " empty note;"; }
		if (cites == "") { flags = flags + " cited nothing;"; }
		if (flags == "") { flags = " none"; }
		out = out + "    Flags:" + flags + nl;
		// Consistency flags evaluated per decision (CONTRACT 8.1, debrief.py):
		// escalation: some order_executed of this customer has (sim_minute, seq)
		// greater than this decision's (sim_minute, seq); phase 3 of the decision's
		// own minute counts, earlier executions do not. Set once, printed once.
		if (kind == "escalation" && flagEscalation == 0) {
			for (int j = 1; j <= ev.numRows; j++) {
				if (ev[j]["event_type"] == "order_executed" && ev[j]["customer_id"] == customerId) {
					double em = twinNum(ev[j]["sim_minute"]);
					int eseq = twinNum(ev[j]["seq"]);
					if (em > m || (Math.fabs(em - m) < 0.0000001 && eseq > dseq)) {
						flagEscalation = 1;
					}
				}
			}
		}
		if (kind == "closure" && outstanding > 0) { flagClosureOutstanding = 1; }
	}
}
for (int i = 1; i <= ev.numRows; i++) {
	if (ev[i]["event_type"] == "decision_rejected" && ev[i]["customer_id"] == customerId) {
		out = out + "  Rejected attempt at minute " + twinFmtMinute(twinNum(ev[i]["sim_minute"])) + ": " + ev[i]["detail"] + nl;
	}
}
if (decisions == 0) { out = out + "  none" + nl; }
// --- consistency flags (observations, not grades; each string at most once) ---
out = out + nl + "Consistency flags" + nl;
string cflags = "";
if (flagEscalation == 1) {
	cflags = cflags + "  escalation recorded while orders executed afterwards (escalation is not a hold)" + nl;
}
// Latest decision is closure and the account is still held at run end (= the
// last hold pair is open at run end, debrief.py).
if (latestDecision == "closure" && ar > 0 && twinNum(Table("run_accounts")[ar]["held"]) == 1) {
	cflags = cflags + "  hold still in place at run end after closure" + nl;
}
if (flagClosureOutstanding == 1) {
	cflags = cflags + "  closure while a request is outstanding" + nl;
}
if (cflags == "") { cflags = "  none" + nl; }
out = out + cflags + nl + "You are assessed on the information available when you decided." + nl;
return out;

// ===== USER COMMAND: exportDebrief(str path) -> str ==========================
// Learner debrief for every customer that has events (main customers always).
// Written to <model folder>\<scenario_id>.debrief.txt and to ui_inputs.debrief_text.
string path = param(1);
Table hdr = Table("run_header");
if (path == "") {
	path = modeldir() + twinText(hdr[1]["scenario_id"]) + ".debrief.txt";
}
Table cu = Table("customers");
Table ev = Table("run_events");
string all = "";
for (int c = 1; c <= cu.numRows; c++) {
	string cust = twinText(cu[c]["customer_id"]);
	int show = 0;
	if (cust == "SYN-001" || cust == "SYN-002") { show = 1; }
	for (int i = 1; i <= ev.numRows; i++) {
		if (ev[i]["customer_id"] == cust && ev[i]["event_type"] != "") { show = 1; }
	}
	if (show == 1) {
		all = all + buildDebrief(cust) + "\n----------------------------------------\n";
	}
}
Table("ui_inputs")[1]["debrief_text"] = all;
fileopen(path);
fpt(all);
fileclose();
return path;
