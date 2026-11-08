'use client';
import Link from 'next/link';
import {useBusinessEntity} from '@/components/settings/useBusinessEntity';
export function BusinessIdentityDetails({initialEntity={}}){
 const entity=useBusinessEntity(initialEntity),email=entity.privacyEmail||entity.supportEmail;
 return <><p>{entity.legalName||'RELOO'} là nền tảng kết nối người thuê và người cho thuê đồ dùng, thiết bị.</p>{entity.taxId&&<p>Mã số thuế: {entity.taxId}</p>}{entity.address&&<p>Địa chỉ: {entity.address}</p>}<p>Yêu cầu về dữ liệu cá nhân: {email?<a href={'mailto:'+email}>{email}</a>:<Link href="/dashboard/profile">gửi yêu cầu hỗ trợ trong tài khoản</Link>}{entity.supportPhone&&<> · Điện thoại: {entity.supportPhone}</>}.</p></>;
}
