import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Upload, Check, AlertCircle, Users } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import {
  STORAGE_BUCKET_PRIVATE,
  privatePassportObjectPath,
  privatePaymentObjectPath,
} from "../lib/storageBuckets";
import { computeBookingQuote, parsePlanBaseUsd } from "../lib/bookingPricing";
import { whatsappUrlSimple } from "../lib/whatsapp";

export default function PlanRequestPage({ plan, session, profile, goHome }) {
  const [step, setStep] = useState(1);
  const [trip, setTrip] = useState({
    bookingType: "solo",
    companions: 0,
    familyMembers: 4,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    phone: (profile?.phone || "").trim(),
    paymentProof: null,
    paymentProofPreview: null,
    passportFile: null,
    passportLocalPreview: null,
  });
  const [passportSignedUrl, setPassportSignedUrl] = useState(null);
  const [passportPreviewError, setPassportPreviewError] = useState(false);
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);

  const baseUsd = useMemo(() => parsePlanBaseUsd(plan.price), [plan.price]);
  const quote = useMemo(
    () => computeBookingQuote(baseUsd, trip.bookingType, trip.companions, trip.familyMembers),
    [baseUsd, trip.bookingType, trip.companions, trip.familyMembers],
  );
  const depositAmount = Math.round((quote.totalUsd || baseUsd) * 0.25);

  useEffect(() => {
    let cancelled = false;

    async function loadPassportPreview() {
      if (!isSupabaseConfigured || !supabase || !session?.user?.id || !profile?.passport_image_url) {
        if (!cancelled) {
          setPassportSignedUrl(null);
          setPassportPreviewError(false);
        }
        return;
      }

      const path = profile.passport_image_url;
      if (typeof path === "string" && path.startsWith("http")) {
        if (!cancelled) {
          setPassportSignedUrl(path);
          setPassportPreviewError(false);
        }
        return;
      }

      const { data, error: signError } = await supabase.storage
        .from(STORAGE_BUCKET_PRIVATE)
        .createSignedUrl(path, 3600);

      if (!cancelled) {
        if (signError || !data?.signedUrl) {
          setPassportSignedUrl(null);
          setPassportPreviewError(true);
        } else {
          setPassportSignedUrl(data.signedUrl);
          setPassportPreviewError(false);
        }
      }
    }

    loadPassportPreview();
    return () => {
      cancelled = true;
    };
  }, [profile?.passport_image_url, session?.user?.id]);

  useEffect(() => {
    const proof = formData.paymentProofPreview;
    const pass = formData.passportLocalPreview;
    return () => {
      if (proof?.startsWith("blob:")) {
        URL.revokeObjectURL(proof);
      }
      if (pass?.startsWith("blob:")) {
        URL.revokeObjectURL(pass);
      }
    };
  }, [formData.paymentProofPreview, formData.passportLocalPreview]);

  const handlePaymentProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const preview = URL.createObjectURL(file);
    setFormData((prev) => {
      if (prev.paymentProofPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(prev.paymentProofPreview);
      }
      return {
        ...prev,
        paymentProof: file,
        paymentProofPreview: preview,
      };
    });
    setError("");
  };

  const handlePassportChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for your passport.");
      return;
    }
    const preview = URL.createObjectURL(file);
    setFormData((prev) => {
      if (prev.passportLocalPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(prev.passportLocalPreview);
      }
      return {
        ...prev,
        passportFile: file,
        passportLocalPreview: preview,
      };
    });
    setError("");
  };

  const handlePhoneChange = (e) => {
    setFormData((prev) => ({ ...prev, phone: e.target.value }));
  };

  const hasPassportOnFile = Boolean(profile?.passport_image_url);
  const passportSignPending =
    hasPassportOnFile &&
    !String(profile.passport_image_url).startsWith("http") &&
    !passportSignedUrl &&
    !passportPreviewError;

  const hasPassportForBooking = Boolean(formData.passportFile) || Boolean(passportSignedUrl);

  const validateStep = () => {
    if (step === 1) {
      if (trip.bookingType === "family") {
        const n = Number(trip.familyMembers) || 0;
        if (n < 2 || n > 20) {
          setError("Family size must be between 2 and 20 members.");
          return false;
        }
      } else {
        const c = Number(trip.companions) || 0;
        if (c < 0 || c > 15) {
          setError("Number of companions must be between 0 and 15.");
          return false;
        }
      }
    }
    if (step === 2) {
      if (!formData.paymentProof) {
        setError("Please upload proof of payment transfer");
        return false;
      }
    } else if (step === 3) {
      if (passportSignPending) {
        setError("Still loading your saved passport preview — please wait a moment");
        return false;
      }
      const phone = formData.phone?.trim() ?? "";
      if (!phone) {
        setError("Phone number is required");
        return false;
      }
      if (phone.length < 7) {
        setError("Please enter a valid phone number");
        return false;
      }
      if (!hasPassportForBooking) {
        setError("Passport image is required (upload a new photo or keep the one on your profile)");
        return false;
      }
      if (!detailsConfirmed) {
        setError("Please confirm that your information is correct");
        return false;
      }
    }
    setError("");
    return true;
  };

  const validateBeforeSubmit = () => {
    if (passportSignPending) {
      setError("Still loading your passport file. Please wait.");
      return false;
    }
    if (!formData.paymentProof) {
      setError("Payment proof is missing. Go back to step 2.");
      return false;
    }
    const phone = formData.phone?.trim() ?? "";
    if (!phone || phone.length < 7) {
      setError("Please enter a valid phone number in step 3.");
      return false;
    }
    if (!hasPassportForBooking) {
      setError("Passport image is required.");
      return false;
    }
    if (!detailsConfirmed) {
      setError("Please confirm your details in step 3.");
      return false;
    }
    setError("");
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((s) => s + 1);
    }
  };

  const handleConfirmBooking = async () => {
    if (!validateBeforeSubmit()) {
      return;
    }

    if (!isSupabaseConfigured || !supabase || !session?.user?.id) {
      setError("You need to be signed in with a working connection to submit this booking.");
      return;
    }

    try {
      setLoading(true);

      let paymentProofUrl = null;
      if (formData.paymentProof) {
        const fileExt = formData.paymentProof.name.split(".").pop();
        const fileName = `payment-${Date.now()}.${fileExt}`;
        const storagePath = privatePaymentObjectPath(session.user.id, fileName);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET_PRIVATE)
          .upload(storagePath, formData.paymentProof);

        if (uploadError) {
          throw new Error("Failed to upload payment proof: " + uploadError.message);
        }
        paymentProofUrl = uploadData.path;
      }

      let passportPath = profile?.passport_image_url ?? null;
      if (formData.passportFile) {
        const fileExt = formData.passportFile.name.split(".").pop();
        const fileName = `passport-${Date.now()}.${fileExt}`;
        const storagePath = privatePassportObjectPath(session.user.id, fileName);

        const { data: passUp, error: passErr } = await supabase.storage
          .from(STORAGE_BUCKET_PRIVATE)
          .upload(storagePath, formData.passportFile);

        if (passErr) {
          throw new Error("Failed to upload passport image: " + passErr.message);
        }
        passportPath = passUp.path;

        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            passport_image_url: passportPath,
            phone: formData.phone.trim(),
          })
          .eq("id", session.user.id);

        if (profileErr) {
          throw new Error("Passport uploaded but profile update failed: " + profileErr.message);
        }
      } else {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ phone: formData.phone.trim() })
          .eq("id", session.user.id);

        if (profileErr) {
          console.warn("Profile phone update:", profileErr.message);
        }
      }

      const fullName =
        profile?.full_name?.trim() ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
        session.user.email?.split("@")[0] ||
        "Traveler";

      const companions = trip.bookingType === "solo" ? Math.min(15, Math.max(0, Math.floor(Number(trip.companions) || 0))) : 0;
      const familyN =
        trip.bookingType === "family" ? Math.min(20, Math.max(2, Math.floor(Number(trip.familyMembers) || 2))) : null;

      const bookingMeta = `BOOKING_META:type=${trip.bookingType};members=${familyN ?? ""};solo=${companions};travelers=${quote.travelersCount};quoted=${quote.totalUsd}`;

      const { error: bookingError } = await supabase.from("plan_requests").insert([
        {
          user_id: session.user.id,
          plan_id: null,
          plan_code: plan.id,
          full_name: fullName,
          email: session.user.email ?? null,
          phone: formData.phone.trim(),
          travelers_count: quote.travelersCount,
          booking_type: trip.bookingType,
          solo_companions: companions,
          family_members_count: familyN,
          quoted_total_usd: quote.totalUsd,
          price_summary: quote.breakdown,
          status: "new",
          payment_proof_url:
            paymentProofUrl && paymentProofUrl !== "n/a" && paymentProofUrl !== "manual" ? paymentProofUrl : null,
          passport_proof_url:
            passportPath && passportPath !== "n/a" ? passportPath : null,
          notes: `${bookingMeta} | Quoted total: $${quote.totalUsd}. ${quote.breakdown} Deposit paid: $${depositAmount}. Payment proof: ${paymentProofUrl || "n/a"}. Passport file: ${passportPath || "n/a"}`,
        },
      ]);

      if (bookingError) {
        throw new Error(bookingError.message);
      }

      setSuccess(true);
      setStep(5);
    } catch (err) {
      setError(err.message || "Failed to confirm booking");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-jade/10 to-linen py-12">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-white p-8 shadow-soft">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-jade/20 p-4">
                <Check className="h-12 w-12 text-jade" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-ink">Booking Confirmed! 🎉</h1>
            <p className="mt-4 text-lg text-ink/68">Thank you for reserving {plan.name}!</p>
            <p className="mt-2 text-sm text-ink/56">
              We've received your deposit of <span className="font-black text-jade">${depositAmount}</span>
            </p>
            <div className="mt-6 space-y-2 rounded-2xl bg-linen p-4 text-left">
              <p className="text-sm font-bold text-ink/72">Next steps:</p>
              <ul className="mt-3 space-y-2 text-sm text-ink/60">
                <li>✓ Our team will review your payment proof</li>
                <li>✓ We'll contact you via WhatsApp to confirm details</li>
                <li>✓ Full itinerary will be sent within 24 hours</li>
                <li>✓ Balance payment due 7 days before travel</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={goHome}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-ink px-6 py-3.5 text-sm font-black text-white transition hover:bg-marine"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linen">
      <header className="border-b border-ink/8 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button type="button" onClick={goHome} className="rounded-full p-2 hover:bg-linen" aria-label="Back">
              <ArrowLeft className="h-5 w-5 text-ink" />
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-black text-ink">{plan.name}</h1>
              <p className="mt-1 text-sm font-bold text-ink/56">{plan.subtitle}</p>
            </div>
            <div className="w-10" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 overflow-hidden rounded-[2rem] bg-white shadow-soft">
          <img src={plan.image} alt={plan.name} className="h-[400px] w-full object-cover" decoding="async" />
        </div>

        <div className="mb-12">
          <div className="mb-8 flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex flex-1 items-center">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black transition sm:h-12 sm:w-12 ${
                    step >= s ? "bg-jade text-white" : "bg-ink/10 text-ink/56"
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div className={`mx-1 h-1 min-w-[1rem] flex-1 rounded-full transition sm:mx-2 ${step > s ? "bg-jade" : "bg-ink/10"}`} />
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="rounded-[1.75rem] bg-white p-8 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-jade/15 text-jade">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-ink">Travel party &amp; estimate</h2>
                  <p className="mt-1 text-sm font-bold text-ink/56">Choose solo (with optional friends) or family pricing.</p>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                <fieldset>
                  <legend className="text-sm font-black text-ink/72">Booking type</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition ${
                        trip.bookingType === "solo" ? "border-jade bg-jade/8" : "border-ink/10 hover:border-ink/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="bookingType"
                        className="sr-only"
                        checked={trip.bookingType === "solo"}
                        onChange={() => setTrip((t) => ({ ...t, bookingType: "solo" }))}
                      />
                      <span className="block text-sm font-black text-ink">Solo / friends</span>
                      <span className="mt-1 block text-xs font-bold text-ink/56">You plus companions; per-person add-on with group discount.</span>
                    </label>
                    <label
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition ${
                        trip.bookingType === "family" ? "border-jade bg-jade/8" : "border-ink/10 hover:border-ink/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="bookingType"
                        className="sr-only"
                        checked={trip.bookingType === "family"}
                        onChange={() => setTrip((t) => ({ ...t, bookingType: "family" }))}
                      />
                      <span className="block text-sm font-black text-ink">Family</span>
                      <span className="mt-1 block text-xs font-bold text-ink/56">Household package scaled by number of members.</span>
                    </label>
                  </div>
                </fieldset>

                {trip.bookingType === "solo" ? (
                  <label className="block">
                    <span className="text-sm font-black text-ink/72">How many friends are traveling with you?</span>
                    <span className="mt-1 block text-xs font-bold text-ink/56">0 if you travel alone. Each extra person adds to the quote; larger groups get a higher discount.</span>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={trip.companions}
                      onChange={(e) =>
                        setTrip((t) => ({ ...t, companions: Math.min(15, Math.max(0, parseInt(e.target.value, 10) || 0)) }))
                      }
                      className="mt-3 w-full max-w-xs rounded-2xl border border-ink/10 bg-linen px-4 py-3 font-black text-ink outline-none focus:border-jade focus:bg-white"
                    />
                  </label>
                ) : (
                  <label className="block">
                    <span className="text-sm font-black text-ink/72">How many family members on this trip?</span>
                    <span className="mt-1 block text-xs font-bold text-ink/56">Include everyone in your household booking (minimum 2).</span>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={trip.familyMembers}
                      onChange={(e) =>
                        setTrip((t) => ({
                          ...t,
                          familyMembers: Math.min(20, Math.max(2, parseInt(e.target.value, 10) || 2)),
                        }))
                      }
                      className="mt-3 w-full max-w-xs rounded-2xl border border-ink/10 bg-linen px-4 py-3 font-black text-ink outline-none focus:border-jade focus:bg-white"
                    />
                  </label>
                )}

                <div className="rounded-2xl border border-jade/25 bg-jade/8 p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-jade">Price estimate</p>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-ink/72">{quote.breakdown}</p>
                  <p className="mt-4 text-3xl font-black text-jade">${quote.totalUsd}</p>
                  <p className="mt-2 text-xs font-bold text-ink/56">
                    Deposit due next step: <span className="text-ink">${depositAmount}</span> (25% of this estimate)
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="mt-8 w-full rounded-2xl bg-jade px-6 py-3.5 text-sm font-black text-white transition hover:bg-marine"
              >
                Continue to payment
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-[1.75rem] bg-white p-8 shadow-soft">
              <h2 className="text-2xl font-black text-ink">Transfer 25% deposit</h2>
              <div className="mt-6 rounded-2xl bg-jade/10 p-6">
                <p className="text-sm font-black text-ink/72">Deposit amount (25% of estimate)</p>
                <p className="mt-2 text-4xl font-black text-jade">${depositAmount}</p>
                <p className="mt-2 text-xs font-bold text-ink/56">
                  Based on estimated total ${quote.totalUsd} — {plan.price} shown on the plan is the marketing label; your quote uses the calculator above.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <div>
                  <label className="block text-sm font-black text-ink/72">Transfer method</label>
                  <p className="mt-2 text-sm text-ink/68">
                    Bank transfer, PayPal, or Western Union to our account details (sent via WhatsApp)
                  </p>
                </div>

                <label className="block">
                  <span className="block text-sm font-black text-ink/72">Upload payment proof</span>
                  <p className="mt-1 text-xs text-ink/56">Screenshot or photo of the transfer confirmation</p>
                  <div className="relative mt-3 rounded-2xl border-2 border-dashed border-jade/40 bg-jade/5 p-6 text-center">
                    {formData.paymentProofPreview ? (
                      <div className="space-y-2">
                        <img
                          src={formData.paymentProofPreview}
                          alt="Payment proof"
                          className="mx-auto h-32 w-auto rounded-lg object-contain"
                          decoding="async"
                        />
                        <p className="text-xs font-bold text-jade">File selected ✓</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-8 w-8 text-jade/60" />
                        <p className="mt-2 text-sm font-bold text-ink/68">Click or drag to upload</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePaymentProofChange}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </div>
                </label>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="mt-8 flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-2xl border-2 border-ink/20 px-6 py-3.5 text-sm font-black text-ink transition hover:bg-ink/5"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 rounded-2xl bg-jade px-6 py-3.5 text-sm font-black text-white transition hover:bg-marine"
                >
                  Next step
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-[1.75rem] bg-white p-8 shadow-soft">
              <h2 className="text-2xl font-black text-ink">Verify Your Details</h2>

              <div className="mt-8 space-y-6">
                <label className="block">
                  <span className="block text-sm font-black text-ink/72">Contact Phone Number</span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="e.g., 0947530585"
                    required
                    className="mt-3 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none focus:border-jade focus:bg-white"
                  />
                </label>

                <div className="block">
                  <span className="block text-sm font-black text-ink/72">Passport Image (Required)</span>
                  <p className="mt-1 text-xs text-ink/56">
                    Clear photo of your passport data page. If you already uploaded one at signup, it appears below —
                    you can replace it here.
                  </p>
                  <div className="relative mt-3 rounded-2xl border-2 border-dashed border-jade/40 bg-jade/5 p-6 text-center">
                    {formData.passportLocalPreview ? (
                      <div className="space-y-2">
                        <img
                          src={formData.passportLocalPreview}
                          alt="Passport preview"
                          className="mx-auto max-h-40 rounded-lg object-contain shadow-sm"
                          decoding="async"
                        />
                        <p className="text-xs font-bold text-jade">New passport file selected ✓</p>
                      </div>
                    ) : passportSignedUrl ? (
                      <div className="space-y-2">
                        <img
                          src={passportSignedUrl}
                          alt="Passport on file"
                          className="mx-auto max-h-40 rounded-lg object-contain shadow-sm"
                          decoding="async"
                        />
                        <p className="text-xs font-bold text-ink/56">Passport on file — tap the area to replace</p>
                      </div>
                    ) : hasPassportOnFile && passportPreviewError ? (
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-ink/68">
                          Could not load your saved passport preview. Please upload a clear photo again.
                        </p>
                      </div>
                    ) : hasPassportOnFile ? (
                      <p className="text-sm font-bold text-ink/56">Loading passport preview…</p>
                    ) : (
                      <>
                        <Upload className="mx-auto h-8 w-8 text-jade/60" />
                        <p className="mt-2 text-sm font-bold text-ink/68">Upload passport image</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePassportChange}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-jade/10 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="confirm-details"
                      checked={detailsConfirmed}
                      onChange={(e) => setDetailsConfirmed(e.target.checked)}
                      className="mt-1 h-5 w-5 shrink-0 rounded accent-jade"
                    />
                    <label htmlFor="confirm-details" className="text-left text-sm font-bold text-ink/72">
                      I confirm all information is correct and I have uploaded or verified my passport image
                    </label>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="mt-8 flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-2xl border-2 border-ink/20 px-6 py-3.5 text-sm font-black text-ink transition hover:bg-ink/5"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 rounded-2xl bg-jade px-6 py-3.5 text-sm font-black text-white transition hover:bg-marine"
                >
                  Confirm Details
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="rounded-[1.75rem] bg-white p-8 shadow-soft">
              <h2 className="text-2xl font-black text-ink">Confirm Your Booking</h2>

              <div className="mt-8 space-y-4 rounded-2xl bg-linen p-6">
                <div className="flex justify-between gap-4">
                  <span className="font-bold text-ink/72">Plan:</span>
                  <span className="text-right font-black text-ink">{plan.name}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-ink/10 pt-4">
                  <span className="font-bold text-ink/72">Travelers:</span>
                  <span className="text-right font-black text-ink">
                    {quote.travelersCount} ({trip.bookingType === "family" ? "family" : "solo + friends"})
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-t border-ink/10 pt-4">
                  <span className="font-bold text-ink/72">Duration:</span>
                  <span className="text-right font-black text-ink">{plan.duration}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-ink/10 pt-4">
                  <span className="font-bold text-ink/72">Estimated total:</span>
                  <span className="text-right font-black text-ink">${quote.totalUsd}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-ink/10 pt-4 text-xs font-bold text-ink/56">
                  <span className="text-left">Summary</span>
                  <span className="max-w-[60%] text-right">{quote.breakdown}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-ink/10 pt-4">
                  <span className="font-bold text-ink/72">Deposit (25%):</span>
                  <span className="text-right font-black text-jade">${depositAmount} ✓</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-ink/10 pt-4">
                  <span className="font-bold text-ink/72">Balance due:</span>
                  <span className="text-right font-black text-ink">${Math.max(0, quote.totalUsd - depositAmount)}</span>
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-jade/10 p-4">
                <p className="text-sm font-bold text-ink/72">By confirming, you agree that:</p>
                <ul className="mt-3 space-y-2 text-sm text-ink/68">
                  <li>✓ The deposit amount has been transferred</li>
                  <li>✓ Your contact information and passport are accurate</li>
                  <li>✓ You will pay the balance 7 days before travel</li>
                  <li>✓ You have read our terms and conditions</li>
                </ul>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="mt-8 flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-2xl border-2 border-ink/20 px-6 py-3.5 text-sm font-black text-ink transition hover:bg-ink/5"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-jade px-6 py-3.5 text-sm font-black text-white transition hover:bg-marine disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Confirm Booking"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <section className="bg-ink py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <span className="text-sm font-black text-saffron">Need Help?</span>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Our Customer Support Team is Ready</h2>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-white/66">
            Have questions about your booking? Contact us via WhatsApp and we'll assist you right away.
          </p>
          <a
            href={whatsappUrlSimple()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-jade px-6 py-3.5 text-sm font-black text-ink transition hover:bg-marine"
          >
            Contact Support on WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
