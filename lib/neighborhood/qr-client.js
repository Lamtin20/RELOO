export async function readHandoverQr(file, order, phase) {
  if (!file || file.size > 5000000 || !file.type.startsWith("image/"))
    throw Error("INVALID_QR");
  const bitmap = await createImageBitmap(file),
    scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height),
    { default: decode } = await import("jsqr");
  const decoded = decode(image.data, image.width, image.height, {
    inversionAttempts: "attemptBoth",
  });
  if (!decoded) throw Error("INVALID_QR");
  let data;
  try {
    data = JSON.parse(decoded.data);
  } catch {
    throw Error("INVALID_QR");
  }
  if (
    data.v !== 1 ||
    data.o !== order ||
    data.p !== phase ||
    !/^\d{6}$/.test(data.c)
  )
    throw Error("INVALID_QR");
  return data.c;
}
