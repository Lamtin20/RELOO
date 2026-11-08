# RELOO state machines v1

Giữ domain tách; registry source/version ở `RELOO_BUSINESS_RULES.md`. Đây là specification + map implementation, không toàn bộ đã coded.

| Domain | States/transitions chính | Actor/condition | Status |
|---|---|---|---|
| Booking | HELD→CONFIRMED→CHECKED_IN→COMPLETED; HELD→EXPIRED/CANCELLED; CONFIRMED→CANCELLED/NO_SHOW | Server hold inventory/policy/payment, partner đúng property và giờ; late payment→review refund | LOCAL_IMPLEMENTED |
| Booking proposed | DRAFT→HELD→PENDING_PAYMENT/PENDING_HOST→CONFIRMED; REJECTED/DISPUTED | Actor/TTL/price version/approval policy | PROPOSED additions |
| Payment | UNPAID/FAILED→PAID, immutable event ID; refund NONE→REVIEW_REQUIRED/REFUNDED | Verified backend callback amount/order; no browser return auth | Simulator local + existing finance source, no booking live provider |
| Rental | Existing inquiry/order/agreement/handover/return/dispute states | Reuse lib/neighborhood + rental_operation engine; no state relabel into paid | EXISTING; link tests/regression |
| Used purchase | REQUESTED→CONFIRMED→HANDED_OVER→COMPLETED; CANCELLED/DISPUTED | Ownership/receipt/version, inventory; existing purchase RPC | EXISTING |
| Offer | PENDING→ACCEPTED/REJECTED/COUNTERED/WITHDRAWN/EXPIRED | Proposal linked version, amount>0, not self, TTL; accepted not sold | PROPOSED, not public enabled |
| Shift job | APPLIED→SELECTED→MUTUALLY_CONFIRMED→CHECKED_IN→WORK_SUBMITTED→COMPLETED; WITHDRAWN/REJECTED/CANCELLED/NO_SHOW/DISPUTED | Employer/worker scoped, no overlap, headcount; pay separate | PROPOSED |
| Full-time | APPLIED→SCREENING→INTERVIEW→OFFER→HIRED/REJECTED/WITHDRAWN | Consent and employer scope, no forced shift acceptance/pay | PROPOSED |
| Partner publish | DRAFT→PENDING→APPROVED; SUSPENDED | Reviewer cannot be partner self; missing docs/policy/media block publish | Booking demo partial |

Every mutation expected version/idempotency, actor verified by server, append history before/after/reason/policy. Failed operations rollback inventory and money; outbox only valid committed changes. Ownership/branch scoped read too; no hidden-menu authorization. Diagram booking full source in BOOKING_DESIGN; no second contradictory commercial state policy.
