"use client";
import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Eye, EyeOff } from 'lucide';
import { MorphIcon } from '@/components/ui/MorphIcon';
import {useLocale} from '@/components/settings/LocaleProvider';

export function PasswordInput({ id, ...props }) {
  const [visible, setVisible] = useState(false);
  const {locale}=useLocale(),label=locale==='en-US'?(visible?'Hide password':'Show password'):(visible?'Ẩn mật khẩu':'Hiện mật khẩu');
  return (
    <div className="auth-field-control">
      <LockKeyhole size={17} aria-hidden="true" />
      <input id={id} type={visible ? "text" : "password"} {...props} />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={label}
        title={label}
        aria-pressed={visible}
      >
        <MorphIcon icon={visible ? EyeOff : Eye} size={18} />
      </button>
    </div>
  );
}
