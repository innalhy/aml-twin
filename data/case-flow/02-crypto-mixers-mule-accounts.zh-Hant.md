# 2. 人頭戶與加密貨幣混幣器（Crypto Mixers and Mule Accounts）

本頁供人閱讀。相近的可玩劇本在 `data/cases/`：`hk-mule-rent-001`、`hk-wiseword-amlmonth-001`、`hk-greythunder-mule-001`、`hk-justicegate-crypto-001`。本頁的決策節點是這條教學流程，不是那些劇本節點的逐字對照。

## 現實運作流程

手法與邏輯分兩段。人頭戶分流把受害人的款項逐層轉走。加密貨幣混幣把鏈上直接對應關係切斷。目的是讓調查人員更難把原始詐騙資金連到犯罪者。

```mermaid
flowchart TD
  victim["受害人被騙轉帳"]
  layer1["資金進入第一層人頭戶"]
  layer23["戶主或控制者迅速轉到第二層或第三層戶口"]
  cashout["提現、購買加密貨幣，或轉往海外戶口"]
  deposit["犯罪者把涉案加密貨幣存入混幣器"]
  mix["混幣器把大量不同用戶的資金多次拆分並混合"]
  payout["犯罪者在新的匿名地址收到扣除手續費後的等值加密貨幣"]
  break["鏈上直接對應關係被切斷，資金來源難以直接判斷"]
  victim --> layer1 --> layer23 --> cashout --> deposit --> mix --> payout --> break
```

## 培訓平台教學流程

學員角色：銀行反洗錢分析員，或加密貨幣交易所合規人員。

核心訓練目標：一併看多個風險訊號，再決定加強盡職審查、暫停交易，或草擬可疑交易報告。

```mermaid
flowchart TD
  account["系統展示帳戶數據：突發大額入帳，短期內轉往多個戶口或交易所"]
  chain["提供鏈上資料：資金最終流向與混幣器相關的地址"]
  choice{"學員決策"}
  clear["A. 直接結案為正常投資：高風險，忽略風險訊號"]
  edd["B. 要求資金來源證明：加強盡職審查，並限制出帳"]
  str["C. 草擬可疑交易報告，並建議凍結戶口"]
  exit["D. 啟動客戶關係退出"]
  feedback["系統評估學員是否看出資金流與客戶背景不符，以及混幣器關聯"]
  account --> chain --> choice
  choice --> clear --> feedback
  choice --> edd --> feedback
  choice --> str --> feedback
  choice --> exit --> feedback
```
