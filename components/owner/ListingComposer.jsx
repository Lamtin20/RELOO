"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  MapPin,
  PackagePlus,
  Save,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { useAuth, useListings } from "@/lib/store";
import { CATEGORIES, LISTING_CONDITIONS } from "@/lib/constants";
import { buildEmptySpecs, normalizeSpecs, validateSpecs } from "@/lib/category-specs";
import { CategorySpecForm } from "@/components/listings/CategorySpecFields";
import { ListingImageUpload } from "@/components/listings/ListingImageUpload";
import { ListingAddressForm } from "@/components/listings/ListingAddressForm";
import { ListingImage } from "@/components/listings/ListingImage";
import { Money } from "@/components/ui";
import {
  buildListingLocationPayload,
  emptyListingAddress,
  validateListingAddress,
} from "@/lib/listing-location";
import { authLink } from "@/lib/auth-navigation";
import { PricingEstimator } from "@/components/pricing/PricingEstimator";
import {fetchProvinces,fetchWards} from '@/lib/vn-address';
import {focusWithoutDelay} from '@/lib/mobile/focus';
import {mobileExperienceCopy} from '@/lib/i18n/mobile-experience';
import {rentalPeriodRate} from '@/lib/rental-selection';
import {rentalSelectionCopy} from '@/lib/i18n/rental-selection';
import {RentalDetailsForm,RentalRateFields} from '@/components/listings/RentalDetailsForm';
import {normalizeRentalDetails} from '@/lib/listing-rental-details';
import {rentalDetailsCopy} from '@/lib/i18n/rental-details';
import {ListingPhotoAssist} from '@/components/listings/ListingPhotoAssist';
import {mergePhotoSuggestion} from '@/lib/listing-ai/policy';
import { ListingFileTools } from './ListingFileTools';

import {useLocale} from '@/components/settings/LocaleProvider';
import {postingMode} from '@/lib/product/modules';
import {discoveryCopy} from '@/lib/i18n/discovery';
import {ownerDraftKey,readOwnerDraft,saveOwnerDraft,beginDraftSignIn,finishDraftTransfer,hasLegacyDraft,adoptLegacyDraft} from '@/lib/owner-draft';
import './owner-draft.css';
import './mobile-composer.css';
const STEPS = [
  { title: "Món đồ của bạn", icon: Camera },
  { title: "Giao dịch & giá", icon: Tag },
  { title: "Khu vực & đăng tin", icon: MapPin },
];
function subscribe() {
  return () => {};
}
export function ListingComposer() {
 const {user,hydrated}=useAuth(),{locale}=useLocale(),t=discoveryCopy[locale]||discoveryCopy['vi-VN'];
 const actor=user?.id||null,identity=actor||'guest';
 const [epoch,setEpoch]=useState(0),[confirmedActor,setConfirmedActor]=useState(null),[legacyError,setLegacyError]=useState('');
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  let legacy=false;try{legacy=ready&&hydrated&&hasLegacyDraft(sessionStorage)&&!readOwnerDraft(sessionStorage,actor,null);}catch{}
  return ready&&hydrated ? (
    <>{legacy&&<section className="owner-draft-legacy"><strong>{t.legacyTitle}</strong><p>{t.legacyHint}</p><label><input type="checkbox" checked={confirmedActor===identity} onChange={e=>setConfirmedActor(e.target.checked?identity:null)}/>{t.legacyConfirm}</label><button type="button" className="btn btn-secondary" disabled={confirmedActor!==identity} onClick={()=>{try{adoptLegacyDraft(sessionStorage,actor,confirmedActor===identity);setEpoch(n=>n+1);setLegacyError('');}catch{setLegacyError(t.draftFailed);}}}>{t.legacyRestore}</button>{legacyError&&<p role="alert">{legacyError}</p>}</section>}<ComposerForm key={identity+':'+epoch}/></>
  ) : (
    <div className="owner-loading" role="status">
      Đang tải thông tin tin đăng...
    </div>
  );
}

