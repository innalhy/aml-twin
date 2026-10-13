# 1. 深偽高層冒充案（Deepfake Executive Impersonation）

可玩劇本仍在 [`data/cases/01-deepfake-hk-001.example.json`](../cases/01-deepfake-hk-001.example.json)，`case_id` 為 `deepfake-hk-001`。本頁供人閱讀，說明這個深偽案例的現實運作流程與培訓平台教學流程。

## 現實運作流程

手法與邏輯：騙徒運用心理社交工程，搭配數碼合成技術，欺騙擁有付款權限的員工完成看起來合法的轉帳。騙徒無需入侵銀行或資訊科技系統。

```mermaid
flowchart TD
  email["騙徒假冒財務總監或高層，發出初始電郵或訊息"]
  claim["聲稱有機密、緊急或不可公開的收購或投資交易"]
  doubt["員工起初存疑，騙徒安排視像會議"]
  video["視像畫面出現數碼生成的財務總監、同事或管理層影像"]
  pressure["權威、緊急、保密、熟悉感，令員工誤以為已獲授權"]
  pay["員工按指示轉帳，通常分多次轉往多個指定戶口"]
  mule["騙徒控制的人頭戶口收款，並快速轉移"]
  email --> claim --> doubt --> video --> pressure --> pay --> mule
```

## 培訓平台教學流程

學員角色：財務專員或付款審批人。

核心訓練目標：視像畫面不等於付款授權證明。高風險付款必須透過獨立、預先設定的渠道核實，例如回撥預留電話，或雙重簽署。

```mermaid
flowchart TD
  mail["學員收到財務總監發出的緊急付款要求電郵"]
  meeting["加入視像會議，看到付款金額與收款人資料"]
  choice{"學員決策"}
  approve["A. 立即批准付款：高風險，錯誤處置"]
  docs["B. 要求補充文件：中風險，缺乏即時核實"]
  callback["C. 經獨立已知渠道或電話向本人核實：正確處置"]
  escalate["D. 升級至合規或財務主管作雙重審查：正確處置"]
  outcome["系統顯示資金是否流失或已截停，並提供風險分析"]
  mail --> meeting --> choice
  choice --> approve --> outcome
  choice --> docs --> outcome
  choice --> callback --> outcome
  choice --> escalate --> outcome
```
