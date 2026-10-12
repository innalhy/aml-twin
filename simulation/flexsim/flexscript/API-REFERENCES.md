# FlexSim APIs used, with evidence level

STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).

## How the research went (so the evidence levels make sense)

- Autodesk Help (`help.autodesk.com/view/FLEXSIMIN/<2025|2026|2027>/ENU/`) is the only official
  host. From the authoring machine **every content page returned "Page Not Found"**: the API guid
  the site's own search returned for "Table"
  (`?guid=FlexSim_User_Manual_reference_codinginflexsim_flexscriptapireference_data_table_html`),
  the "Importing Data into Global Tables" result clicked inside the site, and even the landing
  page's own "Welcome to FlexSim" link. Only the landing page and the search-result list rendered.
  A WebFetch of a Google-indexed 2025 page also returned the 404 shell. The pages exist in the
  search index, so this is most likely a client-side routing or region problem, not missing
  content; the Windows user should open the same guids in FlexSim's installed help (F1).
- `docs.flexsim.com` is dead (Cloudflare origin error); archives were off limits by rule.
- Therefore **confirmed-official = 0**. The best available level is **secondary-source**: the text
  a web-search engine summarised from a legacy `docs.flexsim.com` page (official content, but read
  through a snippet, not opened; the legacy version number is in the URL). A secondary-source row
  carries the full legacy URL the snippet was attributed to, labelled "legacy URL, host offline
  since 2026". Where the URL is a section path recorded without a file name it is marked
  "(folder form)": it is the address the search engine showed, and may have resolved to that
  section's index page. Rows whose only evidence was a community or Autodesk forum post whose
  full URL was not recorded are **unconfirmed**; the post id is kept as a lead, not a citation.
  Everything else is **unconfirmed** with the best-known signature and the page it should be on.
- Budget used: 24 of the 25 allowed fetches/navigations/searches (4 web searches for discovery,
  1 WebFetch, 7 browser navigations/clicks on Autodesk Help, 12 targeted web searches).

Totals (counted from the status column of the three tables below): confirmed-official **0**,
secondary-source **26**, unconfirmed **24**, rows **50**.

## How to confirm on Windows

No API in this file was confirmed against an official page from macOS. The Windows session
confirms them in two ways, in this order:

