/**
 * Ghép tên địa chỉ VN (tỉnh/phường) → mã Goship (city/district/ward)
 */

function normalizeName(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(tinh|thanh pho|quan|huyen|phuong|xa|thi tran)\s+/i, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function findGoshipCity(cities, provinceName) {
  if (!provinceName || !cities?.length) return null;
  const target = normalizeName(provinceName);
  const aliases = {
    "ho chi minh": ["hcm", "tp hcm", "sai gon", "saigon", "thu duc"],
    "ha noi": ["hn", "tp ha noi"],
    "da nang": ["tp da nang"],
  };

  let match =
    cities.find((c) => namesMatch(c.name, provinceName)) ??
    cities.find((c) => {
      const n = normalizeName(c.name);
      return target.includes(n) || n.includes(target);
    });

  if (!match) {
    for (const [key, terms] of Object.entries(aliases)) {
      if (terms.some((t) => target.includes(t)) || target.includes(key)) {
        match = cities.find((c) => normalizeName(c.name).includes(key));
        if (match) break;
      }
    }
  }

  return match ? { id: match.id, name: match.name } : null;
}

export function findGoshipDistrict(districts, wardName, provinceName) {
  if (!districts?.length) return null;

  const wardNorm = normalizeName(wardName);
  const direct =
    districts.find((d) => namesMatch(d.name, wardName)) ??
    districts.find((d) => {
      const n = normalizeName(d.name);
      return wardNorm && (n.includes(wardNorm) || wardNorm.includes(n));
    });
  if (direct) return { id: direct.id, name: direct.name };

  const provinceNorm = normalizeName(provinceName);
  if (provinceNorm.includes("thu duc") || wardNorm.includes("thu duc")) {
    const thuDuc = districts.find((d) => /thu duc|thu duc/i.test(d.name));
    if (thuDuc) return { id: thuDuc.id, name: thuDuc.name };
  }

  if (provinceNorm.includes("binh thanh") || wardNorm.includes("binh thanh")) {
    const bt = districts.find((d) => /binh thanh/i.test(d.name));
    if (bt) return { id: bt.id, name: bt.name };
  }

  if (provinceNorm.includes("quan 1") || wardNorm.includes("quan 1")) {
    const q1 = districts.find((d) => /quan 1/i.test(d.name));
    if (q1) return { id: q1.id, name: q1.name };
  }

  if (provinceNorm.includes("quan 7") || wardNorm.includes("quan 7")) {
    const q7 = districts.find((d) => /quan 7/i.test(d.name));
    if (q7) return { id: q7.id, name: q7.name };
  }

  if (provinceNorm.includes("phu nhuan") || wardNorm.includes("phu nhuan")) {
    const pn = districts.find((d) => /phu nhuan/i.test(d.name));
    if (pn) return { id: pn.id, name: pn.name };
  }

  if (provinceNorm.includes("go vap") || wardNorm.includes("go vap")) {
    const gv = districts.find((d) => /go vap/i.test(d.name));
    if (gv) return { id: gv.id, name: gv.name };
  }

  return districts[0] ? { id: districts[0].id, name: districts[0].name } : null;
}

export function findGoshipWard(wards, wardName) {
  if (!wards?.length) return null;
  const match =
    wards.find((w) => namesMatch(w.name, wardName)) ??
    wards.find((w) => {
      const n = normalizeName(w.name);
      const target = normalizeName(wardName);
      return target && (n.includes(target) || target.includes(n));
    });
  const picked = match ?? wards[0];
  return picked ? { id: picked.id, name: picked.name } : null;
}
