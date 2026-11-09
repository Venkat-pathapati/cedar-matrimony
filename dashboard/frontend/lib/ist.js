// All dates are stored in UTC; show them in Indian Standard Time.
const TZ = "Asia/Kolkata";
export const fmtDateIST = (v) => (v ? new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }) : "—");
export const fmtDateTimeIST = (v) => (v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ }) + " IST" : "—");
