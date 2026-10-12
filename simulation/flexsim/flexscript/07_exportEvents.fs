// ============================================================================
// TwinAML FlexSim edition - exportEvents(path)   (CONTRACT 5 trace)
// ATTACHMENT POINT : Toolbox > User Commands > exportEvents(str path) -> str
//                    (one command in this file).
//                    Called by the "Export run history" dashboard button
//                    (10_ui_buttons.fs) and at the end of replayScenario().
// INPUTS           : run_events, run_header. path "" = <model folder>\
//                    <scenario_id>.events.csv.
// SIDE EFFECTS     : writes one CSV file; no table changes.
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// ============================================================================
//
// Why not exporttable(): the contract fixes the text of every cell (18 not 18.0,
// 480000 not 480000.000000, RFC 4180 quoting of free text). Writing the file
// ourselves guarantees that; exporttable()'s number formatting is unconfirmed.
// Fallback (comparer tolerates numeric "18.0"): exporttable(Table("run_events"),
// path, 0, 1) [U].
//
// Column order is the contract's: seq,sim_minute,customer_id,account_id,
// event_type,ref_id,amount,balance_after,detail. The file is what
// reference/compare_trace.py reads. Line endings "\n" (CONTRACT 5).
//
// Empty cells are decided STRUCTURALLY, never from the Variant type of a cell
// (an empty text cell may import or display as 0 in a Global Table):
//   amount        printed iff event_type is order_executed / order_held / order_failed
//                 (CONTRACT 5: "Order amount for order events; empty otherwise")
//   balance_after printed iff account_id != ""  ("empty when account_id is empty")
// twinEmit() stores the cells by the same rule (00_helpers.fs), so the two agree.

// ===== USER COMMAND: exportEvents(str path) -> str ===========================
string path = param(1);
Table hdr = Table("run_header");
if (path == "") {
	path = modeldir() + twinText(hdr[1]["scenario_id"]) + ".events.csv";   // modeldir() (secondary source)
}
Table ev = Table("run_events");
fileopen(path);                             // fileopen / fpt / fileclose (secondary source: community posts)
fpt("seq,sim_minute,customer_id,account_id,event_type,ref_id,amount,balance_after,detail\n");
for (int i = 1; i <= ev.numRows; i++) {
	string type = ev[i]["event_type"];
	if (type != "") {                       // skip the blank placeholder row, if any
		string line = twinIntText(twinNum(ev[i]["seq"]));
		line = line + "," + twinFmtMinute(twinNum(ev[i]["sim_minute"]));
		string cust = ev[i]["customer_id"];
		string acct = ev[i]["account_id"];
		string ref = ev[i]["ref_id"];
		line = line + "," + twinCsvQuote(cust) + "," + twinCsvQuote(acct) + "," + type + "," + twinCsvQuote(ref);
		string amountText = "";
		if (type == "order_executed" || type == "order_held" || type == "order_failed") {
			amountText = twinIntText(twinNum(ev[i]["amount"]));
		}
		string balanceText = "";
		if (acct != "") {
			balanceText = twinIntText(twinNum(ev[i]["balance_after"]));
		}
		line = line + "," + amountText + "," + balanceText;
		string detail = ev[i]["detail"];
		line = line + "," + twinCsvQuote(detail);
		fpt(line + "\n");
	}
}
fileclose();
return path;
