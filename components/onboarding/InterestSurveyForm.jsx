"use client";

import { useMemo } from "react";
import {
  Check,
  Search,
  Package,
  Repeat,
  Tent,
  PartyPopper,
  Briefcase,
  Baby,
  Sparkles,
  TrendingUp,
  Coins,
} from "lucide-react";

import { CATEGORIES } from "@/lib/constants";
import { Icon } from "@/components/ui";
import {
  SURVEY_INTENTS,
  SURVEY_USE_CASES,
  SURVEY_BUDGET_RANGES,
  SURVEY_MAX_CATEGORIES,
  categoriesFromUseCases,
} from "@/lib/user-preferences";

const EMPTY_DRAFT = {
  intent: null,
  useCases: [],
  interestedCategories: [],
  budgetRange: null,
};

const INTENT_ICONS = {
  renter: Search,
  lender: Package,
  both: Repeat,
};

const USE_CASE_ICONS = {
  travel: Tent,
  event: PartyPopper,
  work: Briefcase,
  family: Baby,
  experience: Sparkles,
  income: TrendingUp,
};

export function InterestSurveyForm({
  value,
  onChange,
  step = "all",
  variant = "default",
  className = "",
}) {
  const draft = { ...EMPTY_DRAFT, ...value };
  const isWelcome = variant === "welcome";

  function patch(next) {
    onChange?.({ ...draft, ...next });
  }

  function toggleUseCase(id) {
    const useCases = draft.useCases.includes(id)
      ? draft.useCases.filter((x) => x !== id)
      : [...draft.useCases, id];
    const suggested = categoriesFromUseCases(useCases);
    const merged = [...new Set([...draft.interestedCategories, ...suggested])].slice(
      0,
      SURVEY_MAX_CATEGORIES,
    );
    patch({ useCases, interestedCategories: merged });
  }

  function toggleCategory(slug) {
    const current = draft.interestedCategories;
    if (current.includes(slug)) {
      patch({ interestedCategories: current.filter((s) => s !== slug) });
      return;
    }
    if (current.length >= SURVEY_MAX_CATEGORIES) return;
    patch({ interestedCategories: [...current, slug] });
  }

  const showIntent = step === "all" || step === "intent";
  const showUseCases = step === "all" || step === "intent";
  const showCategories = step === "all" || step === "categories";
  const showBudget = step === "all" || step === "categories";

  const categoryGrid = useMemo(
    () =>
      [...CATEGORIES].sort((a, b) =>
        a.name.localeCompare(b.name, "vi", { sensitivity: "base" }),
      ),
    [],
  );

  const selectedCount = draft.interestedCategories.length;

  return (
    <div
      className={`interest-survey ${isWelcome ? "interest-survey--welcome" : ""} ${className}`.trim()}
    >
      {showIntent && (
        <fieldset className="interest-survey__block interest-survey__block--animate">
          <legend className="interest-survey__legend">
            <span className="interest-survey__legend-num">1</span>
            Bạn muốn dùng RELOO để làm gì?
          </legend>
          <div className="interest-survey__intent-grid">
            {SURVEY_INTENTS.map((item, idx) => {
              const IntentIcon = INTENT_ICONS[item.id] ?? Search;
              const selected = draft.intent === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className={`interest-survey__intent ${selected ? "is-selected" : ""}`}
                  onClick={() => patch({ intent: item.id })}
                >
                  <span className="interest-survey__intent-icon">
                    <IntentIcon size={20} strokeWidth={2} />
                  </span>
                  <strong>{item.label}</strong>
                  <span>{item.desc}</span>
                  {selected && (
                    <span className="interest-survey__intent-check" aria-hidden="true">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {showUseCases && (
        <fieldset className="interest-survey__block interest-survey__block--animate">
          <legend className="interest-survey__legend">
            <span className="interest-survey__legend-num">2</span>
            Mục đích sử dụng
            <span className="interest-survey__legend-hint">Chọn nhiều</span>
          </legend>
          <div className="interest-survey__chips">
            {SURVEY_USE_CASES.map((item, idx) => {
              const CaseIcon = USE_CASE_ICONS[item.id] ?? Sparkles;
              const selected = draft.useCases.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  style={{ animationDelay: `${idx * 45}ms` }}
                  className={`interest-survey__chip ${selected ? "is-selected" : ""}`}
                  onClick={() => toggleUseCase(item.id)}
                >
                  <CaseIcon size={14} strokeWidth={2} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {showCategories && (
        <fieldset className="interest-survey__block interest-survey__block--animate">
          <legend className="interest-survey__legend">
            <span className="interest-survey__legend-num">{showIntent ? "3" : "1"}</span>
            Danh mục bạn quan tâm
            <span className="interest-survey__counter">
              <span
                className="interest-survey__counter-fill"
                style={{ width: `${(selectedCount / SURVEY_MAX_CATEGORIES) * 100}%` }}
              />
              <span className="interest-survey__counter-text">
                {selectedCount}/{SURVEY_MAX_CATEGORIES}
              </span>
            </span>
          </legend>
          <div className="interest-survey__cat-grid">
            {categoryGrid.map((cat, idx) => {
              const selected = draft.interestedCategories.includes(cat.slug);
              const disabled =
                !selected && draft.interestedCategories.length >= SURVEY_MAX_CATEGORIES;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  style={{ animationDelay: `${Math.min(idx, 12) * 35}ms` }}
                  className={`interest-survey__cat ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}
                  onClick={() => toggleCategory(cat.slug)}
                  disabled={disabled}
                >
                  <span className="interest-survey__cat-icon">
                    <Icon name={cat.icon} size="sm" />
                  </span>
                  <span className="interest-survey__cat-name">{cat.name}</span>
                  {selected && (
                    <span className="interest-survey__cat-check" aria-hidden="true">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {showBudget && (
        <fieldset className="interest-survey__block interest-survey__block--animate">
          <legend className="interest-survey__legend">
            <span className="interest-survey__legend-num">
              <Coins size={12} />
            </span>
            Ngân sách thuê dự kiến
            <span className="interest-survey__legend-hint">Tuỳ chọn</span>
          </legend>
          <div className="interest-survey__chips interest-survey__chips--budget">
            {SURVEY_BUDGET_RANGES.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                style={{ animationDelay: `${idx * 40}ms` }}
                className={`interest-survey__chip ${draft.budgetRange === item.id ? "is-selected" : ""}`}
                onClick={() =>
                  patch({
                    budgetRange: draft.budgetRange === item.id ? null : item.id,
                  })
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

export function isSurveyIntentStepValid(draft) {
  return !!draft?.intent;
}

export function isSurveyCategoriesStepValid(draft) {
  return (draft?.interestedCategories?.length ?? 0) > 0;
}

export function isSurveyDraftComplete(draft) {
  return isSurveyIntentStepValid(draft) && isSurveyCategoriesStepValid(draft);
}
