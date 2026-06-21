const fs = require("fs");
const path = require("path");
const axios = require("axios");
const QRCode = require("qrcode");

// Lives outside src/ entirely, and nothing in this app ever mounts
// express.static — so this directory is unreachable except through the
// authenticated controller that explicitly reads from it.
const STORAGE_ROOT = path.join(__dirname, "../../../../storage/esim-qrcodes");

if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

/**
 * Normalizes whatever the provider gives us into a stored PNG file. eSIM
 * aggregators vary: some return a hosted image URL, some a base64 PNG,
 * some only the raw LPA activation string and expect the integrator to
 * render the QR image themselves. All three are handled here so the rest
 * of the app never needs to know which one a given order used.
 */
async function saveQrCode(orderId, qrSource) {
  const filename = `${orderId}.png`;
  const filePath = path.join(STORAGE_ROOT, filename);

  if (qrSource.type === "url") {
    const response = await axios.get(qrSource.value, { responseType: "arraybuffer" });
    fs.writeFileSync(filePath, Buffer.from(response.data));
  } else if (qrSource.type === "base64") {
    fs.writeFileSync(filePath, Buffer.from(qrSource.value, "base64"));
  } else if (qrSource.type === "lpa") {
    await QRCode.toFile(filePath, qrSource.value, { width: 400 });
  } else {
    throw new Error(`Unknown QR source type: ${qrSource.type}`);
  }

  // Stored as a bare filename in the DB — never a publicly reachable URL.
  // getAbsolutePath() is the only thing that turns this back into a real
  // path, and only the authenticated controller calls it.
  return filename;
}

function getAbsolutePath(storedFilename) {
  return path.join(STORAGE_ROOT, storedFilename);
}

module.exports = { saveQrCode, getAbsolutePath };
