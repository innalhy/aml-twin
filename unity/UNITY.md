# TwinAML Unity training room

Immersive Editor face for COMP3424. The office is the training room. Wall panels are the exercise. The Worker and the web app stay the later home for rules. This room does not call the Worker, and it does not start P1-S2.

Phase 1 content is pre-authored. There is no live video generation and no bank connection. Every screen says the interface is synthetic.

## Open it

1. Install **Unity 2022.3 LTS** (this project was written for 2022.3.62f1). Unity 6 can open the same folder and may ask to upgrade. Allow the upgrade if you want. Do not add a render-pipeline package unless you mean to.
2. **Add** or **Open** the project folder `unity/TwinAML` (the folder that contains `Assets` and `ProjectSettings`).
3. The pipeline is the **Built-in Render Pipeline**, so the first Play is not a pink URP screen. To move to URP later: install Universal RP, create a pipeline asset, and assign it under Project Settings → Graphics.
4. First scene: **`Scn_Boot`**. It is scene 0 in Build Settings. Menu: **TwinAML → Play From Boot**. Or open `Assets/Scenes/Scn_Boot.unity` and press Play.
5. On the first Editor open, **TwinAML → Sync Scenes Into Build Settings** runs by itself and keeps every `Scn_*` scene in the build.

Docker is not used.

Case JSON is read from `data/cases/` next to this Unity project (`Application.dataPath/../../../data/cases`). Do not copy the scripts into the Unity folder. A missing file is shown on the brief panel. The exercise does not invent a second script format.

## What Play does

`FlowController` is created when you press Play. It loads the scene you are in, or `Scn_Boot` if the open scene is not one of ours. UI is built in code (uGUI), so the `.unity` files only need a camera and a light. If a scene is missing from Build Settings, the same controller stays on the current scene and swaps panels. With the build list in place, it calls `SceneManager.LoadScene` for the scene id.

Sign in with any display name. It is stored only in the local dashboard snapshot.

| Step | Scene |
| --- | --- |
| Boot | `Scn_Boot` |
| Sign-in | `Scn_Login` |
| Room note | `Scn_Intro` |
| Topics | `Scn_TopicsHub` |
| AML Training Portal | `Scn_Dashboard` |
| Language | `Scn_Settings` |

Both **Start** buttons on the hub are orange `#f5a524`.

Boot, sign-in, the room note, the hub, settings, and both topics use the same chrome as the training portal: a navy header with the TwinAML mark and the title TwinAML — AML Training Portal, a synthetic-training strip, a light gray page, and white rounded cards in a centered column. Forward actions are blue `#2f6fed`. Back actions are a lighter blue. Trap choices stay red and pass choices stay green, so the grade is still visible on the light page.

Topic panels add a step line under that strip. The current step is blue and bold. Earlier steps are green. Later steps are gray. A thin bar fills up to the current step.

| Topic | Steps | Scenes on the highlighted step |
| --- | --- | --- |
| Topic 1 | Brief → Inbox → Meeting → Decision → Feedback | Decision is the payment desk or hold-and-report. Feedback is the trap, the pass, and the teach panel. |
| Topic 2 | Brief → Statement → Chain → Decision → Feedback | Feedback is either miss or pass. |

## Scene map

```mermaid
flowchart TD
  boot[Scn_Boot] --> login[Scn_Login]
  login --> intro[Scn_Intro]
  intro --> hub[Scn_TopicsHub]
  hub --> dash[Scn_Dashboard]
  hub --> settings[Scn_Settings]
  hub --> t01b[Scn_T01_Brief]
  hub --> t02b[Scn_T02_Brief]
  t01b --> inbox[Scn_T01_Inbox]
  inbox --> meet[Scn_T01_Meeting]
  meet --> pay[Scn_T01_PayDesk]
  meet --> report[Scn_T01_Report]
  pay --> trap[Scn_T01_Trap]
  report --> pass[Scn_T01_Pass]
  pass --> teach[Scn_T01_Teach]
  trap --> hub
  trap --> dash
  teach --> hub
  teach --> dash
  t02b --> statement[Scn_T02_Statement]
  statement --> chain[Scn_T02_Chain]
  chain --> decision[Scn_T02_Decision]
  decision --> miss[Scn_T02_FeedbackA]
  decision --> ok[Scn_T02_FeedbackPass]
  miss --> hub
  miss --> dash
  ok --> hub
  ok --> dash
```

## Topics and case ids

| Topic | case_id | File | Pedagogy |
| --- | --- | --- | --- |
| T01 Deepfake | `deepfake-hk-001` | `data/cases/01-deepfake-hk-001.example.json` | Trap = confirm the payment. Pass = withhold trust and report (暫停並舉報). |
| T02 Mule and mixer | `hk-greythunder-mule-001` | `data/cases/06-greythunder-mule-001.example.json` | A = miss. B / C / D = pass: enhanced due diligence, outbound hold, draft STR. |

T02 uses the mule-cluster script. The chain panel also draws the mixer picture from [`data/case-flow/02-crypto-mixers-mule-accounts.en.md`](../data/case-flow/02-crypto-mixers-mule-accounts.en.md). That picture is teaching context. It is not a second script, and it does not add effect keys. `hk-justicegate-crypto-001` is the nearby cash-and-OTC script and is not the one this room plays.

### Choice → frozen script path

