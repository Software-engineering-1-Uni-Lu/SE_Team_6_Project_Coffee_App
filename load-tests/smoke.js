/**
 * k6 smoke test for Cafe Aroma.
 *
 * Usage:
 *   k6 run load-tests/smoke.js
 *
 * Set BASE_URL env var to test against a specific environment:
 *   k6 run -e BASE_URL=https://preview.cafearoma.com load-tests/smoke.js
 */

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95th percentile < 2s
    http_req_failed: ["rate<0.01"], // Less than 1% failed
  },
};

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    "health status 200": (r) => r.status === 200,
    "health response has status field": (r) =>
      JSON.parse(r.body).status !== undefined,
  });

  // Menu page
  const menuRes = http.get(`${BASE_URL}/menu`);
  check(menuRes, {
    "menu page loads": (r) => r.status === 200,
  });

  // Menu items API
  const itemsRes = http.get(`${BASE_URL}/api/menu/items`);
  check(itemsRes, {
    "items API status 200": (r) => r.status === 200,
    "items API returns items": (r) => JSON.parse(r.body).items !== undefined,
  });

  sleep(1);
}
