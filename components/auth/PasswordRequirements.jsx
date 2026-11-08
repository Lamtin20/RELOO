'use client';
import { Check, Circle } from "lucide-react";
import { passwordChecks } from "@/lib/password-policy";
import {useLocale} from '@/components/settings/LocaleProvider';
import {passwordCopy} from '@/lib/i18n/password';

export function PasswordRequirements({ value, id, showStrength=false }) {
  const {locale}=useLocale(),t=passwordCopy[locale]||passwordCopy['vi-VN'];
  const checks=passwordChecks(value),count=checks.filter(c=>c.passed).length;
  if(showStrength&&!value)return <span id={id} className="sr-only">{t.title}: {checks.map(check=>t[check.id]).join('. ')}</span>;
  return (
    <div className={showStrength?'password-guidance':undefined} id={id}>
    {showStrength&&<div className="password-strength"><div className="password-strength__heading"><span>{t.strength}</span><strong aria-live="polite">{value?t.levels[count]:t.empty}</strong></div><meter min="0" max="4" value={value?count:0} aria-label={t.strength} aria-valuetext={t.progress.replace('{count}',String(count))}/></div>}
    <ul className="password-requirements" aria-label={t.title}>
      {checks.map((check) => (
        <li
          key={check.id}
          className={check.passed ? "is-met" : ""}
          aria-label={`${t[check.id]}: ${check.passed ? t.met : t.unmet}`}
        >
          {check.passed ? (
            <Check size={13} aria-hidden="true" />
          ) : (
            <Circle size={9} aria-hidden="true" />
          )}
          <span>{t[check.id]}</span>
        </li>
      ))}
    </ul>
    </div>
  );
}
