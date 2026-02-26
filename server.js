// server.js (CommonJS)
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const EXECUTOR_ABI = require("./abi/executorAbi");
const { proofRouter, fetchProof } = require("./services/proof");
const { WalletManager } = require("./services/walletManager");

const PORT = parseInt(process.env.PORT || "7002", 10);
const RPC_URL = process.env.RPC_URL || "https://atlantic.dplabs-internal.com";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0xC7eA1B52D20d0B4135ae5cc8E4225b3F12eA279B";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const PRIVATE_KEYS = String(process.env.PRIVATE_KEYS || "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

if (!ethers.isAddress(CONTRACT_ADDRESS)) {
  throw new Error("Invalid CONTRACT_ADDRESS");
}
if (!RPC_URL) {
  throw new Error("Missing RPC_URL");
}
if (!PRIVATE_KEYS.length) {
  throw new Error("Missing PRIVATE_KEYS in .env");
}

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN, credentials: false }));

// Proof endpoint: GET /proof?pairs=0,1,2
app.use("/", proofRouter);

const provider = new ethers.JsonRpcProvider(RPC_URL);
const walletManager = new WalletManager({ provider, privateKeys: PRIVATE_KEYS });

function getContract(signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, EXECUTOR_ABI, signer);
}

function badRequest(res, msg) {
  return res.status(400).json({ error: msg });
}

app.get("/health", async (req, res) => {
  res.json({
    ok: true,
    chainRpc: RPC_URL,
    contract: CONTRACT_ADDRESS,
    wallets: walletManager.getWalletAddresses(),
    time: new Date().toISOString()
  });
});

/**
 * POST /execute/openMarket
 * body: { trader, assetId, isLong, leverage, lotSize, stopLoss, takeProfit, deadline, signature, oracleProof? }
 * - si oracleProof absent: fetchProof([assetId])
 */
app.post("/execute/openMarket", async (req, res) => {
  const b = req.body || {};
  const required = ["trader", "assetId", "isLong", "leverage", "lotSize", "stopLoss", "takeProfit", "deadline", "signature"];
  for (const k of required) if (b[k] === undefined) return badRequest(res, `Missing field: ${k}`);

  try {
    const trader = b.trader;
    const assetId = Number(b.assetId);
    const isLong = Boolean(b.isLong);
    const leverage = Number(b.leverage);
    const lotSize = Number(b.lotSize);
    const stopLoss = Number(b.stopLoss);
    const takeProfit = Number(b.takeProfit);
    const deadline = String(b.deadline);
    const signature = String(b.signature);

    if (!ethers.isAddress(trader)) return badRequest(res, "Invalid trader address");
    if (!Number.isFinite(assetId) || assetId < 0) return badRequest(res, "Invalid assetId");

    const oracleProof = b.oracleProof ? String(b.oracleProof) : await fetchProof([assetId]);

    const tx = await walletManager.send(async (signer, overrides) => {
      const c = getContract(signer);
      return c.executeOpenMarket(
        trader,
        assetId,
        isLong,
        leverage,
        lotSize,
        stopLoss,
        takeProfit,
        deadline,
        oracleProof,
        signature,
        overrides
      );
    });

    res.json({ ok: true, txHash: tx.hash });
  } catch (e) {
    console.error("openMarket error:", e);
    res.status(500).json({ error: e.message || "openMarket failed" });
  }
});

/**
 * POST /execute/closeMarket
 * body: { trader, tradeId, assetId, lotsToClose, deadline, signature, oracleProof? }
 * - si oracleProof absent: fetchProof([assetId])
 */
app.post("/execute/closeMarket", async (req, res) => {
    const b = req.body || {};
    const required = ["trader", "tradeId", "assetId", "lotsToClose", "deadline", "signature"];
    for (const k of required) if (b[k] === undefined) return badRequest(res, `Missing field: ${k}`);
  
    try {
      const trader = b.trader;
      const tradeId = b.tradeId;
      const assetId = Number(b.assetId);
      const lotsToClose = Number(b.lotsToClose);
      const deadline = String(b.deadline);
      const signature = String(b.signature);
  
      if (!ethers.isAddress(trader)) return badRequest(res, "Invalid trader address");
      if (!Number.isFinite(assetId) || assetId < 0) return badRequest(res, "Invalid assetId");
  
      const oracleProof = b.oracleProof ? String(b.oracleProof) : await fetchProof([assetId]);
  
      const tx = await walletManager.send(async (signer, overrides) => {
        const c = getContract(signer);
        return c.executeCloseMarket(trader, tradeId, lotsToClose, deadline, oracleProof, signature, overrides);
      });
  
      res.json({ ok: true, txHash: tx.hash });
    } catch (e) {
      console.error("closeMarket error:", e);
      res.status(500).json({ error: e.message || "closeMarket failed" });
    }
  });

