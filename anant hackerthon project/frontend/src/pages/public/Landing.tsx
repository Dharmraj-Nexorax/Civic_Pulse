import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface PublicStats {
  trackable_issues: number;
  community_reports: number;
  verified_resolutions: number;
  active_wards: number;
  includes_demo_data: boolean;
}

export default function Landing() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch('/api/public/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.trackable_issues === 'number') {
          setStats(d);
        }
      })
      .catch(() => {});
  }, []);

  const dashboardLink = user
    ? user.role === 'ADMIN'
      ? '/admin'
      : user.role === 'WORKER'
      ? '/worker'
      : '/citizen'
    : null;

  const teamMembers = [
    {
      name: 'Jaya Laxmi Devda',
      role: 'Frontend Development',
      handle: '@jayadevda_',
      instagramUrl: 'https://www.instagram.com/jayadevda_/',
      description:
        'Architecting responsive, high-performance web interfaces, intuitive citizen filing flows, accessibility standards, and interactive live dashboards.',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      avatarColor: 'from-emerald-500 to-teal-700',
      initials: 'JD',
    },
    {
      name: 'Ronak',
      role: 'Backend Development',
      handle: '@ronak.py_',
      instagramUrl: 'https://www.instagram.com/ronak.py_/',
      description:
        'Engineering resilient API microservices, role-based JWT authentication, state-machine transitions, SLA monitors, and real-time event audit trails.',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      avatarColor: 'from-blue-600 to-indigo-800',
      initials: 'RN',
    },
    {
      name: 'Chanchal',
      role: 'AI Development',
      handle: '@sakshi_gehlot.517',
      instagramUrl: 'https://www.instagram.com/sakshi_gehlot.517/',
      description:
        'Building NLP categorization models, semantic similarity clustering for duplicate detection, and intelligent municipal triage summarization pipelines.',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      avatarColor: 'from-purple-600 to-pink-700',
      initials: 'CH',
    },
    {
      name: 'Arth Goyal',
      role: 'Database Management',
      handle: '@arthgoyal_07',
      instagramUrl: 'https://www.instagram.com/arthgoyal_07/',
      description:
        'Designing relational schemas, query optimizations, spatial indexing, high-performance SLA aggregations, and strict database integrity constraints.',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      avatarColor: 'from-amber-500 to-orange-700',
      initials: 'AG',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col selection:bg-teal-500 selection:text-white" style={{ background: '#F8FAFC' }}>
      {/* 1. Header Navigation */}
      <nav className="border-b sticky top-0 z-50 bg-white/95 backdrop-blur-md" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-decoration-none">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-base shadow-sm" style={{ background: '#10243A' }}>
              CP
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight leading-tight" style={{ color: '#10243A' }}>
                Civic<span style={{ color: '#16A085' }}>Pulse</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-gray-400">
                Accountability Platform
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#about" className="hover:text-teal-700 transition-colors">About</a>
            <a href="#technology" className="hover:text-teal-700 transition-colors">AI & Tech</a>
            <a href="#team" className="hover:text-teal-700 transition-colors">Team</a>
            <a href="#mission" className="hover:text-teal-700 transition-colors">Mission</a>
            <Link to="/community-map" className="hover:text-teal-700 transition-colors">Civic Map</Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link to={dashboardLink!} className="btn btn-primary text-sm shadow-sm">
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline text-sm">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn text-sm text-white font-semibold shadow-sm transition-all"
                  style={{ background: '#16A085' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#12876f')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#16A085')}
                >
                  Report Issue
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden border-b" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F8FB 100%)', borderColor: '#E2E8F0' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28 flex flex-col items-start gap-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase border border-teal-200 bg-teal-50 text-teal-800">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            Every Voice Matters. Every Issue Counts.
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]" style={{ color: '#10243A', maxWidth: 740 }}>
            From Civic Issues to <span style={{ color: '#16A085' }}>Verifiable Action.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal" style={{ maxWidth: 620 }}>
            Report infrastructure breakdowns, track resolution milestones in real time, and hold municipal teams accountable with
            cryptographic proof of work and citizen-verified closures.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/register"
              className="px-6 py-3.5 rounded-lg font-bold text-white shadow-md hover:shadow-lg transition-all text-sm sm:text-base"
              style={{ background: '#16A085' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#12876f')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#16A085')}
            >
              Report a Civic Issue →
            </Link>
            <Link
              to="/community-map"
              className="px-6 py-3.5 rounded-lg font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all text-sm sm:text-base shadow-sm"
            >
              Explore Public Map 🗺️
            </Link>
          </div>

          <div className="pt-4 flex items-center gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">✓ 100% Explainable Priority SLA</span>
            <span className="flex items-center gap-1.5">✓ Citizen Verification Required</span>
            <span className="flex items-center gap-1.5">✓ Anti-Duplicate Deduplication</span>
          </div>
        </div>
      </section>

      {/* 3. Live Stats Counter */}
      {stats && (
        <section className="border-b bg-white" style={{ borderColor: '#E2E8F0' }}>
          <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col gap-1 border-l-2 pl-4 border-teal-500">
              <div className="text-3xl sm:text-4xl font-black" style={{ color: '#10243A' }}>
                {(stats.trackable_issues ?? 0).toLocaleString()}
              </div>
              <div className="text-xs uppercase font-bold tracking-wider text-slate-500">Tracked Civic Issues</div>
            </div>

            <div className="flex flex-col gap-1 border-l-2 pl-4 border-blue-500">
              <div className="text-3xl sm:text-4xl font-black text-blue-700">
                {(stats.community_reports ?? 0).toLocaleString()}
              </div>
              <div className="text-xs uppercase font-bold tracking-wider text-slate-500">Ingested Reports</div>
            </div>

            <div className="flex flex-col gap-1 border-l-2 pl-4 border-emerald-500">
              <div className="text-3xl sm:text-4xl font-black text-emerald-600">
                {(stats.verified_resolutions ?? 0).toLocaleString()}
              </div>
              <div className="text-xs uppercase font-bold tracking-wider text-slate-500">Citizen-Verified Fixes</div>
            </div>

            <div className="flex flex-col gap-1 border-l-2 pl-4 border-purple-500">
              <div className="text-3xl sm:text-4xl font-black text-purple-700">
                {(stats.active_wards ?? 0).toLocaleString()}
              </div>
              <div className="text-xs uppercase font-bold tracking-wider text-slate-500">Active Municipal Wards</div>
            </div>
          </div>
        </section>
      )}

      {/* 4. About CivicPulse Section */}
      <section id="about" className="py-20 border-b" style={{ background: '#F4F8FB', borderColor: '#E2E8F0' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-700">About CivicPulse</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight" style={{ color: '#10243A' }}>
              Every Voice Matters. Every Issue Counts.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              CivicPulse was engineered to solve the broken feedback loop in municipal administration. In traditional systems,
              complaints are often marked as "Closed" administratively without physical verification. We put the confirmation power back in
              the citizen's hands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center text-2xl">
                📢
              </div>
              <h3 className="font-bold text-lg text-slate-900">Democratized Reporting</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Citizens submit photo evidence, category descriptions, and geographic pinpoints with zero bureaucratic hurdles or paperwork.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-2xl">
                ⚖️
              </div>
              <h3 className="font-bold text-lg text-slate-900">Explainable Triage</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Priorities are computed using verifiable deterministic factors (hazard severity, community cluster density, public impact) with no black-box bias.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-2xl">
                🛡️
              </div>
              <h3 className="font-bold text-lg text-slate-900">Citizen-Gated Resolution</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                A task is only marked permanently resolved when the original reporting citizen inspects the worker's resolution proof and verifies the fix.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. The Accountability Loop (Process) */}
      <section className="py-20 bg-white border-b" style={{ borderColor: '#E2E8F0' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Workflow Architecture</span>
            <h2 className="text-3xl font-extrabold mt-1 tracking-tight" style={{ color: '#10243A' }}>
              The 4-Stage Closed Accountability Loop
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              How CivicPulse transforms an unverified community grievance into an audited, verified municipal resolution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="text-xs font-black tracking-widest text-teal-600 mb-2">STAGE 01</div>
              <h4 className="font-bold text-lg text-slate-900 mb-2">Report & Ingest</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Citizen submits location, photo evidence, and category details. The system creates a unique tracking ID and audit ledger entry.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="text-xs font-black tracking-widest text-blue-600 mb-2">STAGE 02</div>
              <h4 className="font-bold text-lg text-slate-900 mb-2">AI Triage & Group</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                The NLP pipeline identifies category keywords, checks for duplicate cluster reports nearby, and assigns an explainable priority band.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="text-xs font-black tracking-widest text-indigo-600 mb-2">STAGE 03</div>
              <h4 className="font-bold text-lg text-slate-900 mb-2">Dispatch & Remediate</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                The responsible municipal department dispatches a field worker. Upon completion, the worker uploads photo proof and resolution notes.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="text-xs font-black tracking-widest text-emerald-600 mb-2">STAGE 04</div>
              <h4 className="font-bold text-lg text-slate-900 mb-2">Citizen Verification</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                The citizen reviews the proof. If satisfactory, they mark it VERIFIED. If inadequate, the issue automatically reopens with penalty logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. AI & Technology Behind CivicPulse */}
      <section id="technology" className="py-20 border-b" style={{ background: '#10243A', borderColor: '#1E3A5F' }}>
        <div className="max-w-6xl mx-auto px-6 text-white">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-400">Core Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">
              AI & Engineering Behind CivicPulse
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3 leading-relaxed">
              CivicPulse combines modern AI-assisted software development methodologies with purpose-built, high-reliability
              inside-the-application intelligence services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Capability 1 */}
            <div className="bg-[#172E49] p-6 rounded-xl border border-slate-700/60 shadow-lg flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-lg bg-teal-500/20 text-teal-400 font-mono text-sm font-bold">FastAPI :8001</span>
                <h3 className="font-bold text-lg text-white">Dedicated AI Inference Microservice</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                A specialized, high-performance Python FastAPI service runs concurrently with our core Next.js backend, providing low-latency
                NLP inference, structured JSON extraction, and municipal taxonomy classification.
              </p>
            </div>

            {/* Capability 2 */}
            <div className="bg-[#172E49] p-6 rounded-xl border border-slate-700/60 shadow-lg flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400 font-mono text-sm font-bold">NLP Engine</span>
                <h3 className="font-bold text-lg text-white">Category & Keyword Classification</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Analyzes citizen problem statements and automatically maps raw descriptions into 8 standardized municipal categories (Water Supply,
                Roads, Sanitation, Streetlights, etc.) with confidence scoring.
              </p>
            </div>

            {/* Capability 3 */}
            <div className="bg-[#172E49] p-6 rounded-xl border border-slate-700/60 shadow-lg flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono text-sm font-bold">Deduplication</span>
                <h3 className="font-bold text-lg text-white">Semantic Similarity & Hotspot Clustering</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Detects multiple citizen reports regarding the same underlying civic problem within geographic boundaries, consolidating them into a single trackable
                issue to prevent fragmented worker dispatch.
              </p>
            </div>

            {/* Capability 4 */}
            <div className="bg-[#172E49] p-6 rounded-xl border border-slate-700/60 shadow-lg flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400 font-mono text-sm font-bold">Summarizer</span>
                <h3 className="font-bold text-lg text-white">Template & LLM Action Briefs</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Transforms lengthy citizen grievance reports into succinct operational dispatch summaries and executive briefings for municipal
                administrators and field personnel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Meet Our Team Section */}
      <section id="team" className="py-20 bg-white border-b" style={{ borderColor: '#E2E8F0' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Engineering & Design</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight" style={{ color: '#10243A' }}>
              Meet Our Team
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              The dedicated team building transparent, accountable digital infrastructure for modern civic governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Avatar & Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${member.avatarColor} text-white font-bold flex items-center justify-center text-base shadow-sm`}
                    >
                      {member.initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 leading-snug">{member.name}</h3>
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border mt-1 ${member.badgeColor}`}>
                        {member.role}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    {member.description}
                  </p>
                </div>

                {/* Instagram Link Button */}
                <div className="pt-3 border-t border-slate-100">
                  <a
                    href={member.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-600 hover:text-pink-700 transition-colors group"
                  >
                    <svg className="w-4 h-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                    <span>{member.handle}</span>
                    <span className="text-[10px] text-gray-400 font-normal">↗</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Mission Statement */}
      <section id="mission" className="py-20 border-b" style={{ background: '#F4F8FB', borderColor: '#E2E8F0' }}>
        <div className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Our Core Mission</span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: '#10243A' }}>
            "From Civic Issues to Accountable Action."
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed mt-2">
            We believe that <span className="font-semibold text-slate-800">Reporting ≠ Resolution</span>. Real civic transformation
            occurs only when local municipal governments operate with radical transparency, verifiable evidence, and citizen-governed
            quality verification.
          </p>
          <div className="pt-6">
            <Link
              to="/register"
              className="px-6 py-3 rounded-lg font-bold text-white shadow transition-all text-sm"
              style={{ background: '#10243A' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1a3a5a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#10243A')}
            >
              Join the Movement · File an Issue
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Multi-Column Professional Footer */}
      <footer className="border-t bg-white" style={{ borderColor: '#E2E8F0' }}>
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Col 1: Brand */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#10243A] text-white flex items-center justify-center font-black text-sm">
                  CP
                </div>
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  Civic<span className="text-teal-600">Pulse</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                "Every Voice Matters. Every Issue Counts."
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Empowering communities with real-time tracking, explainable SLA metrics, and citizen-governed verification.
              </p>
            </div>

            {/* Col 2: Explore */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">Explore</h4>
              <Link to="/register" className="text-xs text-slate-600 hover:text-teal-700 transition-colors">
                Report a Civic Issue
              </Link>
              <Link to="/community-map" className="text-xs text-slate-600 hover:text-teal-700 transition-colors">
                Public Community Map
              </Link>
              <Link to="/login" className="text-xs text-slate-600 hover:text-teal-700 transition-colors">
                Account Sign In
              </Link>
              <Link to="/admin" className="text-xs text-slate-600 hover:text-teal-700 transition-colors">
                Admin Command Center
              </Link>
              <Link to="/worker" className="text-xs text-slate-600 hover:text-teal-700 transition-colors">
                Worker Field Portal
              </Link>
            </div>

            {/* Col 3: AI & Technology */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">AI & Technology</h4>
              <span className="text-xs text-slate-600">FastAPI Microservice (Port 8001)</span>
              <span className="text-xs text-slate-600">Keyword & Category Classifier</span>
              <span className="text-xs text-slate-600">Semantic Deduplication Engine</span>
              <span className="text-xs text-slate-600">Explainable Priority Banding</span>
              <span className="text-xs text-slate-600">Citizen Verification Gate</span>
            </div>

            {/* Col 4: Meet the Team */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">Meet the Team</h4>
              <a
                href="https://www.instagram.com/jayadevda_/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-600 hover:text-pink-600 transition-colors flex items-center justify-between"
              >
                <span>Jaya Laxmi Devda (Frontend)</span>
                <span className="text-[10px] text-gray-400">@jayadevda_</span>
              </a>
              <a
                href="https://www.instagram.com/ronak.py_/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-600 hover:text-pink-600 transition-colors flex items-center justify-between"
              >
                <span>Ronak (Backend)</span>
                <span className="text-[10px] text-gray-400">@ronak.py_</span>
              </a>
              <a
                href="https://www.instagram.com/sakshi_gehlot.517/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-600 hover:text-pink-600 transition-colors flex items-center justify-between"
              >
                <span>Chanchal (AI Dev)</span>
                <span className="text-[10px] text-gray-400">@sakshi_gehlot.517</span>
              </a>
              <a
                href="https://www.instagram.com/arthgoyal_07/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-600 hover:text-pink-600 transition-colors flex items-center justify-between"
              >
                <span>Arth Goyal (Database)</span>
                <span className="text-[10px] text-gray-400">@arthgoyal_07</span>
              </a>
            </div>
          </div>

          {/* Bottom Copyright Row */}
          <div className="border-t border-slate-200 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>© 2026 CivicPulse · All Rights Reserved.</span>
            <span className="font-semibold text-slate-700">Reporting ≠ Resolution · Empowering Transparent Municipal Action</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
