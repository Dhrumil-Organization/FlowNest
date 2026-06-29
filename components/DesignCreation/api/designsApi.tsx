const API_BASE_URL = "https://your-laravel-app.test/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    const err = new Error((body && body.message) || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

/* ── Main designs (Catalog / MainForm) ──────────────────────────── */

export function listMainDesigns({ category, q } = {}) {
  const params = new URLSearchParams();
  if (category && category !== "ALL") params.set("category", category);
  if (q) params.set("q", q);
  const qs = params.toString();
  return request(`/main-designs${qs ? `?${qs}` : ""}`).then((r) => r.data);
}

export function getMainDesign(id) {
  return request(`/main-designs/${id}`).then((r) => r.data);
}

export function createMainDesign(payload) {
  return request("/main-designs", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((r) => r.data);
}

export function updateMainDesign(id, payload) {
  return request(`/main-designs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }).then((r) => r.data);
}

export function deleteMainDesign(id) {
  return request(`/main-designs/${id}`, { method: "DELETE" });
}

export function checkDesignNameServer(code, selfId) {
  return request("/main-designs/check-name", {
    method: "POST",
    body: JSON.stringify({ code, self_id: selfId ?? null }),
  }).then((r) => r.data);
}

/* ── Colourways (ColorwayForm) ───────────────────────────────────── */

export function listColorways(mainDesignId) {
  return request(`/main-designs/${mainDesignId}/colorways`).then((r) => r.data);
}

export function getNextColorwayCode(mainDesignId) {
  return request(`/main-designs/${mainDesignId}/colorways/next-code`).then((r) => r.data.code);
}

export function createColorway(mainDesignId, payload) {
  return request(`/main-designs/${mainDesignId}/colorways`, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((r) => r.data);
}

/* ── Lookups (pickers) ───────────────────────────────────────────── */

export function listYarnMasters() {
  return request("/yarn-masters").then((r) => r.data);
}

export function listDyedShades() {
  return request("/dyed-shades").then((r) => r.data);
}