/**
 * POST /execute/placeOrder
 * body: { trader, assetId, isLong, isLimit, leverage, lotSize, targetPrice, stopLoss, takeProfit, deadline, signature }
 */
app.post("/execute/placeOrder", async (req, res) => {
  const b = req.body || {};
  const required = ["trader", "assetId", "isLong", "isLimit", "leverage", "lotSize", "targetPrice", "stopLoss", "takeProfit", "deadline", "signature"];
  for (const k of required) if (b[k] === undefined) return badRequest(res, `Missing field: ${k}`);

  try {
    if (!ethers.isAddress(b.trader)) return badRequest(res, "Invalid trader address");

    const tx = await walletManager.send(async (signer, overrides) => {
      const c = getContract(signer);
      return c.executePlaceOrder(
        b.trader,
        Number(b.assetId),
        Boolean(b.isLong),
        Boolean(b.isLimit),
        Number(b.leverage),
        Number(b.lotSize),
        Number(b.targetPrice),
        Number(b.stopLoss),
        Number(b.takeProfit),
        String(b.deadline),
        String(b.signature),
        overrides
      );
    });

    res.json({ ok: true, txHash: tx.hash });
  } catch (e) {
    console.error("placeOrder error:", e);
    res.status(500).json({ error: e.message || "placeOrder failed" });
  }
});

/**
 * POST /execute/updateSLTP
 * body: { trader, tradeId, newSL, newTP, deadline, signature }
 */
app.post("/execute/updateSLTP", async (req, res) => {
  const b = req.body || {};
  const required = ["trader", "tradeId", "newSL", "newTP", "deadline", "signature"];
  for (const k of required) if (b[k] === undefined) return badRequest(res, `Missing field: ${k}`);

  try {
    if (!ethers.isAddress(b.trader)) return badRequest(res, "Invalid trader address");

    const tx = await walletManager.send(async (signer, overrides) => {
      const c = getContract(signer);
      return c.executeUpdateSLTP(
        b.trader,
        b.tradeId,
        Number(b.newSL),
        Number(b.newTP),
        String(b.deadline),
        String(b.signature),
        overrides
      );
    });

    res.json({ ok: true, txHash: tx.hash });
  } catch (e) {
    console.error("updateSLTP error:", e);
    res.status(500).json({ error: e.message || "updateSLTP failed" });
  }
});

/**
 * POST /execute/addMargin
 * body: { trader, tradeId, amount6, deadline, signature }
 */
app.post("/execute/addMargin", async (req, res) => {
  const b = req.body || {};
  const required = ["trader", "tradeId", "amount6", "deadline", "signature"];
  for (const k of required) if (b[k] === undefined) return badRequest(res, `Missing field: ${k}`);

  try {
    if (!ethers.isAddress(b.trader)) return badRequest(res, "Invalid trader address");

    const tx = await walletManager.send(async (signer, overrides) => {
      const c = getContract(signer);
      return c.executeAddMargin(b.trader, b.tradeId, Number(b.amount6), String(b.deadline), String(b.signature), overrides);
    });

    res.json({ ok: true, txHash: tx.hash });
  } catch (e) {
    console.error("addMargin error:", e);
    res.status(500).json({ error: e.message || "addMargin failed" });
  }
});

/**
 * POST /execute/cancelOrder
 * body: { trader, tradeId, deadline, signature }
 */
app.post("/execute/cancelOrder", async (req, res) => {
  const b = req.body || {};
  const required = ["trader", "tradeId", "deadline", "signature"];
  for (const k of required) if (b[k] === undefined) return badRequest(res, `Missing field: ${k}`);

  try {
    if (!ethers.isAddress(b.trader)) return badRequest(res, "Invalid trader address");

    const tx = await walletManager.send(async (signer, overrides) => {
      const c = getContract(signer);
      return c.executeCancelOrder(b.trader, b.tradeId, String(b.deadline), String(b.signature), overrides);
    });

    res.json({ ok: true, txHash: tx.hash });
  } catch (e) {
    console.error("cancelOrder error:", e);
    res.status(500).json({ error: e.message || "cancelOrder failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Relayer API listening on :${PORT}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Wallets: ${walletManager.getWalletAddresses().join(", ")}`);
});