# Registration methods and password feedback — 19 October 2026

Google continues through the existing OAuth handler. Phone registration retains phone/password/confirmation and the existing OTP stage. No SMS provider is configured, so the capability gate stays closed rather than accepting an unverified phone or claiming SMS was sent. The UI states the missing integration accurately. No provider/account purchase or auth config change.

Registration now clearly separates Google from phone/password. Reused PasswordRequirements is mounted directly beneath the new password with an aria-describedby link, four live criteria and an accessible criteria-count meter. Criteria: eight Unicode code points minimum, Unicode uppercase, ASCII digit, non-letter/non-number/non-whitespace special character. Maximum 128 remains enforced by the input and backend policy. Meter describes satisfaction of this project's rules, not a measured password entropy/security guarantee. vi-VN/en-US copy is centralized. Existing password reset reuses localized checks without forcing a meter.

Server already validates these criteria through validatePassword in phoneSignupInput before capability/provider calls; no relaxed checks or client-only password acceptance. Password values are not persisted/logged or sent to analytics. No schema/security privileges change.

Eight auth validation/security tests passed, scoped lint clean. WebKit local browser fixture exercised 0/1/2/3/4 criteria, Google visible, phone capability false disables submit, aria description, and 320/390/430/1440 layouts without horizontal overflow/pageerrors. Test passwords only, no account/OTP/Google submission. Production evidence is recorded separately in output/register-password after healthy rollout and exact renderer verification. No actual iPhone device result claimed; the browser-level iPhone loading incident remains unverified, not declared fixed by this change.

Deployment is staged app-only with encrypted source/DB backups, health guard and rollback image/source. After activation synchronize K3s and compare all running build IDs. No DB restore over ongoing transactions, no native binary release.