1. **The installed manual.** FlexSim installs its user manual locally: Help menu > "User Manual"
   (or F1 from any code editor), which opens the `help` folder of the FlexSim installation
   directory (for example `C:\Program Files\FlexSim <year>\help\`). Open the FlexScript API
   Reference there (Reference > Coding in FlexSim > FlexScript API Reference) and the Tools and
   Dashboard pages, and check each row of the tables below. A row that matches becomes
   confirmed-official; a row that does not gets its fallback applied. Record the FlexSim build
   and the outcome per row in `simulation/flexsim/windows/`.
2. **The Script Console smoke tests** in `ASSEMBLY.md` section 3a. Each line exercises one
   unconfirmed call (`string.fromNum` precision, `substr`/`endsWith`, `VariantType`,
   `indexOf`/`replace`) with the expected output in its comment; a wrong result identifies the
   row to fix before any model building starts.

Until both are done, every status below stays as written and the STATUS line of every file in
this folder stays "UNVERIFIED".

## Table of APIs

Columns: name; signature as used; status; evidence (legacy `docs.flexsim.com` URL the search
engine attributed the snippet to, labelled; Autodesk Help guid where known = where it should be
in the current manual); version in the URL; notes. "Table page" below is short for the Table URL
of the first row.

### Tables and data

| API | As used | Status | Evidence | Version shown | Notes |
| --- | --- | --- | --- | --- | --- |
| `Table(string name)` | `Table("run_accounts")` | secondary-source | `https://docs.flexsim.com/en/22.1/Reference/CodingInFlexSim/FlexScriptAPIReference/Data/Table.html` (legacy URL, host offline since 2026; snippet: "If you pass in a string, the string is expected to be the name of a Global Table") | 22.1 | Autodesk guid `..._flexscriptapireference_data_table_html` (404 from here) |
| `Table.numRows` | `t.numRows` | secondary-source | Table page, same legacy URL (snippet lists numRows/numCols) | 22.1 | |
| `Table.addRow()` | `t.addRow()` | secondary-source | Table page, same legacy URL ("adds a row; optional row index and datatype") | 22.1 | used with no arguments = append (assumed) |
| `Table.deleteRow(int)` | `t.deleteRow(t.numRows)` | secondary-source | Table page, same legacy URL (method listed in the snippet) | 22.1 | also seen in answers.flexsim.com question 125274 (URL not recorded; lead only) |
| `Table.getRowByKey` | not used (own `twinFindRow` loop instead) | unconfirmed | answers.flexsim.com questions 105636 and 125368 (URLs not recorded; leads only) | - | listed because ASSEMBLY mentions it as an alternative |
| `Table.query(sql)` | not used; named as the explicit-sort alternative | secondary-source | Table page, same legacy URL ("Executes an SQL query, returning the result as a Table") | 22.1 | a separate "SQL Queries" page (19.1) was indexed but its URL was not recorded |
| `Table.clear()`, `Table.cloneTo()` | not used | secondary-source | Table page, same legacy URL | 22.1 | `cloneTo` requires a tree-bound target |
| `importtable(Table dest, string file, int firstRowHeaders)` | `importtable(dest, dir + name + ".csv", 1)` | secondary-source | `https://docs.flexsim.com/en/24.1/ModelLogic/GlobalTables/ImportingData` (legacy URL, folder form, host offline since 2026; the 25.2 copy was indexed too; snippet shows exactly this call; "anything other than 0 means true"; "always imports all data") | 24.1 / 25.2 | 4th parameter (first column as row headers) unconfirmed, omitted |
| `exporttable(Table, string file, int rowHeaders, int colHeaders)` | fallback only, commented | unconfirmed | Autodesk forum thread "export-global-table-to-csv" (id 13510905) and answers.flexsim.com 24232 (URLs not recorded; leads only) | - | number formatting unknown, hence not used |
| `modeldir()` | `modeldir() + "tables\\"` | secondary-source | same ImportingData legacy URL as `importtable` (snippet: "modeldir() ... path to the current model file") | 24.1 | assumed to end with a path separator |
| Global Tables tool | Toolbox > Global Tables | secondary-source | `https://docs.flexsim.com/en/20.0/Reference/Tools/GlobalTables` (legacy URL, folder form, host offline since 2026); Autodesk guid `FlexSim_User_Manual_reference_tools_globaltables_html` (404 from here) | 20.0 | GUI import button and its menu path unconfirmed; a 25.0 "Key Concepts" page was indexed without a recorded URL |
| Variant `.type`, `VariantType.Number/.String` | `v.type == VariantType.Number` | unconfirmed | expected on `https://docs.flexsim.com/en/22.0/Reference/CodingInFlexSim/FlexScriptAPIReference/Data/Variant.html` (legacy URL; the page was indexed, the members were not seen in a snippet) | - | fallback in VERSION-ASSUMPTIONS.md |
| `Variant/string.toNum()` | `s.toNum()` | secondary-source | `https://docs.flexsim.com/en/22.0/Reference/CodingInFlexSim/FlexScriptAPIReference/Data/Variant.html` (legacy URL, host offline since 2026; snippet lists toNum) | 22.0 | the "FlexSim 2017 Update 2" release article (answers.flexsim.com article 42780, URL not recorded) also names toNum/fromNum |
| `string.split(string delim) -> Array` | `cited.split("\|")` | secondary-source | same Variant legacy URL (snippet: "split() splits a string Variant into an Array. Forwards to string.split()") | 22.0 | |
| `string.fromNum(double num, int precision)` | `string.fromNum(x, 0)` / `(m, 6)` | unconfirmed | expected on the string page of the FlexScript API Reference; existence of fromNum is named by the 2017 Update 2 release article (URL not recorded), the precision parameter by nothing | 17.2+ | fallback `numtostring(x, 0, p)` (also unconfirmed) |
| `string.length`, `string.substr(int start, int len)` | trailing-zero strip, detail parsing | unconfirmed | string page | - | 0-based `substr` assumed |
| `string.startsWith`, `string.endsWith` | `s.endsWith("0")` | unconfirmed | string page | - | |
| `string.indexOf(string)` | `s.indexOf(",")` | unconfirmed | string page | - | fallback legacy `stringsearch(s, ",", 0)` (unconfirmed) |
| `string.replace(string find, string with)` | quote doubling in `twinCsvQuote` | unconfirmed | string page | - | assumed to replace every occurrence |
| `Array` (1-based, `.length`) | `ids[i]`, `ids.length` | secondary-source | `https://docs.flexsim.com/en/19.2/Reference/CodingInFlexSim/FlexScriptAPIReference/Data/Array.html` (legacy URL, host offline since 2026; snippet: "Arrays in FlexSim are 1-based") | 19.2 | |
| Array literal `[a, b]` | `Array names = [...]`, `Array slotCount = [0, 0, 0, 0]` | unconfirmed | Array page (the literal syntax was not in the snippet) | - | fallback `Array a = Array();` |
| `Math.round`, `Math.floor`, `Math.fabs` | formatting, equality tolerance | unconfirmed | expected on the Math page of the FlexScript API Reference | - | standard FlexScript Math class |
| `print(string)` | Script Console echo in `importTables` | unconfirmed | Script Console page (indexed 20.2, URL not recorded) | - | harmless if replaced by `pt()`/`pr()` |

### Model, objects, 3D

| API | As used | Status | Evidence | Version shown | Notes |
| --- | --- | --- | --- | --- | --- |
| `Model.find(string path)` | `Model.find("Q_Incoming")` | secondary-source | `https://docs.flexsim.com/en/24.0/Reference/CodingInFlexSim/FlexScriptAPIReference/Data/Model.html` (legacy URL, host offline since 2026; snippet: "finds a node in the model's subtree by its path") | 24.0 | |
| `Model.time` | optional free-run mode only | secondary-source | same Model legacy URL ("current simulation time") | 24.0 | guided mode never reads it |
| `Object.color` (get/set) | `tok.color = Color.gray` | secondary-source | `https://docs.flexsim.com/en/22.1/Reference/CodingInFlexSim/FlexScriptAPIReference/Tree/Object.html` (legacy URL, host offline since 2026; snippet notes `setColor()` deprecated) | 22.1 | |
| `Color(double r, g, b, a = 1)`, `Color.gray` | fallback constructor noted; `Color.gray` used | secondary-source | `https://docs.flexsim.com/en/24.2/Reference/CodingInFlexSim/FlexScriptAPIReference/Data/Color.html` (legacy URL, host offline since 2026; snippet shows the constructor and a `Color.gray` example) | 24.2 | |
| `Color.blue`, `Color.yellow`, `Color.green` | token colours | unconfirmed | Color page lists statics; only `gray` appeared in the snippet | 24.2 | fallback RGB values in `09_updateCaseVisuals.fs` |
| `Object.location` (Vec3 property) | `Vec3 ql = q.location` | secondary-source | Object page, same legacy URL ("location property to get and set the position") | 22.1 | `Vec3.x/.y/.z` members are a separate unconfirmed row |
| `Vec3.x`, `Vec3.y`, `Vec3.z` | `ql.x + 0.5 + 1.2 * k` | unconfirmed | expected on the Vec3 page of the FlexScript API Reference | - | fallback: `q.getLocation(0)` style accessors (unconfirmed) |
| `Object.setLocation(x, y, z)` | token and label placement | secondary-source | Object page, same legacy URL (signature with optional factors) | 22.1 | |
| `Object.setProperty("Text", string)` | `twinSetText` | unconfirmed | expected on Object page / Text object page | - | fallback `getvarnode(o, "text").value = text` (unconfirmed) |
| `Object.labels.assert(name).value` | display labels on tokens | unconfirmed | Object page ("labels" subnode snippet only) | - | alternative: set labels by hand in the GUI and drop these lines |
| treenode truthiness `if (!o)` / `if (q && tok)` | null checks | unconfirmed | treenode page | - | fallback `objectexists(o)` (unconfirmed) |
| Queue object (Maximum Content, Item Placement) | four status queues | secondary-source | `https://docs.flexsim.com/en/21.2/Reference/3DObjects/FixedResources/Queue/Queue.html` and `https://docs.flexsim.com/en/23.1/Reference/PropertiesPanels/FixedResourcePanels/Queue/Queue.html` (legacy URLs, host offline since 2026; see `../model-design/3d-layout.md`) | 21.2 / 23.1 | queues hold nothing at run time; settings are cosmetic |
| Text visual object (`Label_*`) | captions, clock, hold text | unconfirmed | Library > Visual | - | |
| `delayednodefunction(node code, double delay, ...)` | optional free-run block 3, commented | unconfirmed | answers.flexsim.com questions 101037 and 44689 (URLs not recorded; leads only: "dlnf ... all parameters passed into the triggered function") | - | not needed in guided mode |

### Tools, triggers, UI

| API | As used | Status | Evidence | Version shown | Notes |
| --- | --- | --- | --- | --- | --- |
| User Commands tool (parameters `str num var ...`, return `num str node var`) | every `.fs` block | secondary-source | `https://docs.flexsim.com/en/21.0/Reference/Tools/UserCommands` (legacy URL, folder form, host offline since 2026; snippet: types list; "call it like any other FlexSim command") | 21.0 | |
| `param(int n)` inside a User Command | `string customerId = param(1);` | unconfirmed | expected on the User Commands page | - | long-standing FlexScript convention |
| Model Triggers > OnModelReset | `resetRun();` | secondary-source | `https://docs.flexsim.com/en/24.2/Reference/Tools/ModelTriggers` (legacy URL, folder form, host offline since 2026; snippet: "On Reset - fired when the model is reset") | 24.2 | |
| User Events tool (time + repeat) | optional free-run tick | secondary-source (tool exists) | `https://docs.flexsim.com/en/21.2/Reference/Tools/UserEvents` (legacy URL, folder form, host offline since 2026; title indexed only) | 21.2 | the repeat option is a separate unconfirmed row |
| User Events "repeat" option | optional free-run tick | unconfirmed | same User Events page; option not seen | - | not needed in guided mode |
| Dashboard Button, OnPress | all learner controls | secondary-source | `https://docs.flexsim.com/en/20.0/Reference/Dashboard/Widgets` (legacy URL, folder form, host offline since 2026; snippet: "OnPress trigger that fires when they are pressed") | 20.0 | answers.flexsim.com 57900 also seen (URL not recorded) |
| Edit field linked to a Global Table cell | ui_inputs text inputs | secondary-source | same Dashboard Widgets legacy URL | 20.0 | answers.flexsim.com article 23049 ("eye dropper ... sample the desired node or table cell") also seen, URL not recorded |
| Combo box (numeric values, OnSelect) | optional case selector | unconfirmed | a "ComboboxOptions" page (22.0) was indexed; its URL was not recorded (snippet: "values must be numeric", OnSelect) | 22.0 | why case/decision are text or radio-mapped |
| Radio buttons linked to a numeric cell | decision kind | secondary-source | same Dashboard Widgets legacy URL | 20.0 | mapping 1/2/3 in `10_ui_buttons.fs` |
| Dashboard Table widget showing a Global Table | optional display of learner-visible tables | unconfirmed | Dashboard pages | - | fallback: open the Global Table window from the Toolbox |
| Model Settings > Time units = Minutes | model build step | secondary-source | `https://docs.flexsim.com/en/22.0/Reference/GeneralModelSettings/ModelGeneralProperties` (legacy URL, folder form, host offline since 2026; snippet: Microseconds ... Years, Seconds default) | 22.0 | display only for the twin clock; exact menu path unconfirmed; answers.flexsim.com 111892 also seen (URL not recorded) |
| `fileopen(string)`, `fpt(string)`, `fileclose()` | `exportEvents`, `exportDebrief` | unconfirmed | Autodesk forum threads "can-flexscript-write-to-a-file" (id 13543591) and "export-global-table-to-csv" (id 13510905) showed an fpt/fpc example; URLs not recorded, leads only | - | `"\n"` escape inside `fpt` assumed; these are the only file-writing calls in the folder |
| Script Console | smoke tests in ASSEMBLY.md | unconfirmed | Script Console page indexed (20.2), URL not recorded | 20.2 | View menu, per common usage |

## Unconfirmed list (24)

`Table.getRowByKey`; `exporttable`; `Variant.type` / `VariantType`; `string.fromNum(num, precision)`;
`string.length` / `string.substr` (0-based); `string.startsWith` / `string.endsWith`;
`string.indexOf`; `string.replace`; Array literal `[]`; `Math.round/floor/fabs`; `print()`;
`Color.blue/yellow/green` statics; `Vec3.x/.y/.z`; `Object.setProperty("Text", ...)`;
`Object.labels.assert().value`; treenode truthiness; Text visual object; `delayednodefunction`;
`param(n)`; User Events repeat option; Combo box numeric values / OnSelect; Dashboard Table widget
bound to a Global Table; `fileopen` / `fpt` / `fileclose`; Script Console.
Also unconfirmed as a behaviour (not an API): that a Global Table keeps its column headers at zero
rows (the code avoids zero rows to be safe), that `importtable` types numeric cells as numbers
(the code tolerates either), and that `fpt()` with `"\n"` produces `\n` line endings.
