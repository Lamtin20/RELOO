# Samsung app audit — bounded observation

Date22/10/2026 Asia/Ho_Chi_Minh; target Samsung SM-N950N, ADB state `device`. Existing pinned REA6.5.0, commit/source verified in prior study and tools/rea-toolchain.json; SDK adb37.0.1 at output/mobile-tools. No reinstall/update/root/security bypass. Only requested apps and system UI needed for connection. No private messages/photos/contacts; no form submit/application/payment/booking/offer.

| App | Actual identity | Direct screens captured | Scope not covered |
|---|---|---|---|
| Small Jobs | vn.onesec.smalljobs1.2.4 code98, Play installer | Splash then home, field filter sheet; candidate/employer/type entries observed | Applications, private tasks, chat, eKYC, wallet, employer approval, shift no-show = UNOBSERVED |
| Mioto | com.mioto.mioto5.3.1 code719, Play | Home self-drive/chauffeur, location/date interval, tab structure | New detailed booking or vehicle pickup/payment = UNOBSERVED |
| Chợ Tốt | com.chotot.vn5.51.0 code1055100, Play | Startup then feed/categories, time/specs/price/location, saved/bell/nav | Post/offer/chat/buyer protection pipeline = UNOBSERVED |
| Go2Joy | Query package substring go2joy returned0 | Browser official home/terms only | Native identity and all device flows UNOBSERVED; cannot infer absent under other package name |

Each `*-version.json`, launch and screenshot JSON stores REA evidence ID/digest/limitations. REA screencap is a frame, not proof of the whole flow. UIAutomator text captured only for target app surfaces. Personal header/task counts/account labels are masked in retained images/XML; redaction manifest has post-redaction hash (REA original hash describes original frame). Status-bar clock is not task date authority. No false app failure claim from one splash frame.

| Observation | UX principle | RELOO application | Rule / component / test |
|---|---|---|---|
| Small Jobs field+location filters and work type entry | Distinguish intent before showing terms/pay | Separate worker/employer and shift/full-time selections, coming-soon gate | JOB-001, ServicePages, superapp.test |
| Mioto clear rental period | Price context must include dates and responsibility | Existing HomeDiscoveryHero/RentalCalendar, no cross-domain price sorting | RENT-001, UX-002, home-discovery/rental-selection tests |
| Chợ Tốt category and item card specs | Keep domain-specific facts on common card structure | Used entry points to sale-filtered catalog, no fake reviews | UX-001/002, MiniAppCards, superapp.test |
| Go2Joy official browser modes + range price | Stay mode/time is business context | Existing day-booking demo, future hour/night rules require explicit tariff | STAY-001/002, Stays, stays.test |

Device observed home/filter only, not all screens. Existing signed-in apps left untouched except opening relevant public surfaces/filter and Back; no private workflows used. When research ends, user may unplug USB and turn off USB debugging in Developer options if no further debug is needed. No requirement to disable device security or expose remote ports.
