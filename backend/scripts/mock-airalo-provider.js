// A tiny mock Airalo provider for local testing without real partner
// credentials. Deliberately returns only an `lpa` activation string (no
// qrcode_url or base64 image) so your QR-generation code path — not just
// the simpler URL-download path — actually gets exercised during testing.
//
// Run: PORT=7000 node scripts/mock-airalo-provider.js
// Then set AIRALO_BASE_URL=http://localhost:7000 in your .env.
//
// Include "FAIL" in your test reference to simulate a failed purchase —
// the reference flows through as `description` on the order payload.

const express = require("express");
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 7000;

app.post("/v2/token", (req, res) => {
  res.json({ data: { access_token: "mock-airalo-token" } });
});

app.post("/v2/orders", (req, res) => {
  const { description } = req.body;

  if (description?.includes("FAIL")) {
    return res.status(400).json({ message: "Package unavailable" });
  }

  const fakeIccid = `8944${Math.floor(Math.random() * 1e15)}`;

  res.json({
    data: {
      id: `mock-order-${Date.now()}`,
      sims: [
        {
          iccid: fakeIccid,
          lpa: `LPA:1$mock.smdp.io$ACTIVATION-${Date.now()}`,
        },
      ],
    },
  });
});

app.listen(PORT, () => {
  console.log(`Mock Airalo provider listening on http://localhost:${PORT}`);
  console.log('Include "FAIL" in your test reference to simulate a failed purchase.');
});
