import { useState } from 'react';

export function App() {
  const [health, setHealth] = useState<string>('—');

  async function checkApi() {
    const res = await fetch('/api/health');
    const data = await res.json();
    setHealth(JSON.stringify(data));
  }

  return (
    <main className="page">
      <h1>Taxi.Rio</h1>
      <p>UI mínima — Parte 1 (compose fundação)</p>
      <button type="button" onClick={() => void checkApi()}>
        Testar API /health
      </button>
      <pre>{health}</pre>
    </main>
  );
}
