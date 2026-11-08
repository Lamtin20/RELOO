import QRCode from "qrcode";
import { encodeWebp } from "../images/webp.js";
import { UUID } from "./domain.js";
export async function handoverQr(order, phase, code) {
  if (
    !UUID.test(order) ||
    !["PICKUP", "RETURN"].includes(phase) ||
    !/^\d{6}$/.test(code)
  )
    throw Error("INVALID_INPUT");
  const payload = JSON.stringify({ v: 1, o: order, p: phase, c: code });
  const png = await QRCode.toBuffer(payload, {
    width: 480,
    margin: 4,
    errorCorrectionLevel: "M",
  });
  const encoded = await encodeWebp(png, { maxEdge: 600, quality: 95 });
  return "data:image/webp;base64," + encoded.data.toString("base64");
}
