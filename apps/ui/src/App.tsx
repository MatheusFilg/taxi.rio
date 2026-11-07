import { useCallback, useEffect, useState } from 'react';

type Perfil = 'passageiro' | 'motorista';

const STORAGE_KEY = 'taxi.jwt';

const sampleTokensHint =
  'Gere com: bun run mint-jwt passageiro | motorista (na raiz do repo)';

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [perfil, setPerfil] = useState<Perfil>('passageiro');
  const [origem, setOrigem] = useState('Copacabana');
  const [destino, setDestino] = useState('Centro');
  const [corridaId, setCorridaId] = useState('');
  const [statusCorrida, setStatusCorrida] = useState('ACEITA');
  const [log, setLog] = useState<string>('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, token);
  }, [token]);

  const headers = useCallback(() => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token.trim()) h.authorization = `Bearer ${token.trim()}`;
    return h;
  }, [token]);

  async function criarCorrida() {
    const key = crypto.randomUUID();
    const res = await fetch('/api/corridas', {
      method: 'POST',
      headers: {
        ...headers(),
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ origem, destino }),
    });
    const text = await res.text();
    setLog(`POST /corridas [${res.status}]\n${text}`);
    if (res.ok) {
      try {
        const data = JSON.parse(text) as { id: number };
        setCorridaId(String(data.id));
      } catch {
        /* ignore */
      }
    }
  }

  async function buscarCorrida() {
    if (!corridaId) return;
    const res = await fetch(`/api/corridas/${corridaId}`, { headers: headers() });
    const text = await res.text();
    setLog(`GET /corridas/${corridaId} [${res.status}]\n${text}`);
  }

  async function atualizarStatus() {
    if (!corridaId) return;
    const res = await fetch(`/api/corridas/${corridaId}/status`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ status: statusCorrida }),
    });
    const text = await res.text();
    setLog(`PATCH /corridas/${corridaId}/status [${res.status}]\n${text}`);
  }

  return (
    <main className="page">
      <h1>Taxi.Rio</h1>
      <p className="hint">UI mínima — Parte 1 (JWT + corridas)</p>

      <section>
        <h2>Token JWT</h2>
        <p className="hint">{sampleTokensHint}</p>
        <label>
          Perfil ativo (referência)
          <select
            value={perfil}
            onChange={(e) => setPerfil(e.target.value as Perfil)}
          >
            <option value="passageiro">Passageiro</option>
            <option value="motorista">Motorista</option>
          </select>
        </label>
        <textarea
          rows={4}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Cole o Bearer token aqui"
        />
      </section>

      {perfil === 'passageiro' && (
        <section>
          <h2>Passageiro — nova corrida</h2>
          <label>
            Origem
            <input value={origem} onChange={(e) => setOrigem(e.target.value)} />
          </label>
          <label>
            Destino
            <input value={destino} onChange={(e) => setDestino(e.target.value)} />
          </label>
          <button type="button" onClick={() => void criarCorrida()}>
            Criar corrida
          </button>
        </section>
      )}

      <section>
        <h2>Acompanhar corrida</h2>
        <label>
          ID
          <input value={corridaId} onChange={(e) => setCorridaId(e.target.value)} />
        </label>
        <button type="button" onClick={() => void buscarCorrida()}>
          GET status
        </button>
      </section>

      {perfil === 'motorista' && (
        <section>
          <h2>Motorista — alterar status</h2>
          <label>
            Novo status
            <select
              value={statusCorrida}
              onChange={(e) => setStatusCorrida(e.target.value)}
            >
              <option value="ACEITA">ACEITA</option>
              <option value="EM_ANDAMENTO">EM_ANDAMENTO</option>
              <option value="FINALIZADA">FINALIZADA</option>
              <option value="CANCELADA">CANCELADA</option>
            </select>
          </label>
          <button type="button" onClick={() => void atualizarStatus()}>
            PATCH status
          </button>
        </section>
      )}

      <pre className="log">{log}</pre>
    </main>
  );
}
