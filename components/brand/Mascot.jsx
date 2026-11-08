"use client";

import {Reloop} from '@/components/mascot/Reloop';

const SIZE_PRESETS = { xs: 72, sm: 120, md: 200, lg: 280, xl: 360 };

/**
 * Linh vật RELOOP — artwork raster từ ảnh chuẩn Character Lock v1.0.
 * @source public/mascot/reloop/approved-v2/reference.png
 */
export function Mascot({
  size = "md",
  className = "",
  title = "RELOOP — Guardian of Trust",
}) {
  const px = typeof size === "number" ? size : SIZE_PRESETS[size] ?? SIZE_PRESETS.md;

  return <Reloop size={px} animated={false} label={title} className={className}/>;
}
