// ============================================================================
// TwinAML FlexSim edition - importTables()
// ATTACHMENT POINT : Toolbox > User Commands > importTables (no parameters,
//                    return type num). Run once per model build from the Script
//                    Console (`importTables();`) or from the "Import tables"
//                    dashboard button (10_ui_buttons.fs). Not from OnModelReset:
//                    the snapshot tables are imported once and then read-only.
// INPUTS           : ui_inputs[1]["tables_dir"] - folder holding the eight CSVs
//                    (default: <model folder>\tables\). Global Tables named
//                    customers, accounts, transactions, alerts, request_catalog,
//                    evidence_catalog, due_events, initial_state must already
//                    exist (Toolbox > Global Tables; any size, they are replaced).
// SIDE EFFECTS     : Overwrites the eight snapshot Global Tables from the CSVs.
//                    Touches no run_* table.
// STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).
// ============================================================================
//
// importtable(table, filename, 1): the official "Importing Data into Global
// Tables" page (search snippet, docs.flexsim.com 24.1/25.2; Autodesk Help copy
// could not be opened from the authoring machine) shows this call and says the
// numeric parameter makes the first CSV row the column headers ("anything other
// than 0 means true") and that the command always imports all data. Whether the
// fourth parameter (first column as row headers) exists is unconfirmed; we do
// not want row headers, so it is omitted. Column headers are required: every
// other file indexes cells by column name (t[row]["balance"]).
//
// Manual alternative (ASSEMBLY.md step 3): Toolbox > Global Tables > open table >
// Import (CSV) with "first row as headers"; or the Excel Interface tool. Either
// way the table names must match the CSV stems exactly.

// ===== USER COMMAND: importTables() -> num ===================================
string dir = twinText(Table("ui_inputs")[1]["tables_dir"]);
if (dir == "") {
	dir = modeldir() + "tables\\";          // modeldir() (secondary source): folder of the .fsm, with trailing separator
}
Array names = ["customers", "accounts", "transactions", "alerts",
               "request_catalog", "evidence_catalog", "due_events", "initial_state"];
for (int i = 1; i <= names.length; i++) {
	string name = names[i];
	Table dest = Table(name);              // Table("name") = Global Table by name (secondary source)
	importtable(dest, dir + name + ".csv", 1);   // 1 = first row holds column headers
}
// Sanity echo for the Script Console (row counts from data/manifest.json:
// 6, 24, 126, 6, 12, 24, 4, 6).
print("importTables: customers=" + twinIntText(Table("customers").numRows)
	+ " accounts=" + twinIntText(Table("accounts").numRows)
	+ " transactions=" + twinIntText(Table("transactions").numRows)
	+ " alerts=" + twinIntText(Table("alerts").numRows)
	+ " request_catalog=" + twinIntText(Table("request_catalog").numRows)
	+ " evidence_catalog=" + twinIntText(Table("evidence_catalog").numRows)
	+ " due_events=" + twinIntText(Table("due_events").numRows)
	+ " initial_state=" + twinIntText(Table("initial_state").numRows));
return 1;
