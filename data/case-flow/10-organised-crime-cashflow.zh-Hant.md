# 10. 無商業目的流水，有組織犯罪指標

本頁供人閱讀。可玩劇本是 [`data/cases/09-triad-cashflow-001.example.json`](../cases/09-triad-cashflow-001.example.json)，`case_id` 為 `hk-triad-cashflow-001`。公開報道的靈感說明在 [`data/cases/README.md`](../cases/README.md)。

## 現實運作流程

手法與邏輯：有組織犯罪網絡透過本地公司戶口，做大規模、高頻率的大額進出。這些帳戶沒有發票、沒有商業合約、沒有薪金紀錄，交易對手多為個人。被銀行查問時，說法是現金生意或批發買賣。

```mermaid
flowchart TD
  flow["本地公司戶口在短期內出現大量、高額的資金進出"]
  blank["交易對手多為個人，用途欄空白，沒有發票、合約或稅務證明"]
  cash["合規人員查問時，客戶口頭說這只是現金生意"]
  indicator["內部風險監測或情報把這組流水標為有組織犯罪得益指標"]
  out["資金隨即被轉移或提現，黑產資金的流轉與清洗完成"]
  flow --> blank --> cash --> indicator --> out
```

`hk-triad-cashflow-001` 的公開報道說明是靈感來源，不是這份劇本裡的客戶檔。

## 培訓平台教學流程

學員角色：資深合規主任，或反洗錢調查員。

核心訓練目標：口頭稱為現金生意，不是有效憑證。內部類型已標示有組織犯罪得益時，只草擬報告並不足夠，必須同時暫停出帳並建議凍結。

```mermaid
flowchart TD
  show["系統顯示公司戶口有大額進出，缺乏發票，且對手為個人"]
  choice1{"決策 1"}
  pass["A. 輕信現金生意標籤並直接放行：較差起點，錯誤處置"]
  edd["B. 索取發票與合約，或先暫停出帳。規則 R1：要求加強盡職審查與止付"]
  r2["客戶交不出任何商業憑證。內部系統隨後標出有組織犯罪得益指標。規則 R2 已觸發"]
  choice2{"決策 2"}
  close["A. 當成一般現金生意結案：忽略 R2，錯誤處置"]
  draft["B. 只草擬可疑交易報告而不止付：不完整出口"]
  freeze["C. 建議凍結並草擬可疑交易報告：符合 R2 的完整出口"]
  show --> choice1
  choice1 --> pass
  choice1 --> edd --> r2 --> choice2
  choice2 --> close
  choice2 --> draft
  choice2 --> freeze
```

在這份劇本裡，只草擬報告而不建議凍結，並不能清除 `R2_OC_INDICATOR`。這個不完整出口列在 [`data/cases/README.md`](../cases/README.md)。
