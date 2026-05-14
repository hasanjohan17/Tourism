import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const STATUS_LABEL = {
  new: "Pending",
  contacted: "In contact",
  confirmed: "Accepted",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

function statusBadgeClass(status) {
  switch (status) {
    case "confirmed":
      return "bg-jade/20 text-jade";
    case "contacted":
      return "bg-marine/20 text-marine";
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-saffron/25 text-ink";
  }
}

export default function MyBookingsPage({ session, goHome }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured || !supabase || !session?.user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("plan_requests")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  return (
    <div className="min-h-screen bg-linen">
      <header className="border-b border-ink/8 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={goHome}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black text-ink hover:bg-linen"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </button>
          <h1 className="text-lg font-black text-ink sm:text-xl">My Bookings</h1>
          <span className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-medium leading-7 text-ink/64">
          Here you can see every plan request you submitted, its current status, and the details you provided.
        </p>

        {loading ? (
          <div className="mt-10 flex justify-center text-ink/56">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          </div>
        ) : error ? (
          <p className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>
        ) : rows.length === 0 ? (
          <p className="mt-10 rounded-2xl bg-white p-8 text-center text-sm font-bold text-ink/56 shadow-soft">
            You have no bookings yet. Choose a plan from the home page and complete the request flow.
          </p>
        ) : (
          <ul className="mt-8 space-y-4">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-soft transition hover:shadow-lift"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink/48">Plan</p>
                    <p className="text-lg font-black text-ink">Plan {row.plan_code || "—"}</p>
                    <p className="mt-1 text-sm font-bold text-ink/60">{row.full_name}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${statusBadgeClass(row.status)}`}
                  >
                    {STATUS_LABEL[row.status] || row.status || "Pending"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-ink/56">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                  </span>
                  {row.phone ? <span>Phone: {row.phone}</span> : null}
                  {row.travelers_count != null ? <span>Travelers: {row.travelers_count}</span> : null}
                  {row.quoted_total_usd != null ? (
                    <span className="text-marine">Est. total: ${row.quoted_total_usd}</span>
                  ) : null}
                </div>
                {row.booking_type ? (
                  <p className="mt-2 text-xs font-bold text-ink/48">
                    Type: {row.booking_type === "family" ? "Family" : "Solo"}
                    {row.booking_type === "solo" && row.solo_companions != null
                      ? ` · Companions: ${row.solo_companions}`
                      : null}
                    {row.booking_type === "family" && row.family_members_count != null
                      ? ` · Members: ${row.family_members_count}`
                      : null}
                  </p>
                ) : null}
                {row.price_summary ? (
                  <p className="mt-2 text-xs leading-relaxed text-ink/52">{row.price_summary}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
