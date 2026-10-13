const surfaces = [
  {
    name: "Scenario player",
    detail: "Walks nodes from data/cases. Not connected to the API yet.",
  },
  {
    name: "Dashboard",
    detail: "Shows the same twin state and events. Not connected to the API yet.",
  },
];

export function App() {
  return (
    <main>
      <p className="eyebrow">COMP3424 demo · scaffold</p>
      <h1>TwinAML</h1>
      <p className="lead">
        Digital twin for AML simulation training. This page is the web client
        placeholder. The player and the dashboard are not built yet.
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
        Example script: <code>data/cases/01-deepfake-hk-001.example.json</code>.
        API stub: <code>GET /health</code> on the Cloudflare Worker.
      </p>
    </main>
  );
}
