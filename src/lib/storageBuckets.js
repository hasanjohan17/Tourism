/**
 * أسماء حاويات Supabase Storage والمجلدات داخلها.
 * غيّر القيم في `.env` إذا استخدمت أسماء مختلفة (مع إبقاء المسارات متطابقة مع السياسات في schema.sql).
 */
export const STORAGE_BUCKET_PRIVATE =
  import.meta.env.VITE_STORAGE_BUCKET_PRIVATE?.trim() || "important images";

export const STORAGE_BUCKET_PUBLIC =
  import.meta.env.VITE_STORAGE_BUCKET_PUBLIC?.trim() || "posts-and-plans";

/** داخل الحاوية الخاصة (جواز + دفعات) */
export const PRIVATE_FOLDER_PASSPORT = "passport images";
export const PRIVATE_FOLDER_PAYMENT = "payment images";

/** داخل الحاوية العامة (منشورات وخطط من لوحة التحكم) */
export const PUBLIC_FOLDER_POSTS = "posts images";
export const PUBLIC_FOLDER_PLANS = "plans images";

/** يُحدَّد بعد أول رفع ناجح — ليتوافق مع اسم الحاوية الفعلي في مشروعك */
let resolvedPublicBucketId = null;

/**
 * أسماء شائعة للحاوية العامة (المسافة في الاسم تسبب أخطاء إن لم تُنشأ بنفس الشكل في Dashboard).
 */
export function getPublicBucketCandidates() {
  const env = import.meta.env.VITE_STORAGE_BUCKET_PUBLIC?.trim();
  return [...new Set([env, "posts-and-plans", "public images", "public-images", "public_images"].filter(Boolean))];
}

export function privatePassportObjectPath(userId, fileName) {
  return `${PRIVATE_FOLDER_PASSPORT}/${userId}/${fileName}`;
}

export function privatePaymentObjectPath(userId, fileName) {
  return `${PRIVATE_FOLDER_PAYMENT}/${userId}/${fileName}`;
}

export function publicPostImageObjectPath(adminId, fileName) {
  return `${PUBLIC_FOLDER_POSTS}/${adminId}/${fileName}`;
}

export function publicPlanImageObjectPath(adminId, fileName) {
  return `${PUBLIC_FOLDER_PLANS}/${adminId}/${fileName}`;
}

function isBucketNotFoundError(err) {
  const m = String(err?.message || err || "").toLowerCase();
  return m.includes("bucket not found");
}

/**
 * رفع صورة عامة (منشور / خطة) مع تجربة عدة معرفات للحاوية إن فشلت الأولى.
 * يستخدم upsert لتفادي فشل إعادة الرفع لنفس المسار أثناء التجارب.
 */
export async function uploadPublicFileAndGetUrl(supabase, objectPath, file) {
  const base = getPublicBucketCandidates();
  const order = resolvedPublicBucketId
    ? [resolvedPublicBucketId, ...base.filter((b) => b !== resolvedPublicBucketId)]
    : base;

  let lastError = null;
  for (const bucketId of order) {
    const { error } = await supabase.storage.from(bucketId).upload(objectPath, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (!error) {
      resolvedPublicBucketId = bucketId;
      const { data } = supabase.storage.from(bucketId).getPublicUrl(objectPath);
      return { publicUrl: data.publicUrl, bucketId };
    }
    lastError = error;
    if (!isBucketNotFoundError(error)) {
      break;
    }
  }

  const hint = `Create a public bucket in Supabase (Storage) named exactly one of: ${getPublicBucketCandidates().join(", ")} — or set VITE_STORAGE_BUCKET_PUBLIC in .env to match your bucket id. Run the STORAGE block in supabase/schema.sql for RLS policies.`;
  throw new Error(lastError?.message ? `${lastError.message} — ${hint}` : hint);
}

export function getPublicImageUrl(supabase, objectPath) {
  const bucketId = resolvedPublicBucketId || STORAGE_BUCKET_PUBLIC;
  const { data } = supabase.storage.from(bucketId).getPublicUrl(objectPath);
  return data.publicUrl;
}
