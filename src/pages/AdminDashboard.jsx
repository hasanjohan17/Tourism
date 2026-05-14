import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, Plus, Search, Trash2, Eye, EyeOff, Upload, ClipboardList, X } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import {
  STORAGE_BUCKET_PRIVATE,
  publicPlanImageObjectPath,
  publicPostImageObjectPath,
  uploadPublicFileAndGetUrl,
  getPublicImageUrl as buildPublicImageUrl,
} from "../lib/storageBuckets";
import { Users, MapPin, Plane } from "lucide-react";

/** حجوزات قديمة: استخراج مسار إثبات الدفع من حقل notes */
function parsePaymentProofFromNotes(notes) {
  if (!notes || typeof notes !== "string") {
    return null;
  }
  const marker = "Payment proof: ";
  const startIdx = notes.indexOf(marker);
  if (startIdx === -1) {
    return null;
  }
  const from = startIdx + marker.length;
  const endIdx = notes.indexOf(". Passport", from);
  const raw = (endIdx === -1 ? notes.slice(from) : notes.slice(from, endIdx)).trim();
  if (!raw || raw === "n/a" || raw === "manual") {
    return null;
  }
  return raw;
}

function parsePassportPathFromNotes(notes) {
  if (!notes || typeof notes !== "string") {
    return null;
  }
  const marker = "Passport file: ";
  const startIdx = notes.indexOf(marker);
  if (startIdx === -1) {
    return null;
  }
  const raw = notes.slice(startIdx + marker.length).trim();
  if (!raw || raw === "n/a") {
    return null;
  }
  return raw;
}

/** نسخة احتياطية إذا لم تُرجع الأعمدة من الـ API (كاش قديم أو عمود غير منشأ بعد) */
function parseBookingMetaFromNotes(notes) {
  if (!notes || typeof notes !== "string") {
    return null;
  }
  const tag = "BOOKING_META:";
  const idx = notes.indexOf(tag);
  if (idx === -1) {
    return null;
  }
  const segment = notes.slice(idx + tag.length).split(/\||\n/)[0].trim();
  const parts = segment.split(";");
  const out = {};
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const k = p.slice(0, eq).trim();
    const v = p.slice(eq + 1).trim();
    if (k) {
      out[k] = v;
    }
  }
  if (!out.type) {
    return null;
  }
  return {
    type: out.type,
    members: out.members ? parseInt(out.members, 10) : null,
    solo: out.solo !== undefined && out.solo !== "" ? parseInt(out.solo, 10) : null,
    travelers: out.travelers ? parseInt(out.travelers, 10) : null,
    quoted: out.quoted ? parseInt(out.quoted, 10) : null,
  };
}

function parseFamilyCountFromQuoteNotes(notes) {
  if (!notes || typeof notes !== "string") {
    return null;
  }
  const m = notes.match(/Family \((\d+) members\)/i);
  return m ? parseInt(m[1], 10) : null;
}

