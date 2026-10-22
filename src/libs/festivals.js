// Fixed Gregorian and lunar festival lookup for the toolbar easter egg.
// Lunar dates come from the built-in Intl Chinese calendar (no data table).

const GREGORIAN_FESTIVALS = [
  { id: "valentine", name: "情人节", month: 2, days: [14], emojis: ["💕", "💋", "💍", "💌"] },
  { id: "women", name: "妇女节", month: 3, days: [8], emojis: ["🎀", "💄", "👗", "👠"] },
  { id: "patrick", name: "圣帕特里克节", month: 3, days: [17], emojis: ["🍀", "💚", "☘️", "📗"] },
  { id: "labor", name: "劳动节", month: 5, days: [1], emojis: ["💼", "📎", "📌", "🖊️", "🗒️"] },
  { id: "idahot", name: "国际不再恐同日", month: 5, days: [17], emojis: ["🌈", "🏳️‍🌈", "🏳️‍⚧️", "🩷"] },
  { id: "children", name: "儿童节", month: 6, days: [1], emojis: ["🧸", "🍭", "🍰", "🎠"] },
  { id: "halloween", name: "万圣节", month: 10, days: [31], emojis: ["🎃", "👻", "🍬", "🦇"] },
  { id: "dayOfDead", name: "亡灵节", month: 11, days: [1, 2], emojis: ["⚰️", "✝️", "🕯️", "🌼", "💀"] },
  { id: "christmas", name: "圣诞节", month: 12, days: [25], emojis: ["🎄", "🎁", "❄️", "🧦", "🔔"] },
];

const LUNAR_FESTIVALS = [
  { id: "spring", name: "春节", month: 1, day: 1, emojis: ["🧨", "🧧", "🥟", "🎇"] },
  { id: "lantern", name: "元宵节", month: 1, day: 15, emojis: ["🥣", "🏮", "🍡", "⚪️"] },
  { id: "dragonBoat", name: "端午节", month: 5, day: 5, emojis: ["🐉", "🐲", "🍚", "🛶"] },
  { id: "midAutumn", name: "中秋节", month: 8, day: 15, emojis: ["🌕", "🌛", "🥮", "🦀"] },
];

let lunarFormatter;
let lunarFormatterReady = false;

function getLunarFormatter() {
  if (lunarFormatterReady) return lunarFormatter;
  lunarFormatterReady = true;
  try {
    const formatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
      month: "numeric",
      day: "numeric",
    });
    lunarFormatter =
      formatter.resolvedOptions().calendar === "chinese" ? formatter : null;
  } catch (e) {
    lunarFormatter = null;
  }
  return lunarFormatter;
}

// Returns { month, day } for the lunar date, or null for unsupported calendars
// and leap months (a leap month must not trigger the regular festival).
function getLunarMonthDay(date) {
  const formatter = getLunarFormatter();
  if (!formatter) return null;
  try {
    const parts = formatter.formatToParts(date);
    const rawMonth = parts.find((part) => part.type === "month")?.value || "";
    if (rawMonth.includes("闰")) return null;
    const readNumber = (value) => parseInt(String(value).replace(/[^\d]/g, ""), 10);
    const month = readNumber(rawMonth);
    const day = readNumber(parts.find((part) => part.type === "day")?.value || "");
    return Number.isFinite(month) && Number.isFinite(day) ? { month, day } : null;
  } catch (e) {
    return null;
  }
}

// Returns { id, name, emojis } for today's festival, or null.
export function getFestivalInfo(date = new Date()) {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  for (const festival of GREGORIAN_FESTIVALS) {
    if (festival.month === month && festival.days.includes(day)) {
      return { id: festival.id, name: festival.name, emojis: festival.emojis };
    }
  }

  const lunar = getLunarMonthDay(date);
  if (!lunar) return null;
  for (const festival of LUNAR_FESTIVALS) {
    if (festival.month === lunar.month && festival.day === lunar.day) {
      return { id: festival.id, name: festival.name, emojis: festival.emojis };
    }
  }
  return null;
}
