# 4. 貿易洗錢（Trade-Based Money Laundering）

本頁供人閱讀。可玩劇本是 [`data/cases/02-daybreak-tbml-001.example.json`](../cases/02-daybreak-tbml-001.example.json)，`case_id` 為 `daybreak-tbml-001`。公開報道的靈感說明在 [`data/cases/README.md`](../cases/README.md)。

## 現實運作流程

手法與邏輯：犯罪集團以國際貿易作掩護。貨物價值被虛高或虛構，發票與貨運文件對不上。非法資金以貿易貨款的名義跨境轉移。

```mermaid
flowchart TD
  shell["空殼公司或貿易商提交進出口文件，例如聲稱經營珠寶或鑽石"]
  mismatch["申報的貿易走廊或商品價值，與公司規模嚴重不符"]
  third["貨款由發票上的買家以外的人支付"]
  noship["沒有提單、海關紀錄或庫存等實際貨運證據"]
  split["款項到帳後同日拆帳，轉往與貿易無關的個人或海外戶口"]
  clean["資金完成跨國轉移。表面上看似正常商業貿易"]
  shell --> mismatch --> third --> noship --> split --> clean
```

公開報道裡，這類手法會用空殼公司做出大額虛假貿易流，用來避開外匯管制與合規審查。香港海關曾公布的珠寶貿易洗錢報道，是 `daybreak-tbml-001` 的靈感來源，不是這份劇本裡的客戶檔。

## 培訓平台教學流程

學員角色：銀行貿易融資人員，或企業合規審查員。

核心訓練目標：看出文件缺口，包括沒有貨運證據、以及第三者付款。不要把缺口當成單據在途或一般商業時差。

```mermaid
flowchart TD
  review["學員覆核企業客戶的珠寶出口帳戶與交易檔"]
  gaps["兩個風險：沒有貨運證據，以及買賣雙方與付款人不一致"]
  choice{"學員決策"}
  release["A. 接受單據在途並放行：高風險，錯誤處置"]
  edd["B. 加強盡職審查並暫停出帳：正確處置"]
  str["C. 草擬可疑交易報告，或建議退出客戶關係：正確處置"]
  alert["若放行，其後的拆帳會觸發違規警報"]
  held["若加強審查或上報，出帳不會按貿易檔放行"]
  review --> gaps --> choice
  choice --> release --> alert
  choice --> edd --> held
  choice --> str --> held
```

放行之後，檢視的是學員有否按劇本裡的規則處理，而不是事後口述。
