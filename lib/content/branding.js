import { securityDb } from "../security/service.js";
import { mediaUrl } from "./media.js";
export const DEFAULT_SITE_TITLE = "Reloo - Cộng đồng thuê & cho thuê đồ dùng, thiết bị";
export async function branding() {
  try {
    const { data, error } = await securityDb()
      .from("brand_settings")
      .select("*")
      .eq("id", true)
      .single();
    if (error) throw error;
    return {
      siteTitle: data.site_title || DEFAULT_SITE_TITLE,
      shippingEnabled: data.shipping_enabled === true,
      rentalPaymentsEnabled: data.rental_payments_enabled === true,
      favicon: mediaUrl(data.favicon_id) || "/brand/reloo-symbol.png",
      appIcon: mediaUrl(data.app_icon_id) || "/brand/reloo-symbol.png",
      crmLogo: mediaUrl(data.crm_logo_id) || "/brand/reloo-logo.png",
      version: data.version,
    };
  } catch {
    return {
      siteTitle: DEFAULT_SITE_TITLE,
      shippingEnabled: false,
      rentalPaymentsEnabled: false,
      favicon: "/brand/reloo-symbol.png",
      appIcon: "/brand/reloo-symbol.png",
      crmLogo: "/brand/reloo-logo.png",
      version: 1,
    };
  }
}
