import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

/**
 * Smoke de carga (Parte 2): POST /corridas + GET /corridas/:id com JWT passageiro.
 *
 * Variáveis:
 *   BASE_URL   — default http://localhost:3000
 *   JWT_TOKEN  — Bearer RS256 (obrigatório)
 */
export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 2),
      duration: __ENV.DURATION || '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
    'http_req_duration{endpoint:post_corrida}': ['p(95)<3000'],
    'http_req_duration{endpoint:get_corrida}': ['p(95)<1500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN;

export function setup() {
  if (!JWT_TOKEN) {
    throw new Error(
      'Defina JWT_TOKEN (ex.: export JWT_TOKEN=$(bun scripts/mint-jwt.ts passageiro))',
    );
  }
  return { token: JWT_TOKEN };
}

export default function (data) {
  const authHeaders = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
    'idempotency-key': uuidv4(),
  };

  const postRes = http.post(
    `${BASE_URL}/corridas`,
    JSON.stringify({
      origem: `Origem k6 VU${__VU}`,
      destino: `Destino k6 iter ${__ITER}`,
    }),
    { headers: authHeaders, tags: { endpoint: 'post_corrida' } },
  );

  const postOk = check(postRes, {
    'POST /corridas 201 ou 200 (idempotência)': (r) =>
      r.status === 201 || r.status === 200,
  });

  if (!postOk) {
    return;
  }

  let corridaId;
  try {
    corridaId = postRes.json('id');
  } catch {
    return;
  }

  const getRes = http.get(`${BASE_URL}/corridas/${corridaId}`, {
    headers: { Authorization: `Bearer ${data.token}` },
    tags: { endpoint: 'get_corrida' },
  });

  check(getRes, {
    'GET /corridas/:id 200': (r) => r.status === 200,
    'GET retorna mesmo id': (r) => r.json('id') === corridaId,
    'GET status SOLICITADA': (r) => r.json('status') === 'SOLICITADA',
  });

  sleep(Number(__ENV.SLEEP || 0.3));
}
