// ============================================================================
// TwinAML FlexSim edition - model triggers and the OPTIONAL free-run mode
// ATTACHMENT POINT : Toolbox > Model Triggers > OnModelReset (block 1).
//                    Block 2 (optional) is a Toolbox > User Events entry.
//                    Block 3 (optional) is Toolbox > Model Triggers > OnRunStart.
// INPUTS           : none beyond the tables the called commands read.
// SIDE EFFECTS     : block 1 rebuilds the run (resetRun). Blocks 2-3 only in
//                    free-run mode.
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// ============================================================================

// ===== BLOCK 1: Model Triggers > OnModelReset ===============================
// FlexSim's Reset button becomes CONTRACT 4.8 reset. (Model Triggers tool:
// "On Reset - fired when the model is reset", secondary source.)
resetRun();

// ===== BLOCK 2 (OPTIONAL, free-run mode): User Events > "twin tick" =========
// Guided mode (normative) never presses Run. If an instructor wants to watch the
// clock move on its own, add one User Event (Toolbox > User Events) that fires at
// model time 1 and repeats every 1 model minute (model time units = minutes),
// with this code. Each tick brings the twin clock to Model.time and then runs
// the deferred due checks of that minute. Scheduled minutes between ticks
// (e.g. a request due at 15.3) are processed in order inside advanceTo().
//
// Limitations, stated plainly: (a) a click made while the model runs lands at
// whatever Model.time the GUI processes it, so the tie rule "hold at 18 beats the
// order due at 18" is NOT reproducible in free-run mode (the tick at 18 runs
// phase 3 of 18 immediately); (b) traces are still contract-shaped and
// exactly-once (06_clock.fs guards). Use guided mode for assessment.
//
// Model.time (secondary source). User Events tool: page title indexed, repeat
// option UNCONFIRMED (API-REFERENCES.md).
//
// advanceTo(Model.time);
// twinLeaveMinute();
// if (twinNum(Table("run_header")[1]["ended"]) == 0
// 	&& Model.time >= twinNum(Table("run_header")[1]["run_until_minute"])) {
// 	finishRun();
// }

// ===== BLOCK 3 (OPTIONAL, free-run mode): Model Triggers > OnRunStart =======
// Alternative to block 2 that schedules the four due checks as FlexSim events
// through onOrderDue(). delayednodefunction(codeNode, delay, p1 ...) is a
// community-documented command (secondary source) whose exact signature and the
// node path of a User Command's code are UNCONFIRMED; prefer block 2.
//
// Table ord = Table("run_orders");
// for (int i = 1; i <= ord.numRows; i++) {
// 	if (ord[i]["status"] == "pending") {
// 		double due = twinNum(ord[i]["due_minute"]);
// 		if (due > Model.time) {
// 			string txId = ord[i]["transaction_id"];
// 			// [U] delayednodefunction(Model.find("Tools/UserCommands/onOrderDue/code"), due - Model.time, txId);
// 		}
// 	}
// }
