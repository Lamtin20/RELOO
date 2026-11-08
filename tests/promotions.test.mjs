import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, generateKeyPairSync } from "node:crypto";
import { setup, source } from "./helpers/promotion-db.mjs";
import {
  percentBps,
  discountAmount,
  distributeDiscount,
  couponCode,
} from "../lib/promotions/rules.js";
import { campaignFields, couponFields } from "../lib/promotions/validation.js";
import {
  promotionReceipt,
  validPromotionReceipt,
  verifyPromotionCredit,
} from "../lib/promotions/server.js";
import { encryptPrivate } from "../lib/operations/crypto.js";
import { sealEntry } from "../lib/assurance/journal.js";
async function program(
  db,
  {
    funder = "PROVIDER",
    type = "PERCENT",
    value = "2000",
    total = 100,
    customer = 1,
    budget = 1000000,
    services = ["RENTAL"],
  } = {},
) {
  const id = (
    await db.query(
      "insert into promotion_campaigns(name,terms,services,funder,starts_at,ends_at,status,budget_limit,created_by,updated_by) values('Chương trình thử','Điều kiện thuê và trách nhiệm tài trợ đã xác nhận',$1,$2,now()-interval '1 hour',now()+interval '1 day','ACTIVE',$3,'admin','admin') returning id",
      [services, funder, budget],
    )
  ).rows[0].id;
  const coupon = (
    await db.query(
      "insert into promotion_coupons(campaign_id,code,discount_type,value,starts_at,ends_at,total_limit,customer_limit,status,created_by,updated_by) values($1,$2,$3,$4,now()-interval '1 hour',now()+interval '1 day',$5,$6,'ACTIVE','admin','admin') returning *",
      [
        id,
        ("TEST" + id.replaceAll("-", "").slice(0, 12)).toUpperCase(),
        type,
        value,
        total,
        customer,
      ],
    )
  ).rows[0];
  if (funder === "PROVIDER") {
    await db.query("select reloo_invite_promotion('admin',$1,'bob')", [id]);
    await db.query("select reloo_accept_promotion('bob',$1,1,true)", [id]);
  }
  return { id, coupon };
}
async function rental(db) {
  return (
    await db.query(
      "insert into rental_agreements(renter_id,lender_id,status,rent_amount) values('alice','bob','ACCEPTED',100000) returning id",
    )
  ).rows[0].id;
}
async function va(db) {
  return (
    await db.query(
      "insert into customer_va_links(profile_id,bank_account_id,provider_va_id,va_encrypted,va_hash,masked_va,bank_name) values('alice','bank',gen_random_uuid(),'private',gen_random_uuid(),'***','VCB') returning id",
    )
  ).rows[0].id;
}
async function quote(
  db,
  p,
  gross = 100000,
  service = "RENTAL",
  provider = "bob",
) {
  return (
    await db.query("select reloo_promotion_quote('alice',$1,$2,$3,$4) q", [
      provider,
      service,
      gross,
      p.coupon.code,
    ])
  ).rows[0].q;
}
function receipt(id, q) {
  return {
    envelope: { streamId: id },
    privatePayload: { payload: q },
    hash: "a".repeat(64),
    signature: "s".repeat(88),
  };
}
async function reserve(db, p, agreement, link, q) {
  const id = randomUUID();
  await db.query(
    "select reloo_create_promoted_rental('alice',$1,$2,$3,$4,$5)",
    [agreement, link, p.coupon.code, id, receipt(id, q)],
  );
  return id;
}
test("VND discounts, fractional percentages, caps and invoice distribution preserve exact totals and reject invalid or stacked discounts", () => {
  assert.equal(percentBps("12.35"), 1235);
  for (const x of ["0", "-1", "100.01", "1.005", "1e2"])
    assert.throws(() => percentBps(x));
  assert.equal(
    discountAmount("999999999999999", "PERCENT", "1235"),
    "123499999999999",
  );
  assert.equal(discountAmount("100", "AMOUNT", "1000"), "100");
  assert.equal(discountAmount("100000", "PERCENT", "3000", "20000"), "20000");
  assert.throws(() => discountAmount("100000","PERCENT","3000","-1"));
  assert.throws(() => discountAmount("100000","PERCENT","3000","0"));
  const result = distributeDiscount(
    [
      { unitPrice: "1", quantity: 1 },
      { unitPrice: "1", quantity: 1 },
      { unitPrice: "1", quantity: 1 },
    ],
    "2",
  );
  assert.equal(
    result.reduce((n, i) => n + BigInt(i.discount), 0n),
    2n,
  );
  assert.throws(() =>
    distributeDiscount([{ unitPrice: "10", quantity: 1, discount: "1" }], "1"),
  );
  assert.equal(couponCode(" reloo-10 "), "RELOO-10");
});
test("provider authorization, expiry, audience, services, order minimum and version changes are enforced before applying a coupon", async () => {
  const db = await setup();
  try {
    const p = await program(db);
    await db.query(
      "update promotion_participants set status='INVITED' where campaign_id=$1",
      [p.id],
    );
    await assert.rejects(quote(db, p), /PROVIDER_CONSENT/);
    await db.query("select reloo_accept_promotion('bob',$1,1,true)", [p.id]);
    assert.equal((await quote(db, p)).net, "80000");
    await assert.rejects(quote(db, p, 100000, "DEPOSIT"), /NOT_ELIGIBLE/);
    await db.query(
      "update promotion_coupons set minimum_amount=200000 where id=$1",
      [p.coupon.id],
    );
    await assert.rejects(quote(db, p), /NOT_ELIGIBLE/);
    await db.query(
      "update promotion_coupons set minimum_amount=0,customer_ids=array['admin'] where id=$1",
      [p.coupon.id],
    );
    await assert.rejects(quote(db, p), /NOT_ELIGIBLE/);
    await db.query(
      "update promotion_coupons set customer_ids='{}',ends_at=now()-interval '1 minute' where id=$1",
      [p.coupon.id],
    );
    await assert.rejects(quote(db, p), /NOT_ELIGIBLE/);
    await db.query(
      "update promotion_coupons set ends_at=now()+interval '1 day' where id=$1",
      [p.coupon.id],
    );
    await db.query("update promotion_campaigns set version=2 where id=$1", [
      p.id,
    ]);
    await assert.rejects(quote(db, p), /PROVIDER_CONSENT/);
    await assert.rejects(
      db.query("select reloo_accept_promotion('alice',$1,2,true)", [p.id]),
      /INVITATION_REQUIRED/,
    );
    await db.exec("set role authenticated");
    await assert.rejects(quote(db, p), /permission denied/);
  } finally {
    await db.close();
  }
});
test("provider-funded coupons freeze the agreed lower price, reserve usage exactly once and do not create a platform subsidy", async () => {
  const db = await setup();
  try {
    const p = await program(db),
      a = await rental(db),
      link = await va(db),
      q = await quote(db, p),
      id = await reserve(db, p, a, link, q);
    assert.equal(
      (
        await db.query(
          "select amount,owner_amount from rental_payment_intents where id=$1",
          [id],
        )
      ).rows[0].amount,
      80000,
    );
    await assert.rejects(quote(db, p), /CUSTOMER_LIMIT/);
    assert.equal(
      (
        await db.query(
          "select reloo_create_promoted_rental('alice',$1,$2,$3,$4,$5) id",
          [a, link, p.coupon.code, randomUUID(), receipt(randomUUID(), q)],
        )
      ).rows[0].id,
      id,
    );
    await assert.rejects(
      db.query("update rental_payment_intents set amount=1 where id=$1", [id]),
      /PRICE_IMMUTABLE/,
    );
    await assert.rejects(
      db.query("update promotion_redemptions set discount=1 where id=$1", [id]),
      /IMMUTABLE/,
    );
    const f = await source(db, 80000);
    const ref = (
      await db.query(
        "select reference from rental_payment_intents where id=$1",
        [id],
      )
    ).rows[0].reference;
    assert.equal(
      (
        await db.query(
          "select reloo_allocate_rental_payment($1,'alice',$2) v",
          [f.id, ref],
        )
      ).rows[0].v,
      true,
    );
    assert.equal(
      (
        await db.query(
          "select reloo_allocate_rental_payment($1,'alice',$2) v",
          [f.id, ref],
        )
      ).rows[0].v,
      true,
    );
    assert.equal(
      (await db.query("select status from promotion_redemptions")).rows[0]
        .status,
      "REDEEMED",
    );
    assert.equal(
      (await db.query("select count(*)::int n from promotion_subsidy_credits"))
        .rows[0].n,
      0,
    );
    assert.equal(
      (await db.query("select reloo_cash_summary('bob') v")).rows[0].v.net,
      "80000",
    );
  } finally {
    await db.close();
  }
});
test("RELOO subsidies require verified corporate funding, honour campaign budget and assign actual funds to the lender without duplicating bank receipts", async () => {
  const db = await setup();
  try {
    const p = await program(db, { funder: "RELOO", budget: 30000 });
    await assert.rejects(quote(db, p), /SPONSOR_FUNDS/);
    const bankFund = await source(db, 100000);
    await db.query(
      "select reloo_fund_promotion('admin',$1,$2,20000,'Nguồn vốn RELOO đã đối chiếu chứng từ ngân hàng')",
      [p.id, bankFund.id],
    );
    const q = await quote(db, p);
    assert.equal(q.ownerAmount, "100000");
    const a = await rental(db),
      link = await va(db),
      id = await reserve(db, p, a, link, q);
    const f = await source(db, 80000),
      ref = (await db.query("select reference from rental_payment_intents"))
        .rows[0].reference;
    await db.query("select reloo_allocate_rental_payment($1,'alice',$2)", [
      f.id,
      ref,
    ]);
    assert.equal(
      (
        await db.query(
          "select sum(amount)::text n from promotion_subsidy_credits",
        )
      ).rows[0].n,
      "20000",
    );
    assert.equal(
      (await db.query("select count(*)::int n from customer_cash_entries"))
        .rows[0].n,
      1,
    );
    assert.equal(
      (await db.query("select reloo_wallet_snapshot('bob') v")).rows[0].v
        .subsidiesCount,
      1,
    );
    await db.query(
      "select reloo_release_payout('admin','bob','RENTAL',80000,$1,'Khoản thuê và ngân hàng đã được đối soát đầy đủ')",
      [f.id],
    );
    await db.query(
      "select reloo_release_payout('admin','bob','RENTAL',20000,$1,'Phần bù giảm giá RELOO đã đối chiếu đầy đủ')",
      [bankFund.id],
    );
    assert.equal(
      (await db.query("select reloo_payout_available('bob') v")).rows[0].v
        .total,
      "100000",
    );
    await assert.rejects(
      db.query(
        "select reloo_release_payout('admin','alice','RENTAL',1,$1,'Kiểm tra nguồn bù đã được ghi nhận chính xác')",
        [bankFund.id],
      ),
      /ENTITLEMENT/,
    );
    await assert.rejects(
      db.query("select reloo_attribute_cash($1,'alice','OTHER')", [
        bankFund.id,
      ]),
      /VA_LINK|LOCKED/,
    );
    await assert.rejects(
      db.query(
        "select reloo_fund_promotion('admin',$1,$2,1,'Khoản khách hàng không thể cấp làm tiền RELOO')",
        [p.id, f.id],
      ),
      /COMPANY_FUNDS/,
    );
    await assert.rejects(quote(db, p), /CUSTOMER_LIMIT|BUDGET_LIMIT/);
    assert.equal(
      (
        await db.query(
          "select discount,net,owner_amount from promotion_redemptions where id=$1",
          [id],
        )
      ).rows[0].owner_amount,
      100000,
    );
  } finally {
    await db.close();
  }
});
test("a depleted sponsor bank cannot fund a program or reserve a discount even if its old incoming receipt is authentic", async () => {
  const db = await setup();
  try {
    const p = await program(db, { funder: "RELOO" }),
      f = await source(db, 100000);
    await db.query(
      "select reloo_fund_promotion('admin',$1,$2,20000,'Nguồn vốn công ty đã được kiểm tra qua ngân hàng')",
      [p.id, f.id],
    );
    await source(db, 100000, null, "OUT");
    const q = await quote(db, p),
      a = await rental(db),
      link = await va(db);
    await assert.rejects(reserve(db, p, a, link, q), /LIQUIDITY_CHANGED/);
    assert.equal(
      (await db.query("select count(*)::int n from promotion_redemptions"))
        .rows[0].n,
      0,
    );
  } finally {
    await db.close();
  }
});
test("100% provider discounts settle as free without a zero-value bank event, while 100% RELOO discounts create only funded subsidy credits", async () => {
  const db = await setup();
  try {
    let p = await program(db, { value: "10000" }),
      a = await rental(db),
      q = await quote(db, p),
      id = await reserve(db, p, a, null, q);
    assert.equal(
      (
        await db.query(
          "select status from rental_payment_intents where id=$1",
          [id],
        )
      ).rows[0].status,
      "FREE",
    );
    assert.equal(
      (await db.query("select count(*)::int n from customer_cash_entries"))
        .rows[0].n,
      0,
    );
    p = await program(db, { funder: "RELOO", value: "10000" });
    const f = await source(db, 100000);
    await db.query(
      "select reloo_fund_promotion('admin',$1,$2,100000,'Nguồn ngân sách hỗ trợ đã xác nhận từ ngân hàng')",
      [p.id, f.id],
    );
    a = await rental(db);
    q = await quote(db, p);
    id = await reserve(db, p, a, null, q);
    assert.equal(
      (
        await db.query(
          "select sum(amount)::text n from promotion_subsidy_credits",
        )
      ).rows[0].n,
      "100000",
    );
    assert.equal(
      (await db.query("select count(*)::int n from customer_cash_entries"))
        .rows[0].n,
      0,
    );
  } finally {
    await db.close();
  }
});
test("service invoice discounts reserve limits, lock net/tax totals and release only an unsent draft, while issuance consumes the coupon", async () => {
  const db = await setup();
  try {
    const p = await program(db, {
        services: ["RELOO_FEE"],
        funder: "PROVIDER",
      }),
      q = await quote(db, p, 100000, "RELOO_FEE", null),
      id = randomUUID();
    await db.query(
      "select reloo_create_promoted_invoice('admin',$1,'alice','RELOO_FEE',100000,$2,$3,$4)",
      [
        id,
        p.coupon.code,
        receipt(id, q),
        {
          sellerVersion: 1,
          seller: {},
          encrypted: "private",
          subtotal: "80000",
          tax: "8000",
          total: "88000",
        },
      ],
    );
    assert.equal(
      (await db.query("select status from promotion_redemptions")).rows[0]
        .status,
      "RESERVED",
    );
    await assert.rejects(
      db.query("update invoice_documents set total=1 where id=$1", [id]),
      /PRICE_LOCKED/,
    );
    await db.query(
      "select reloo_void_promotion_invoice('admin',$1,'Bản nháp chưa gửi nhà cung cấp, không có nghĩa vụ')",
      [id],
    );
    assert.equal(
      (await db.query("select status from promotion_redemptions")).rows[0]
        .status,
      "RELEASED",
    );
    assert.equal((await quote(db, p, 100000, "RELOO_FEE", null)).net, "80000");
    const issuedId = randomUUID(), issuedQuote = await quote(db,p,100000,"RELOO_FEE",null);
    await db.query("select reloo_create_promoted_invoice('admin',$1,'alice','RELOO_FEE',100000,$2,$3,$4)",
      [issuedId,p.coupon.code,receipt(issuedId,issuedQuote),{sellerVersion:1,seller:{},encrypted:"private",subtotal:"80000",tax:"8000",total:"88000"}]);
    await db.query("update invoice_documents set status='ISSUED' where id=$1",[issuedId]);
    assert.equal((await db.query("select status from promotion_redemptions where id=$1",[issuedId])).rows[0].status,"REDEEMED");
    await assert.rejects(db.query("select reloo_void_promotion_invoice('admin',$1,'Hóa đơn đã phát hành không được hủy như bản nháp')",[issuedId]), /UNSENT_DRAFT/);
    const first = await program(db,{services:["RELOO_FEE"],funder:"RELOO"});
    await db.query("update promotion_coupons set first_order_only=true where id=$1",[first.coupon.id]);
    await assert.rejects(quote(db,first,100000,"RELOO_FEE",null),/FIRST_ORDER/);
  } finally {
    await db.close();
  }
});
test("promotion receipts and funded subsidy evidence reject changed amounts, parties and borrowed receipts", () => {
  const prev = process.env.RELOO_JOURNAL_PRIVATE_KEY;
  const prevDataKey = process.env.RELOO_PRIVATE_DATA_KEY;
  const key = generateKeyPairSync("ed25519")
    .privateKey.export({ type: "pkcs8", format: "der" })
    .toString("base64");
  process.env.RELOO_JOURNAL_PRIVATE_KEY = key;
  process.env.RELOO_PRIVATE_DATA_KEY = "ab".repeat(32);
  try {
    const id = randomUUID(),
      q = {
        gross: "100000",
        discount: "20000",
        net: "80000",
        ownerAmount: "100000",
        providerId: "bob",
        payerId: "alice",
        funder: "RELOO",
        service: "RENTAL",
      },
      r = promotionReceipt(id, q);
    assert.equal(validPromotionReceipt(r, q, id), true);
    assert.equal(validPromotionReceipt(r, { ...q, net: "1" }, id), false);
    assert.equal(validPromotionReceipt(r, q, randomUUID()), false);
    const sourceId = randomUUID(), bankReceipt = sealEntry({streamId:sourceId,sequence:1,event:"BANK_VERIFIED",previousHash:"0".repeat(64),recordedAt:new Date().toISOString(),payload:{verified:{providerId:"bank-fixture",accountId:"bank",type:"IN",amount:"50000"}}},key);
    const evidence = {id:sourceId,provider_id:"bank-fixture",bank_account_id:"bank",direction:"IN",amount:"50000",evidence_encrypted:encryptPrivate(JSON.stringify(bankReceipt.privatePayload)),evidence_envelope:bankReceipt.envelope,evidence_hash:bankReceipt.hash,signature:bankReceipt.signature,signing_key_id:bankReceipt.keyId};
    const credit = {profileId:"bob",redemptionId:id,amount:"20000",quote:q,receipt:r,evidence};
    assert.equal(verifyPromotionCredit(credit),true);
    assert.equal(verifyPromotionCredit({...credit,profileId:"alice"}),false);
    assert.equal(verifyPromotionCredit({...credit,amount:"30000"}),false);
    assert.equal(verifyPromotionCredit({...credit,evidence:{...evidence,amount:"99999"}}),false);
    assert.equal(verifyPromotionCredit({...credit,quote:{...q,discount:"30000"}}),false);
    assert.equal(verifyPromotionCredit({...credit,evidence:{...evidence,id:randomUUID()}}),false);
    assert.equal(verifyPromotionCredit({...credit,amount:"bad"}),false);
  } finally {
    if (prev === undefined) delete process.env.RELOO_JOURNAL_PRIVATE_KEY;
    else process.env.RELOO_JOURNAL_PRIVATE_KEY = prev;
    if (prevDataKey === undefined) delete process.env.RELOO_PRIVATE_DATA_KEY;
    else process.env.RELOO_PRIVATE_DATA_KEY = prevDataKey;
  }
});
test("shared coupon limits and program budgets cover reservations across customers; exhausted public codes disappear", async () => {
  const db = await setup();
  try {
    const p = await program(db,{services:["RELOO_FEE"],funder:"RELOO",total:1});
    await db.query("update promotion_coupons set public_code=true where id=$1",[p.coupon.id]);
    assert.equal((await db.query("select reloo_public_promotions() v")).rows[0].v.length,1);
    const q = await quote(db,p,100000,"RELOO_FEE",null), id=randomUUID();
    await db.query("select reloo_reserve_promotion($1,'INVOICE',$1,'alice',null,'RELOO_FEE',100000,$2,$3,null)",[id,p.coupon.code,receipt(id,q)]);
    await assert.rejects(db.query("select reloo_promotion_quote('bob',null,'RELOO_FEE',100000,$1)",[p.coupon.code]),/COUPON_LIMIT/);
    assert.equal((await db.query("select reloo_public_promotions() v")).rows[0].v.length,0);
    const limited=await program(db,{services:["RELOO_FEE"],funder:"RELOO",budget:19999});
    await assert.rejects(quote(db,limited,100000,"RELOO_FEE",null),/BUDGET_LIMIT/);
    await db.query("update promotion_coupons set first_order_only=true where id=$1",[p.coupon.id]);
    const first=await program(db,{services:["RELOO_FEE"],funder:"RELOO"});
    await db.query("update promotion_coupons set first_order_only=true where id=$1",[first.coupon.id]);
    await assert.rejects(quote(db,first,100000,"RELOO_FEE",null),/FIRST_ORDER/);
  } finally { await db.close(); }
});
test("corporate funding is classified once, cannot borrow customer funds or exceed the same bank source", async () => {
  const db = await setup();
  try {
    const p=await program(db,{funder:"RELOO"}),s=await source(db,50000);
    await db.query("select reloo_fund_promotion_classified('admin',$1,$2,20000,'Nguồn doanh thu có chứng từ và quyền sử dụng của RELOO','5113')",[p.id,s.id]);
    const row=(await db.query("select * from promotion_funding_reclassifications")).rows[0];
    assert.equal(row.amount,20000); assert.equal(row.debit_account,"3388"); assert.equal(row.credit_account,"5113");
    const other=await program(db,{funder:"RELOO"});
    await assert.rejects(db.query("select reloo_fund_promotion_classified('admin',$1,$2,40000,'Không thể cấp vượt nguồn ngân hàng đã kiểm tra','411')",[other.id,s.id]),/ALREADY_ALLOCATED/);
    await assert.rejects(db.query("update promotion_funding_reclassifications set amount=1"),/IMMUTABLE/);
    assert.equal((await db.query("select reloo_promotion_bank_requirement('bank') v")).rows[0].v,"20000");
    const customer=await source(db,30000,"alice");
    assert.equal((await db.query("select reloo_promotion_company_sources() v")).rows[0].v.some(r=>r.id===customer.id),false);
  } finally { await db.close(); }
});
test("normal rental checkout remains compatible and records no promotion; reapplying migrations preserves paid frozen prices",async()=>{
  const db=await setup();
  try {
    const a=await rental(db),link=await va(db);
    const id=(await db.query("select reloo_create_payment_intent('alice',$1,$2) id",[a,link])).rows[0].id;
    const intent=(await db.query("select * from rental_payment_intents where id=$1",[id])).rows[0];
    assert.equal(intent.amount,100000); assert.equal(intent.gross_amount,100000);assert.equal(intent.coupon_id,null);
    const f=await source(db,100000);
    await db.query("select reloo_allocate_rental_payment($1,'alice',$2)",[f.id,intent.reference]);
    const {readFile}=await import('node:fs/promises');
    for(const n of ['promotions','promotion-payments','promotion-wallet','promotion-invoices','promotion-deletion','promotion-funding-ledger','promotion-public'])
      await db.exec(await readFile(new URL('../deploy/vietnam/'+n+'.sql',import.meta.url),'utf8'));
    assert.equal((await db.query("select status from rental_payment_intents where id=$1",[id])).rows[0].status,'PAID');
    assert.equal((await db.query("select count(*)::int n from promotion_redemptions")).rows[0].n,0);
    assert.equal((await db.query("select reloo_wallet_snapshot('bob') v")).rows[0].v.bankCount,1);
  }finally{await db.close();}
});
