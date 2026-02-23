import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PLATFORM_STATS = [
  { label: 'Active Vendors', value: '18,400+', tone: 'text-orange-600' },
  { label: 'Trusted Suppliers', value: '2,900+', tone: 'text-emerald-600' },
  { label: 'Monthly Orders', value: '96K+', tone: 'text-sky-600' },
  { label: 'Average Savings', value: '22%', tone: 'text-fuchsia-600' },
];

const OPERATING_HIGHLIGHTS = [
  {
    title: 'Real-Time Market Board',
    description: 'Track daily raw material rates and identify price drops before morning sourcing.',
    badge: 'Live',
    color: 'from-orange-500 to-amber-500',
  },
  {
    title: 'Voice-Led Discovery',
    description: 'Search suppliers in English + Indic languages for faster on-the-go procurement.',
    badge: 'Multilingual',
    color: 'from-sky-500 to-indigo-500',
  },
  {
    title: 'Verified Network',
    description: 'FSSAI-aware profiles, trust scoring, and transparent fulfillment history.',
    badge: 'Trusted',
    color: 'from-emerald-500 to-teal-500',
  },
];

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Set Your Sourcing Profile',
    description: 'Define budget, preferred quality, delivery radius, and core ingredient categories.',
  },
  {
    step: '02',
    title: 'Discover Matched Suppliers',
    description: 'Smart Street ranks options using trust, availability, pricing, and proximity.',
  },
  {
    step: '03',
    title: 'Lock Orders & Track Delivery',
    description: 'Place direct or group orders, then monitor status with clear operational updates.',
  },
  {
    step: '04',
    title: 'Improve Every Week',
    description: 'Use analytics, spend patterns, and forecasts to reduce cost and stock-outs.',
  },
];

const VALUE_PILLARS = [
  {
    icon: '🤖',
    title: 'AI Supplier Match',
    text: 'Prioritizes reliability, quality fit, and best price windows for your business profile.',
  },
  {
    icon: '📉',
    title: 'Price Intelligence',
    text: 'Understand trend movement and buy at the right time with actionable signals.',
  },
  {
    icon: '👥',
    title: 'Group Buying Power',
    text: 'Join nearby vendors to unlock bulk rates and lower your per-unit sourcing cost.',
  },
  {
    icon: '🧾',
    title: 'Operational Visibility',
    text: 'Track spend, margin pressure, and top suppliers from one dashboard.',
  },
  {
    icon: '🛡️',
    title: 'Trust + Compliance',
    text: 'Work with suppliers backed by verification data and quality transparency.',
  },
  {
    icon: '⚡',
    title: 'Faster Daily Ops',
    text: 'Cut sourcing calls and manual comparisons with in-app ordering workflows.',
  },
];

