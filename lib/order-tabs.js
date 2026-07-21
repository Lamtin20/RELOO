/** Trạng thái đơn đang diễn ra (chưa hoàn tất / chưa hủy) */
export const ACTIVE_ORDER_TAB_STATUSES = [
  "pending",
  "paid",
  "audit_pickup",
  "shipping",
  "in_use",
  "audit_return",
];

export const ORDER_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "active", label: "Đang thuê" },
  { id: "completed", label: "Hoàn tất" },
  { id: "overdue", label: "Quá hạn" },
];

const TAB_FILTERS = {
  all: () => true,
  active: (order) => ACTIVE_ORDER_TAB_STATUSES.includes(order.status),
  completed: (order) => order.status === "completed",
  overdue: (order) => order.status === "overdue",
};

export function isValidOrderTab(id) {
  return ORDER_TABS.some((t) => t.id === id);
}

export function filterOrdersByTab(orders, tabId = "all") {
  const predicate = TAB_FILTERS[tabId] ?? TAB_FILTERS.all;
  return orders.filter(predicate);
}

export function countOrdersByTab(orders) {
  return ORDER_TABS.reduce((acc, tab) => {
    acc[tab.id] = filterOrdersByTab(orders, tab.id).length;
    return acc;
  }, {});
}
