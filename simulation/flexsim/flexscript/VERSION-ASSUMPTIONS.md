# Version assumptions

STATUS: UNVERIFIED in FlexSim (authored on macOS, not compiled).

## Intended version

**FlexSim 2027.** Reason: `https://help.autodesk.com/view/FLEXSIMIN/2027/ENU/` is the release the
Autodesk Help landing page presents as current ("Welcome to FlexSim 2027 Help"); 2025 and 2026
are also published there. The Windows user should install whichever of these the course licence
covers and record the exact build in `simulation/flexsim/windows/` (the Windows handoff checklist).

## Assumed minimum (assumption, not verified)

**FlexSim 22.0 (2022).** Everything in the `.fs` files uses the dot-syntax FlexScript introduced
with FlexSim 2017 (Table / Array / Map / string classes, `Model.find`, `Object.color`, `Color`
statics). The release article indexed for "FlexSim 2017 Update 2" says `string.toNum()` /
`fromNum()` were added in that release, so the real floor is probably 17.2; 22.0 is chosen as a
conservative floor because the Color class and `Object.setProperty` are later additions whose
exact introduction versions could not be read. Label it an assumption when quoting it.

## What depends on the version

| Area | Used here | If the installed version lacks it |
| --- | --- | --- |
| `Object.color = Color.gray` | `09_updateCaseVisuals.fs` | older builds only have `setColor()` (noted as deprecated in the Object page snippet); use `tok.setColor(0.6, 0.6, 0.6)` style calls with the fallback RGB values in the file |
| `Object.setProperty("Text", ...)` | `twinSetText` | fall back to `getvarnode(o, "text").value = text` (both unconfirmed) |
| `string.fromNum(num, precision)` | `twinIntText`, `twinFmtMinute` | fall back to `numtostring(value, 0, precision)` or the arithmetic version in the comments |
| `Variant.type == VariantType.Number` | `twinNum`, `twinText`, the radio-button mapping in `10_ui_buttons.fs` | set every string column of the snapshot tables to text in the Global Table GUI and replace the checks with direct conversions |
| Array literal `[]` | `recordDecision`, `updateCaseVisuals` | `Array a = Array();` or `Array a = Array(0);` |
| `importtable(table, file, 1)` | `importTables` | import each CSV manually (ASSEMBLY.md step 3b) |
| User Commands with `param(n)` | every command | if the installed version exposes named parameters instead, keep `param(n)` (still supported as far as is known) or rename |
| Dashboard Model Input widgets, OnPress | learner controls | all versions since 2016 have them; the numeric-only combo box is the reason case and decision are typed/radio-mapped |
| User Events "repeat" | optional free-run mode only | not needed for guided mode |

## Not version dependent

- The contract semantics (`CONTRACT.md` 1.0) and the Global Table layout.
- The trace format: `exportEvents()` writes the file itself, so number formatting does not depend
  on `exporttable()` behaviour.
- Row order of the snapshot CSVs equals the contract's phase orderings (checked with Python on
  2026-10-07 against `../data/tables/`); if the CSVs are regenerated with a different sort, the
  three loops that rely on it (`twinPhase1`, `twinPhase3`, release re-check) must sort explicitly
  (for example with `Table.query(... ORDER BY ...)`, unconfirmed).
