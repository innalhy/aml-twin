# TwinAML

數位孿生 AML 模擬培訓。COMP3424 課程示範。

倉庫：[github.com/innalhy/aml-twin](https://github.com/innalhy/aml-twin)

TwinAML 讓學員在一宗合成案例裡做決定。後端保住這次調查的數位孿生：客戶、KYC、交易、風險旗標、結局。畫面只負責把狀態演出來。第一個例子是香港深偽視像開戶（`deepfake-hk-001`），資料全是合成的。

這是平台構想的課程演示，不是銀行生產系統，也不是企業級參考架構。

## 平台與客戶端

數位孿生是後端的狀態加事件。Web 是臉。

| | 角色 |
| --- | --- |
| 平台 | 一個 FastAPI 應用。載入劇本、開 session、收下決策、用規則更新孿生、寫出事件 |
| Web 客戶端 | React + Vite + TypeScript。劇本播放器與簡單儀表板，讀同一份狀態 |
| Unity | 可選的以後客戶端。未要求之前不要加專案。它不擁有另一套孿生 |

播放器不該自己計算合規結論。結論來自劇本裡的規則與之後的狀態機。

## 簡化技術棧

課堂示範用。不要擴成微服務。

| 層 | 選擇 | 現況 |
| --- | --- | --- |
| API | 一個 FastAPI 應用（`backend/`） | 只有 `GET /health` |
| Web | React + Vite + TypeScript（`frontend/`） | 可啟動的佔位頁 |
| 案例 | `data/cases/` 的 JSON 劇本與初始孿生狀態 | 一個深偽分支例子 |
| 媒體 | `data/media/` | 只追蹤 `.gitkeep`。大型 mp4 不進 git |
| 契約 | `packages/schemas/script.schema.json` | 劇本節點的最小 JSON Schema |
| 文件 | `docs/` | 架構與科目對照 |
| 編排 | `docker-compose.yml` | 草圖。預設 profile 不會啟動服務 |

不做：Neo4j、Kafka、服務拆分、Unity 專案、真實銀行連線。

## 資料夾

```
.
├── README.md
├── AGENTS.md
├── AGENT.md                 # 指向 AGENTS.md
├── .gitignore
├── docker-compose.yml       # 草圖，不是正式跑法
├── docs/
│   ├── architecture.md
│   └── comp3424-mapping.md
├── backend/
│   ├── README.md
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       └── main.py          # 健康檢查佔位
├── frontend/
│   ├── README.md
│   └── src/                 # Vite React TS 佔位
├── data/
│   ├── cases/
│   │   └── deepfake-hk-001.example.json
│   └── media/
│       └── .gitkeep
├── packages/
│   └── schemas/
│       └── script.schema.json
└── scripts/
    └── .gitkeep
```

## 如何執行

兩個程序分開跑。先不要靠 `docker compose up`：compose 檔把服務放在 `sketch` profile，只是端口與指令備忘。

API，在 `backend/`：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

`http://127.0.0.1:8000/health` 應回 `{"status":"ok","service":"twinaml-api"}`。

Web，在 `frontend/`：

```bash
npm install
npm run dev
```

開啟 `http://127.0.0.1:5173`。頁面應顯示 TwinAML scaffold，而不是一個已接上案例的播放器。

## Vibe-coding

給代理與自己用的短規則。完整版在 `AGENTS.md`。

1. 一次只做一小步。做完要能說出學員多看到了什麼。
2. 守住上面的技術棧。不要順手加資料庫叢集、訊息佇列或第二個前端。
3. 案例形狀以 `packages/schemas/script.schema.json` 與 `data/cases/deepfake-hk-001.example.json` 為準。
4. 規則先於 AI。模型可以之後解釋，不能悄悄改結局。
5. 文件可中英並用。課程詞彙保持英文：mirroring、shadowing、threading、Chan Level 1、Chan Level 2。
6. 不提交密鑰與大型媒體。

架構說明：`docs/architecture.md`。科目對照：`docs/comp3424-mapping.md`。

## English

TwinAML is a course demo of a digital twin for AML simulation training. The twin is backend state plus events. The web app is the face. Unity may later be another face on the same API. The stack is one FastAPI app, one Vite React TypeScript client, and JSON case scripts. The checked-in example is a synthetic Hong Kong deepfake onboarding branch. Large media and secrets stay out of git.

## 授權

TwinAML 的平台構想與本倉庫內容版權所有（All rights reserved）。

本倉庫供 COMP3424 課程示範。沒有附上 OSI 授權，不要把它當成開源專案再散布，或拿去做成商業產品。使用與改作以擁有者的許可為準。
