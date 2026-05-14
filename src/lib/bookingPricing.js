/** Parse first dollar amount from plan label e.g. "Starting from $549" → 549 */
export function parsePlanBaseUsd(planPriceLabel) {
  const m = String(planPriceLabel || "").match(/\d+/);
  const n = m ? parseInt(m[0], 10) : 0;
  return n > 0 ? n : 299;
}

/**
 * Solo: you + companions (friends). Extra people add ~32% of base each; group discount up to ~18%.
 * Family: total members (min 2). Package scales with household size.
 */
export function computeBookingQuote(baseUsd, bookingType, companions, familyMembers) {
  const base = Math.max(1, baseUsd || 299);

  if (bookingType === "family") {
    const n = Math.min(20, Math.max(2, Number(familyMembers) || 2));
    let total = base * (0.88 + n * 0.035);
    if (n > 6) {
      total += (n - 6) * base * 0.018;
    }
    total = Math.round(total);
    return {
      travelersCount: n,
      totalUsd: total,
      breakdown: `Family (${n} members): package estimate $${total} (final quote may be adjusted by our team).`,
    };
  }

  const c = Math.min(15, Math.max(0, Math.floor(Number(companions) || 0)));
  const totalPeople = 1 + c;
  const extraEach = base * 0.32;
  const subtotal = base + c * extraEach;
  const discountRate = Math.min(0.18, c * 0.025);
  const total = Math.round(subtotal * (1 - discountRate));

  return {
    travelersCount: totalPeople,
    totalUsd: total,
    breakdown: `Solo + ${c} companion(s), ${totalPeople} travelers: ~$${Math.round(subtotal)} before ${Math.round(discountRate * 100)}% group savings → $${total}.`,
  };
}
