const image = (name) => `${import.meta.env.BASE_URL}images/${encodeURIComponent(name)}`;

/** قلعة الحصن (حمص) — مسار الصور الثابت للخلفية */
export const alHosnCastleSrc = image("Homs Al Hosn Castle.jpg");

export const destinationImages = [
  {
    src: alHosnCastleSrc,
    title: "Al Hosn Castle",
    tag: "Castles and heritage",
    description: "Medieval fortress in Homs with striking stone walls and views over the old city.",
    location: "Homs, Syria",
  },
  {
    src: image("Bosra roman Theatre.jpg"),
    title: "Bosra Theatre",
    tag: "Roman ruins",
    description: "One of the best-preserved Roman theatres in the Middle East, carved from black basalt.",
    location: "Bosra, Daraa Governorate",
  },
  {
    src: image("damascus umaayya.jpg"),
    title: "Old Damascus",
    tag: "Living history",
    description: "Walk the Umayyad-era lanes, souqs, and mosques at the heart of the oldest capital in the world.",
    location: "Damascus Old City",
  },
  {
    src: image("palmyra nice.jpg"),
    title: "Palmyra",
    tag: "Desert civilization",
    description: "Ancient desert oasis city — colonnades and temples rising from the Syrian desert.",
    location: "Palmyra, Homs Governorate",
  },
  {
    src: image("damascus four session hotel.jpg"),
    title: "Comfortable stay",
    tag: "Selected hotels",
    description: "Hand-picked hotels for rest between full days of sightseeing and family time.",
    location: "Damascus",
  },
  {
    src: image("damascus locale resturant.jpg"),
    title: "Local restaurants",
    tag: "Authentic experience",
    description: "Traditional Syrian dishes in atmospheric courtyards and family-run kitchens.",
    location: "Damascus",
  },
];

export const plans = [
  {
    id: "A",
    name: "Plan A",
    subtitle: "A light trip for families",
    duration: "3 days / 2 nights",
    price: "Starting from $299",
    image: image("damascus umaayya.jpg"),
    accent: "marine",
    highlights: ["Old Damascus tour", "4-star hotel", "Comfortable transportation", "Local guide"],
  },
  {
    id: "B",
    name: "Plan B",
    subtitle: "The balanced cultural route",
    duration: "5 days / 4 nights",
    price: "Starting from $549",
    image: image("Bosra AL-Sham.jpg"),
    accent: "jade",
    featured: true,
    highlights: ["Damascus and Bosra", "Flexible family schedule", "Selected restaurants", "WhatsApp support"],
  },
  {
    id: "C",
    name: "Plan C",
    subtitle: "Full VIP experience",
    duration: "7 days / 6 nights",
    price: "Starting from $899",
    image: image("palmyra.jpg"),
    accent: "saffron",
    highlights: ["Damascus, Palmyra, and Al Hosn", "Excellent hotels", "Private car", "Custom trip design"],
  },
];

export const stats = [
  { value: "3", label: "Curated travel plans" },
  { value: "6+", label: "Unforgettable destinations" },
  { value: "24/7", label: "Personal travel support" },
];