function ComposerForm() {
  const router = useRouter();
  const { user } = useAuth();
  const {locale}=useLocale(),t=discoveryCopy[locale]||discoveryCopy["vi-VN"];
  const { createListing } = useListings();
  const [draft] = useState(() => {
    try {
      return readOwnerDraft(sessionStorage,user?.id,new URLSearchParams(location.search).get("draft"));
    } catch {
      return null;
    }
  });
  const [form, setForm] = useState(() => ({
    title: String(draft?.form?.title || "").slice(0, 160),
    rentalDetails:draft?.form?.rentalDetails||{pickupAvailable:true,deliveryAvailable:false},
    description: String(draft?.form?.description || "").slice(0, 6000),
    category: [2,3].includes(draft?.version) && CATEGORIES.some(
      (category) => category.id === draft?.form?.category,
    )
      ? draft.form.category
      : '',
    condition: Object.values(LISTING_CONDITIONS).some(
      (condition) => condition.code === draft?.form?.condition,
    )
      ? draft.form.condition
      : '',
    dailyPrice: String(draft?.form?.dailyPrice || ""),
    transactionMode: postingMode(draft?.form?.transactionMode,new URLSearchParams(location.search).get('intent')),
    salePrice: String(draft?.form?.salePrice || ""),
    marketValue: String(draft?.form?.marketValue || ""),
  }));
  const [address, setAddress] = useState(
    draft?.address || emptyListingAddress(),
  );
  useEffect(()=>{if(!user?.id||draft?.address)return;const controller=new AbortController();fetch('/api/profile',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>{const a=data?.details?.addressDetails;if(!a?.preciseLocation)return;setAddress(current=>current.province||current.street||current.addressDetail?current:{...current,province:a.province,ward:a.ward,house:a.house,street:a.street,addressDetail:[a.house,a.street].filter(Boolean).join(' '),coords:a.preciseLocation.coords,preciseLocation:{...a.preciseLocation,source:'manual',gps:null,consent:false,confirmed:false}})}).catch(()=>{});return()=>controller.abort();},[user?.id,draft]);
  const [specs, setSpecs] = useState(
    draft?.specs || buildEmptySpecs(form.category),
  );
  const [images, setImages] = useState(
    Array.isArray(draft?.images)
      ? draft.images
          .filter(
            (image) => typeof image === "string" && image.length <= 400000,
          )
          .slice(0, 8)
      : [],
  );
  const [step, setStep] = useState(
    form.category && Number.isInteger(draft?.step) && draft.step >= 0 && draft.step < 3
      ? draft.step
      : 0,
  );
  const [photoAssistAllowed,setPhotoAssistAllowed]=useState(draft?.photoAssistAllowed!==false);
  function choosePhotoAssist(value){setPhotoAssistAllowed(value);try{saveOwnerDraft(sessionStorage,user?.id,{form,address,specs,images,step,photoAssistAllowed:value,photoAssistTouched:[...aiProtected.current]})}catch{setErrors(current=>({...current,submit:'Chưa lưu được lựa chọn trên thiết bị. Lựa chọn vẫn áp dụng cho lần mở này.'}))}}
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false),[pricingHelp,setPricingHelp]=useState(false);
  const [saved, setSaved] = useState("");
  const aiProtected=useRef(new Set(Array.isArray(draft?.photoAssistTouched)?draft.photoAssistTouched.filter(key=>typeof key==='string').slice(0,80):[])),aiCategory=useRef(form.category);
  const draftState=useRef({form,specs});
  const [publishConfirmed,setPublishConfirmed]=useState(false);
  useEffect(()=>{draftState.current={form,specs}},[form,specs]);
  function applyPhotoSuggestion(value){
    const current=draftState.current,protectedFields=[...aiProtected.current],patch=value.patch||{};
    const checked=mergePhotoSuggestion(current,value,protectedFields);
    const normalized=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(checked.form.category!==patch.category||current.specs.brand&&normalized(current.specs.brand)!==normalized(patch.specs?.brand)||current.specs.model&&normalized(current.specs.model)!==normalized(patch.specs?.model))return false;
    draftState.current=checked;setForm(checked.form);setSpecs(checked.specs);aiCategory.current=checked.form.category;setPublishConfirmed(false);setSaved('');return true;
  }
  function changeSpecs(value){for(const key of Object.keys(value))if(value[key]!==draftState.current.specs[key])aiProtected.current.add('specs.'+key);draftState.current={...draftState.current,specs:value};setSpecs(value);setPublishConfirmed(false);}

  const [published, setPublished] = useState(null);
  const stepRef = useRef(null),pendingStepFocus=useRef(false),submitting=useRef(false);
  const mt=mobileExperienceCopy[locale]||mobileExperienceCopy['vi-VN'],rt=rentalSelectionCopy[locale]||rentalSelectionCopy['vi-VN'];
  useEffect(()=>{const c=navigator.connection||{};if(step!==1||c.saveData||['2g','slow-2g'].includes(c.effectiveType))return;fetchProvinces().catch(()=>{});if(address.province?.code)fetchWards(address.province.code).catch(()=>{});},[step,address.province?.code]);
  const previewRate=rentalPeriodRate({...form,dailyPrice:Number(form.dailyPrice)});
  useEffect(()=>{if(!pendingStepFocus.current)return;pendingStepFocus.current=false;focusWithoutDelay(stepRef.current?.querySelector('.owner-form__title h2'));},[step]);
  useEffect(()=>{const url=new URL(location.href),token=url.searchParams.get('draft');if(!token||!user?.id)return;try{if(finishDraftTransfer(sessionStorage,user.id,draft,token)){url.searchParams.delete('draft');history.replaceState(null,'',url.pathname+url.search+url.hash);}}catch{}},[draft,user?.id]);
  const category = CATEGORIES.find((item) => item.id === form.category);
  function update(field, value) {
    aiProtected.current.add(field);if(field==='category')aiCategory.current=value;
    draftState.current={form:{...draftState.current.form,[field]:value},specs:field==='category'?buildEmptySpecs(value):draftState.current.specs};setPublishConfirmed(false);
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "category") setSpecs({ ...buildEmptySpecs(value), ...(form.category === '' && value === draft?.form?.category ? normalizeSpecs(value, draft?.specs || {}) : {}) });
    setSaved("");
    setErrors((current) => ({ ...current, [field]: null, ...(field==='rentalDetails'?{rentalPrice:null}:{}), submit: null }));
  }
  function saveDraft() {
    try {
      saveOwnerDraft(sessionStorage,user?.id,{form,address,specs,images,step,photoAssistAllowed,photoAssistTouched:[...aiProtected.current]});
      setSaved(t.draftSaved);
      return true;
    } catch {
      setErrors((current) => ({
        ...current,
        submit:
          "Chưa lưu được bản nháp trên trình duyệt. Kiểm tra dung lượng ảnh hoặc thử lại.",
      }));
      return false;
    }
  }
  function validate(index) {
    const next = {};
    if(index===0&&form.transactionMode!=='SALE'){try{normalizeRentalDetails({...form.rentalDetails,billingUnit:'DAY',periodPrice:null},form.category);}catch{next.rentalDetails=(rentalDetailsCopy[locale]||rentalDetailsCopy['vi-VN']).invalid;}if(form.rentalDetails?.pickupAvailable===false&&form.rentalDetails?.deliveryAvailable===false)next.rentalDetails=mt.handoverRequired;}
    if (index === 0) {
      if(!Object.values(LISTING_CONDITIONS).some(item=>item.code===form.condition))next.condition=locale==='en-US'?'Confirm the actual condition.':'Chọn tình trạng thực tế của món đồ.';
      if (form.title.trim().length < 3)
        next.title = "Tên món đồ cần ít nhất 3 ký tự.";
      if (!form.description.trim())
        next.description = "Thêm mô tả để người thuê hiểu món đồ.";
      if (!images.length) next.images = "Thêm ít nhất một ảnh của món đồ.";
      if (!category) next.category = 'Vui lòng chọn danh mục cho món đồ.';
      else {
        const fields = validateSpecs(form.category, specs);
        if (Object.keys(fields).length) next.specs = fields;
      }
    }
    if (index === 1) {
      if(form.transactionMode!=='SALE')try{normalizeRentalDetails(form.rentalDetails,form.category);}catch{next.rentalPrice=mt.periodRequired;}
      if (
        form.transactionMode!=='SALE'&&(!Number.isSafeInteger(Number(form.dailyPrice)) ||
        Number(form.dailyPrice) < 1 ||
        Number(form.dailyPrice) > 100000000)
      )
        next.dailyPrice = "Nhập giá thuê hợp lệ.";
      if(form.transactionMode!=='RENT'&&(!Number.isSafeInteger(Number(form.salePrice))||Number(form.salePrice)<1||Number(form.salePrice)>1000000000))next.salePrice='Nhập giá bán hợp lệ.';
      if (
        !Number.isSafeInteger(Number(form.marketValue)) ||
        Number(form.marketValue) < 1 ||
        Number(form.marketValue) > 1000000000
      )
        next.marketValue = "Nhập giá trị tài sản hợp lệ.";
    }
    if (index === 2){Object.assign(next, validateListingAddress(address));if(!publishConfirmed)next.publishConfirmed=locale==='en-US'?'Review the details before publishing.':'Bạn cần kiểm tra và xác nhận thông tin trước khi đăng.';}
    setErrors(next);
    if(Object.keys(next).length)requestAnimationFrame(()=>focusWithoutDelay(stepRef.current?.querySelector('[aria-invalid="true"]')));
    return Object.keys(next).length === 0;
  }
  function moveTo(index) {
    pendingStepFocus.current=true;
    setStep(index);
  }
  async function submit(event) {
    event.preventDefault();
    if (submitting.current || busy || !validate(step)) return;
    if (step < 2) {
      moveTo(step + 1);
      return;
    }
    if (!user) {
      if (saveDraft()){try{const next=beginDraftSignIn(sessionStorage,crypto.randomUUID());router.push(authLink("/auth",next,"lender"));}catch{setErrors({submit:t.draftFailed});}}
      return;
    }
    if (user.activationStatus !== "ACTIVE") {
      saveDraft();
      setErrors({
        submit: mt.activeRequired,
      });
      return;
    }
    // Validate all stages again before the backend receives the listing.
    for (let index = 0; index < 3; index++)
      if (!validate(index)) {
        moveTo(index);
        return;
      }
    submitting.current=true;
    setBusy(true);
    try {
      const listing = await createListing({
        ...form,
        dailyPrice: Number(form.dailyPrice),
        marketValue: Number(form.marketValue),
        title: form.title.trim(),
        description: form.description.trim(),
        ...buildListingLocationPayload(address),
        images,
        specs: normalizeSpecs(form.category, specs),
        rentalDetails:form.transactionMode==='SALE'?null:form.rentalDetails,
      });
      try {
        sessionStorage.removeItem(ownerDraftKey(user?.id));
      } catch {
        /* The backend already saved the listing. */
      }
      setPublished(listing);
    } catch (cause) {
      setErrors({
        submit: cause.message || "Chưa đăng được tin. Bản nháp vẫn ở đây.",
      });
    } finally {
      submitting.current=false;
      setBusy(false);
    }
  }
  const preview=(
        <aside className="owner-preview">
          <div className="owner-preview__heading">
            <span>XEM TRƯỚC TIN ĐĂNG</span>
            <span>Chưa công khai</span>
          </div>
          <article className="owner-preview__listing">
            <div className="owner-preview__image">
              <ListingImage
                images={images}
                alt={form.title || "Ảnh món đồ của bạn"}
              />
            </div>
            <div className="owner-preview__body">
              <span className="owner-preview__category">{category?.name || 'Chưa chọn danh mục'}</span>
              <h3>{form.title || "Tên món đồ của bạn"}</h3>
              <div className="owner-preview__price">
                {Number(form.transactionMode==='SALE'?form.salePrice:previewRate.price) > 0 ? (
                  <Money amount={Number(form.transactionMode==='SALE'?form.salePrice:previewRate.price)} />
                ) : (
                  "Chưa đặt giá"
                )}
                <span>{form.transactionMode==='SALE'?mt.saleUnit:'/ '+rt[previewRate.unit]}</span>
              </div>
              <p>
                <MapPin size={14} />
                {[address.ward?.name, address.province?.name]
                  .filter(Boolean)
                  .join(", ") || "Chưa chọn khu vực"}
              </p>
              <div className="owner-preview__profile">
                <span>
                  <UserAvatar user={user} />
                </span>
                <div>
                  <strong>{user?.name || "Chủ đồ"}</strong>
                  <span>Trao đổi trực tiếp trên RELOO</span>
                </div>
              </div>
            </div>
          </article>
          <div className="owner-preview__checklist">
            <h3>Tin rõ ràng, dễ được quan tâm</h3>
            {[
              { done: images.length > 0, label: "Ảnh thực tế của món đồ" },
              {
                done:
                  form.title.trim().length >= 3 &&
                  Boolean(form.description.trim()),
                label: "Tên và mô tả đầy đủ",
              },
              { done: Number(form.transactionMode==='SALE'?form.salePrice:previewRate.price)>0, label:mt.priceProvided },
              { done: Boolean(category) && Object.keys(validateSpecs(form.category, specs)).length === 0, label: 'Danh mục, thông số và phụ kiện' },
              { done: Boolean(address.ward), label: "Khu vực giao nhận" },
            ].map((item) => (
              <p key={item.label} className={item.done ? "is-done" : ""}>
                <CheckCircle2 size={15} />
                {item.label}
              </p>
            ))}
          </div>
        </aside>
  );
  if (published)
    return (
      <div className="owner-published" role="status">
        <CheckCircle2 size={44} />
        <h2>{mt.published}</h2>
        <p>{published.title}</p>
        <Link href={`/product/${published.id}`} className="btn btn-primary">
          Xem tin đăng <ArrowRight size={17} />
        </Link>
        <Link href="/dashboard/assets" className="owner-text-link">
          Quản lý tin của bạn
        </Link>
      </div>
    );
  return (
    <div className="owner-composer" ref={stepRef} data-step={step}>
      <div className="owner-composer__toolbar">
        <ol className="owner-steps" aria-label="Tiến trình đăng tin">
          {STEPS.map((item, index) => (
            <li
              key={item.title}
              aria-current={step === index ? "step" : undefined}
              className={
                index < step ? "is-done" : step === index ? "is-active" : ""
              }
            >
              <span>{index < step ? <Check size={16} /> : index + 1}</span>
              <strong>{item.title}</strong>
            </li>
          ))}
        </ol>
        <button
          className="owner-save"
          type="button"
          onClick={saveDraft}
          disabled={busy}
          title={t.draftScope}
        >
          <Save size={17} />
          <span>Lưu bản nháp</span>
        </button>
      </div>
      {draft&&<p className="owner-draft-restored" role="status"><CheckCircle2 size={16}/>{t.draftRestored}</p>}
      {saved && (
        <p className="owner-saved" role="status">
          <CheckCircle2 size={14} />
          {saved}
        </p>
      )}
      <details className="owner-import-tools"><summary>{mt.advancedImport}</summary><ListingFileTools form={form} specs={specs} addressDetail={address.addressDetail} disabled={busy} onImport={(imported) => {
        for(const key of Object.keys(imported.form))aiProtected.current.add(key);for(const key of Object.keys(imported.specs))aiProtected.current.add('specs.'+key);aiCategory.current=imported.form.category;draftState.current={form:imported.form,specs:imported.specs};setForm(imported.form); setSpecs(imported.specs);setPublishConfirmed(false);
        if (imported.addressDetail) setAddress((current) => ({ ...current, addressDetail: imported.addressDetail }));
        setStep(0); setErrors({}); setSaved('Đã nhập thông tin vào bản nháp.');
      }} /></details>
      <div className="owner-composer__layout">
        <form
          className="owner-form"
          onSubmit={submit}
          noValidate
          aria-busy={busy}
        >
          <div className="owner-form__title">
            <span>BƯỚC 0{step + 1} / 03</span>
            <h2 data-header-title tabIndex={-1}>{STEPS[step].title}</h2>
          </div>
          {step === 0 && (
              <fieldset className="owner-upload">
                <legend>
                  <ImagePlus size={17} />
                  Ảnh món đồ
                </legend>
                <div className="owner-capture-intro"><h3>{locale==='en-US'?'List your item':'Đăng món đồ của bạn'}</h3><p>{locale==='en-US'?'Take a photo. RELOO helps with the details.':'Chụp ảnh, RELOO lo phần thông tin.'}</p></div>
                <ListingImageUpload
                  images={images}
                  onChange={(value) => {
                    setImages(value);
                    setPublishConfirmed(false);
                    setErrors(current=>({...current,images:null,submit:null}));
                    setSaved("");
                  }}
                />
                {errors.images && (
                  <p className="owner-field-error">{errors.images}</p>
                )}
              </fieldset>
          )}
              <div className="owner-photo-assist-slot" hidden={step!==0}><ListingPhotoAssist images={images} disabled={busy} active={step===0} onSuggestion={applyPhotoSuggestion} allowed={photoAssistAllowed} onAllowedChange={choosePhotoAssist} onOpenHelp={saveDraft}/></div>
          {step===0&&(<>
              <label htmlFor="owner-title">Tên món đồ</label>
              <input
                id="owner-title"
                  disabled={busy}
                required
                maxLength={160}
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Ví dụ: Máy ảnh Sony A7IV kèm lens 24–70mm"
                aria-invalid={Boolean(errors.title)}
              />
              {errors.title && (
                <p className="owner-field-error">{errors.title}</p>
              )}
              <div className="owner-form__row">
                <div>
                  <label htmlFor="owner-category">Danh mục *</label>
                  <select
                    id="owner-category"
                  disabled={busy}
                    required
                    aria-invalid={Boolean(errors.category)}
                    value={form.category}
                    onChange={(event) => update("category", event.target.value)}
                  >
                    <option value="" disabled>Chọn danh mục</option>
                    {CATEGORIES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="owner-field-error" role="alert">{errors.category}</p>}
                </div>
                <div>
                  <label htmlFor="owner-condition">Tình trạng</label>
                  <select
                    id="owner-condition"
                  disabled={busy}
                    value={form.condition}
                    aria-invalid={Boolean(errors.condition)}
                    onChange={(event) =>
                      update("condition", event.target.value)
                    }
                  >
                    <option value="" disabled>{locale==='en-US'?'Confirm actual condition':'Chọn tình trạng thực tế'}</option>
                    {Object.values(LISTING_CONDITIONS).map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  {errors.condition&&<p className="owner-field-error" role="alert">{errors.condition}</p>}
                </div>
              </div>
              <label htmlFor="owner-description">Mô tả & điều kiện thuê</label>
              <textarea
                id="owner-description"
                  disabled={busy}
                required
                rows={4}
                maxLength={6000}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Tình trạng, phụ kiện đi kèm, tiền cọc đề nghị và điều kiện giao nhận..."
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description && (
                <p className="owner-field-error">{errors.description}</p>
              )}
              {form.transactionMode!=='SALE'&&<RentalDetailsForm showPricing={false} invalid={!!errors.rentalDetails} value={form.rentalDetails} category={form.category} onChange={value=>update('rentalDetails',value)} disabled={busy}/>}
              {errors.rentalDetails&&<p role="alert">{errors.rentalDetails}</p>}
              <section className="owner-specs">
                <h3>Thông số & phụ kiện *</h3>
                {category ? <CategorySpecForm
                  categoryId={form.category}
                  values={specs}
                  errors={errors.specs || {}}
                  onChange={(value) => {setErrors(current=>({...current,specs:Object.fromEntries(Object.entries(current.specs||{}).filter(([key])=>value[key]===specs[key])),submit:null}));changeSpecs(value);setSaved('');}}
                /> : <p className="text-muted">Chưa chọn danh mục.</p>}
              </section>
            </>
          )}
          {step === 1 && (
            <>
              <label htmlFor="owner-transaction">Bạn muốn giao dịch thế nào?</label>
              <select id="owner-transaction" disabled={busy} value={form.transactionMode} onChange={e=>update('transactionMode',e.target.value)} className="input"><option value="RENT">Cho thuê</option><option value="SALE">Đăng bán</option><option value="BOTH">Cho thuê & bán</option></select>
              {form.transactionMode!=='RENT'&&<><label htmlFor="owner-sale-price">Giá bán món đồ</label><div className="owner-money-input"><input id="owner-sale-price" disabled={busy} required inputMode="numeric" step="1" type="number" min="1" max="1000000000" value={form.salePrice} onChange={e=>update('salePrice',e.target.value)} aria-invalid={Boolean(errors.salePrice)}/><span>đ</span></div>{errors.salePrice&&<p className="owner-field-error">{errors.salePrice}</p>}</>}
              {form.transactionMode!=='SALE'&&<>
              <section className="owner-rental-rate"><h3>{mt.pricing}</h3><div className="rental-detail-fields"><RentalRateFields value={form.rentalDetails} onChange={value=>update('rentalDetails',value)} error={!!errors.rentalPrice} disabled={busy}/></div>{errors.rentalPrice&&<p role="alert" className="owner-field-error">{errors.rentalPrice}</p>}</section>
              <details className="owner-price-assist" open={pricingHelp} onToggle={e=>setPricingHelp(e.currentTarget.open)}><summary>{mt.priceHelp}</summary>{pricingHelp&&<PricingEstimator
                category={form.category}
                condition={form.condition}
                initialBrand={specs.brand || ""}
                initialModel={specs.model || form.title}
                onApply={(value) => {
                  if(busy)return;
                  update("dailyPrice", String(value.dailyPrice));
                  update("marketValue", String(value.marketValue));
                }}
              />}</details>
              <label htmlFor="owner-price">{form.rentalDetails?.billingUnit&&form.rentalDetails.billingUnit!=='DAY'?mt.baseDaily:'Giá thuê mỗi ngày'}</label>
              <div className="owner-money-input">
                <input
                  id="owner-price"
                  disabled={busy}
                  required inputMode="numeric" step="1"
                  type="number"
                  min={1}
                  max={100000000}
                  value={form.dailyPrice}
                  onChange={(event) => update("dailyPrice", event.target.value)}
                  placeholder="180000"
                  aria-invalid={Boolean(errors.dailyPrice)}
                />
                <span>đ / ngày</span>
              </div>
              {errors.dailyPrice && (
                <p className="owner-field-error">{errors.dailyPrice}</p>
              )}
              </>}
              <label htmlFor="owner-value">Giá trị tham khảo của món đồ</label>
              <div className="owner-money-input">
                <input
                  id="owner-value"
                  disabled={busy}
                  required inputMode="numeric" step="1"
                  type="number"
                  min={1}
                  max={1000000000}
                  value={form.marketValue}
                  onChange={(event) =>
                    update("marketValue", event.target.value)
                  }
                  placeholder="3500000"
                  aria-invalid={Boolean(errors.marketValue)}
                />
                <span>đ</span>
              </div>
              {errors.marketValue && (
                <p className="owner-field-error">{errors.marketValue}</p>
              )}
              <div className="owner-price-preview">{form.transactionMode!=='SALE'&&<small>{mt.chargedBy}: {rt[previewRate.unit]}</small>}
                <span>{form.transactionMode==='SALE'?mt.salePreview:mt.preview}</span>
                <strong>
                  <Money
                    amount={form.transactionMode==='SALE'?Math.max(0,Number(form.salePrice)||0):Math.max(0,Math.ceil(3/previewRate.days)*previewRate.price)}
                  />
                </strong>
                <p>
                  Tiền cọc, ưu đãi và phí giao nhận do hai bên thỏa thuận trực
                  tiếp.
                </p>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <ListingAddressForm
                value={address}
                onChange={value=>{setErrors(current=>({...current,province:value.province!==address.province?null:current.province,ward:value.ward!==address.ward?null:current.ward,addressDetail:value.addressDetail!==address.addressDetail?null:current.addressDetail,submit:null}));setAddress(value);setPublishConfirmed(false);}}
                errors={errors}
              />
              <div className="owner-final-preview">{preview}</div>
              <div className="owner-publish-note">
                <ShieldCheck size={20} />
                <p>
                  Tin đăng gắn với tài khoản của bạn. RELOO kết nối người thuê;
                  thanh toán và đặt cọc do hai bên tự thỏa thuận.
                </p>
              </div>
            </>
          )}
          {step===2&&<div className="owner-review-confirmation"><label><input type="checkbox" checked={publishConfirmed} disabled={busy} onChange={event=>{setPublishConfirmed(event.target.checked);setErrors(current=>({...current,publishConfirmed:null}))}}/>{locale==='en-US'?'I have reviewed the item details, actual condition, accessories and prices.':'Tôi đã kiểm tra thông tin món đồ, tình trạng thực tế, phụ kiện và mức giá.'}</label>{errors.publishConfirmed&&<p role="alert">{errors.publishConfirmed}</p>}</div>}
          {errors.submit && (
            <div className="owner-submit-error" role="alert">
              <p>{errors.submit}</p>
              {user?.activationStatus !== "ACTIVE" && user && (
                <Link href="/help">
                  {mt.support} <ArrowRight size={14} />
                </Link>
              )}
            </div>
          )}
          <div className="owner-form__actions">
            {step > 0 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => moveTo(step - 1)}
              >
                <ArrowLeft size={16} />
                Quay lại
              </button>
            ) : (
              <span />
            )}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? (
                <LoaderCircle size={18} className="spin" />
              ) : step === 2 ? (
                <PackagePlus size={18} />
              ) : (
                <ArrowRight size={18} />
              )}
              {busy
                ? "Đang đăng tin..."
                : step < 2
                  ? "Tiếp tục"
                  : !user
                    ? "Đăng nhập & đăng tin"
                    : mt.publish}
            </button>
          </div>
        </form>
        {preview}
      </div>
    </div>
  );
}
function UserAvatar({ user }) {
  return user?.avatar ? (
    <img src={user.avatar} alt="" />
  ) : (
    <PackagePlus size={18} />
  );
}
