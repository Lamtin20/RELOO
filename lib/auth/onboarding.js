import {HttpError} from '../server/http.js';
import {validBirthDate} from '../profile/birth-date.js';
export function validateOnboardingDetails(body){if(!validBirthDate(body.birthDate))throw new HttpError(400,'Ngày sinh chưa hợp lệ.','INVALID_BIRTH_DATE');if(!['HOUSE','APARTMENT','OTHER'].includes(body.housingType))throw new HttpError(400,'Vui lòng chọn loại hình nhà ở.','INVALID_HOUSING_TYPE');return {birthDate:body.birthDate,housingType:body.housingType,onboardingVersion:2};}
