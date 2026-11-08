// Business rule requested by the product owner. Not a payment authorization.
export const RENTAL_RETURN_POLICY=Object.freeze({version:'2026-10-23',graceMinutes:60,hourlyUntilMinutes:360,hoursPerDay:24,maximumDays:1});
export function rentalLateReturnFee({dueAt,returnedAt,rent,rentalDays,policy=RENTAL_RETURN_POLICY}){
 const due=Date.parse(dueAt),returned=Date.parse(returnedAt);
 if(!Number.isFinite(due)||!Number.isFinite(returned)||!Number.isSafeInteger(rent)||rent<0||!Number.isSafeInteger(rentalDays)||rentalDays<1)throw Error('INVALID_RETURN_ASSESSMENT');
 if(!policy||Object.entries(RENTAL_RETURN_POLICY).some(([key,value])=>policy[key]!==value))throw Error('UNSUPPORTED_RETURN_POLICY');
 const lateMinutes=Math.max(0,(returned-due)/60000),dailyAverage=rent/rentalDays;
 const basis=lateMinutes<policy.graceMinutes?'GRACE':lateMinutes<=policy.hourlyUntilMinutes?'HOURLY':'DAY';
 const amount=Math.round(basis==='GRACE'?0:basis==='HOURLY'?dailyAverage*lateMinutes/(60*policy.hoursPerDay):dailyAverage);
 return {policyVersion:policy.version,lateMinutes,dailyAverage,basis,amount,currency:'VND',requiresReview:true};
}
export const rentalReturnCopy={
 'vi-VN':'Giờ trả gợi ý sớm hơn giờ nhận 30 phút vào ngày trả. Trễ dưới 1 giờ: miễn phí. Từ 1 đến hết 6 giờ: giá thuê trung bình ngày ÷ 24 × số giờ trễ. Trên 6 giờ: tính 1 ngày. Tính theo thời gian trễ thực tế, làm tròn đến đồng; không tự động trừ tiền.',
 'en-US':'Suggested return is 30 minutes before the pickup time on the return date. Under 1 hour late: free. From 1 through 6 hours: average daily rent ÷ 24 × hours late. Over 6 hours: one day. Prorated by actual elapsed time and rounded to VND; no automatic debit.'
};
