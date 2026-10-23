"use client";
import { createContext, useContext } from "react";
import type { state } from "@/lib/service";
export type State = ReturnType<typeof state>;
export type Act = <T = unknown>(
  path: string,
  body: unknown,
  message?: string,
  href?: string,
) => Promise<T | null>;
export interface AppContextValue {
  data: State;
  act: Act;
  busy: boolean;
  lang: "en" | "hi";
  t: (key: string) => string;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error("App context unavailable");
  return c;
}
export const copy: Record<string, [string, string]> = {
  origin: ["Starting point", "प्रस्थान स्थान"],
  destination: ["Destination", "गंतव्य"],
  earliest: ["Earliest departure · IST", "सबसे जल्दी प्रस्थान · IST"],
  latest: ["Latest departure · IST", "अंतिम प्रस्थान समय · IST"],
  wait: ["Maximum wait · minutes", "अधिकतम प्रतीक्षा · मिनट"],
  detour: ["Maximum added driving · minutes", "अधिकतम अतिरिक्त यात्रा · मिनट"],
  walk: [
    "Maximum pickup walk · metres",
    "मिलने के लिए अधिकतम पैदल दूरी · मीटर",
  ],
  seats: ["Passenger seats needed", "यात्री सीटों की संख्या"],
  luggage: ["Luggage per passenger", "प्रति यात्री सामान"],
  provider: ["Provider preference", "कैब सेवा की पसंद"],
  solo: [
    "Your current solo cab quote · ₹",
    "आपके अकेले सफर का अनुमानित किराया · ₹",
  ],
  discoveryConsent: [
    "I consent to matching within my community. I understand this is passenger coordination, and fares are estimates.",
    "मैं अपने समुदाय में सहयात्री खोजने की सहमति देता/देती हूँ। यह यात्री समन्वय है और किराया अनुमानित है।",
  ],
  invite: ["Invite group", "समूह को आमंत्रित करें"],
  actual: ["Actual cab fare · ₹", "वास्तविक कैब किराया · ₹"],
  recalculate: [
    "Recalculate actual shares",
    "वास्तविक हिस्से दोबारा गणना करें",
  ],
  acceptFare: [
    "Accept actual-fare shares",
    "वास्तविक किराये के हिस्से स्वीकार करें",
  ],
  paid: ["Mark my share paid", "मेरा हिस्सा भुगतान किया चिह्नित करें"],
  unpaid: ["Mark my share unpaid", "मेरा हिस्सा भुगतान बाकी चिह्नित करें"],
  prepare: ["Prepare external booking", "बाहरी बुकिंग की तैयारी करें"],
  booked: ["I booked externally", "मैंने बाहरी ऐप पर बुकिंग की"],
  reportBody: ["Your report", "आपकी रिपोर्ट"],
  reportSubmit: ["Submit report", "रिपोर्ट भेजें"],
  block: [
    "Also block this traveller from future matching and messages.",
    "इस यात्री को भविष्य के मिलान और संदेशों से भी ब्लॉक करें।",
  ],
  routeTitle: ["Where are you headed?", "आप कहाँ जा रहे हैं?"],
  limitsTitle: ["Your journey. Your limits.", "आपकी यात्रा। आपकी सीमाएँ।"],
  reviewTitle: [
    "Ready to find your circle?",
    "अपने सहयात्री खोजने के लिए तैयार हैं?",
  ],

  dashboard: ["Overview", "अवलोकन"],
  trips: ["My journeys", "मेरी यात्राएँ"],
  matches: ["Find co-travellers", "सहयात्री खोजें"],
  history: ["Trip history", "यात्रा इतिहास"],
  notifications: ["Notifications", "सूचनाएँ"],
  profile: ["My profile", "मेरी प्रोफ़ाइल"],
  safety: ["Safety & support", "सुरक्षा और सहायता"],
  create: ["Plan a journey", "यात्रा की योजना बनाएँ"],
  find: ["Find my people", "सहयात्री खोजें"],
  accept: ["Accept current terms", "वर्तमान शर्तें स्वीकार करें"],
  cancel: ["Cancel request", "अनुरोध रद्द करें"],
  report: ["Report or block", "रिपोर्ट या ब्लॉक करें"],
  booking: [
    "You book externally. No booking is verified by Yatra Sync.",
    "बुकिंग बाहरी ऐप पर करें। यात्रा सिंक बुकिंग की पुष्टि नहीं करता।",
  ],
  payment: [
    "Self-reported settlement. No money moves through Yatra Sync.",
    "भुगतान की स्थिति स्वयं बताई गई है। यात्रा सिंक पैसे नहीं लेता।",
  ],
  consent: [
    "I agree to this group, departure and fare method.",
    "मैं इस समूह, प्रस्थान और किराया विधि से सहमत हूँ।",
  ],
  synthetic: ["SYNTHETIC DEMO", "काल्पनिक डेमो"],
  next: ["Continue", "आगे बढ़ें"],
  back: ["Back", "पीछे"],
  save: ["Save changes", "बदलाव सहेजें"],
  leave: ["Decline / leave group", "समूह अस्वीकार करें / छोड़ें"],
};
