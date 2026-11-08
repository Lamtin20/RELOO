import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import { join } from "node:path";
import { encodeWebp } from "../images/webp.js";
import { encryptPrivate, decryptPrivate } from "../operations/crypto.js";
const root = () =>
  join(
    process.env.RELOO_EVIDENCE_DIR || "data/private-evidence",
    "neighborhood",
  );
export async function prepareEvidence(images, { account, orderId }) {
  const created = [];
  const { db, profile } = account;
  const rollback = async () => {
    for (const e of created) {
      await db.rpc("reloo_neighborhood_evidence", {
        p_actor: profile.id,
        p_id: e.id,
        p_order: orderId,
        p_filename: null,
        p_action: "REMOVE",
      });
      await unlink(e.path).catch(() => {});
    }
  };
  try {
    const urls = [];
    for (const image of images) {
      if (!/^data:image\/(png|jpeg|webp);base64,/.test(image))
        throw Error("INVALID_INPUT");
      const bytes = Buffer.from(image.slice(image.indexOf(",") + 1), "base64");
      if (bytes.length > 2500000) throw Error("INVALID_INPUT");
      const webp = await encodeWebp(bytes);
      const id = randomUUID(),
        filename = id + ".enc",
        path = join(root(), filename);
      await mkdir(root(), { recursive: true, mode: 0o700 });
      await writeFile(path, encryptPrivate(webp.data.toString("base64")), {
        flag: "wx",
        mode: 0o600,
      });
      created.push({ id, path });
      const r = await db.rpc("reloo_neighborhood_evidence", {
        p_actor: profile.id,
        p_id: id,
        p_order: orderId,
        p_filename: filename,
        p_action: "ADD",
      });
      if (r.error) throw Error(r.error.message);
      urls.push("/api/neighborhood/evidence/" + id);
    }
    return { urls, rollback };
  } catch (e) {
    await rollback();
    throw e;
  }
}
export async function evidenceBytes(filename) {
  if (!/^[a-f0-9-]{36}\.enc$/i.test(filename)) throw Error("NOT_FOUND");
  return Buffer.from(
    decryptPrivate(await readFile(join(root(), filename), "utf8")),
    "base64",
  );
}
