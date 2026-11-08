"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Package, Plus, Search } from "lucide-react";
import { LocationChip } from "@/components/location/LocationChip";
import { useReloo } from "@/lib/store";

export function HomeRentalSearch() {
  const router = useRouter();
  const { state, hydrated: ready } = useReloo();
  const [mode, setMode] = useState("short");
  const [query, setQuery] = useState("");
  const [days, setDays] = useState("1");
  function changeMode(value) {
    setMode(value);
    if (value !== "lend") setDays(value === "long" ? "7" : "1");
  }
  function destination(term = query) {
    const params = new URLSearchParams({ locMode: "province", days });
    if (term.trim()) params.set("q", term.trim());
    const location = state.guestLocation;
    if (location?.province?.name) params.set("loc", location.province.name);
    else params.set("sort", "newest");
    if (location?.wards?.length)
      params.set("wards", location.wards.map((ward) => ward.code).join(","));
    else if (location?.ward?.code) params.set("wards", location.ward.code);
    return `/explore?${params}`;
  }
  return (
    <div className="home-rental-tool" aria-busy={!ready} data-ready={ready}>
      <fieldset className="home-rental-tool__modes" disabled={!ready}>
        <legend className="sr-only">Nhu cầu thuê đồ</legend>
        {[
          { value: "short", label: "Ngắn ngày", Icon: Package },
          { value: "long", label: "Dài ngày", Icon: CalendarDays },
          { value: "lend", label: "Cho thuê", Icon: Plus },
        ].map(({ value, label, Icon }) => (
          <label key={value}>
            <input
              type="radio"
              name="home-rental-mode"
              checked={mode === value}
              onChange={() => changeMode(value)}
            />
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      {mode === "lend" ? (
        <div className="home-rental-tool__owner">
          <div>
            <strong>Biến món đồ ít dùng thành cơ hội cho thuê.</strong>
            <p>Tự đặt giá, lịch thuê và trao đổi với người cần đồ.</p>
          </div>
          <Link className="btn btn-primary" href="/lend">
            <Plus size={18} /> Đăng tin cho thuê
          </Link>
        </div>
      ) : (
        <>
          <form
            className="home-rental-tool__form"
            role="search"
            aria-label="Tìm đồ theo nhu cầu"
            onSubmit={(event) => {
              event.preventDefault();
              router.push(destination());
            }}
          >
            <div className="home-rental-tool__location">
              <span>Khu vực</span>
              <LocationChip compact />
            </div>
            <div className="home-rental-tool__query">
              <label htmlFor="home-rental-query">Bạn cần thuê gì?</label>
              <div>
                <Search size={18} aria-hidden="true" />
                <input
                  id="home-rental-query"
                  disabled={!ready}
                  type="search"
                  maxLength={160}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Máy ảnh, lều camping, laptop…"
                />
              </div>
            </div>
            <div className="home-rental-tool__duration">
              <label htmlFor="home-rental-days">Thời lượng dự kiến</label>
              <select
                id="home-rental-days"
                disabled={!ready}
                value={days}
                onChange={(event) => setDays(event.target.value)}
              >
                {(mode === "long" ? [7, 14, 30] : [1, 3, 5]).map((value) => (
                  <option key={value} value={value}>
                    {value} ngày
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={!ready}>
              <Search size={18} /> Tìm đồ thuê
            </button>
          </form>
          <div className="home-rental-tool__suggestions">
            <span>{mode === "long" ? "Thuê dài ngày:" : "Tìm nhiều:"}</span>
            {(mode === "long"
              ? ["Laptop", "Máy ảnh", "Đồ gia dụng"]
              : ["Máy ảnh", "Lều camping", "Váy dạ hội"]
            ).map((term) => (
              <Link key={term} href={destination(term)}>
                {term}
                <ArrowRight size={12} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
