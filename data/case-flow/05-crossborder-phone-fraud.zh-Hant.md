# 5. 跨境電話騙案走廊與集團式轉帳

本頁供人閱讀。可玩劇本是 [`data/cases/07-crossborder-tel-001.example.json`](../cases/07-crossborder-tel-001.example.json)，`case_id` 為 `crossborder-tel-001`。公開報道的靈感說明在 [`data/cases/README.md`](../cases/README.md)。

## 現實運作流程

手法與邏輯：犯罪集團針對跨境匯款走廊，例如香港公司付往內地個人戶口。名義上的佣金或代客繳費是掩護。電話騙案所得很快扇出到大量互不相關的個人帳戶。

```mermaid
flowchart TD
  fan["香港公司帳戶在短時間內向數十個內地個人戶口支付大額款項"]
  label["註冊用途標為佣金或服務費"]
  mismatch["銀行合規或通訊員指標顯示，收款人與檔案中的供應商名單不符"]
  nocontract["雙方沒有實質商業合約，收款人彼此也無關聯"]
  corridor["資金是跨境電話騙案得益的扇出轉移通道"]
  cash["款項再被分散提現，切斷執法追蹤"]
  fan --> label --> mismatch --> nocontract --> corridor --> cash
```

`crossborder-tel-001` 的公開報道說明是靈感來源，不是這份劇本裡的客戶檔。

## 培訓平台教學流程

學員角色：跨境合規主任，或交易監測分析員。

核心訓練目標：辨識沒有合約的大量個人收款，以及電話騙案走廊指標。不要輕信客戶口頭改口的代繳或佣金藉口。

```mermaid
flowchart TD
  show["系統顯示某企業客戶頻繁向大量內地個人戶口扇出付款"]
  file["檔案沒有佣金合約，並已觸發通訊員詐騙類型提示"]
  choice{"學員決策"}
  accept["A. 接受口頭的代客繳費或佣金說法並結案：高風險，錯誤處置"]
  edd["B. 暫停對外付款，並對走廊做加強盡職審查：正確處置"]
  report["C. 建議凍結、草擬可疑交易報告，或退出客戶關係：正確處置"]
  closed["若接受口頭說法，扇出仍在進行卻被結案"]
  held["若暫停出帳或上報，走廊不會因口頭說法而結案"]
  show --> file --> choice
  choice --> accept --> closed
  choice --> edd --> held
  choice --> report --> held
```

檢視的是學員在風險指標已經出現時，有否緊守規則，拒絕被動結案。
