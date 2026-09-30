# TwinAML API（佔位）

一個 FastAPI 應用，之後負責：

- 載入 `data/cases/` 的劇本（`script_json`）
- 開設培訓 session
- 收下學員決策
- 用明確規則更新數位孿生狀態，並寫出事件

現在只有 `GET /health`。沒有資料庫、沒有案例路由、沒有狀態機。

## 執行

在 `backend/` 目錄：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

然後開啟 `http://127.0.0.1:8000/health`。

預期回應：`{"status":"ok","service":"twinaml-api"}`。
