import { ArrowRight, Check, PackagePlus, Search } from "lucide-react";
const INTENTS = [
  { id: "renter", label: "Tôi muốn thuê", icon: Search },
  { id: "lender", label: "Tôi cho thuê", icon: PackagePlus },
  { id: "both", label: "Cả hai", icon: ArrowRight },
];
export function AccountIntentPicker({ value, onChange }) {
  return (
    <fieldset className="auth-intents">
      <legend>Bạn đến RELOO để</legend>
      <div>
        {INTENTS.map((item) => (
          <label key={item.id}>
            <input
              type="radio"
              name="intent"
              value={item.id}
              checked={value === item.id}
              onChange={() => onChange(item.id)}
            />
            <item.icon size={17} />
            <span>{item.label}</span>
            {value === item.id && (
              <Check size={13} className="auth-intents__check" />
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
