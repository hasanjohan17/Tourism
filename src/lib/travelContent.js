import {
  destinationImages as fallbackDestinationImages,
  plans as fallbackPlans,
} from "../data/travelData";

const fallbackPlansByCode = new Map(fallbackPlans.map((plan) => [plan.id, plan]));
const fallbackDestinationsByImage = new Map(fallbackDestinationImages.map((destination) => [destination.src, destination]));

export async function fetchPublicTravelContent(supabase) {
  const [plansResponse, destinationsResponse] = await Promise.all([
    supabase
      .from("travel_plans")
      .select(
        "id, code, name, subtitle, duration, price_label, image_url, accent, is_featured, sort_order, plan_highlights(body, sort_order)",
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("destinations")
      .select("id, title, tag, description, image_url, location, sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (plansResponse.error) {
    throw plansResponse.error;
  }

  if (destinationsResponse.error) {
    throw destinationsResponse.error;
  }

  return {
    plans: plansResponse.data.map((plan) => ({
      id: plan.code,
      name: fallbackPlansByCode.get(plan.code)?.name ?? plan.name,
      subtitle: fallbackPlansByCode.get(plan.code)?.subtitle ?? plan.subtitle,
      duration: fallbackPlansByCode.get(plan.code)?.duration ?? plan.duration,
      price: fallbackPlansByCode.get(plan.code)?.price ?? plan.price_label,
      image: plan.image_url,
      accent: fallbackPlansByCode.get(plan.code)?.accent ?? plan.accent,
      featured: plan.is_featured,
      highlights:
        fallbackPlansByCode.get(plan.code)?.highlights ??
        [...(plan.plan_highlights ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((highlight) => highlight.body),
    })),
    destinationImages: destinationsResponse.data.map((destination) => {
      const fb = fallbackDestinationsByImage.get(destination.image_url);
      return {
        id: destination.id,
        src: destination.image_url,
        title: fb?.title ?? destination.title,
        tag: fb?.tag ?? destination.tag,
        description: (destination.description ?? "").trim() || fb?.description || "",
        location: (destination.location ?? "").trim() || fb?.location || "",
      };
    }),
  };
}
