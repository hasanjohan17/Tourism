/** رقم واتساب: أرقام فقط مع رمز الدولة بدون + (مثال: 9639xxxxxxxx) */
export function getWhatsAppDigits() {
  return String(import.meta.env.VITE_WHATSAPP_E164 || "").replace(/\D/g, "");
}

/** رابط واتساب مع نص مُشفّر (يُستخدم للرسائل الجاهزة) */
export function whatsappUrlWithText(message) {
  const digits = getWhatsAppDigits() || "963947530585";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** رابط واتساب بدون نص مسبق */
export function whatsappUrlSimple() {
  const digits = getWhatsAppDigits() || "963947530585";
  return `https://wa.me/${digits}`;
}

/** رسالة جاهزة عن منشور / وجهة سياحية */
export function buildDestinationInquiryMessage(destination) {
  const title = destination?.title?.trim() || "this place";
  const loc = destination?.location?.trim();
  const desc = destination?.description?.trim();
  const tag = destination?.tag?.trim();

  const lines = [
    `Hello — I need to ask about this destination: *${title}*.`,
    tag ? `Category / tag: ${tag}.` : null,
    loc ? `Location: ${loc}.` : null,
    desc
      ? `More context: ${desc.length > 400 ? `${desc.slice(0, 400)}…` : desc}`
      : "I'd like more details about visiting this place.",
    "",
    "I'm interested in availability, how it fits an itinerary, and any family-friendly options. Thank you!",
  ];

  return lines.filter(Boolean).join("\n");
}
