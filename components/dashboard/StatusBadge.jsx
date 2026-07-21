import { Badge } from "@/components/ui";
import { ORDER_STATUS_LIST, LISTING_STATUS } from "@/lib/constants";

const ORDER_VARIANTS = {
  pending: "warning",
  paid: "blue",
  audit_pickup: "blue",
  shipping: "blue",
  in_use: "green",
  audit_return: "blue",
  completed: "green",
  cancelled: "muted",
  disputed: "danger",
  overdue: "danger",
  risk: "danger",
};

const LISTING_VARIANTS = {
  available: "green",
  rented: "blue",
  draft: "muted",
  suspended: "danger",
};

export const ACTIVE_ORDER_STATUSES = [
  "pending",
  "paid",
  "audit_pickup",
  "shipping",
  "in_use",
  "audit_return",
  "overdue",
  "risk",
  "disputed",
];

export function StatusBadge({ status, className = "" }) {
  const entry = ORDER_STATUS_LIST.find((s) => s.code === status);
  const variant = ORDER_VARIANTS[status] ?? "muted";
  return (
    <Badge variant={variant} className={className}>
      {entry?.label ?? status}
    </Badge>
  );
}

export function ListingStatusBadge({ status, className = "" }) {
  const entry = Object.values(LISTING_STATUS).find((s) => s.code === status);
  const variant = LISTING_VARIANTS[status] ?? "muted";
  return (
    <Badge variant={variant} className={className}>
      {entry?.label ?? status}
    </Badge>
  );
}
