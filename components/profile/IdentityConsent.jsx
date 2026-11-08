'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ShieldCheck,X,LoaderCircle,ScanFace,IdCard} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {DATA_COLLECTION_PATH,identityControllerReady} from '@/lib/privacy/identity-policy';
import './identity-review.css';
export function IdentityConsent({business,busy,error,fields,checks,phase='review',onAgree,onClose,onRetake}){
 const {locale}=useLocale(),en=locale==='en-US',t=(vi,english)=>en?english:vi,panel=useRef(null),[allowed,setAllowed]=useState(false);
 const ready=identityControllerReady(business?.entity),entry=phase==='entry',loading=phase==='checking'||busy;
 useEffect(()=>{const before=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';panel.current?.focus({preventScroll:true});return()=>{document.body.style.overflow=overflow;before?.focus({preventScroll:true});};},[]);
 function key(e){if(e.key==='Escape'&&!loading)onClose();if(e.key==='Tab'){const nodes=[...panel.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),summary')],first=nodes[0],last=nodes.at(-1);if(!nodes.length){e.preventDefault();return;}if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}
 const date=v=>v?new Date(v+'T00:00:00Z').toLocaleDateString(locale,{timeZone:'UTC'}):t('Chưa đọc rõ','Not readable');
 return <div className="identity-overlay" onKeyDown={key}><section className="identity-consent identity-review identity-review-compact" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="identity-consent-title" aria-busy={loading}>
 <header><ShieldCheck size={24}/><h2 id="identity-consent-title">{loading?t('Đang đọc thông tin','Reading your card'):entry?t('Xác thực căn cước','Verify your identity'):t('Kiểm tra thông tin','Check your details')}</h2><button type="button" aria-label={t('Đóng','Close')} disabled={loading} onClick={onClose}><X size={20}/></button></header>
 {loading?<div className="identity-checking" role="status"><div className="identity-checking-orbit"><ScanFace size={52}/><LoaderCircle className="identity-spinner" size={94}/></div><p>{t('Đang đối chiếu ảnh và QR…','Comparing your card and QR…')}</p></div>:<>
 {entry?<><div className="identity-intro-symbol"><IdCard size={36}/><ScanFace size={36}/></div><p>{t('Chụp căn cước, quét QR và làm theo hướng dẫn gương mặt.','Capture your card, scan its QR and follow the face prompts.')}</p>{!ready&&<p role="alert">{t('Xác thực chưa sẵn sàng. Vui lòng thử lại sau.','Verification is unavailable. Please try again later.')}</p>}</>:<>
 <dl className="identity-confirm-fields">{[[t('Họ và tên','Full name'),fields?.name],[t('Số định danh','Personal ID'),fields?.nationalId],[t('Ngày sinh','Date of birth'),date(fields?.birthDate)],[t('Ngày hết hạn','Expiry date'),date(checks?.expiryDate)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'—'}</dd></div>)}</dl>
 {!checks?.eligible&&<p className="identity-review-note" role="status">{t('Có thông tin cần kiểm tra thêm. Bạn có thể chụp lại hoặc gửi để xét duyệt.','Some details need review. Retake the photos or submit for review.')}</p>}
 </>}
 <label className="identity-ack"><input type="checkbox" checked={allowed} onChange={e=>setAllowed(e.target.checked)}/><span>{entry?t('Tôi đồng ý xử lý dữ liệu để xác minh danh tính.','I agree to data processing for identity verification.'):t('Tôi xác nhận thông tin trên là đúng.','I confirm these details are correct.')}</span></label>
 <p className="identity-review-note identity-privacy-caption">{t('RELOO xử lý QR, OCR, ảnh căn cước và chân dung/video tại Việt Nam để xác minh và lưu bằng chứng trong hồ sơ.','RELOO processes QR, OCR, card images and portrait/video in Vietnam for verification and evidence retention.')} <Link href={DATA_COLLECTION_PATH} target="_blank" rel="noopener">{t('Chính sách & quyền dữ liệu','Privacy and your rights')}</Link></p>
 <details className="identity-policy-details"><summary>{t('Đơn vị tiếp nhận & hỗ trợ','Controller and support')}</summary><p>{business?.entity?.legalName} · {business?.entity?.address} · {business?.entity?.privacyEmail}</p><p>{t('OCR/QR không xác nhận giấy tờ thật hay đối soát cơ sở dữ liệu quốc gia. Xem chính sách để yêu cầu sửa, rút đồng ý hoặc xóa dữ liệu.','OCR/QR does not authenticate the card or check national records. See the policy to request correction, withdrawal or deletion.')}</p></details>
 {error&&<p role="alert" className="ops-error">{error}</p>}
 <div className="identity-actions"><button type="button" className="btn btn-primary" disabled={!ready||!allowed||(!entry&&(!fields?.nationalId||!checks?.qrValid))} onClick={()=>onAgree()}>{entry?t('Đồng ý và bắt đầu','Agree and start'):checks?.eligible?t('Xác nhận thông tin','Confirm details'):t('Gửi để kiểm tra','Submit for review')}</button></div>
 {!entry&&onRetake&&<button type="button" className="identity-correct-details" onClick={onRetake}>{t('Chụp lại căn cước','Retake card photos')}</button>}
 </>}
 </section></div>;
}
