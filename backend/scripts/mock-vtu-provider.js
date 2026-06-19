// A tiny mock VTU provider for local testing without real SME API/VTU.ng
// credentials. Lets you exercise the circuit breaker, timeout-before-failover
// rule, and reconciliation worker end-to-end before you have a live account
// with either provider.
//
// Run:   PORT=6001 node scripts/mock-vtu-provider.js
//
// Behavior is controlled two ways:
//   1. MOCK_MODE env var: "success" (default) or "fail" — forces ALL
//      requests to behave that way regardless of reference.
//   2. The order reference itself: include "FAIL" or "TIMEOUT" anywhere
//      in it to force that specific outcome even when MOCK_MODE=success.
//
// To test real cross-provider failover (SME API fails, VTU.ng succeeds),
// run two instances on two ports with different MOCK_MODE values and point
// SME_API_BASE_URL / VTUNG_BASE_URL at them respectively:
//   PORT=6001 MOCK_MODE=fail    node scripts/mock-vtu-provider.js   (broken SME API)
//   PORT=6002 MOCK_MODE=success node scripts/mock-vtu-provider.js   (working VTU.ng)

const express = require("express");
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 6000;
const MOCK_MODE = process.env.MOCK_MODE || "success";

// In-memory store so /status and /requery answer consistently with what
// the original purchase call decided for that reference.
const transactions = new Map();

function handlePurchase(req, res) {
  const { request_id } = req.body;

  if (MOCK_MODE === "fail" || request_id?.includes("FAIL")) {
    transactions.set(request_id, "failed");
    return res.status(200).json({ status: "failed", reference: request_id });
  }

  if (request_id?.includes("TIMEOUT")) {
    transactions.set(request_id, "pending");
    return; // never respond — forces the client's own axios timeout to fire
  }

  transactions.set(request_id, "success");
  return res
    .status(200)
    .json({ status: "success", reference: request_id, transactionId: request_id });
}

// SME API style endpoints
app.post("/airtime", handlePurchase);
app.post("/data", handlePurchase);
app.post("/electricity", handlePurchase);
app.post("/cable", handlePurchase);
app.get("/status/:reference", (req, res) => {
  const status = transactions.get(req.params.reference) || "unknown";
  res.status(200).json({ status, reference: req.params.reference });
});

// VTU.ng style endpoints — same logic, different paths, so one script
// file works for either provider depending on which port you point at.
app.post("/topup", handlePurchase);
app.post("/billpayment/electricity", handlePurchase);
app.post("/billpayment/tv", handlePurchase);
app.get("/requery/:reference", (req, res) => {
  const status = transactions.get(req.params.reference) || "unknown";
  res.status(200).json({ status, reference: req.params.reference });
});

app.listen(PORT, () => {
  console.log(`Mock VTU provider [mode=${MOCK_MODE}] listening on http://localhost:${PORT}`);
  console.log('Include "FAIL" or "TIMEOUT" in a reference to force that outcome regardless of mode.');
});
