const surfaces = [
  {
    name: "劇本播放器",
    detail: "依 data/cases 的節點前進。尚未接上 API。",
  },
  {
    name: "儀表板",
    detail: "顯示同一個孿生狀態與事件。尚未接上 API。",
  },
];

export function App() {
  return (
    <main>
      <p className="eyebrow">COMP3424 demo · scaffold</p>
      <h1>TwinAML</h1>
      <p className="lead">
        數位孿生 AML 模擬培訓。這個頁面只是 Web 客戶端佔位，播放器與儀表板都還沒做。
      </p>
      <ul>
        {surfaces.map((item) => (
          <li key={item.name}>
            <strong>{item.name}</strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ul>
      <p className="note">
        範例劇本：<code>data/cases/deepfake-hk-001.example.json</code>
        。API 佔位：<code>GET /health</code>。
      </p>
    </main>
  );
}
