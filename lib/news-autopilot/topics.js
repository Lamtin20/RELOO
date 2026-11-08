export const EDITORIAL_TOPICS={
 PERSONAL_FINANCE:'Tài chính cá nhân',
 INVESTMENT_NEWS:'Tin tài chính và đầu tư',
 CATALOG:'Các nhóm hàng RELOO',
 RENT_BUY:'Kinh nghiệm thuê và mua',
 RENT_BENEFITS:'Phân tích lợi ích của thuê',
 ENVIRONMENT:'Môi trường và tiêu dùng bền vững',
};
export const FINANCIAL_TOPICS=['PERSONAL_FINANCE','INVESTMENT_NEWS'];
export function topicLabel(topic){return EDITORIAL_TOPICS[topic]||EDITORIAL_TOPICS.CATALOG;}
export function financialFailures(article){
 const text=JSON.stringify(article||{}).normalize('NFKC').toLowerCase();
 const failures=[];
 if(/(?:nên|hãy|khuyên|khuyến nghị)\s+(?:mua|bán|đầu tư|vay|gửi tiền)|(?:mục tiêu giá|điểm mua|điểm bán|cắt lỗ|chốt lời)|(?:cam kết|bảo đảm|đảm bảo)\s+(?:sinh lời|lợi nhuận|hoàn vốn)|(?:không có rủi ro|lợi nhuận chắc chắn|làm giàu nhanh)/u.test(text))failures.push('FINANCIAL_RECOMMENDATION');
 return failures;
}
