import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Hotel,
  LogIn,
  LogOut,
  MapPin,
  Maximize2,
  Menu,
  MessageCircle,
  Plane,
  ShieldCheck,
  Sparkles,
  SquareMenu,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  alHosnCastleSrc,
  destinationImages as fallbackDestinationImages,
  plans as fallbackPlans,
  stats,
} from "./data/travelData";
import { fetchPublicTravelContent } from "./lib/travelContent";
import { buildDestinationInquiryMessage, whatsappUrlSimple, whatsappUrlWithText } from "./lib/whatsapp";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import AdminDashboard from "./pages/AdminDashboard";
import PlanRequestPage from "./pages/PlanRequestPage";
import MyBookingsPage from "./pages/MyBookingsPage";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Plans", href: "#plans" },
  { label: "Destinations", href: "#destinations" },
  { label: "For families", href: "#families" },
  { label: "Contact", href: "#contact" },
];

const planTone = {
  marine: "border-marine/20 bg-marine text-white",
  jade: "border-jade/20 bg-jade text-white",
  saffron: "border-saffron/30 bg-saffron text-ink",
};

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const h = window.location.hash;
    if (h === "#admin") return "admin";
    if (h === "#plan-request") return "plan-request";
    if (h === "#my-bookings") return "my-bookings";
    return "home";
  });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    region: "",
  });
  const [authMessage, setAuthMessage] = useState("");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [contentPlans, setContentPlans] = useState(fallbackPlans);
  const [contentDestinationImages, setContentDestinationImages] = useState(fallbackDestinationImages);
  const [activeDestination, setActiveDestination] = useState(0);
  const [destinationDetail, setDestinationDetail] = useState(null);

  const heroBackdropSrc = alHosnCastleSrc;
  const firstName =
    profile?.first_name ||
    session?.user?.user_metadata?.first_name ||
    session?.user?.email?.split("@")[0] ||
    "";
  const fullName =
    profile?.full_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    session?.user?.user_metadata?.full_name ||
    [session?.user?.user_metadata?.first_name, session?.user?.user_metadata?.last_name].filter(Boolean).join(" ");

  const loadProfile = async (user) => {
    if (!isSupabaseConfigured || !supabase || !user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

    if (error) {
      console.warn("Profile could not be loaded:", error.message);
      setProfile({
        first_name: user.user_metadata?.first_name ?? "",
        last_name: user.user_metadata?.last_name ?? "",
        full_name: user.user_metadata?.full_name ?? "",
        phone: user.user_metadata?.phone ?? "",
        region: user.user_metadata?.region ?? "",
      });
      return;
    }

    setProfile(data);
    setIsAdmin(data?.role === "admin");
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#admin") {
        setCurrentPage("admin");
      } else if (hash === "#plan-request") {
        setCurrentPage("plan-request");
      } else if (hash === "#my-bookings") {
        setCurrentPage("my-bookings");
      } else {
        setCurrentPage("home");
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    // Check on initial load
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadTravelContent() {
      if (!isSupabaseConfigured || !supabase) {
        return;
      }

      try {
        const content = await fetchPublicTravelContent(supabase);

        if (!isMounted) {
          return;
        }

        if (content.plans.length > 0) {
          setContentPlans(content.plans);
        }

        if (content.destinationImages.length > 0) {
          setContentDestinationImages(content.destinationImages);
        }
      } catch (error) {
        console.warn("Using local travel content fallback:", error.message);
      }
    }

    loadTravelContent();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      loadProfile(data.session?.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      loadProfile(nextSession?.user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Prevent scrolling on body when modal is open
    if (authOpen || accountOpen || destinationDetail) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
    }

    return () => {
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
    };
  }, [authOpen, accountOpen, destinationDetail]);

  useEffect(() => {
    if (!destinationDetail) {
      return undefined;
    }
    const onKey = (e) => {
      if (e.key === "Escape") {
        setDestinationDetail(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [destinationDetail]);

  useEffect(() => {
    if (contentDestinationImages.length === 0 || destinationDetail) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveDestination((current) => (current + 1) % contentDestinationImages.length);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [contentDestinationImages.length, destinationDetail]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setAuthMessage("");

    if (!isSupabaseConfigured) {
      setAuthMessage("Add Supabase keys in the .env file to enable login.");
      return;
    }

    const fullNameValue = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const credentials = { email: form.email.trim(), password: form.password };
    const response =
      authMode === "signin"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp({
            ...credentials,
            options: {
              data: {
                first_name: form.firstName.trim(),
                last_name: form.lastName.trim(),
                full_name: fullNameValue,
                phone: form.phone.trim(),
                region: form.region.trim(),
              },
            },
          });

    if (response.error) {
      setAuthMessage(response.error.message);
      return;
    }

    let signupDetailError = null;

    if (authMode === "signup" && response.data.session) {
      const userId = response.data.user.id;

      const profileData = {
        id: userId,
        email: form.email.trim(),
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        full_name: fullNameValue,
        phone: form.phone.trim(),
        region: form.region.trim(),
        role: "traveler",
      };

      const { error: profileError } = await supabase.from("profiles").upsert([profileData], { onConflict: "id" }).select();

      if (profileError) {
        console.error("Profile upsert error:", profileError);
        signupDetailError =
          "Account created but there was an issue saving your details: " + profileError.message;
      }
    }

    if (authMode === "signin") {
      setAuthMessage("Login completed successfully.");
    } else {
      setAuthMessage(
        signupDetailError ??
          (response.data.session
            ? "Account created successfully."
            : "Account created. Check your email if confirmation is enabled."),
      );
    }

    if (response.data.session) {
      setAuthOpen(false);
      setForm({ firstName: "", lastName: "", phone: "", email: "", password: "", region: "" });
    }
  };

  const handleSignOut = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    await supabase.auth.signOut();
    setAccountOpen(false);
    setProfile(null);
    setSession(null);
    setIsAdmin(false);
  };

  // Show admin dashboard if on admin page
  if (currentPage === "admin") {
    return <AdminDashboard goHome={() => {
      window.location.hash = "#home";
      setCurrentPage("home");
    }} />;
  }

  // Show plan request page if booking a plan
  // Plan booking requires an authenticated Supabase session
  if (currentPage === "plan-request" && selectedPlan) {
    if (!isSupabaseConfigured || !supabase) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-linen px-6 text-center">
          <p className="max-w-md text-lg font-bold text-ink/80">
            Booking is unavailable because Supabase is not configured. Add your keys to the <code className="rounded bg-white px-1">.env</code> file and restart the dev server.
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.hash = "#home";
              setCurrentPage("home");
              setSelectedPlan(null);
            }}
            className="mt-6 rounded-2xl bg-ink px-6 py-3 text-sm font-black text-white"
          >
            Back to home
          </button>
        </div>
      );
    }

    if (!session?.user) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-linen px-6 text-center">
          <p className="max-w-md text-lg font-bold text-ink/80">Please sign in to request a plan and upload payment details.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                window.location.hash = "#home";
                setCurrentPage("home");
                setSelectedPlan(null);
              }}
              className="rounded-2xl border-2 border-ink/20 px-6 py-3 text-sm font-black text-ink"
            >
              Back to home
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.hash = "#home";
                setCurrentPage("home");
                setSelectedPlan(null);
                setAuthOpen(true);
              }}
              className="rounded-2xl bg-jade px-6 py-3 text-sm font-black text-white"
            >
              Sign in
            </button>
          </div>
        </div>
      );
    }

    return (
      <PlanRequestPage
        plan={selectedPlan}
        session={session}
        profile={profile}
        goHome={() => {
          window.location.hash = "#home";
          setCurrentPage("home");
          setSelectedPlan(null);
        }}
      />
    );
  }

  if (currentPage === "my-bookings") {
    if (!isSupabaseConfigured || !supabase) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-linen px-6 text-center">
          <p className="max-w-md text-lg font-bold text-ink/80">
            Bookings are unavailable because Supabase is not configured. Add your keys to the{" "}
            <code className="rounded bg-white px-1">.env</code> file and restart the dev server.
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.hash = "#home";
              setCurrentPage("home");
            }}
            className="mt-6 rounded-2xl bg-ink px-6 py-3 text-sm font-black text-white"
          >
            Back to home
          </button>
        </div>
      );
    }

    if (!session?.user) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-linen px-6 text-center">
          <p className="max-w-md text-lg font-bold text-ink/80">Please sign in to view your bookings.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                window.location.hash = "#home";
                setCurrentPage("home");
              }}
              className="rounded-2xl border-2 border-ink/20 px-6 py-3 text-sm font-black text-ink"
            >
              Back to home
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.hash = "#home";
                setCurrentPage("home");
                setAuthOpen(true);
              }}
              className="rounded-2xl bg-jade px-6 py-3 text-sm font-black text-white"
            >
              Sign in
            </button>
          </div>
        </div>
      );
    }

    return (
      <MyBookingsPage
        session={session}
        goHome={() => {
          window.location.hash = "#home";
          setCurrentPage("home");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-linen text-ink">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-ink/55 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#home" className="group flex items-center gap-3" aria-label="Return to home">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-marine shadow-soft transition duration-500 ease-out hover:scale-105 hover:-rotate-6 hover:shadow-lift">
              <Plane className="h-5 w-5 transition-transform duration-500 group-hover:scale-110" />
            </span>
            <span>
              <span className="block text-lg font-black leading-none">Without name</span>
              <span className="mt-1 block text-xs font-medium text-white/72">Family, cultural, and religious travel</span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-bold text-white/78 transition duration-300 hover:-translate-y-0.5 hover:bg-white/12 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href={whatsappUrlSimple()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/24 px-4 py-2 text-sm font-bold text-white transition hover:bg-white hover:text-ink"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            {session ? (
              <a
                href="#my-bookings"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition duration-300 hover:bg-white/18"
              >
                <CalendarDays className="h-4 w-4" />
                My Bookings
              </a>
            ) : null}
            {session ? (
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-ink shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <UserRound className="h-4 w-4" />
                My Account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-ink shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <LogIn className="h-4 w-4" />
                Login or Create your Account
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/24 lg:hidden"
            aria-label="Open menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/12 bg-ink/94 px-4 py-4 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-bold text-white/82 hover:bg-white/10"
                >
                  {item.label}
                </a>
              ))}
              {session ? (
                <>
                  <a
                    href="#my-bookings"
                    onClick={() => setMenuOpen(false)}
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/24 px-4 py-3 text-sm font-black text-white hover:bg-white/10"
                  >
                    <CalendarDays className="h-4 w-4" />
                    My Bookings
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setAccountOpen(true);
                    }}
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-ink"
                  >
                    <UserRound className="h-4 w-4" />
                    My Account
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setAuthOpen(true);
                  }}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-ink"
                >
                  <LogIn className="h-4 w-4" />
                  Login 
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        <section id="home" className="relative min-h-[92vh] pt-20">
          <div className="image-scrim absolute inset-0 overflow-hidden">
            <img
              src={heroBackdropSrc}
              alt=""
              aria-hidden
              className="hero-kenburns-a pointer-events-none absolute inset-0 h-full w-full object-cover"
              decoding="async"
              fetchpriority="high"
            />
            <img
              src={heroBackdropSrc}
              alt="Al Hosn Castle"
              className="hero-kenburns-b hero-shimmer pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-soft-light"
              decoding="async"
            />
          </div>
          <div className="ambient-band pointer-events-none absolute -inset-10 z-[1] opacity-70" />

          <div className="relative z-10 mx-auto flex min-h-[calc(92vh-5rem)] max-w-7xl items-end px-4 pb-8 pt-12 sm:px-6 lg:px-8">
            <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
              <div className="hero-reveal max-w-3xl pb-4 text-white">
                <div className="animate-gentle-scale mb-5 inline-flex items-center gap-2 rounded-full border border-white/24 bg-white/12 px-4 py-2 text-sm font-bold backdrop-blur motion-reduce:animate-none">
                  <Sparkles className="h-4 w-4 motion-safe:animate-subtle-float text-saffron" />
                  Discover authentic Syria with your loved ones
                </div>
                <h1 className="animate-reveal-soft max-w-3xl text-5xl font-black leading-[1.05] motion-reduce:animate-none sm:text-6xl lg:text-7xl">
                  Without name
                </h1>
                {session && (
                  <p className="animate-reveal-soft mt-4 inline-flex rounded-full border border-white/24 bg-white/14 px-4 py-2 text-sm font-black text-white backdrop-blur motion-reduce:animate-none [animation-delay:100ms]">
                    Welcome, {firstName}
                  </p>
                )}
                <p className="animate-reveal-soft mt-5 max-w-2xl text-lg font-medium leading-8 text-white/84 motion-reduce:animate-none sm:text-xl [animation-delay:140ms]">
                  Experience unforgettable journeys through Syria's rich history, breathtaking landscapes, and vibrant culture. Every moment crafted for your comfort and joy.
                </p>
                <div className="animate-reveal-soft relative mt-8 flex flex-col flex-wrap gap-3 motion-reduce:animate-none sm:flex-row [animation-delay:200ms]">
                  <a
                    href="#plans"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-saffron px-6 py-3.5 text-sm font-black text-ink shadow-lift transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_14px_40px_rgba(217,159,61,0.45)] active:scale-[0.98]"
                  >
                    Explore plans
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => (session ? setAccountOpen(true) : setAuthOpen(true))}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/12 px-6 py-3.5 text-sm font-black text-white backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white hover:text-ink active:scale-[0.98]"
                  >
                    {session ? <UserRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                    {session ? "Open My Account" : "First time visiting us? Log in"}
                  </button>
                  {session ? (
                    <a
                      href="#my-bookings"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/12 px-6 py-3.5 text-sm font-black text-white backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white hover:text-ink active:scale-[0.98]"
                    >
                      <CalendarDays className="h-4 w-4" />
                      My Bookings
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="glass-panel hero-reveal rounded-[2rem] p-4 shadow-soft transition duration-500 ease-out hover:-translate-y-1 hover:shadow-lift [animation-delay:180ms]">
                <div className="grid grid-cols-3 gap-3">
                  {stats.map((stat, i) => (
                    <div
                      key={stat.label}
                      className={`rounded-3xl bg-white/72 p-4 text-center transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md ${i === 1 ? "motion-safe:animate-border-pulse motion-reduce:shadow-none" : ""}`}
                    >
                      <div className="text-2xl font-black text-marine">{stat.value}</div>
                      <div className="mt-1 text-xs font-bold leading-5 text-ink/60">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-3xl bg-ink p-5 text-white">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-white/62">Suggested package</p>
                      <h2 className="mt-1 text-2xl font-black">Plan B</h2>
                    </div>
                    <span className="rounded-full bg-jade px-3 py-1 text-xs font-black">Most balanced</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-white/72">
                    A suitable and calm trip that combines heritage and nature
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="plans" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-reveal-soft flex flex-col justify-between gap-5 motion-reduce:animate-none md:flex-row md:items-end">
              <div className="max-w-2xl">
                <span className="inline-block text-sm font-black text-jade motion-safe:animate-subtle-float motion-reduce:animate-none">
                  Our Experiences
                </span>
                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
                  Choose your perfect journey through Syria's wonders
                </h2>
              </div>
              <p className="max-w-md text-sm font-medium leading-7 text-ink/62">From 3 to 7 days of pure exploration and discovery</p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {contentPlans.map((plan, index) => (
                <article
                  key={plan.id}
                  style={{ animationDelay: `${index * 80}ms` }}
                  className={`animate-fade-in-up group relative overflow-hidden rounded-[1.75rem] border bg-white shadow-soft transition duration-500 ease-out will-change-transform hover:-translate-y-2 hover:shadow-lift hover:ring-2 hover:ring-jade/25 ${
                    plan.featured ? "border-jade/40 ring-4 ring-jade/10" : "border-ink/8"
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute left-5 top-5 z-10 rounded-full bg-white px-3 py-1 text-xs font-black text-jade shadow-soft">
                      Featured
                    </div>
                  )}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={plan.image}
                      alt={plan.name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110 group-hover:rotate-1"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/82 to-transparent p-5 text-white">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-ink">
                        {plan.id}
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-black">{plan.name}</h3>
                        <p className="mt-1 text-sm font-bold text-ink/56">{plan.subtitle}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${planTone[plan.accent]}`}>
                        {plan.duration}
                      </span>
                    </div>
                    <div className="mt-5 flex items-center gap-2 text-lg font-black text-marine">
                      <CalendarDays className="h-5 w-5" />
                      {plan.price}
                    </div>
                    <ul className="mt-5 space-y-3">
                      {plan.highlights.map((item) => (
                        <li key={item} className="flex items-center gap-3 text-sm font-bold text-ink/68">
                          <BadgeCheck className="h-5 w-5 shrink-0 text-jade" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => {
                        setSelectedPlan(plan);
                        window.location.hash = "#plan-request";
                      }}
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-black text-white transition duration-300 hover:-translate-y-1 hover:bg-marine"
                    >
                      Request this plan
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="destinations" className="relative overflow-hidden bg-mist py-20 sm:py-24">
          <div className="ambient-band pointer-events-none absolute -inset-16 opacity-60" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[360px_1fr] lg:items-center">
              <div className="animate-fade-in-up">
                <span className="text-sm font-black text-marine">Highlights & Destinations</span>
                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">Explore Syria's hidden treasures</h2>
                <p className="mt-4 text-sm font-medium leading-7 text-ink/64">
                  From ancient Palmyra's desert ruins to Damascus' bustling old city, discover the destinations that will transform your perspective of the Middle East
                </p>
              </div>
              <div className="animate-scale-in relative min-h-[430px] overflow-hidden rounded-[2rem] bg-ink p-4 shadow-soft">
                {contentDestinationImages.map((item, index) => {
                  const total = contentDestinationImages.length;
                  const position = (index - activeDestination + total) % total;
                  const isActive = position === 0;
                  const isNext = position === 1;
                  const isPrevious = position === total - 1;
                  const isVisible = isActive || isNext || isPrevious;

                  return (
                    <article
                      key={item.id ?? item.src}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open details: ${item.title}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveDestination(index);
                          setDestinationDetail(item);
                        }
                      }}
                      onClick={() => {
                        setActiveDestination(index);
                        setDestinationDetail(item);
                      }}
                      className={`gallery-card absolute inset-4 cursor-pointer overflow-hidden rounded-[1.5rem] outline-none transition-shadow focus-visible:ring-4 focus-visible:ring-saffron/90 ${
                        isActive ? "z-30 opacity-100 blur-0" : "z-10 opacity-55 blur-[3px]"
                      } ${isVisible ? "pointer-events-auto" : "pointer-events-none opacity-0 blur-md"}`}
                      style={{
                        transform: isActive
                          ? "translateX(0) scale(1)"
                          : isNext
                            ? "translateX(58%) scale(0.78)"
                            : isPrevious
                              ? "translateX(-58%) scale(0.78)"
                              : "translateX(0) scale(0.72)",
                      }}
                    >
                      <img src={item.src} alt={item.title} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/88 via-ink/12 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                        {isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDestinationDetail(item);
                            }}
                            className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-ink shadow-soft transition hover:scale-[1.03] hover:bg-linen"
                          >
                            <Maximize2 className="h-4 w-4" />
                            View details
                          </button>
                        )}
                        <span className="rounded-full bg-white/16 px-3 py-1 text-xs font-black backdrop-blur">
                          {item.tag}
                        </span>
                        <h3 className="mt-3 text-3xl font-black">{item.title}</h3>
                        {item.location ? (
                          <p className="mt-2 flex items-center gap-2 text-sm font-bold text-white/85">
                            <MapPin className="h-4 w-4 shrink-0 text-saffron" />
                            {item.location}
                          </p>
                        ) : null}
                        {!isActive ? (
                          <p className="mt-2 text-xs font-bold text-white/70">Tap to open</p>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
                <div className="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveDestination((current) => (current - 1 + contentDestinationImages.length) % contentDestinationImages.length)}
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white transition duration-300 hover:bg-white/40"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex gap-2">
                    {contentDestinationImages.map((item, index) => (
                      <button
                        key={item.src}
                        type="button"
                        onClick={() => setActiveDestination(index)}
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          activeDestination === index ? "w-8 bg-saffron" : "w-2.5 bg-white/42"
                        }`}
                        aria-label={`Show ${item.title}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveDestination((current) => (current + 1) % contentDestinationImages.length)}
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white transition duration-300 hover:bg-white/40"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="families" className="bg-white py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div className="relative min-h-[480px] overflow-hidden rounded-[2rem]">
              <img
                src="/images/damascus four session hotel.jpg"
                alt="Comfortable hotel stay"
                className="hero-kenburns h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/76 to-transparent" />
              <div className="absolute bottom-0 p-7 text-white">
                <p className="text-sm font-black text-saffron">Family comfort first</p>
                <h2 className="mt-2 text-3xl font-black">A flexible program without crowding the day.</h2>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <span className="text-sm font-black text-jade">Why Choose Us</span>
              <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
                Travel with confidence, comfort, and complete peace of mind.
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Users, title: "Family-Focused Journeys", text: "Thoughtfully paced itineraries that let families savor each destination without rushing." },
                  { icon: Users, title: "People-focused journeys", text: "Thoughtfully paced itineraries that let every traveler savor each destination without rushing." },
                  { icon: Hotel, title: "Premium Accommodations", text: "Hand-selected hotels and authentic restaurants that showcase local hospitality and culture." },
                  { icon: ShieldCheck, title: "Complete Transparency", text: "Detailed itineraries with all costs, timings, and inclusions clearly outlined upfront." },
                  { icon: HeartHandshake, title: "24/7 Travel Support", text: "Dedicated assistance via WhatsApp or our platform to ensure your journey runs smoothly." },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-[1.35rem] border border-ink/8 bg-linen p-5 transition duration-300 hover:-translate-y-1 hover:shadow-soft"
                  >
                    <feature.icon className="h-7 w-7 text-marine" />
                    <h3 className="mt-4 text-lg font-black">{feature.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-7 text-ink/60">{feature.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="bg-ink py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_420px] lg:items-center lg:px-8">
            <div>
              <span className="text-sm font-black text-saffron">Ready for Adventure?</span>
              <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
                Let's plan your dream journey to Syria today.
              </h2>
              <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-white/66">
                Reach out to our team via WhatsApp to customize your perfect itinerary. We're here to answer all your questions and craft an unforgettable experience tailored to your needs.
              </p>
            </div>
            <div className="rounded-[1.75rem] bg-white p-5 text-ink shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-jade/10 text-jade">
                  <MapPin className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-black">Travel plan request</h3>
                  <p className="text-sm font-bold text-ink/56">Choose A, B, or C to start.</p>
                </div>
              </div>
              <a
                href={whatsappUrlSimple()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-jade px-5 py-3.5 text-sm font-black text-white transition duration-300 hover:-translate-y-1 hover:bg-marine"
              >
                <MessageCircle className="h-4 w-4" />
                Contact via WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/8 bg-ink py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md text-center md:text-left">
              <p className="text-lg font-black">Without name</p>
              <p className="mt-2 text-sm font-medium leading-7 text-white/70">
                Family, cultural, and religious travel in Syria — curated itineraries and responsive support.
              </p>
              <p className="mt-4 text-xs font-bold text-white/48">© {new Date().getFullYear()} All rights reserved.</p>
            </div>
            <div>
              <p className="text-center text-xs font-black uppercase tracking-widest text-saffron md:text-left">Connect</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                {[
                  {
                    href: whatsappUrlSimple(),
                    icon: "fa-brands fa-whatsapp",
                    label: "WhatsApp",
                  },
                  import.meta.env.VITE_SOCIAL_FACEBOOK?.trim() && {
                    href: import.meta.env.VITE_SOCIAL_FACEBOOK.trim(),
                    icon: "fa-brands fa-facebook-f",
                    label: "Facebook",
                  },
                  import.meta.env.VITE_SOCIAL_INSTAGRAM?.trim() && {
                    href: import.meta.env.VITE_SOCIAL_INSTAGRAM.trim(),
                    icon: "fa-brands fa-instagram",
                    label: "Instagram",
                  },
                  import.meta.env.VITE_SOCIAL_X?.trim() && {
                    href: import.meta.env.VITE_SOCIAL_X.trim(),
                    icon: "fa-brands fa-x-twitter",
                    label: "X",
                  },
                  import.meta.env.VITE_SOCIAL_TIKTOK?.trim() && {
                    href: import.meta.env.VITE_SOCIAL_TIKTOK.trim(),
                    icon: "fa-brands fa-tiktok",
                    label: "TikTok",
                  },
                  import.meta.env.VITE_SOCIAL_EMAIL?.trim() && {
                    href: import.meta.env.VITE_SOCIAL_EMAIL.trim().startsWith("mailto:")
                      ? import.meta.env.VITE_SOCIAL_EMAIL.trim()
                      : `mailto:${import.meta.env.VITE_SOCIAL_EMAIL.trim()}`,
                    icon: "fa-solid fa-envelope",
                    label: "Email",
                  },
                ]
                  .filter(Boolean)
                  .map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      className="grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/8 text-lg text-white transition hover:-translate-y-0.5 hover:bg-jade hover:text-white hover:shadow-lift"
                    >
                      <i className={item.icon} aria-hidden />
                    </a>
                  ))}
              </div>
              <p className="mt-4 max-w-xs text-center text-xs font-bold text-white/45 md:text-left">
                Set your WhatsApp number and social URLs in <code className="rounded bg-white/10 px-1">.env</code> (see{" "}
                <code className="rounded bg-white/10 px-1">.env.example</code>).
              </p>
            </div>
          </div>
        </div>
      </footer>

      {destinationDetail && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="destination-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/72 backdrop-blur-md"
            aria-label="Close destination details"
            onClick={() => setDestinationDetail(null)}
          />
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-ink/10 md:max-h-[min(92vh,720px)]">
            <button
              type="button"
              onClick={() => setDestinationDetail(null)}
              className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-ink shadow-soft transition hover:bg-linen"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto md:flex md:overflow-hidden">
              <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] md:gap-0">
                <div className="relative flex min-h-[220px] items-center justify-center bg-gradient-to-b from-ink/[0.07] to-ink/[0.03] px-4 py-6 md:min-h-0 md:max-h-full md:border-r md:border-ink/10 md:px-5 md:py-8">
                  <img
                    src={destinationDetail.src}
                    alt={destinationDetail.title}
                    className="max-h-[min(48vh,380px)] w-full rounded-2xl object-contain object-center shadow-sm md:max-h-full md:max-w-full"
                    decoding="async"
                  />
                </div>
                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-6 sm:p-8 md:max-h-full">
                  <span className="w-fit rounded-full bg-jade/15 px-3 py-1 text-xs font-black text-jade">{destinationDetail.tag}</span>
                  <h2 id="destination-modal-title" className="text-2xl font-black leading-tight text-ink sm:text-3xl">
                    {destinationDetail.title}
                  </h2>
                  {destinationDetail.location ? (
                    <p className="flex items-start gap-2 text-sm font-bold text-marine">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                      <span>{destinationDetail.location}</span>
                    </p>
                  ) : null}
                  <div className="rounded-2xl bg-linen p-4 sm:p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-ink/44">About this place</p>
                    <p className="mt-2 text-sm font-medium leading-7 text-ink/78">
                      {destinationDetail.description?.trim()
                        ? destinationDetail.description
                        : "We can include this stop on your custom itinerary — contact us for dates, transport, and family-friendly options."}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-col gap-3 pt-2">
                    <a
                      href={whatsappUrlWithText(buildDestinationInquiryMessage(destinationDetail))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-jade px-5 py-3.5 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-marine"
                    >
                      <i className="fa-brands fa-whatsapp text-lg" aria-hidden />
                      Ask on WhatsApp (this place)
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setDestinationDetail(null);
                        window.setTimeout(() => {
                          window.location.hash = "#contact";
                          document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                        }, 0);
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink/15 bg-white px-5 py-3.5 text-sm font-black text-ink transition hover:border-jade/40 hover:bg-linen"
                    >
                      Customer service — not for plan booking
                    </button>
                    <p className="text-center text-xs font-bold text-ink/45">
                      The green button opens WhatsApp with a ready message about this destination. Use the outline button for general questions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {authOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/68 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-jade">Traveler account</p>
                <h2 className="mt-1 text-2xl font-black">
                  {authMode === "signin" ? "Login" : "Create account"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAuthOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-ink/5 text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 rounded-2xl bg-ink/5 p-1">
              {[
                ["signin", "Login"],
                ["signup", "New account"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setAuthMode(mode);
                    setAuthMessage("");
                  }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                    authMode === mode ? "bg-white text-ink shadow-soft" : "text-ink/52"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleAuth}>
              {authMode === "signup" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-ink/68">First name</span>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(event) => setForm((value) => ({ ...value, firstName: event.target.value }))}
                      required
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none ring-jade/20 transition focus:border-jade focus:ring-4"
                      placeholder="First name"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-black text-ink/68">Last name</span>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(event) => setForm((value) => ({ ...value, lastName: event.target.value }))}
                      required
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none ring-jade/20 transition focus:border-jade focus:ring-4"
                      placeholder="Last name"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-black text-ink/68">Contact number</span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
                      required
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none ring-jade/20 transition focus:border-jade focus:ring-4"
                      placeholder="+963..."
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-black text-ink/68">Region / الدولة</span>
                    <select
                      value={form.region}
                      onChange={(event) => setForm((value) => ({ ...value, region: event.target.value }))}
                      required
                      className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 outline-none ring-jade/20 transition focus:border-jade focus:ring-4"
                    >
                      <option value="">Choose region / اختر المنطقة</option>
                      <option value="damascus">Damascus / دمشق</option>
                      <option value="aleppo">Aleppo / حلب</option>
                      <option value="homs">Homs / حمص</option>
                      <option value="latakia">Latakia / اللاذقية</option>
                      <option value="hama">Hama / حماة</option>
                      <option value="raqqa">Raqqa / الرقة</option>
                      <option value="deez">Darez / دير الزور</option>
                      <option value="sweida">Sweida / السويداء</option>
                      <option value="other">Other / أخرى</option>
                    </select>
                  </label>
                </div>
              )}
              <label className="block">
                <span className="text-sm font-black text-ink/68">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
                  required
                  className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 text-left outline-none ring-jade/20 transition focus:border-jade focus:ring-4"
                  placeholder="name@example.com"
                />
              </label>
              <label className="block">
                <span className="text-sm font-black text-ink/68">Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
                  required
                  minLength={6}
                  className="mt-2 w-full rounded-2xl border border-ink/10 bg-linen px-4 py-3 text-left outline-none ring-jade/20 transition focus:border-jade focus:ring-4"
                  placeholder="********"
                />
              </label>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 text-sm font-black text-white transition hover:bg-marine"
              >
                <LogIn className="h-4 w-4" />
                {authMode === "signin" ? "Login" : "Create account"}
              </button>
            </form>

            {authMessage && (
              <p className="mt-4 rounded-2xl bg-mist px-4 py-3 text-sm font-bold leading-6 text-ink/72">
                {authMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {accountOpen && session && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/68 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-jade">My Account</p>
                <h2 className="mt-1 text-2xl font-black">Welcome, {firstName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-ink/5 text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {[
                ["Full name", fullName || "Not provided"],
                ["First name", profile?.first_name || session.user.user_metadata?.first_name || "Not provided"],
                ["Last name", profile?.last_name || session.user.user_metadata?.last_name || "Not provided"],
                ["Email", session.user.email],
                ["Contact number", profile?.phone || session.user.user_metadata?.phone || "Not provided"],
                ["Region", profile?.region || session.user.user_metadata?.region || "Not provided"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-ink/8 bg-linen px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-wide text-ink/44">{label}</p>
                  <p className="mt-1 break-words text-sm font-black text-ink">{value}</p>
                </div>
              ))}
              {profile?.passport_image_url && (
                <div className="rounded-2xl border border-ink/8 bg-linen p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-ink/44">Passport Image</p>
                  <p className="mt-1 text-sm font-bold text-ink/68">✓ Uploaded</p>
                </div>
              )}
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  window.location.hash = "#admin";
                }}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-jade px-5 py-3.5 text-sm font-black text-white transition hover:bg-marine"
              >
                <SquareMenu className="h-4 w-4" />
                Admin Dashboard
              </button>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 text-sm font-black text-white transition hover:bg-marine"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
