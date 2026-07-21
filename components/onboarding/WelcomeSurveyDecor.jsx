"use client";

import { Leaf, Recycle, Sprout } from "lucide-react";

import { Mascot } from "@/components/brand/Mascot";

export function WelcomeSurveyDecor({ step = 1, total = 2 }) {
  return (
    <div className="welcome-survey-decor" aria-hidden="true">
      <span className="welcome-survey-decor__orb welcome-survey-decor__orb--1" />
      <span className="welcome-survey-decor__orb welcome-survey-decor__orb--2" />
      <span className="welcome-survey-decor__leaf welcome-survey-decor__leaf--1">
        <Leaf size={18} />
      </span>
      <span className="welcome-survey-decor__leaf welcome-survey-decor__leaf--2">
        <Sprout size={16} />
      </span>
      <span className="welcome-survey-decor__leaf welcome-survey-decor__leaf--3">
        <Recycle size={15} />
      </span>

      <div className="welcome-survey-decor__hero">
        <div className="welcome-survey-decor__mascot">
          <span className="welcome-survey-decor__halo" />
          <Mascot size="sm" />
        </div>
        <div className="welcome-survey-decor__copy">
          <span className="welcome-survey-decor__badge">
            <Leaf size={12} /> Vòng tuần hoàn RELOO
          </span>
          <p>
            Thuê thay vì mua — giảm lãng phí, kéo dài tuổi thọ đồ dùng, góp phần tái tạo
            không gian xanh.
          </p>
          <div className="welcome-survey-decor__steps">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`welcome-survey-decor__step ${i + 1 <= step ? "is-active" : ""} ${i + 1 === step ? "is-current" : ""}`}
              />
            ))}
            <span className="welcome-survey-decor__step-label">
              Bước {step}/{total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
