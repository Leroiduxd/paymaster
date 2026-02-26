// services/proof.js (CommonJS) — inclut le client Supra DORA inline
const express = require("express");
const fetch = require("node-fetch"); // v2 (CJS)

// ── Config via env (avec fallback)
const DORA_RPC = process.env.DORA_RPC || "https://rpc-testnet-dora-2.supra.com";
const DORA_CHAIN = process.env.DORA_CHAIN || "evm";

class PullServiceClient {
  constructor(address) {
    this.address = address.replace(/\/+$/, "");
    this.timeoutMs = 12_000;
  }

  async _post(url, body) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url} :: ${text.slice(0, 200)}`);
      }
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  async getProof({ pair_indexes, chain_type }) {
    if (!Array.isArray(pair_indexes) || pair_indexes.length === 0) {
      throw new Error("pair_indexes must be a non-empty array");
    }
    const chain = chain_type || "evm";

    const endpoints = [
      {
        url: `${this.address}`,
        body: { id: 1, jsonrpc: "2.0", method: "get_proof", params: { pair_indexes, chain_type: chain } },
        pick: (j) => j?.result?.proof_bytes || j?.result?.proofBytes || j?.proof_bytes || j?.proofBytes
      },
      {
        url: `${this.address}/rpc`,
        body: { id: 1, jsonrpc: "2.0", method: "get_proof", params: { pair_indexes, chain_type: chain } },
        pick: (j) => j?.result?.proof_bytes || j?.result?.proofBytes || j?.proof_bytes || j?.proofBytes
      },
      {
        url: `${this.address}/v2/pull/get_proof`,
        body: { pair_indexes, chain_type: chain },
        pick: (j) => j?.proof_bytes || j?.proofBytes || j?.data?.proof_bytes || j?.data?.proofBytes
      },
      {
        url: `${this.address}/pull-service/get_proof`,
        body: { pair_indexes, chain_type: chain },
        pick: (j) => j?.proof_bytes || j?.proofBytes || j?.data?.proof_bytes || j?.data?.proofBytes
      },
      {
        url: `${this.address}/get_proof`,
        body: { pair_indexes, chain_type: chain },
        pick: (j) => j?.proof_bytes || j?.proofBytes || j?.data?.proof_bytes || j?.data?.proofBytes
      }
    ];

    let lastErr;
    for (const cand of endpoints) {
      try {
        const json = await this._post(cand.url, cand.body);
        const proof = cand.pick(json);
        if (proof) return { proof_bytes: String(proof) };
        if (json?.data?.proof_bytes) return { proof_bytes: String(json.data.proof_bytes) };
        lastErr = new Error(`No proof_bytes in response from ${cand.url}`);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Unable to fetch proof from any known endpoint");
  }
}

const router = express.Router();
const client = new PullServiceClient(DORA_RPC);
const cache = new Map(); // key = "0,1,2" ; value = { proof, timestamp }

async function fetchProof(pairIndexes) {
  const key = [...pairIndexes].sort((a, b) => a - b).join(",");
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.timestamp < 1000) return cached.proof;

  const data = await client.getProof({ pair_indexes: pairIndexes, chain_type: DORA_CHAIN });
  const proofBytes = data.proof_bytes;
  const proof = String(proofBytes).startsWith("0x") ? String(proofBytes) : "0x" + String(proofBytes);

  cache.set(key, { proof, timestamp: now });
  return proof;
}

router.get("/proof", async (req, res) => {
  const query = req.query.pairs;
  if (!query) return res.status(400).json({ error: "Missing ?pairs=0,1,2" });

  const pairIndexes = String(query)
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  if (!pairIndexes.length) return res.status(400).json({ error: "No valid pair indexes" });

  try {
    const proof = await fetchProof(pairIndexes);
    res.json({ proof });
  } catch (e) {
    console.error("[Proof] error:", e?.response?.data || e.message);
    res.status(503).json({ error: "Failed to fetch proof" });
  }
});

module.exports = { proofRouter: router, fetchProof };