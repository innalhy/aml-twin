# COMP3424 對照

科目：[COMP3424 Digital Twins: Simulation and Case Studies](https://www.polyu.edu.hk/comp/docdrive/ug/subject/COMP3424.pdf)（香港理工大學，3 學分）。科目要求理解數位孿生、模擬，以及如何把孿生接到人工智慧；應用場景包含政府與其他非工廠例子。TwinAML 用 **AML 模擬培訓** 當案例，而不是 FlexSim 產線。

下面三組詞是本 demo 的教學合同。Chan Level 1 / Level 2 在這裡指兩級交付：先做出鏡像，再讓一次培訓跟上它。這是作業範圍，不是把工廠數位孿生的多級成熟度模型整套搬進來。Mirroring、shadowing、threading 採用工業數位孿生裡常見的三項能力講法（Jiang, Yin, Li, Luo, Kaynak, *Industrial applications of digital twins*, 2021；Saracco 的 mirror / shadow / thread）。三項能力都收在同一個簡化後端，不另起企業架構。

## Chan Level 1 — 劇本鏡像

**本倉庫現在這一層。**

Level 1 是一宗案例的數位模型。物理世界在這個 demo 裡不是工廠，而是一場合成調查：客戶、KYC 訊號、戶口、交易、風險旗標。

- 鏡子就是 `data/cases/deepfake-hk-001.example.json` 的 `initial_twin_state` 加 `nodes`。
- 還沒有 session runtime。人可以讀 JSON，說出孿生在任何決策之前相信什麼。
- 分支是寫死的劇本，不是即時感測。

完成 Level 1 的判準：一份能通過 `packages/schemas/script.schema.json` 的案例檔，而且規則寫在檔內，不是寫在聊天裡。

## Chan Level 2 — 培訓影子

**下一階段，仍在同一個 FastAPI 應用裡。現在未做。**

Level 2 讓一次 session 陰影著學員。學員的選擇變成事件，事件更新孿生，儀表板只讀那份狀態。

- 資料方向：學員操作 → 決策事件 → 孿生狀態 → Web。
- 孿生不會回頭控制真實銀行系統。沒有這條反向控制，它仍是 shadow，不是接上生產環境的雙向 twin。
- 兩條不同選擇必須得到兩份不同的狀態快照。

完成 Level 2 的判準：同一案例走「拒絕開戶」與「開戶後結為誤報」，儀表板看得到不同的 `disposition` 與旗標，而且順序事件可以重播。

再往上（雙向控制真實系統、自主代理、Unity）不在這個 demo。

## Mirroring、shadowing、threading

| 能力 | 在 TwinAML 裡 | 這次 scaffold 有沒有 |
| --- | --- | --- |
| **Mirroring** | 把調查世界投影成離線模型：客戶、訊號、戶口、規則、劇本節點 | 有，在範例 JSON |
| **Shadowing** | 學員一做決定，孿生就跟上。儀表板顯示當前狀態，而不是另一份手改數字 | 未做。Level 2 |
| **Threading** | 把劇本版本、決策順序、覆寫、結局串成一條可回放的紀錄。解釋「為什麼出現這個旗標」時讀這條線，不靠記憶 | 未做。事件紀錄是 thread，不是跨系統資料湖 |

媒體檔不是孿生。影片只是節點上的 `media_ref`。大檔留在本機 `data/media/`。

## Rules before AI

合規結論先由規則與狀態機產生。

範例裡：

- **R1**：連續兩次活體失敗 → 不得開戶。學員可以覆寫，但 `R1_OVERRIDDEN` 必須留在狀態裡。
- **R2**：已有深偽訊號，再加上第三者資金突發 → 必須上報或加強審查。直接結為誤報是較差路徑（`false_positive_cleared`）。

語言模型如果以後加進來，只能在規則觸發之後解釋或起草敘述。它不是評分本體，也不能在沒有覆寫事件的情況下改寫 `disposition`。這對應科目裡「把孿生接到 AI」的學習成果：接上去，但不跳過規則。

## 和科目其他題目的邊界

| 科目常見工具或題目 | 本 demo |
| --- | --- |
| 離散事件模擬、FlexSim | 不做產線模擬。模擬是分支劇本加上狀態機 |
| IoT 感測 | 學員決策就是輸入事件，沒有感測器 |
| NVIDIA Omniverse、VR、元宇宙 | 不做。Web 是臉 |
| Unity | 可選的以後客戶端，呼叫同一 API |
| 人工智慧 / 機器學習 | 規則之後才考慮，而且不可取代規則 |

## 學員可以怎麼講這份作業

TwinAML Level 1 把一宗香港深偽開戶案例做成可讀的數位鏡像。Level 2 會讓培訓 session 陰影這面鏡子，並用事件 thread 解釋每次風險旗標。判斷先走 R1 / R2，不走模型分數。