The room logs the button id, the time the decision panel was shown, and the time you pressed it. It then plays the script choice ids below with the schema 0.1 applier (`docs/effects.md`): clone `initial_twin_state`, apply each `twin_patch` on entry, then apply that choice's `effects`.

| Button | Script choices | Disposition | Grade |
| --- | --- | --- | --- |
| T01 Confirm payment | `pass_video`, `clear_alert` | `false_positive_cleared` | Trap. Funds at risk. |
| T01 Hold and report | `redo_liveness`, `follow_r1` | `blocked_by_rule` | Pass. Account stays closed. |
| T02 A Close as a normal investment | `release_friend`, `clear_friend` | `false_positive_cleared` | Trap. Skips the story node. |
| T02 B Enhanced due diligence | `edd_cluster`, `hold`, `exit_rel` | `account_exit` | Pass. |
| T02 C Hold outbound payments | `restrict`, `hold`, `exit_rel` | `account_exit` | Pass. |
| T02 D Draft an STR | `edd_cluster`, `hold`, `str_freeze` | `freeze_recommended` | Pass. STR drafted. |

Check the six paths from the repo root:

```bash
node scripts/unity-room-paths.test.mjs
```

T01's pass records `called_back` and `dual_approval` on the session because you refused a single approval from the video. The frozen script does not draft an STR on that ending: rule R1 stops onboarding before an account exists. The teach panel says so. Drafting an STR is T02 D. STR means a suspicious transaction report. In Hong Kong practice it is filed with the Joint Financial Intelligence Unit. This room only writes a draft flag onto the synthetic twin.

T02 B and C both end as `account_exit`, which this script lists as acceptable. They differ in flags: B orders enhanced due diligence (`EDD_ORDERED`); C places the outbound hold first and does not.

## Twin state and the dashboard

`Scn_Dashboard` is the **TwinAML — AML Training Portal** (TwinAML — 反洗錢培訓平台). It is a light three-column board. Boot, sign-in, the hub, and both topics use the same navy header, light page, and white cards. The brand is TwinAML. The page heading is Overview and Progress (總覽與進度).

The top bar is navy: a T mark, the portal title, a short language toggle, a settings gear, a notices bell, and the signed-in name with the role AML Specialist (反洗錢專員). The name is a label. It does not open a page. Tabs under the bar are Dashboard, My Training, Reports, and Help. Those four tabs stay on `Scn_Dashboard` and swap the page. Reports lists the session reports in the local snapshot (trap rate, reaction time, and the four twin fields). Help explains the tabs, the topic steps, and how the donut is counted. Neither tab opens Settings. The gear is the only control on this bar that opens `Scn_Settings`, and that scene only changes the interface language. A strip under the tabs keeps the synthetic-training line visible.

The catalogue has six modules. The donut is completed modules divided by six, so an empty board reads 0%. A playable module counts as completed when its latest session is a pass. In progress means that latest session was a trap, or the module is open and no choice has been written yet. Remaining is six minus those two counts. Topic 01 and Topic 02 are the modules you can start. Trade-based money laundering and the insurer-control card stay Not Started. Account rental and the featured cross-border card stay locked until Topic 02 has a pass; both remain catalogue cards. Topic 01 uses a blue Continue (or Review once passed). Topic 02 uses an orange Start Module (`#f5a524`) until it is passed. Quick Access (Policy, News, Contact Compliance) posts a training-prop notice.

The mirror is the cloned script state plus patches. These four dashboard fields are written from that mirror and from the room choice. They are not extra keys in the case file.

| Field | When it is true |
| --- | --- |
| `funds_risk` | The disposition is in `teaching.poor_dispositions`, or `R2_IGNORED` is on the mirror. |
| `called_back` | The T01 pass (independent callback instead of paying from the video). |
| `dual_approval` | The room choice marks dual control, or `account.holds` contains `outbound`. |
| `str_filed` | `STR_DRAFTED` is on the mirror, or the disposition is `str_drafted`, `freeze_recommended`, or `cdd_refreshed_and_str`. |

Before any choice, the metrics strip is empty: trap rate (出錯率), mean reaction time, and the four fields stay blank. After a choice, the room appends the session and writes `twinaml-dashboard.json` under `Application.persistentDataPath`. That write is unchanged. The strip reads the same list: trap rate is completed traps divided by completed exercises, reaction time is the mean, and the four fields are the latest session. The path of the snapshot is on the strip. The Reports tab repeats each session as its own report card (disposition, flags, risk score, the four fields, choice id, script choice ids, and reaction time). The left column of the overview also lists recent completions and the pass or trap badge.

The meeting panel has a video slot for `media_ref` (`data/media/deepfake-hk-001/kyc-clip.mp4`). If the file is absent, the slot says so and the exercise continues. Phase 1 does not generate a clip.

## Language

The header switches **English** and **繁體中文** with a short 繁 / EN toggle on the portal and on the exercise screens. Chinese copy is formal written Traditional Chinese for a bank compliance room, not spoken Cantonese. Script prompts stay in the Traditional Chinese of the case file either way. The embedded font is a subset of WenQuanYi Micro Hei (Apache 2.0) so those characters can draw without a local CJK install. See `Assets/Fonts/NOTICE.txt`.

## What this folder does not do

- It does not change `packages/schemas/script.schema.json` or the eleven case files.
- It does not implement Worker routes or P1-S2.
- It does not connect to a bank, HKMA, or the JFIU.
- It does not require Docker.
