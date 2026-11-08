"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  BadgeCheck,
  Leaf,
  Handshake,
  Recycle,
  ScanFace,
} from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Mascot } from "@/components/brand/Mascot";
import { LocationPicker } from "@/components/location/LocationPicker";
import { WelcomeSurveyDecor } from "@/components/onboarding/WelcomeSurveyDecor";
import {
  InterestSurveyForm,
  isSurveyCategoriesStepValid,
  isSurveyIntentStepValid,
} from "@/components/onboarding/InterestSurveyForm";
import { useReloo } from "@/lib/store";
import { saveInterestSurvey } from "@/lib/user-preferences";

const SLIDES = [
  {
    key: "hello",
    eyebrow: "Xin chào!",
    title: "Mình là RELOOP - trợ thủ của bạn tại RELOO",
    body: "Tìm đồ cần thuê, đăng đồ ít dùng và trao đổi trực tiếp với nhau trên RELOO. Hai bên chủ động thỏa thuận giá và giao nhận.",
    tags: [
      { icon: Handshake, label: "P2P Marketplace" },
      { icon: ShieldCheck, label: "An toàn" },
      { icon: Leaf, label: "Bền vững" },
    ],
  },
  {
    key: "how",
    eyebrow: "Cách hoạt động",
    title: "Chỉ trả tiền cho ngày bạn dùng",
    body: "Không cần mua đồ, không cần lo bảo quản. Thuê theo ngày, giao tận nơi hoặc gặp trực tiếp - tuỳ bạn chọn.",
    tags: [
      { icon: Search, label: "Tìm dễ" },
      { icon: Wallet, label: "VietQR" },
      { icon: Recycle, label: "Tiết kiệm" },
    ],
  },
  {
    key: "trust",
    eyebrow: "Vì sao yên tâm?",
    title: "Kiểm tra tình trạng - lưu bằng chứng minh bạch",
    body: "Hai bên cùng kiểm tra tình trạng đồ khi giao nhận, lưu ảnh và trao đổi trong chat để có thông tin đối chiếu khi trả đồ.",
    tags: [
      { icon: ScanFace, label: "eKYC 3 cấp" },
      { icon: BadgeCheck, label: "Chứng nhận tài sản số" },
      { icon: Sparkles, label: "Điểm tin cậy" },
    ],
  },
  {
    key: "location",
    eyebrow: "Cá nhân hoá",
    title: "Cho mình biết bạn ở đâu?",
    body: "Chọn tỉnh và phường/xã để mình gợi ý đúng đồ trong khu vực bạn đang sống.",
    isLocation: true,
  },
  {
    key: "survey-intent",
    eyebrow: "Khảo sát nhu cầu",
    title: "Kết nối với cộng đồng RELOO",
    body: "Mỗi lần thuê là một lần giảm lãng phí — cho mình biết nhu cầu để gợi ý đúng đồ, gần bạn.",
    isSurveyIntent: true,
    surveyStep: 1,
  },
  {
    key: "survey-categories",
    eyebrow: "Gợi ý xanh",
    title: "Nhóm đồ bạn quan tâm?",
    body: "RELOOP sẽ ưu tiên tin phù hợp trên trang chủ — tiết kiệm thời gian tìm kiếm và tài nguyên.",
    isSurveyCategories: true,
    surveyStep: 2,
  },
  {
    key: "ready",
    eyebrow: "Sẵn sàng!",
    title: "Bắt đầu khám phá cùng RELOOP",
    body: "Bạn có thể vào ngay để xem sản phẩm, hoặc tạo tài khoản để đăng tin cho thuê đồ của mình.",
    isFinal: true,
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { state, actions } = useReloo();
  const [step, setStep] = useState(0);
  const [locationDraft, setLocationDraft] = useState(state.guestLocation || {});
  const [surveyDraft, setSurveyDraft] = useState({
    intent: null,
    useCases: [],
    interestedCategories: [],
    budgetRange: null,
  });

  const slide = SLIDES[step];
  const progress = ((step + 1) / SLIDES.length) * 100;
  const isSurveySlide = slide.isSurveyIntent || slide.isSurveyCategories;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("reloo-welcome-seen", "1");
  }, []);

  function persistSurvey() {
    if (isSurveyCategoriesStepValid(surveyDraft)) {
      saveInterestSurvey(surveyDraft);
    }
  }

  function next() {
    if (slide.isLocation && locationDraft?.province) {
      actions.setGuestLocation(locationDraft);
    }
    if (slide.isSurveyCategories) {
      persistSurvey();
    }
    if (step >= SLIDES.length - 1) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  function finish() {
    router.push("/");
  }

  const canNext = useMemo(() => {
    if (slide.isLocation) return !!locationDraft?.province;
    if (slide.isSurveyIntent) return isSurveyIntentStepValid(surveyDraft);
    if (slide.isSurveyCategories) return isSurveyCategoriesStepValid(surveyDraft);
    return true;
  }, [slide, locationDraft, surveyDraft]);

  const isWideSlide = slide.isLocation || isSurveySlide;

  return (
    <div className={`welcome-page ${isSurveySlide ? "welcome-page--survey" : ""}`}>
      <header className="welcome-page__nav">
        <Logo size="md" href="/" />
        <button
          type="button"
          className="welcome-page__skip"
          onClick={finish}
          aria-label="Bỏ qua hướng dẫn"
        >
          Bỏ qua
        </button>
      </header>

      <div className="welcome-page__progress" role="progressbar" aria-valuenow={progress}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <main className="welcome-page__main">
        <div
          className={`welcome-slide ${isWideSlide ? "welcome-slide--solo welcome-slide--wide" : ""} ${isSurveySlide ? "welcome-slide--survey" : ""}`}
        >
          {!isWideSlide && (
            <div className="welcome-slide__mascot">
              <span className="welcome-slide__halo" aria-hidden="true" />
              <Mascot size="lg" />
            </div>
          )}

          <div className="welcome-slide__content">
            {!isSurveySlide && (
              <>
                <span className="welcome-slide__eyebrow">{slide.eyebrow}</span>
                <h1 className="welcome-slide__title">{slide.title}</h1>
                <p className="welcome-slide__body">{slide.body}</p>
              </>
            )}

            {slide.tags && (
              <div className="welcome-slide__tags">
                {slide.tags.map((t) => {
                  const Icon = t.icon;
                  return (
                    <span key={t.label} className="welcome-slide__tag">
                      <Icon size={14} /> {t.label}
                    </span>
                  );
                })}
              </div>
            )}

            {slide.isLocation && (
              <div className="welcome-slide__location">
                <LocationPicker
                  value={locationDraft}
                  onChange={setLocationDraft}
                  autoGeo
                  label={null}
                />
              </div>
            )}

            {isSurveySlide && (
              <div className="welcome-survey-shell">
                <WelcomeSurveyDecor step={slide.surveyStep} total={2} />
                <div className="welcome-survey-shell__card">
                  <div className="welcome-survey-shell__head">
                    <span className="welcome-slide__eyebrow">{slide.eyebrow}</span>
                    <h1 className="welcome-slide__title">{slide.title}</h1>
                    <p className="welcome-slide__body">{slide.body}</p>
                  </div>
                  {slide.isSurveyIntent && (
                    <InterestSurveyForm
                      value={surveyDraft}
                      onChange={setSurveyDraft}
                      step="intent"
                      variant="welcome"
                    />
                  )}
                  {slide.isSurveyCategories && (
                    <InterestSurveyForm
                      value={surveyDraft}
                      onChange={setSurveyDraft}
                      step="categories"
                      variant="welcome"
                    />
                  )}
                </div>
              </div>
            )}

            {slide.isFinal && (
              <div className="welcome-slide__cta">
                <Link href="/explore" className="btn btn-primary btn-lg">
                  Khám phá ngay <ArrowRight size={16} />
                </Link>
                <Link href="/auth/register" className="btn btn-ghost btn-lg">
                  Tạo tài khoản miễn phí
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="welcome-page__foot">
        <div className="welcome-dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`welcome-dot ${i === step ? "is-active" : ""}`}
              onClick={() => setStep(i)}
              aria-label={`Bước ${i + 1}`}
            />
          ))}
        </div>

        <div className="welcome-page__actions">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={prev}>
              <ArrowLeft size={14} /> Quay lại
            </button>
          )}
          {!slide.isFinal && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={next}
              disabled={!canNext}
            >
              {step === SLIDES.length - 2 ? "Xong" : "Tiếp tục"} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