const USE_CASES = [
  {
    title: 'Street Cart Clusters',
    text: 'Coordinate neighborhood purchases for staples like onion, tomato, and oil to reduce volatility.',
  },
  {
    title: 'Cloud Kitchen Inputs',
    text: 'Lock recurring supplier lanes and monitor delivery consistency for multi-outlet operations.',
  },
  {
    title: 'Regional Wholesalers',
    text: 'Use demand forecasting to plan inventory and avoid missed high-volume windows.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'Our weekly ingredient spend became predictable. Group orders alone improved our margins.',
    name: 'A. Mehta',
    role: 'Pav Bhaji Vendor, Mumbai',
  },
  {
    quote: 'I receive better quality buyers and fewer last-minute cancellations after joining the platform.',
    name: 'R. Sharma',
    role: 'Produce Supplier, Pune',
  },
  {
    quote: 'Voice search is surprisingly practical during rush hours. I can source while serving customers.',
    name: 'K. Selvan',
    role: 'Tiffin Owner, Chennai',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Can I use Smart Street in local languages?',
    answer: 'Yes. Voice and translation-friendly workflows support English plus major Indic languages for search and supplier discovery.',
  },
  {
    question: 'Is this only for large businesses?',
    answer: 'No. The platform is built for daily street vendors, small kitchens, and local suppliers who need practical procurement tools.',
  },
  {
    question: 'How are suppliers ranked?',
    answer: 'Ranking combines trust score, inventory availability, price relevance, distance, and recent fulfillment performance.',
  },
  {
    question: 'Can I start with no upfront payment?',
    answer: 'Yes. You can create your profile, compare suppliers, and explore workflows before scaling up usage.',
  },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  // Redirect authenticated users to their dashboard
  if (isAuthenticated && user) {
    const dashboardPath = user.role === 'vendor' ? '/vendor/dashboard' : '/supplier/dashboard';
    return <Navigate to={dashboardPath} replace />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#fff5ec] via-[#f3fbff] to-[#eefaf2]">
        <div className="pointer-events-none absolute -left-24 top-6 h-64 w-64 rounded-full bg-orange-300/30 blur-3xl"></div>
        <div className="pointer-events-none absolute right-[-8rem] top-16 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl"></div>
        <div className="pointer-events-none absolute bottom-[-8rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/30 blur-3xl"></div>

        <nav className="sticky top-0 z-40 border-b border-white/50 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-orange-100 px-2 py-1 text-lg">🏪</span>
              <div>
                <div className="text-base font-black tracking-tight text-slate-900 sm:text-lg">Smart Street</div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Food Supply OS</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/auth"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Launch App
              </Link>
            </div>
          </div>
        </nav>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:pb-24 lg:pt-20 lg:px-8">
          <div className="animate-fadeIn">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-orange-700">
              Built for India&apos;s street food economy
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Source Better.
              <br />
              <span className="bg-gradient-to-r from-orange-600 via-rose-600 to-emerald-600 bg-clip-text text-transparent">
                Sell Faster.
              </span>
              <br />
              Grow Smarter.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Smart Street connects vendors and suppliers on a single intelligence layer for discovery, pricing, trust, ordering, and forecasting.
              Reduce sourcing chaos and make daily procurement decisions with confidence.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-orange-500 hover:shadow-lg hover:shadow-orange-300/40"
              >
                Start Free
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-1 hover:border-slate-400"
              >
                Explore Vendor Tools
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {PLATFORM_STATS.map((stat, index) => (
                <div
                  key={stat.label}
                  className="animate-scaleIn rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className={`text-xl font-black ${stat.tone}`}>{stat.value}</div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-slideInRight">
            <div className="rounded-3xl border border-white/80 bg-white/75 p-5 shadow-2xl shadow-slate-300/30 backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Control Center</div>
                  <div className="text-xl font-bold text-slate-900">Live Procurement Pulse</div>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Online</span>
              </div>
              <div className="space-y-3">
                {OPERATING_HIGHLIGHTS.map((item, index) => (
                  <div
                    key={item.title}
                    className="group rounded-2xl border border-slate-200 bg-white/90 p-4 transition-all duration-500 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                      </div>
                      <span className={`rounded-full bg-gradient-to-r px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white ${item.color}`}>
                        {item.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-white">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-300">Today&apos;s signal</div>
                <p className="mt-2 text-sm text-slate-100">
                  Tomato demand trending +18% in your zone. Suggested action: lock supplier rates before 9:00 AM.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">How Smart Street Works</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">From Chaos to Repeatable Procurement</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PROCESS_STEPS.map((item, index) => (
            <div
              key={item.step}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-500 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-sm font-black text-orange-600">{item.step}</div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Choose Your Path</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Built for Both Sides of the Market</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="group rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl">🍽️</div>
              <h3 className="text-2xl font-black text-slate-900">I&apos;m a Vendor</h3>
              <p className="mt-4 text-slate-700">
                Discover reliable suppliers, compare prices instantly, run voice-based searches, and optimize daily sourcing costs.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                <li>• Smart supplier ranking by trust + price</li>
                <li>• Group order participation for better rates</li>
                <li>• Spend and margin analytics</li>
              </ul>
              <Link
                to="/auth"
                className="mt-7 inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-orange-500"
              >
                Start as Vendor
              </Link>
            </div>
            <div className="group rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-2xl">🚚</div>
              <h3 className="text-2xl font-black text-slate-900">I&apos;m a Supplier</h3>
              <p className="mt-4 text-slate-700">
                Reach verified demand, manage inventory intelligently, and respond to market trends with AI-supported forecasting.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                <li>• Supplier storefront with trust signals</li>
                <li>• Inventory automation and stock alerts</li>
                <li>• Forecasting and loyalty insights</li>
              </ul>
              <Link
                to="/auth"
                className="mt-7 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-500"
              >
                Start as Supplier
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Capabilities</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Everything Needed for Daily Supply Operations</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALUE_PILLARS.map((feature, index) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-500 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="text-2xl">{feature.icon}</div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Where It Performs Best</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Designed for Real Market Conditions</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {USE_CASES.map((caseItem, index) => (
              <div
                key={caseItem.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 transition-all duration-500 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <h3 className="text-lg font-bold">{caseItem.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{caseItem.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Customer Voice</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Teams Seeing Real Operational Impact</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((item, index) => (
            <blockquote
              key={item.name}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <p className="text-sm leading-relaxed text-slate-700">&ldquo;{item.quote}&rdquo;</p>
              <footer className="mt-5 border-t border-slate-200 pt-4">
                <div className="text-sm font-bold text-slate-900">{item.name}</div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{item.role}</div>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">FAQ</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Questions Before You Start
            </h2>
            <p className="mt-4 text-slate-600">
              Clear answers for procurement teams, vendors, and suppliers evaluating Smart Street.
            </p>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="group rounded-xl border border-slate-200 p-4 open:border-slate-300 open:bg-slate-50">
                <summary className="cursor-pointer list-none pr-6 text-sm font-bold text-slate-900 marker:content-none">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-orange-600 via-rose-600 to-emerald-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Upgrade Your Sourcing Workflow This Week
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
            Join vendors and suppliers building healthier margins, stronger fulfillment reliability, and faster daily decisions.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="rounded-xl bg-white px-6 py-3 text-sm font-black text-slate-900 transition-all duration-300 hover:-translate-y-1 hover:bg-slate-100"
            >
              Create Your Account
            </Link>
            <Link
              to="/auth"
              className="rounded-xl border border-white/60 px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
            >
              See Supplier Dashboard
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 py-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="text-xl font-black">🏪 Smart Street</div>
            <p className="mt-3 text-sm text-slate-400">
              A sourcing operating system for India&apos;s street food and small-format food businesses.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-200">Vendors</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>Supplier Discovery</li>
              <li>Group Orders</li>
              <li>Price Insights</li>
              <li>Tracking</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-200">Suppliers</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>Inventory Management</li>
              <li>Demand Forecast</li>
              <li>Order Operations</li>
              <li>Loyalty Insights</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-200">Platform</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>Trust &amp; Safety</li>
              <li>Multilingual UX</li>
              <li>Support Center</li>
              <li>Privacy &amp; Terms</li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-slate-800 px-4 pt-6 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
          &copy; 2026 Smart Street. Purpose-built for reliable food supply coordination.
        </div>
      </footer>
    </div>
  );
}
