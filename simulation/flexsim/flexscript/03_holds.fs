// ============================================================================
// TwinAML FlexSim edition - payment eligibility, hold, release
//                           (CONTRACT 4.1, 4.2, 4.3, 4.4)
// ATTACHMENT POINT : Toolbox > User Commands: twinCheckOrder, placeHold,
//                    releaseHold (one block each, see marker lines).
//                    placeHold / releaseHold are called from dashboard buttons
//                    (10_ui_buttons.fs) while the model is stopped (phase 2 of
//                    the current minute), and from replayScenario().
// INPUTS           : run_accounts, run_orders, run_header, customers.
// SIDE EFFECTS     : run_accounts.held/hold_reason/hold_since_minute;
//                    run_orders.status/executed_minute/overdue; run_accounts.balance;
//                    events hold_placed, hold_rejected, hold_released,
//                    release_rejected, order_executed, order_held, order_failed,
//                    action_rejected (unknown customer, via twinRejectUnknown);
//                    3D redraw of the customer's token.
// RETURN CODES     : placeHold / releaseHold: 1 accepted, 0 rejected (hold_rejected
//                    / release_rejected written), -1 unknown customer
//                    (action_rejected reason=unknown_customer written, CONTRACT 4).
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// ============================================================================
//
// Exactly-once guarantee. twinCheckOrder() is the only place a balance changes.
// Its first line is the status guard `status == pending`: executed and
// failed_insufficient are terminal, so a second due check, a release re-check
// after a due execution, or a duplicated FlexSim event can never execute an
// order twice (CONTRACT 2.2, 4.3, 4.9). It is called from exactly two places:
// twinPhase3() (trigger=due) and releaseHold() (trigger=release). Payment
// timing therefore comes only from run_orders.due_minute and from the minute of
// a release click, never from any 3D object (3d-layout.md).

// ===== USER COMMAND: twinCheckOrder(str txId, str trigger) -> num ============
// CONTRACT 4.4, one order at a time, conditions in the stated order.
// Returns 1 when the order executed, 0 otherwise.
string txId = param(1);
string trigger = param(2);                  // "due" or "release"
Table ord = Table("run_orders");
int r = twinFindRow("run_orders", "transaction_id", txId);
if (r == 0) {
	return 0;
}
if (ord[r]["status"] != "pending") {        // 1. terminal statuses: nothing, no event
	return 0;
}
string acctId = ord[r]["from_account"];
Table acc = Table("run_accounts");
int ar = twinFindRow("run_accounts", "account_id", acctId);
if (ar == 0) {
	return 0;
}
string cust = acc[ar]["customer_id"];
if (acc[ar]["account_status"] != "open") {  // 2. always open in this edition
	return 0;
}
double amount = twinNum(ord[r]["amount"]);
if (twinNum(acc[ar]["held"]) == 1) {        // 3. hold -> order_held, stays pending
	ord[r]["overdue"] = 1;
	twinEmit("order_held", cust, txId, amount,
		"hold_since=" + twinFmtMinute(twinNum(acc[ar]["hold_since_minute"])));
	return 0;
}
double bal = twinNum(acc[ar]["balance"]);
if (bal < amount) {                         // 4. insufficient funds -> terminal failure
	ord[r]["status"] = "failed_insufficient";
	twinEmit("order_failed", cust, txId, amount,
		"reason=insufficient_funds;available=" + twinIntText(bal));
	return 0;
}
acc[ar]["balance"] = bal - amount;          // 5. execute (external recipients are not credited)
ord[r]["status"] = "executed";
ord[r]["executed_minute"] = twinNow();
string toAcct = ord[r]["to_account"];
twinEmit("order_executed", cust, txId, amount, "to=" + toAcct + ";trigger=" + trigger);
return 1;

// ===== USER COMMAND: placeHold(str customerId, str reason) -> num ============
// CONTRACT 4 (unknown customer) then 4.1. Returns 1 accepted, 0 rejected,
// -1 unknown customer (action_rejected written, nothing else happens).
string customerId = param(1);
string reason = param(2);
if (twinRejectUnknown("hold", customerId) == 1) {   // checked BEFORE anything else
	return -1;
}
string acctId = twinAccountOf(customerId);
Table acc = Table("run_accounts");
int ar = twinFindRow("run_accounts", "account_id", acctId);
if (ar == 0) {
	return -1;                              // unreachable after the guard; kept as a safety net
}
if (twinNum(acc[ar]["held"]) == 1) {
	twinEmit("hold_rejected", customerId, "", "", "reason=already_held");   // idempotent, visible
	return 0;
}
acc[ar]["held"] = 1;
acc[ar]["hold_reason"] = reason;
acc[ar]["hold_since_minute"] = twinNow();
twinEmit("hold_placed", customerId, "", "", "reason=" + reason);
updateCaseVisuals(customerId);
return 1;

// ===== USER COMMAND: releaseHold(str customerId, str note) -> num ============
// CONTRACT 4 (unknown customer), then 4.2, then 4.3. Returns 1 accepted,
// 0 rejected, -1 unknown customer (action_rejected written, nothing else happens).
string customerId = param(1);
string note = param(2);
if (twinRejectUnknown("release", customerId) == 1) {   // checked BEFORE anything else
	return -1;
}
string acctId = twinAccountOf(customerId);
Table acc = Table("run_accounts");
int ar = twinFindRow("run_accounts", "account_id", acctId);
if (ar == 0) {
	return -1;                              // unreachable after the guard; kept as a safety net
}
if (twinNum(acc[ar]["held"]) != 1) {
	twinEmit("release_rejected", customerId, "", "", "reason=not_held");
	return 0;
}
acc[ar]["held"] = 0;
acc[ar]["hold_reason"] = "";
acc[ar]["hold_since_minute"] = -1;
twinEmit("hold_released", customerId, "", "", "note=" + note);
// 4.3 release re-check: this account only, pending and strictly overdue
// (due_minute < now), in (due_minute, transaction_id) order = row order of
// run_orders restricted to the account (verified, see 00_helpers.fs). Orders
// with due_minute == now are left to phase 3 of this minute (one execution,
// trigger=due); later orders wait for their own due minute.
double now = twinNow();
Table ord = Table("run_orders");
for (int i = 1; i <= ord.numRows; i++) {
	if (ord[i]["from_account"] == acctId
		&& ord[i]["status"] == "pending"
		&& twinNum(ord[i]["due_minute"]) < now) {
		string txId = ord[i]["transaction_id"];
		twinCheckOrder(txId, "release");
	}
}
updateCaseVisuals(customerId);
return 1;
