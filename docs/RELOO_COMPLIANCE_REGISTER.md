# RELOO compliance register — release gate

Updated 22/10/2026. Không coi technical implementation là xác nhận pháp lý. Kế thừa [LEGAL_COMPLIANCE_MATRIX.md](LEGAL_COMPLIANCE_MATRIX.md), không sao chép kết luận chưa kiểm chứng. Mỗi mục chưa có article/model/signoff = NEEDS_LEGAL_REVIEW, chặn release nghiệp vụ liên quan.

| ID / model | Official basis / checked | Điều khoản & hiệu lực | Thực thi / người xác nhận | Status |
|---|---|---|---|---|
| LC-PRIV all | https://chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroupid=3 ; REA privacy-law.json 22/10 | Metadata luật91/2025, cần đọc full điều và nghị định hướng dẫn trước signoff; không blanket certificate | Consent purposes/version, HttpOnly, private retention/rights, legal hold; owner legal/privacy chưa xác nhận | NEEDS_LEGAL_REVIEW |
| LC-TMDT four domains | Official sources in existing matrix; not all reverified this run | Phân loại nền tảng/registration/transitional obligations chưa signoff article-by-article | CMS legal/partner verification/moderation + entity details; legal owner required | NEEDS_LEGAL_REVIEW |
| LC-STAY | Lodging/licensing/fire/local residence/lease rights | Specific local model/properties unknown, no verified article list | Partner publish gate + evidence, rights; ops/legal | NEEDS_LEGAL_REVIEW |
| LC-JOBS | Employment service/labor/minors | Determine actual intermediary/employer/payment model first | Employer verification, no job deposit, private applications; legal owner | NEEDS_LEGAL_REVIEW |
| LC-PAY | Bank/PSP/VA contract and rules | Existing SePay code not a license to custody funds | No live sandbox mapped/approved, hold money disabled; finance/legal | BLOCKED_PROVIDER |
| LC-USED | Consumer/IP/prohibited goods/advertising | Catalog/categories and moderation enforcement require review | Listing moderation/report/dispute, no fake protection; operations | NEEDS_LEGAL_REVIEW |
| LC-TAX | Existing matrix tax/invoice sources | Tax subject/rate/invoicing/withholding depends actual model | Finance ledger separation; accountants signoff before money | NEEDS_LEGAL_REVIEW |

Không áp mức hủy/commission/penalty/insurance của đối thủ vào RELOO. Fee/TTL/SLA chưa chốt có PROPOSED status. Policy acceptance versioned; operational notices separate marketing; no registration email→Calendar consent shortcut. No deleting legally retained accounting/evidence on account removal. Không có pháp nhân/hợp đồng/giấy phép nào được bịa để pass release.
