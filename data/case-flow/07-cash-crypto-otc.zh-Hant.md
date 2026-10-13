# 7. 現金與場外加密貨幣套現

本頁供人閱讀。可玩劇本是 [`data/cases/05-justicegate-crypto-001.example.json`](../cases/05-justicegate-crypto-001.example.json)，`case_id` 為 `hk-justicegate-crypto-001`。公開報道的靈感說明在 [`data/cases/README.md`](../cases/README.md)。

## 現實運作流程

手法與邏輯：受薪零售帳戶收集多筆第三者入帳，再以大額現金提取，以及轉往場外加密貨幣交易商，把資金套現並移走，避開銀行的持續監控。

```mermaid
flowchart TD
  collect["受薪零售帳戶在短時間內收集多筆來源不明的第三者入帳"]
  mismatch["金額與頻率和客戶申報的薪金檔案嚴重不符"]
  pipes["資金走向兩條高風險管道：大額現金提取，以及轉往場外加密貨幣交易商"]
  blank["被問及時，客戶給不出與檔案相符的資金來源，只說是朋友換匯"]
  out["款項經現金與加密貨幣流出，套現與隱匿完成"]
  collect --> mismatch --> pipes --> blank --> out
```

`hk-justicegate-crypto-001` 的公開報道說明是靈感來源，不是這份劇本裡的客戶檔。

## 培訓平台教學流程

學員角色：零售銀行反洗錢警報審查員。

核心訓練目標：客戶交不出與檔案相符的資金來源時，不得把它當成合理解釋。面對現金加上場外加密貨幣的去向，必須止付、建議凍結或上報。

```mermaid
flowchart TD
  show["系統顯示受薪客戶有大額進出，且去向包含場外交易商"]
  choice1{"決策 1"}
  invest["A. 註記為個人投資並直接結案：較差起點，忽略風險"]
  edd["B. 索取資金來源證明並做加強盡職審查，或先暫停出帳：正確處置"]
  blank["客戶只交出朋友換匯，且無法提供證明。規則 R1：來源空白不得結案"]
  choice2{"決策 2"}
  release["A. 接受朋友換匯說法並放行：覆寫 R1，錯誤處置"]
  hold["B. 維持暫停出帳、草擬可疑交易報告，或建議凍結：符合 R2"]
  show --> choice1
  choice1 --> invest
  choice1 --> edd --> blank --> choice2
  choice2 --> release
  choice2 --> hold
```

檢視的是學員有否拒絕空白來源，以及有否對現金加場外交易商的路徑止付或上報。
