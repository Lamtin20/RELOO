import { NextResponse } from "next/server";
import {
  getGoshipTrackingEvents,
  getLatestGoshipTracking,
  seedGoshipTracking,
} from "@/lib/goship/shipping-tracking-store";

/** Demo: khởi tạo tracking mẫu cho RL-2026-0002 */
const DEMO_SEEDED = new Set();

function ensureDemoSeed(orderId) {
  if (orderId !== "RL-2026-0002" || DEMO_SEEDED.has(orderId)) return;
  DEMO_SEEDED.add(orderId);
  seedGoshipTracking(orderId, [
    {
      orderId,
      gcode: "GS6ZE234V6",
      carrierCode: "AHM-VN87654321",
      status: "901",
      statusText: "Chờ lấy hàng",
      message: "Chờ shipper qua lấy hàng",
      description: "Shipper đang trên đường đến lấy hàng",
      trackingUrl: "https://donhang.ghn.vn/?order_code=GAPBLXAE",
      carrierShortName: "ghn",
      updateTime: 1735700400,
    },
    {
      orderId,
      gcode: "GS6ZE234V6",
      carrierCode: "AHM-VN87654321",
      status: "904",
      statusText: "Đang vận chuyển",
      message: "Hàng đang trên đường giao",
      description: "Đơn hàng đang được vận chuyển đến người nhận",
      trackingUrl: "https://donhang.ghn.vn/?order_code=GAPBLXAE",
      carrierShortName: "ghn",
      updateTime: 1735786800,
    },
    {
      orderId,
      gcode: "GS6ZE234V6",
      carrierCode: "AHM-VN87654321",
      status: "905",
      statusText: "Đang giao hàng",
      message: "Shipper đang giao hàng",
      description: "Shipper sẽ liên hệ trước khi giao",
      trackingUrl: "https://donhang.ghn.vn/?order_code=GAPBLXAE",
      carrierShortName: "ghn",
      updateTime: 1735790400,
    },
  ]);
}

export async function GET(_request, { params }) {
  const orderId = params?.orderId;
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Missing orderId" }, { status: 400 });
  }

  ensureDemoSeed(orderId);

  const events = getGoshipTrackingEvents(orderId);
  const latest = getLatestGoshipTracking(orderId);

  return NextResponse.json({
    ok: true,
    data: {
      orderId,
      latest,
      events,
    },
  });
}
