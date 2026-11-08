export function validDailyLimits(target, budget) {
 return Number.isInteger(target) && target >= 1 && target <= 40
  && Number.isInteger(budget) && budget >= 10000 && budget <= 5000000;
}
