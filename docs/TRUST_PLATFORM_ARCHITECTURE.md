# RELOO Trust Platform — Enterprise Architecture

> **RULE FIRST · AI SECOND**  
> Nền tảng cho thuê tài sản P2P — không phải sàn TMĐT.

## 1. Mục tiêu

- Trust, Risk, Audit, Chronicle, Fraud Detection, Deposit Engine, Rule Engine, AI Ready
- Tự học từ dữ liệu, không phụ thuộc một AI cụ thể
- Mở rộng hàng triệu giao dịch
- Replay hành vi, giải thích mọi quyết định, không mất dấu hành động

## 2. Nguyên tắc bất biến

| Nguyên tắc | Mô tả |
|------------|--------|
| RULE FIRST | Rule Engine + Decision Engine quyết định cuối |
| AI SECOND | AI chỉ đề xuất probability / recommendation |
| CRITICAL Rules | R001–R010 không override |
| Chronicle | INSERT only — immutable |
| Identity Gate | VERIFIED mới được thuê (R003) |

## 3. Pipeline quyết định đặt thuê

```
Checkout Request
    → Identity Engine (VERIFIED?)
    → Rule Engine (R001–R007)
    → Trust Engine (0–1000)
    → Fraud Engine (0–100)
    → AI Engine (predictions + explainable log — R010)
    → Risk Engine (0–100)
    → Deposit Engine (dynamic + AI suggestion)
    → Decision Engine → APPROVE | REJECT | NEED_MORE_VERIFICATION | ...
    → Chronicle (RULE + AI entries)
```

## 4. Engines (code: `lib/trust-platform/`)

| Engine | File | Vai trò |
|--------|------|---------|
| Identity | `identity-engine.js` | Email, SĐT, CCCD, OCR, Face Match → VERIFIED |
| Rule | `rule-engine.js` | R001–R010 priority evaluation |
| Chronicle | `chronicle.js` | Immutable event store |
| Trust | `trust-engine.js` | Score 0–1000 |
| Risk | `risk-engine.js` | Composite risk 0–100 |
| Fraud | `fraud-engine.js` | Fraud signals 0–100 |
| Deposit | `deposit-engine.js` | Dynamic cọc — không rule cứng |
| AI | `ai-engine.js` | Chỉ predictions + explainable log |
| Decision | `decision-engine.js` | Orchestrator cuối |
| Behavior | `behavior-logger.js` | Full action trail |
| Session Replay | `session-replay.js` | Timeline playback |
| Feature Store | `feature-store.js` | ML feature vectors |

## 5. Rule CRITICAL (R001–R010)

- **R001** CCCD + Face Match bắt buộc
- **R002** Một CCCD / một tài khoản ACTIVE
- **R003** Identity != VERIFIED → cấm thuê
- **R004** Asset locked → cấm thuê
- **R005** Asset dispute → cấm thuê
- **R006** User dispute nghiêm trọng → cấm thuê
- **R007** Fraud Score ≥ ngưỡng → cấm thuê
- **R008** Không sửa Audit Log
- **R009** Không xóa/sửa Chronicle
- **R010** AI phải có Explainable Log

## 6. Chronicle types

`USER` · `ASSET` · `TRANSACTION` · `BEHAVIOR` · `AI` · `DISPUTE` · `RULE`

Mỗi entry: `chronicleId`, `type`, `entityId`, `action`, `beforeState`, `afterState`, `timestamp`, `ruleId`, `decisionId`, `aiPrediction`

## 7. Behavior Log schema

`logId`, `eventId`, `userId`, `sessionId`, `deviceId`, `assetId`, `transactionId`, `action`, `module`, `screen`, `oldValue`, `newValue`, scores, `decisionId`, `ruleId`, metadata (GPS, IP, browser, …)

## 8. Database (production target)

Xem `lib/trust-platform/schema.js`:

- users, identity_profiles, identity_documents
- assets, asset_passports
- transactions, transaction_timelines
- chronicle, audit_events, behavior_logs
- rule_engine, rule_history
- trust_scores, risk_scores, fraud_scores
- deposit_rules, decision_logs
- session_replays, feature_store

## 9. Event-driven architecture (scale)

- **Message bus**: Kafka / RabbitMQ
- **Cache**: Redis
- **Chronicle store**: PostgreSQL append-only + S3
- **Feature store**: Redis + BigQuery
- **Search**: OpenSearch
- **Analytics**: BigQuery + Looker Studio

Services: Rule, Trust, Risk, Fraud, Deposit, AI (suggest-only), Decision, Chronicle Writer, Behavior Ingestion, Session Replay

## 10. Tích hợp app (demo)

- Store: `CREATE_ORDER` → `evaluateRentalDecision()` trước khi ghi order
- Checkout: preview decision + hiển thị lỗi Rule/Identity
- Hook: `useTrustPlatform()` — evaluate, logBehavior, captureReplay
- eKYC: `UPDATE_KYC` cập nhật `identityProfiles`

## 11. Cursor rules

`.cursor/rules/reloo-trust-platform-core.mdc` (always apply)  
`.cursor/rules/reloo-critical-rules.mdc`  
`.cursor/rules/reloo-chronicle-behavior.mdc`  
`.cursor/rules/reloo-trust-engines.mdc`
