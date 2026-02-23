import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PLATFORM_STATS = [
  { label: 'Active Vendors', value: '18,400+', tone: 'text-slate-900' },
  { label: 'Trusted Suppliers', value: '2,900+', tone: 'text-slate-900' },
  { label: 'Monthly Orders', value: '96K+', tone: 'text-slate-900' },
  { label: 'Average Savings', value: '22%', tone: 'text-slate-900' },
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
    <div className="min-h-screen bg-white text-slate-900">
      <div className="relative overflow-hidden">
        {/* Subtle background accent - single refined element */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-br from-slate-100/40 via-slate-50/20 to-transparent blur-3xl"></div>

        {/* Navigation */}
        <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900">SmartStreet</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/auth"
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-300 hover:text-slate-900"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-slate-800 active:scale-95"
              >
                Launch App
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left Content */}
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Connecting Vendors & Suppliers
                </p>
                <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl">
                  Smart Supply
                  <br />
                  <span className="text-slate-600">Made Simple</span>
                </h1>
                <p className="text-lg leading-relaxed text-slate-600 max-w-xl">
                  Real-time pricing, verified suppliers, group buying power, and AI-driven insights for daily procurement decisions that reduce costs and chaos.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/auth"
                  className="group relative inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-base font-semibold text-white transition-all duration-300 hover:bg-slate-800 active:scale-95 overflow-hidden"
                >
                  <span className="relative z-10">Start Free</span>
                  <div className="absolute inset-0 bg-slate-800 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300 origin-center"></div>
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-8 py-3 text-base font-semibold text-slate-900 transition-all duration-300 hover:border-slate-400 hover:bg-slate-50 active:scale-95"
                >
                  Explore Features
                </Link>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 max-w-md">
                {PLATFORM_STATS.map((stat, index) => (
                  <div
                    key={stat.label}
                    className="group animate-scaleIn rounded-lg border border-slate-200 bg-white p-4 transition-all duration-300 hover:border-slate-300 hover:shadow-md cursor-default"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Feature Card */}
            <div className="animate-slideInRight lg:mt-0">
              <div className="group relative rounded-2xl border border-slate-200 bg-white p-8 shadow-lg transition-all duration-500 hover:shadow-2xl hover:border-slate-300">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                
                <div className="relative z-10 space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Platform Highlights</p>
                    <h2 className="text-2xl font-bold text-slate-900">Live Features</h2>
                  </div>

                  <div className="space-y-3">
                    {OPERATING_HIGHLIGHTS.map((item, index) => (
                      <div
                        key={item.title}
                        className="group/item rounded-lg border border-slate-100 bg-slate-50/50 p-4 transition-all duration-300 hover:bg-slate-100 hover:border-slate-200 cursor-default"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
                          </div>
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 whitespace-nowrap">
                            {item.badge}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-6 rounded-lg bg-slate-900 p-4 text-white">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-200"></span>
                      </span>
                      Market Signal
                    </div>
                    <p className="text-sm leading-relaxed text-slate-100">
                      High demand for seasonal vegetables. Lock supplier rates for optimal margins.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* How It Works Section */}
      <section className="border-t border-slate-200 bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="space-y-12">
            <div className="text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Simple Four-Step Process</p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                From Chaos to Smart Operations
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {PROCESS_STEPS.map((item, index) => (
                <div
                  key={item.step}
                  className="group relative animate-fadeIn rounded-xl border border-slate-200 bg-white p-6 transition-all duration-500 hover:shadow-lg hover:border-slate-300 hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  
                  <div className="relative z-10 space-y-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-lg font-bold text-white">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                    </div>
                  </div>

                  {/* Connector line - hidden on mobile */}
                  {index < PROCESS_STEPS.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 h-0.5 w-6 bg-gradient-to-r from-slate-200 to-slate-100"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection Section */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="space-y-12">
            <div className="text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Choose Your Role</p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Designed for Both Sides
              </h2>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Vendor Card */}
              <div className="group relative rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-500 hover:shadow-2xl hover:border-slate-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                
                <div className="relative z-10 space-y-6">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-3xl group-hover:scale-110 transition-transform duration-300">🍽️</div>
                  <div>
                    <h3 className="text-3xl font-bold text-slate-900">For Vendors</h3>
                    <p className="mt-3 text-lg leading-relaxed text-slate-600">
                      Find trusted suppliers, compare prices instantly, and optimize sourcing costs with AI-powered insights.
                    </p>
                  </div>

                  <ul className="space-y-3">
                    {[
                      'Smart supplier ranking',
                      'Group buying power',
                      'Spend analytics'
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">✓</span>
                        <span className="text-slate-700">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/auth"
                    className="mt-2 inline-flex rounded-full bg-slate-900 px-6 py-3 text-base font-semibold text-white transition-all duration-300 hover:bg-slate-800 active:scale-95"
                  >
                    Start as Vendor
                  </Link>
                </div>
              </div>

              {/* Supplier Card */}
              <div className="group relative rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-500 hover:shadow-2xl hover:border-slate-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                
                <div className="relative z-10 space-y-6">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-3xl group-hover:scale-110 transition-transform duration-300">🚚</div>
                  <div>
                    <h3 className="text-3xl font-bold text-slate-900">For Suppliers</h3>
                    <p className="mt-3 text-lg leading-relaxed text-slate-600">
                      Reach verified demand, manage inventory intelligently, and forecast market trends with AI support.
                    </p>
                  </div>

                  <ul className="space-y-3">
                    {[
                      'Supplier storefront',
                      'Inventory automation',
                      'Forecasting insights'
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">✓</span>
                        <span className="text-slate-700">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/auth"
                    className="mt-2 inline-flex rounded-full bg-slate-900 px-6 py-3 text-base font-semibold text-white transition-all duration-300 hover:bg-slate-800 active:scale-95"
                  >
                    Start as Supplier
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-slate-200 bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="space-y-12">
            <div className="text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Core Capabilities</p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Everything You Need
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {VALUE_PILLARS.map((feature, index) => (
                <article
                  key={feature.title}
                  className="group relative animate-fadeIn rounded-xl border border-slate-200 bg-white p-6 transition-all duration-500 hover:shadow-lg hover:border-slate-300 hover:-translate-y-1"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  
                  <div className="relative z-10 space-y-3">
                    <div className="text-3xl">{feature.icon}</div>
                    <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{feature.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="space-y-12">
            <div className="text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Real-World Applications</p>
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Built for Market Realities
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {USE_CASES.map((caseItem, index) => (
                <div
                  key={caseItem.title}
                  className="group relative animate-fadeIn rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6 transition-all duration-500 hover:shadow-2xl hover:border-slate-600 hover:-translate-y-1 overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"></div>
                  
                  <div className="relative z-10 space-y-3">
                    <h3 className="text-lg font-bold text-white">{caseItem.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-300">{caseItem.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="space-y-12">
            <div className="text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Customer Stories</p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Real Impact, Real Results
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((item, index) => (
                <blockquote
                  key={item.name}
                  className="group relative animate-fadeIn rounded-xl border border-slate-200 bg-white p-8 transition-all duration-500 hover:shadow-lg hover:border-slate-300 hover:-translate-y-1 overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  
                  <div className="relative z-10 space-y-4">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-lg">⭐</span>
                      ))}
                    </div>
                    <p className="text-base leading-relaxed text-slate-700 italic">&ldquo;{item.quote}&rdquo;</p>
                    <footer className="space-y-1 pt-4 border-t border-slate-200">
                      <div className="text-sm font-bold text-slate-900">{item.name}</div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.role}</div>
                    </footer>
                  </div>
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">FAQ</p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                Common Questions
              </h2>
              <p className="text-lg text-slate-600">
                Everything you need to know about Smart Street and getting started.
              </p>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, index) => (
                <details 
                  key={item.question} 
                  className="group animate-fadeIn rounded-lg border border-slate-200 transition-all duration-300 open:border-slate-300 open:bg-slate-50 open:shadow-md overflow-hidden"
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-bold text-slate-900 marker:content-none hover:bg-slate-50 transition-colors duration-200">
                    <span>{item.question}</span>
                    <span className="transition-transform duration-300 group-open:rotate-180">
                      <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-6 pb-4 text-sm leading-relaxed text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Ready to Transform Your Supply Chain?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            Join vendors and suppliers making smarter procurement decisions. Start free, no credit card required.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/auth"
              className="group relative inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-bold text-slate-900 transition-all duration-300 hover:shadow-lg hover:shadow-white/20 active:scale-95 overflow-hidden"
            >
              <span className="relative z-10">Start Your Free Account</span>
              <div className="absolute inset-0 bg-slate-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300 origin-center"></div>
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-full border-2 border-white px-8 py-4 text-base font-bold text-white transition-all duration-300 hover:bg-white/10 active:scale-95"
            >
              Explore Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white border-t border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 mb-12">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">SmartStreet</h2>
              <p className="text-sm text-slate-400">
                Intelligent procurement for India's street food and small-format food businesses.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200">For Vendors</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="hover:text-slate-200 transition-colors cursor-pointer">Supplier Discovery</li>
                <li className="hover:text-slate-200 transition-colors cursor-pointer">Group Orders</li>
                <li className="hover:text-slate-200 transition-colors cursor-pointer">Price Insights</li>
                <li className="hover:text-slate-200 transition-colors cursor-pointer">Order Tracking</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200">For Suppliers</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="hover:text-slate-200 transition-colors cursor-pointer">Inventory Tools</li>
                <li className="hover:text-slate-200 transition-colors cursor-pointer">Demand Forecast</li>
                <li className="hover:text-slate-200 transition-colors cursor-pointer">Order Management</li>
                <li className="hover:text-slate-200 transition-colors cursor-pointer">Loyalty Insights</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200">Company</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="hover:text-slate-200 transition-colors cursor-pointer">Trust &amp; Safety</li>
                <li className="hover:text-slate-200 transition-colors cursor-pointer">Support</li>
                <li className="hover:text-slate-200 transition-colors cursor-pointer">Privacy</li>
                <li className="hover:text-slate-200 transition-colors cursor-pointer">Terms</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-xs text-slate-500">
              &copy; 2026 SmartStreet. Purpose-built for reliable food supply coordination.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