export default function AdminDashboard({ goHome }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [showDestinationForm, setShowDestinationForm] = useState(false);
  const [destinationForm, setDestinationForm] = useState({
    title: "",
    tag: "",
    description: "",
    image_url: "",
    location: "",
    sort_order: 0,
    is_published: true,
  });
  const [plans, setPlan] = useState([]);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [destinationImageUploading, setDestinationImageUploading] = useState(false);
  const [planImageUploading, setPlanImageUploading] = useState(false);
  const [planRequests, setPlanRequests] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [planForm, setPlanForm] = useState({
    code: "",
    name: "",
    subtitle: "",
    duration: "",
    price_label: "",
    image_url: "",
    accent: "marine",
    is_featured: false,
    sort_order: 0,
    is_published: true,
  });

  useEffect(() => {
    const checkAuth = async () => {
      if (!isSupabaseConfigured || !supabase) {
        alert("Supabase غير مكون");
        handleGoHome();
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          alert("يجب تسجيل الدخول أولاً");
          handleGoHome();
          return;
        }

        setUser(sessionData.session.user);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single();

        if (profileError) {
          console.error("Error loading profile:", profileError);
          alert("خطأ: " + profileError.message);
          handleGoHome();
          return;
        }

        if (!profileData || profileData?.role !== "admin") {
          console.error("User is not admin. Role:", profileData?.role);
          alert("أنت لست مسؤول!");
          handleGoHome();
          return;
        }

        setProfile(profileData);
        
        // Load all data
        await Promise.all([loadUsers(), loadDestinations(), loadPlans(), loadPlanRequests()]);
      } catch (error) {
        console.error("Auth check error:", error);
        alert("خطأ: " + error.message);
        handleGoHome();
      }
    };

    checkAuth();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log("Starting loadUsers...");
      
      // Get all users from profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("*");

      console.log("Query result:", { data, error });

      if (error) {
        console.error("Query error:", error);
        setUsers([]);
        return;
      }

      // Map the data
      const transformedUsers = (data || []).map((profile) => ({
        ...profile,
        email: profile.email || "",
        phone: profile.phone || "",
        region: profile.region || "",
        full_name: profile.full_name || "مستخدم بدون اسم",
      }));

      console.log("Transformed users:", transformedUsers);
      setUsers(transformedUsers);
    } catch (error) {
      console.error("Exception in loadUsers:", error);
      setUsers([]); 
    } finally {
      setLoading(false);
    }
  };

  const loadDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setDestinations(data || []);
    } catch (error) {
      console.error("Error loading destinations:", error);
    }
  };

  const loadPlanRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("plan_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }
      setPlanRequests(data || []);
    } catch (error) {
      console.error("Error loading plan requests:", error);
      setPlanRequests([]);
    }
  };

  const updatePlanRequestStatus = async (id, status) => {
    try {
      const { error } = await supabase.from("plan_requests").update({ status }).eq("id", id);
      if (error) {
        throw error;
      }
      await loadPlanRequests();
    } catch (error) {
      console.error("Failed to update booking status:", error);
      alert(error.message || String(error));
    }
  };

  const openSignedPrivatePreview = async (title, storagePath) => {
    if (!storagePath) {
      alert("لا يوجد ملف مرتبط.");
      return;
    }
    if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
      setImagePreview({ url: storagePath, title });
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET_PRIVATE)
        .createSignedUrl(storagePath, 3600);
      if (error) {
        throw error;
      }
      if (!data?.signedUrl) {
        throw new Error("لم يُرجع التخزين رابطاً");
      }
      setImagePreview({ url: data.signedUrl, title });
    } catch (e) {
      alert("تعذر فتح الصورة: " + (e.message || String(e)));
    }
  };

  const resolveBookingPaymentPath = (row) =>
    row.payment_proof_url || parsePaymentProofFromNotes(row.notes);

  const resolveBookingPassportPath = (row) =>
    row.passport_proof_url ||
    users.find((u) => u.id === row.user_id)?.passport_image_url ||
    parsePassportPathFromNotes(row.notes);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("travel_plans")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setPlan(data || []);
    } catch (error) {
      console.error("Error loading plans:", error);
    }
  };

  const getPublicImageUrl = (objectPath) => buildPublicImageUrl(supabase, objectPath);

  const uploadPublicImageFile = async (file, kind) => {
    if (!file || !user?.id) {
      throw new Error("ملف غير صالح أو جلسة منتهية");
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      throw new Error("الصيغ المسموحة: jpg, png, webp, gif");
    }
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const objectPath =
      kind === "plan" ? publicPlanImageObjectPath(user.id, fileName) : publicPostImageObjectPath(user.id, fileName);
    const { publicUrl } = await uploadPublicFileAndGetUrl(supabase, objectPath, file);
    return publicUrl;
  };

  const handleDestinationImagePick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      setDestinationImageUploading(true);
      const url = await uploadPublicImageFile(file, "post");
      setDestinationForm((prev) => ({ ...prev, image_url: url }));
    } catch (err) {
      console.error(err);
      alert("فشل رفع الصورة: " + (err.message || String(err)));
    } finally {
      setDestinationImageUploading(false);
    }
  };

  const handlePlanImagePick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      setPlanImageUploading(true);
      const url = await uploadPublicImageFile(file, "plan");
      setPlanForm((prev) => ({ ...prev, image_url: url }));
    } catch (err) {
      console.error(err);
      alert("فشل رفع الصورة: " + (err.message || String(err)));
    } finally {
      setPlanImageUploading(false);
    }
  };

  const addDestination = async (e) => {
    e.preventDefault();
    if (!destinationForm.image_url?.trim()) {
      alert("الرجاء رفع صورة من الجهاز أو لصق رابط صورة صالح.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from("destinations").insert([destinationForm]);

      if (error) throw error;

      setDestinationForm({
        title: "",
        tag: "",
        description: "",
        image_url: "",
        location: "",
        sort_order: 0,
        is_published: true,
      });
      setShowDestinationForm(false);
      alert("تمت إضافة المنشور بنجاح!");
      await loadDestinations();
    } catch (error) {
      console.error("Error adding destination:", error);
      alert("خطأ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDestination = async (id) => {
    if (confirm("هل تريد حذف هذا المنشور؟")) {
      try {
        setLoading(true);
        const { error } = await supabase.from("destinations").delete().eq("id", id);

        if (error) throw error;
        alert("تم الحذف بنجاح!");
        await loadDestinations();
      } catch (error) {
        console.error("Error deleting destination:", error);
        alert("خطأ: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const deleteBooking = async (bookingId) => {
    if (
      !confirm(
        "هل أنت متأكد من رغبتك في حذف هذه الحجز؟ هذا الإجراء لا يمكن التراجع عنه.",
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from("plan_requests").delete().eq("id", bookingId);

      if (error) throw error;
      alert("تم حذف الحجز بنجاح!");
      await loadPlanRequests();
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("خطأ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addPlan = async (e) => {
    e.preventDefault();
    if (!planForm.image_url?.trim()) {
      alert("الرجاء رفع صورة من الجهاز أو لصق رابط صورة صالح.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from("travel_plans").insert([
        {
          ...planForm,
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      setPlanForm({
        code: "",
        name: "",
        subtitle: "",
        duration: "",
        price_label: "",
        image_url: "",
        accent: "marine",
        is_featured: false,
        sort_order: 0,
        is_published: true,
      });
      setShowPlanForm(false);
      alert("تمت إضافة الخطة بنجاح!");
      await loadPlans();
    } catch (error) {
      console.error("Error adding plan:", error);
      alert("خطأ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (id) => {
    if (confirm("هل تريد حذف هذه الخطة؟")) {
      try {
        setLoading(true);
        const { error } = await supabase.from("travel_plans").delete().eq("id", id);

        if (error) throw error;
        alert("تم الحذف بنجاح!");
        await loadPlans();
      } catch (error) {
        console.error("Error deleting plan:", error);
        alert("خطأ: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const deleteUser = async (userId) => {
    if (userId === user?.id) {
      alert("لا يمكنك حذف حسابك الإداري من هذه القائمة.");
      return;
    }
    if (
      !confirm(
        "تحذير: سيتم حذف حجوزات هذا المستخدم ثم ملفه الشخصي من قاعدة البيانات. هل أنت متأكد؟",
      )
    ) {
      return;
    }
    try {
      setLoading(true);

      const { error: bookingDelError } = await supabase.from("plan_requests").delete().eq("user_id", userId);
      if (bookingDelError) {
        throw new Error("تعذر حذف حجوزات المستخدم: " + bookingDelError.message);
      }

      const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);

      if (profileError) {
        throw profileError;
      }

      alert(
        "تم حذف سجل المستخدم وحجوزاته من قاعدة البيانات. حساب تسجيل الدخول (Auth) ما زال في Supabase — لحذفه نهائياً استخدم Dashboard → Authentication أو Edge Function بمفتاح الخدمة.",
      );
      await loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("خطأ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (goHome) {
      goHome();
    } else {
      window.location.hash = "#home";
    }
  };

  const handleGoHome = () => {
    if (goHome) {
      goHome();
    } else {
      window.location.hash = "#home";
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true; // إذا كانت البحث فارغة، عرّض الكل
    
    const query = searchQuery.toLowerCase();
    return (
      (u.first_name && u.first_name.toLowerCase().includes(query)) ||
      (u.last_name && u.last_name.toLowerCase().includes(query)) ||
      (u.phone && u.phone.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query))
    );
  });

  return (
    <>
      <div className="min-h-screen bg-linen" dir="rtl" lang="ar">
      {/* Header */}
      <header className="border-b border-ink/8 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleGoHome}
                className="rounded-full p-2 hover:bg-linen"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-5 w-5 text-ink" />
              </button>
              <div>
                <h1 className="text-3xl font-black text-ink">لوحة التحكم الإدارية</h1>
                <p className="mt-1 text-sm font-bold text-ink/56">
                  أهلاً {profile?.first_name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="neuro-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-ink/8 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {[
              { id: "users", label: "المستخدمين", icon: Users },
              { id: "bookings", label: "الحجوزات", icon: ClipboardList },
              { id: "destinations", label: "المناشير", icon: MapPin },
              { id: "plans", label: "الخطط", icon: Plane },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`neuro-tab flex items-center gap-2 border-b-4 px-1 py-4 font-bold transition-all duration-300 ${
                    activeTab === tab.id
                      ? "border-jade text-jade shadow-[0_14px_36px_-14px_rgba(21,154,140,0.45)]"
                      : "border-transparent text-ink/56 hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl animate-fade-in-up px-4 py-12 sm:px-6 lg:px-8">
        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            <h2 className="mb-6 text-2xl font-black text-ink">المستخدمين المسجلين</h2>
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4">
              <Search className="h-5 w-5 text-ink/56" />
              <input
                type="text"
                placeholder="ابحث عن مستخدم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>

            <div className="overflow-x-auto rounded-2xl bg-white/95 shadow-soft glass-morphic-surface">
              <table className="w-full">
                <thead className="border-b border-ink/8 bg-linen">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-black text-ink">الاسم</th>
                    <th className="px-6 py-4 text-right text-sm font-black text-ink">البريد الإلكتروني</th>
                    <th className="px-6 py-4 text-right text-sm font-black text-ink">الهاتف</th>
                    <th className="px-6 py-4 text-right text-sm font-black text-ink">المنطقة</th>
                    <th className="px-6 py-4 text-right text-sm font-black text-ink">جواز السفر</th>
                    <th className="px-6 py-4 text-right text-sm font-black text-ink">التاريخ</th>
                    <th className="px-6 py-4 text-right text-sm font-black text-ink">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-ink/56">
                        جاري التحميل...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-ink/56">
                        لا توجد مستخدمين
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="border-t border-ink/8 hover:bg-linen/50">
                        <td className="px-6 py-4 font-bold text-ink">
                          {u.full_name || `${u.first_name} ${u.last_name}`.trim()}
                        </td>
                        <td className="px-6 py-4 text-sm text-ink/68">{u.email || "-"}</td>
                        <td className="px-6 py-4 text-sm text-ink/68">{u.phone || "-"}</td>
                        <td className="px-6 py-4 text-sm text-ink/68">{u.region || "-"}</td>
                        <td className="px-6 py-4 text-sm text-ink/68">
                          {u.passport_image_url ? (
                            <button
                              type="button"
                              onClick={() => openSignedPrivatePreview("جواز السفر", u.passport_image_url)}
                              className="inline-flex items-center gap-1 rounded-lg bg-jade/15 px-2.5 py-1 text-xs font-black text-jade transition hover:bg-jade/25"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              عرض
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-ink/40">
                              <EyeOff className="h-4 w-4" /> لا يوجد
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-ink/68">
                          {new Date(u.created_at).toLocaleDateString("ar-SA")}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-bold text-red-600 transition hover:bg-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-2 text-xs font-bold text-ink/48">
              للمستخدمين الجدد يُحفظ البريد في الملف الشخصي مع التسجيل. للحسابات القديمة يمكن مزامنة البريد من SQL Editor (انظر تعليقات نهاية ملف supabase/schema.sql).
            </p>
            <p className="mt-4 text-sm font-bold text-ink/56">
              إجمالي المستخدمين: <span className="text-ink">{users.length}</span>
            </p>
          </div>
        )}

        {activeTab === "bookings" && (
          <div>
            <h2 className="mb-2 text-2xl font-black text-ink">طلبات الحجز</h2>
            <p className="mb-6 text-sm font-bold text-ink/56">
              إثبات الدفع وصورة الجواز تُعرض برابط آمن لمدة ساعة. الطلبات القديمة تُستخرج من نص الملاحظات إن لزم.
            </p>
            <div className="overflow-x-auto rounded-2xl bg-white/95 shadow-soft glass-morphic-surface">
              <table className="w-full min-w-[800px]">
                <thead className="border-b border-ink/8 bg-linen">
                  <tr>
                    <th className="px-3 py-3 text-right text-xs font-black text-ink">التاريخ</th>
                    <th className="px-3 py-3 text-right text-xs font-black text-ink">الاسم</th>
                    <th className="px-3 py-3 text-right text-xs font-black text-ink">الخطة</th>
                    <th className="px-3 py-3 text-right text-xs font-black text-ink">الحالة</th>
                    <th className="px-3 py-3 text-right text-xs font-black text-ink">إثبات</th>
                    <th className="px-3 py-3 text-right text-xs font-black text-ink">جواز</th>
                    <th className="px-3 py-3 text-right text-xs font-black text-ink">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {planRequests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-sm text-ink/56">
                        لا توجد طلبات حجز بعد
                      </td>
                    </tr>
                  ) : (
                    planRequests.map((row) => {
                      const payPath = resolveBookingPaymentPath(row);
                      const passPath = resolveBookingPassportPath(row);
                      const meta = parseBookingMetaFromNotes(row.notes);
                      const inferredFamily = parseFamilyCountFromQuoteNotes(row.notes);
                      const bookingType = row.booking_type || meta?.type || null;
                      const familyMembers =
                        row.family_members_count ??
                        meta?.members ??
                        (bookingType === "family" ? inferredFamily : null);
                      const soloCompanions = row.solo_companions ?? meta?.solo ?? 0;
                      const travelersCount = row.travelers_count ?? meta?.travelers ?? null;
                      const quotedUsd = row.quoted_total_usd ?? meta?.quoted ?? null;
                      return (
                        <tr key={row.id} className="border-t border-ink/8 hover:bg-linen/40">
                          <td className="px-3 py-3 text-xs text-ink/68">
                            {row.created_at ? new Date(row.created_at).toLocaleDateString("ar-SA") : "-"}
                          </td>
                          <td className="px-3 py-3 text-xs font-bold text-ink line-clamp-1" title={row.full_name}>{row.full_name || "-"}</td>
                          <td className="px-3 py-3 text-sm font-black text-jade">{row.plan_code || "-"}</td>
                          <td className="px-3 py-3">
                            <select
                              value={row.status || "new"}
                              onChange={(e) => updatePlanRequestStatus(row.id, e.target.value)}
                              className="w-full max-w-[9rem] cursor-pointer rounded-lg border border-ink/12 bg-linen px-1.5 py-1 text-xs font-bold text-ink outline-none focus:border-jade"
                            >
                              <option value="new">جديد</option>
                              <option value="contacted">تواصل</option>
                              <option value="confirmed">مقبول</option>
                              <option value="rejected">مرفوض</option>
                              <option value="cancelled">ملغى</option>
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            {payPath ? (
                              <button
                                type="button"
                                onClick={() => openSignedPrivatePreview(`إثبات دفع — ${row.full_name}`, payPath)}
                                className="rounded-lg bg-marine/15 px-2 py-1 text-xs font-black text-marine hover:bg-marine/25 transition"
                              >
                                عرض
                              </button>
                            ) : (
                              <span className="text-xs text-ink/40">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {passPath ? (
                              <button
                                type="button"
                                onClick={() => openSignedPrivatePreview(`جواز — ${row.full_name}`, passPath)}
                                className="rounded-lg bg-jade/15 px-2 py-1 text-xs font-black text-jade hover:bg-jade/25 transition"
                              >
                                عرض
                              </button>
                            ) : (
                              <span className="text-xs text-ink/40">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => deleteBooking(row.id)}
                              disabled={loading}
                              className="rounded-lg bg-red-100 px-2 py-1 text-xs font-black text-red-600 hover:bg-red-200 transition disabled:opacity-50"
                              title="حذف الحجز"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Destinations Tab */}
        {activeTab === "destinations" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black text-ink">المناشير السياحية</h2>
              {!showDestinationForm && (
                <button
                  onClick={() => setShowDestinationForm(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-jade px-4 py-2.5 text-sm font-black text-white transition hover:bg-marine"
                >
                  <Plus className="h-4 w-4" />
                  إضافة منشور
                </button>
              )}
            </div>

            {showDestinationForm && (
              <form
                onSubmit={addDestination}
                className="mb-8 rounded-2xl bg-white/95 p-6 shadow-soft glass-morphic-surface"
              >
                <h3 className="mb-4 text-lg font-black text-ink">إضافة منشور جديد</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-ink/68">العنوان</span>
                    <input
                      type="text"
                      value={destinationForm.title}
                      onChange={(e) =>
                        setDestinationForm({ ...destinationForm, title: e.target.value })
                      }
                      required
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-black text-ink/68">الوسم</span>
                    <input
                      type="text"
                      value={destinationForm.tag}
                      onChange={(e) =>
                        setDestinationForm({ ...destinationForm, tag: e.target.value })
                      }
                      required
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade"
                    />
                  </label>
                  <div className="block sm:col-span-2">
                    <span className="text-sm font-black text-ink/68">صورة المنشور</span>
                    <p className="mt-1 text-xs font-bold text-ink/50">
                      ارفع صورة من الهاتف أو الحاسوب، أو الصق رابط صورة يعمل في المتصفح.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-jade/30 bg-jade/10 px-4 py-2.5 text-sm font-black text-jade transition hover:bg-jade/20">
                        <Upload className="h-4 w-4" />
                        {destinationImageUploading ? "جاري الرفع..." : "اختر صورة"}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={destinationImageUploading}
                          onChange={handleDestinationImagePick}
                        />
                      </label>
                    </div>
                    <input
                      type="url"
                      placeholder="أو الصق رابط الصورة (https://...)"
                      value={destinationForm.image_url}
                      onChange={(e) =>
                        setDestinationForm({ ...destinationForm, image_url: e.target.value })
                      }
                      className="mt-3 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade"
                    />
                    {destinationForm.image_url ? (
                      <div className="mt-3 overflow-hidden rounded-xl border border-ink/10 shadow-sm">
                        <img
                          src={destinationForm.image_url}
                          alt=""
                          className="max-h-44 w-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                  <label className="block">
                    <span className="text-sm font-black text-ink/68">الوصف</span>
                    <textarea
                      value={destinationForm.description}
                      onChange={(e) =>
                        setDestinationForm({
                          ...destinationForm,
                          description: e.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-black text-ink/68">الموقع</span>
                    <input
                      type="text"
                      value={destinationForm.location}
                      onChange={(e) =>
                        setDestinationForm({ ...destinationForm, location: e.target.value })
                      }
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade"
                    />
                  </label>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    disabled={loading || destinationImageUploading}
                    className="rounded-2xl bg-jade px-6 py-2.5 text-sm font-black text-white transition hover:bg-marine disabled:opacity-50"
                  >
                    إضافة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDestinationForm(false)}
                    className="rounded-2xl border border-ink/10 px-6 py-2.5 text-sm font-black text-ink transition hover:bg-linen"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {destinations.map((destination, idx) => (
                <div
                  key={destination.id}
                  style={{ animationDelay: `${Math.min(idx, 8) * 55}ms` }}
                  className="animate-fade-in-up overflow-hidden rounded-2xl bg-white/95 shadow-soft glass-morphic-surface transition duration-300 hover:-translate-y-1 hover:shadow-lift"
                >
                  {destination.image_url && (
                    <img
                      src={destination.image_url}
                      alt={destination.title}
                      className="h-48 w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-black text-ink">{destination.title}</h3>
                    <p className="mt-1 text-xs font-bold text-jade">{destination.tag}</p>
                    <p className="mt-2 text-sm text-ink/68">{destination.location}</p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => deleteDestination(destination.id)}
                        className="w-full rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-200"
                      >
                        <Trash2 className="inline h-4 w-4" /> حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plans Tab */}
        {activeTab === "plans" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black text-ink">خطط الرحلات</h2>
              {!showPlanForm && (
                <button
                  onClick={() => setShowPlanForm(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-jade px-4 py-2.5 text-sm font-black text-white transition hover:bg-marine"
                >
                  <Plus className="h-4 w-4" />
                  إضافة خطة
                </button>
              )}
            </div>

            {showPlanForm && (
              <form onSubmit={addPlan} className="mb-8 rounded-2xl bg-white/95 p-6 shadow-soft glass-morphic-surface">
                <h3 className="mb-4 text-lg font-black text-ink">إضافة خطة جديدة</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-ink/68">الكود (A, B, C)</span>
                    <input
                      type="text"
                      maxLength="1"
                      value={planForm.code}
                      onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                      required
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-black text-ink/68">الاسم</span>
                    <input
                      type="text"
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      required
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-black text-ink/68">الوصف</span>
                    <input
                      type="text"
                      value={planForm.subtitle}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, subtitle: e.target.value })
                      }
                      required
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-black text-ink/68">المدة</span>
                    <input
                      type="text"
                      placeholder="مثل: 3 أيام / 2 ليالي"
                      value={planForm.duration}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, duration: e.target.value })
                      }
                      required
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-black text-ink/68">السعر</span>
                    <input
                      type="text"
                      placeholder="مثل: من 299 دولار"
                      value={planForm.price_label}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, price_label: e.target.value })
                      }
                      required
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade"
                    />
                  </label>
                  <div className="block sm:col-span-2">
                    <span className="text-sm font-black text-ink/68">صورة الخطة</span>
                    <p className="mt-1 text-xs font-bold text-ink/50">
                      ارفع صورة من الجهاز أو الصق رابط صورة عام.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-jade/30 bg-jade/10 px-4 py-2.5 text-sm font-black text-jade transition hover:bg-jade/20">
                        <Upload className="h-4 w-4" />
                        {planImageUploading ? "جاري الرفع..." : "اختر صورة"}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={planImageUploading}
                          onChange={handlePlanImagePick}
                        />
                      </label>
                    </div>
                    <input
                      type="url"
                      placeholder="أو الصق رابط الصورة (https://...)"
                      value={planForm.image_url}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, image_url: e.target.value })
                      }
                      className="mt-3 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade"
                    />
                    {planForm.image_url ? (
                      <div className="mt-3 overflow-hidden rounded-xl border border-ink/10 shadow-sm">
                        <img src={planForm.image_url} alt="" className="max-h-44 w-full object-cover" />
                      </div>
                    ) : null}
                  </div>
                  <label className="block">
                    <span className="text-sm font-black text-ink/68">اللون</span>
                    <select
                      value={planForm.accent}
                      onChange={(e) => setPlanForm({ ...planForm, accent: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade"
                    >
                      <option value="marine">أزرق (Marine)</option>
                      <option value="jade">أخضر (Jade)</option>
                      <option value="saffron">ذهبي (Saffron)</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={planForm.is_published}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, is_published: e.target.checked })
                      }
                      className="h-5 w-5"
                    />
                    <span className="text-sm font-black text-ink/68">منشور</span>
                  </label>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    disabled={loading || planImageUploading}
                    className="rounded-2xl bg-jade px-6 py-2.5 text-sm font-black text-white transition hover:bg-marine disabled:opacity-50"
                  >
                    إضافة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPlanForm(false)}
                    className="rounded-2xl border border-ink/10 px-6 py-2.5 text-sm font-black text-ink transition hover:bg-linen"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {plans.map((plan, idx) => (
                <div
                  key={plan.id}
                  style={{ animationDelay: `${Math.min(idx, 6) * 60}ms` }}
                  className="animate-fade-in-up overflow-hidden rounded-2xl bg-white/95 shadow-soft glass-morphic-surface transition duration-300 hover:-translate-y-1 hover:shadow-lift"
                >
                  {plan.image_url && (
                    <img
                      src={plan.image_url}
                      alt={plan.name}
                      className="h-48 w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-black text-ink">{plan.name}</h3>
                        <p className="mt-1 text-sm text-ink/68">{plan.subtitle}</p>
                      </div>
                      <span className="rounded-full bg-linen px-2 py-1 text-xs font-black text-ink">
                        {plan.code}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-jade">{plan.duration}</p>
                    <p className="text-sm font-bold text-marine">{plan.price_label}</p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="w-full rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-200"
                      >
                        <Trash2 className="inline h-4 w-4" /> حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>

      {imagePreview?.url ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={imagePreview.title}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
          onClick={() => setImagePreview(null)}
        >
          <div
            className="glass-morphic-surface relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white/95 p-3 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-2 pb-2">
              <h3 className="text-sm font-black text-ink">{imagePreview.title}</h3>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="rounded-full p-2 text-ink hover:bg-linen"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(92vh-4rem)] overflow-auto p-2">
              <img src={imagePreview.url} alt="" className="mx-auto max-h-[80vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

