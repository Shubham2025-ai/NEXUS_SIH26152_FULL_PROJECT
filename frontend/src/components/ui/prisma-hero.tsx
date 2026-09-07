import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Activity,
  TrendingUp,
  Network,
  Share2,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Compass,
  Terminal,
  ExternalLink,
  Eye,
  BarChart3,
  Sparkles,
  GitBranch,
  Search,
  Radio,
  Clock,
  ChevronRight,
  Server,
} from "lucide-react";
import { useRef } from "react";
import { Footer } from "./footer-section";

/* ---------------- WordsPullUp ---------------- */
interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  style?: React.CSSProperties;
}

export const WordsPullUp = ({ text, className = "", showAsterisk = false, style }: WordsPullUpProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block relative"
            style={{ marginRight: isLast ? 0 : "0.25em" }}
          >
            {word}
            {showAsterisk && isLast && (
              <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">*</span>
            )}
          </motion.span>
        );
      })}
    </div>
  );
};

/* ---------------- WordsPullUpMultiStyle ---------------- */
interface Segment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[];
  className?: string;
  style?: React.CSSProperties;
}

export const WordsPullUpMultiStyle = ({ segments, className = "", style }: WordsPullUpMultiStyleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const words: { word: string; className?: string }[] = [];
  segments.forEach((seg) => {
    seg.text.split(" ").forEach((w) => {
      if (w) words.push({ word: w, className: seg.className });
    });
  });

  return (
    <div ref={ref} className={`inline-flex flex-wrap justify-center ${className}`} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`inline-block ${w.className ?? ""}`}
          style={{ marginRight: "0.25em" }}
        >
          {w.word}
        </motion.span>
      ))}
    </div>
  );
};

/* ---------------- Navigation ---------------- */
interface NavItem {
  label: string;
  href: string;
  isDashboard?: boolean;
}

const navItems: NavItem[] = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Tech Stack", href: "#stack" },
  { label: "Enter Lab", href: "/dashboard", isDashboard: true },
];

interface PrismaHeroProps {
  onNavigateDashboard?: () => void;
  className?: string;
}

/* ---------------- Helper Section Card Animation ---------------- */
interface SectionRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const SectionReveal = ({ children, className = "", delay = 0 }: SectionRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 35 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ---------------- Main Long-Scroll Page Component ---------------- */
export const PrismaHero = ({ onNavigateDashboard, className = "" }: PrismaHeroProps) => {
  const handleCtaClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigateDashboard) {
      onNavigateDashboard();
    } else {
      window.history.pushState({}, "", "/dashboard");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <div className={`relative w-full bg-[#070b14] text-[#edf4ff] selection:bg-[#5b8cff]/30 selection:text-white ${className}`}>
      
      {/* ============================================================ */}
      {/* 1. HERO SECTION (Exactly preserved design and typography)      */}
      {/* ============================================================ */}
      <section className="min-h-screen w-full p-2 sm:p-4 md:p-6 flex flex-col justify-center">
        <div className="relative h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] w-full overflow-hidden rounded-2xl md:rounded-[2rem]">
          
          {/* Background video with Unsplash fallback */}
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80"
            className="absolute inset-0 h-full w-full object-cover"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
          />

          {/* Noise overlay */}
          <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />

          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/80" />

          {/* Navbar */}
          <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2 max-w-[96%]">
            <div className="flex items-center gap-2 rounded-b-2xl bg-black/90 backdrop-blur-md px-3 py-2 sm:gap-4 sm:px-6 md:gap-8 md:rounded-b-3xl md:px-8 border-b border-x border-[#232f44]/60 shadow-2xl">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={
                    item.isDashboard
                      ? handleCtaClick
                      : (e) => handleAnchorClick(e, item.href)
                  }
                  className={`text-[11px] font-medium transition-all sm:text-xs md:text-sm whitespace-nowrap ${
                    item.isDashboard
                      ? "rounded-full bg-[#E1E0CC] text-black px-3 py-1 font-semibold hover:bg-white hover:shadow-[0_0_15px_rgba(225,224,204,0.4)]"
                      : "text-[#E1E0CC]/80 hover:text-[#E1E0CC]"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          {/* Hero content */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 sm:px-6 sm:pb-6 md:px-10 md:pb-8">
            <div className="grid grid-cols-12 items-end gap-4">
              
              <div className="col-span-12 lg:col-span-8">
                <h1
                  className="font-medium leading-[0.85] tracking-[-0.07em] text-[24vw] sm:text-[22vw] md:text-[20vw] lg:text-[18vw] xl:text-[17vw] select-none"
                  style={{ color: "#E1E0CC" }}
                >
                  <WordsPullUp text="Prisma" showAsterisk />
                </h1>
              </div>

              <div className="col-span-12 flex flex-col gap-4 pb-4 sm:gap-5 sm:pb-6 lg:col-span-4 lg:pb-8">
                
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-xs text-primary/80 sm:text-sm md:text-base max-w-lg"
                  style={{ lineHeight: 1.35 }}
                >
                  Prisma is a worldwide network of visual artists, filmmakers and storytellers bound not by place, status or labels but by passion and hunger to unlock potential through our unique perspectives.
                </motion.p>

                <motion.button
                  type="button"
                  onClick={handleCtaClick}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="group inline-flex items-center gap-2 self-start rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-black transition-all hover:gap-3 cursor-pointer sm:text-base shadow-lg hover:brightness-105 active:scale-95"
                >
                  Join the lab
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                    <ArrowRight className="h-4 w-4" style={{ color: "#E1E0CC" }} />
                  </span>
                </motion.button>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. ABOUT THE PROJECT SECTION                                 */}
      {/* ============================================================ */}
      <section id="about" className="relative py-20 sm:py-28 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto border-t border-[#1c2638]/60">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#172646]/20 via-transparent to-transparent" />
        
        <SectionReveal>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-[#5b8cff] shadow-[0_0_8px_#5b8cff]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#87b5ff]">
              Smart India Hackathon 2026 · SIH26152 · NTRO
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f1f5fb] mb-6 leading-tight">
            We track how narratives emerge, mutate and move —{" "}
            <span className="text-[#E1E0CC]">then keep the evidence that proves every conclusion.</span>
          </h2>

          <p className="text-base sm:text-lg text-[#9cb0cf] max-w-3xl leading-relaxed mb-12">
            NEXUS is an evidence-backed, cross-platform social intelligence framework designed for national situational awareness.
            It rejects black-box guesswork in favor of four deterministic analytical vectors, immutable provenance hashes,
            and honest data collection coverage.
          </p>
        </SectionReveal>

        {/* 3 Truth Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <SectionReveal delay={0.1}>
            <div className="glass-card rounded-2xl p-6 h-full flex flex-col justify-between border-l-4 border-l-[#4ee1a0]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#4ee1a0]/10 text-[#4ee1a0] border border-[#4ee1a0]/30">
                    LIVE
                  </span>
                  <Radio className="w-5 h-5 text-[#4ee1a0]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Verified Real-Time Ingestion</h3>
                <p className="text-sm text-[#8492aa] leading-relaxed">
                  Real public or authorized telemetry fetched live from open sources during analysis. Zero synthetic relabeling.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-[#1c2638] text-xs font-mono text-[#5f7495]">
                Telegram Bot API · YouTube Live · X Official
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div className="glass-card rounded-2xl p-6 h-full flex flex-col justify-between border-l-4 border-l-[#5b8cff]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#5b8cff]/10 text-[#5b8cff] border border-[#5b8cff]/30">
                    REPLAY
                  </span>
                  <Database className="w-5 h-5 text-[#5b8cff]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Deterministic Jury Benchmarks</h3>
                <p className="text-sm text-[#8492aa] leading-relaxed">
                  Reproducible, isolated multi-narrative datasets for verifiable model benchmarking, test suites, and jury inspection.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-[#1c2638] text-xs font-mono text-[#5f7495]">
                67 Canonical Events · Pre-Seeded
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.3}>
            <div className="glass-card rounded-2xl p-6 h-full flex flex-col justify-between border-l-4 border-l-[#8b5cf6]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/30">
                    IMPORT
                  </span>
                  <Layers className="w-5 h-5 text-[#8b5cf6]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Analyst Evidence Archives</h3>
                <p className="text-sm text-[#8492aa] leading-relaxed">
                  Structured CSV and JSON exports converted cleanly into canonical format without losing platform provenance metadata.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-[#1c2638] text-xs font-mono text-[#5f7495]">
                Strict SHA-256 Schema Validation
              </div>
            </div>
          </SectionReveal>
        </div>

        {/* Honest Baseline Doctrine banner */}
        <SectionReveal delay={0.4}>
          <div className="p-6 rounded-2xl bg-[#0e1627] border border-[#253652] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-[#E1E0CC] shrink-0" />
              <div>
                <h4 className="font-semibold text-[#f1f5fb] text-sm sm:text-base">
                  The Honest Baseline Doctrine
                </h4>
                <p className="text-xs sm:text-sm text-[#7d91ae]">
                  NEXUS records "earliest observed in collected dataset" rather than claiming absolute origin across the entire internet.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono uppercase bg-[#14213d] text-[#8db5f8] px-3 py-1.5 rounded-lg border border-[#2d4573] whitespace-nowrap">
              Audit-Proof Integrity
            </span>
          </div>
        </SectionReveal>
      </section>

      {/* ============================================================ */}
      {/* 3. KEY FEATURES — FOUR ANALYTICAL VECTORS                    */}
      {/* ============================================================ */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto border-t border-[#1c2638]/60">
        <SectionReveal>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-[#8b5cf6] shadow-[0_0_8px_#8b5cf6]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#b895ff]">
              Four Core Analytical Vectors
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f1f5fb] mb-4">
            Comprehensive Analysis. <span className="text-[#E1E0CC]">Zero Hallucination.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#9cb0cf] max-w-2xl mb-12">
            Every ingested event is processed across four decoupled analytical engines, providing complete multidimensional situational awareness.
          </p>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Vector 1 */}
          <SectionReveal delay={0.1}>
            <div className="glass-card rounded-2xl p-7 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#376df6]/10 rounded-full blur-2xl group-hover:bg-[#376df6]/20 transition-all" />
              <div className="w-12 h-12 rounded-xl bg-[#14223d] border border-[#273d6b] flex items-center justify-center mb-5 text-[#5b8cff]">
                <Activity className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#5b8cff] font-bold">Vector 01</span>
              <h3 className="text-xl font-bold text-white mt-1 mb-3">Sentiment & Stance Dynamics</h3>
              <p className="text-sm text-[#8492aa] leading-relaxed mb-5">
                Evaluates polarity (-1.0 to +1.0), granular stance (Support, Neutral, Oppose), and emotional vectors
                (anger, fear, joy, surprise) with transparent lexical and VADER movement tracking over time.
              </p>
              <ul className="space-y-2 text-xs font-mono text-[#9bb2d3]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ee1a0]" /> Continuous Polarity & Emotion Vectoring
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ee1a0]" /> Temporal Stance Trajectory Over Chronology
                </li>
              </ul>
            </div>
          </SectionReveal>

          {/* Vector 2 */}
          <SectionReveal delay={0.2}>
            <div className="glass-card rounded-2xl p-7 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#4ee1a0]/10 rounded-full blur-2xl group-hover:bg-[#4ee1a0]/20 transition-all" />
              <div className="w-12 h-12 rounded-xl bg-[#122822] border border-[#1f4a3e] flex items-center justify-center mb-5 text-[#4ee1a0]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#4ee1a0] font-bold">Vector 02</span>
              <h3 className="text-xl font-bold text-white mt-1 mb-3">Privacy-Safe Demographics</h3>
              <p className="text-sm text-[#8492aa] leading-relaxed mb-5">
                Aggregate language distribution and coarse self-declared geography with rigorous differential privacy
                and small-group suppression (&lt; 5 items) to protect individual identity.
              </p>
              <ul className="space-y-2 text-xs font-mono text-[#9bb2d3]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ee1a0]" /> Small-Group Suppression (k &lt; 5)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ee1a0]" /> Non-Invasive Aggregate Attribute Profiling
                </li>
              </ul>
            </div>
          </SectionReveal>

          {/* Vector 3 */}
          <SectionReveal delay={0.3}>
            <div className="glass-card rounded-2xl p-7 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/10 rounded-full blur-2xl group-hover:bg-[#8b5cf6]/20 transition-all" />
              <div className="w-12 h-12 rounded-xl bg-[#23173d] border border-[#432c70] flex items-center justify-center mb-5 text-[#b895ff]">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#b895ff] font-bold">Vector 03</span>
              <h3 className="text-xl font-bold text-white mt-1 mb-3">Narrative Clustering & Trend Tracking</h3>
              <p className="text-sm text-[#8492aa] leading-relaxed mb-5">
                Discovers semantic story clusters across differing wording via scikit-learn TF-IDF and cosine similarity.
                Calculates burst scores, growth curves, and cross-platform convergence.
              </p>
              <ul className="space-y-2 text-xs font-mono text-[#9bb2d3]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ee1a0]" /> Semantic Vectorization Beyond Hashtags
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ee1a0]" /> Mutation & Correction Chronology
                </li>
              </ul>
            </div>
          </SectionReveal>

          {/* Vector 4 */}
          <SectionReveal delay={0.4}>
            <div className="glass-card rounded-2xl p-7 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffbf69]/10 rounded-full blur-2xl group-hover:bg-[#ffbf69]/20 transition-all" />
              <div className="w-12 h-12 rounded-xl bg-[#2b2214] border border-[#523e1e] flex items-center justify-center mb-5 text-[#ffbf69]">
                <Network className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#ffbf69] font-bold">Vector 04</span>
              <h3 className="text-xl font-bold text-white mt-1 mb-3">Link & Network Topology</h3>
              <p className="text-sm text-[#8492aa] leading-relaxed mb-5">
                Constructs directed interaction networks via NetworkX to compute PageRank, betweenness centrality,
                Louvain community clusters, high-reach nodes, and critical cross-community bridges.
              </p>
              <ul className="space-y-2 text-xs font-mono text-[#9bb2d3]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ee1a0]" /> Bridge Node Identification
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ee1a0]" /> Influence & Amplification Quantification
                </li>
              </ul>
            </div>
          </SectionReveal>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. HOW IT WORKS — THE PIPELINE                               */}
      {/* ============================================================ */}
      <section id="workflow" className="py-20 sm:py-28 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto border-t border-[#1c2638]/60 relative">
        <span id="how-it-works" className="sr-only pointer-events-none" />
        <SectionReveal>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-[#4ee1a0] shadow-[0_0_8px_#4ee1a0]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#7de5b7]">
              Processing Pipeline
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f1f5fb] mb-4">
            How NEXUS Operates. <span className="text-[#E1E0CC]">Step by Step.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#9cb0cf] max-w-2xl mb-16">
            From raw, unstructured social media feeds to mathematically certified intelligence briefings.
          </p>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          
          {/* Step 1 */}
          <SectionReveal delay={0.1}>
            <div className="glass-card rounded-2xl p-6 relative flex flex-col justify-between h-full border border-[#21324d]">
              <div>
                <div className="text-2xl font-mono font-extrabold text-[#5b8cff] mb-4">01</div>
                <h3 className="text-base font-bold text-white mb-2">Multi-Source Ingestion</h3>
                <p className="text-xs text-[#8492aa] leading-relaxed">
                  Fetches public feeds via verified live bridges (Telegram Bot API, YouTube yt-dlp) and official APIs (X v2).
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#1c2638] text-[11px] font-mono text-[#8fa8cc]">
                Promise.allSettled Resilience
              </div>
            </div>
          </SectionReveal>

          {/* Step 2 */}
          <SectionReveal delay={0.2}>
            <div className="glass-card rounded-2xl p-6 relative flex flex-col justify-between h-full border border-[#21324d]">
              <div>
                <div className="text-2xl font-mono font-extrabold text-[#7de5b7] mb-4">02</div>
                <h3 className="text-base font-bold text-white mb-2">Canonical Normalization</h3>
                <p className="text-xs text-[#8492aa] leading-relaxed">
                  Transforms incoming JSON/HTML into unified <code className="text-[#7de5b7]">SocialEvent</code> objects with SHA-256 fingerprinting.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#1c2638] text-[11px] font-mono text-[#8fa8cc]">
                Immutable Event Provenance
              </div>
            </div>
          </SectionReveal>

          {/* Step 3 */}
          <SectionReveal delay={0.3}>
            <div className="glass-card rounded-2xl p-6 relative flex flex-col justify-between h-full border border-[#21324d]">
              <div>
                <div className="text-2xl font-mono font-extrabold text-[#b895ff] mb-4">03</div>
                <h3 className="text-base font-bold text-white mb-2">Four-Vector AI Analysis</h3>
                <p className="text-xs text-[#8492aa] leading-relaxed">
                  Executes scikit-learn TF-IDF clustering, VADER sentiment & stance scoring, and NetworkX topological graph engines.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#1c2638] text-[11px] font-mono text-[#8fa8cc]">
                FastAPI Analytics (:8000)
              </div>
            </div>
          </SectionReveal>

          {/* Step 4 */}
          <SectionReveal delay={0.4}>
            <div className="glass-card rounded-2xl p-6 relative flex flex-col justify-between h-full border border-[#21324d]">
              <div>
                <div className="text-2xl font-mono font-extrabold text-[#ffbf69] mb-4">04</div>
                <h3 className="text-base font-bold text-white mb-2">Evidence Certification</h3>
                <p className="text-xs text-[#8492aa] leading-relaxed">
                  Issues auditable evidence certificates or triggers an explicit <span className="text-[#ffbf69] font-bold">ABSTAIN</span> if coverage is insufficient.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#1c2638] text-[11px] font-mono text-[#8fa8cc]">
                Signed Decision Verification
              </div>
            </div>
          </SectionReveal>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. AI & INTELLIGENCE CAPABILITIES                            */}
      {/* ============================================================ */}
      <section id="capabilities" className="py-20 sm:py-28 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto border-t border-[#1c2638]/60 relative">
        <span id="intelligence" className="sr-only pointer-events-none" />
        <SectionReveal>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-[#E1E0CC] shadow-[0_0_8px_#E1E0CC]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E1E0CC]">
              Intelligence Architecture
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f1f5fb] mb-4">
            Mathematical Certainty. <span className="text-[#E1E0CC]">No Black-Box Hallucinations.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#9cb0cf] max-w-2xl mb-12">
            Built without reliance on paid cloud LLMs or opaque external APIs. Every score is explainable, traceable, and inspectable.
          </p>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SectionReveal delay={0.1}>
            <div className="glass-card rounded-2xl p-6 border border-[#253652] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-[#14233e] text-[#5b8cff]">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">TF-IDF Vector Space</h3>
                </div>
                <p className="text-xs text-[#8492aa] leading-relaxed mb-4">
                  Sublinear term-frequency scaling and cosine similarity metrics cluster synonymous phrasing across languages, discovering coordinated campaign narratives without relying on literal keyword matches.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#0a101d] border border-[#1b283d] font-mono text-[11px] text-[#7ea0cc]">
                Adaptive Threshold: 0.28 — 0.45
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div className="glass-card rounded-2xl p-6 border border-[#253652] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-[#271d3d] text-[#b895ff]">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">NetworkX Centrality</h3>
                </div>
                <p className="text-xs text-[#8492aa] leading-relaxed mb-4">
                  Computes directed PageRank scores and betweenness metrics to identify bridge accounts that inject narratives from fringe channels into mainstream community clusters.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#0a101d] border border-[#1b283d] font-mono text-[11px] text-[#a488e0]">
                Directed DiGraph · Bridge Isolation
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.3}>
            <div className="glass-card rounded-2xl p-6 border border-[#253652] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-[#152e25] text-[#4ee1a0]">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">Evidence Verification Engine</h3>
                </div>
                <p className="text-xs text-[#8492aa] leading-relaxed mb-4">
                  Every decision compiles an auditable Evidence Certificate. When data is scarce or confidence is insufficient, NEXUS emits an auditable ABSTAIN response rather than speculative output.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#0a101d] border border-[#1b283d] font-mono text-[11px] text-[#4ee1a0]">
                /api/certificates · Non-Speculative
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. OPERATIONAL USE CASES                                     */}
      {/* ============================================================ */}
      <section id="use-cases" className="py-20 sm:py-28 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto border-t border-[#1c2638]/60">
        <SectionReveal>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-[#376df6] shadow-[0_0_8px_#376df6]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#7ea0cc]">
              Mission Applications
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f1f5fb] mb-4">
            Operational Scenarios & <span className="text-[#E1E0CC]">Strategic Defense.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#9cb0cf] max-w-2xl mb-12">
            Engineered to fulfill the requirements of the Smart India Hackathon problem statement for intelligence analysts and defense agencies.
          </p>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <SectionReveal delay={0.1}>
            <div className="glass-card rounded-2xl p-7 border border-[#20324e]">
              <div className="flex items-center gap-3 mb-4">
                <Compass className="w-6 h-6 text-[#5b8cff]" />
                <h3 className="text-lg font-bold text-white">National & Public Security (NTRO)</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#8492aa] leading-relaxed mb-4">
                Rapid detection of synthetic panic narratives, coordinated influence campaigns, and emerging public unrest indicators across unmonitored channels.
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="px-2.5 py-1 rounded-md bg-[#132038] text-[#87b5ff] border border-[#253e6c]">Zero-Key Ingestion</span>
                <span className="px-2.5 py-1 rounded-md bg-[#132038] text-[#87b5ff] border border-[#253e6c]">Bridge Isolation</span>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div className="glass-card rounded-2xl p-7 border border-[#20324e]">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-[#4ee1a0]" />
                <h3 className="text-lg font-bold text-white">Cross-Platform Spillover Tracking</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#8492aa] leading-relaxed mb-4">
                Chronologically map when a rumor emerges on Telegram, migrates to YouTube commentary, and subsequently explodes into trending hashtags on X.
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="px-2.5 py-1 rounded-md bg-[#122822] text-[#7de5b7] border border-[#1f4a3e]">Chronological Graph</span>
                <span className="px-2.5 py-1 rounded-md bg-[#122822] text-[#7de5b7] border border-[#1f4a3e]">Mutation Analysis</span>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.3}>
            <div className="glass-card rounded-2xl p-7 border border-[#20324e]">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-[#b895ff]" />
                <h3 className="text-lg font-bold text-white">Coordinated Inauthentic Behavior (CIB)</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#8492aa] leading-relaxed mb-4">
                Detect bot rings and synchronized amplifier accounts that exhibit identical posting intervals, near-identical lexical templates, and unnatural PageRank scores.
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="px-2.5 py-1 rounded-md bg-[#25193d] text-[#b895ff] border border-[#442c70]">Louvain Modularity</span>
                <span className="px-2.5 py-1 rounded-md bg-[#25193d] text-[#b895ff] border border-[#442c70]">Burst Detection</span>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.4}>
            <div className="glass-card rounded-2xl p-7 border border-[#20324e]">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-[#ffbf69]" />
                <h3 className="text-lg font-bold text-white">Rapid Fact-Checking & Crisis Defense</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#8492aa] leading-relaxed mb-4">
                Produce judicial-grade Evidence Certificates detailing observed chronologies, raw hashes, and reach metrics to debunk falsehoods with indisputable data.
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="px-2.5 py-1 rounded-md bg-[#292013] text-[#ffbf69] border border-[#523e1e]">Evidence Certificates</span>
                <span className="px-2.5 py-1 rounded-md bg-[#292013] text-[#ffbf69] border border-[#523e1e]">Audit-Ready</span>
              </div>
            </div>
          </SectionReveal>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. TECHNOLOGY STACK                                          */}
      {/* ============================================================ */}
      <section id="stack" className="py-20 sm:py-28 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto border-t border-[#1c2638]/60 relative">
        <span id="tech-stack" className="sr-only pointer-events-none" />
        <SectionReveal>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-[#87b5ff] shadow-[0_0_8px_#87b5ff]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#87b5ff]">
              Architecture & Stack
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f1f5fb] mb-4">
            Engineered for <span className="text-[#E1E0CC]">Speed, Resilience & Audits.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#9cb0cf] max-w-2xl mb-12">
            Built with modern standards across the entire stack. No container overhead required for core deployment.
          </p>
        </SectionReveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {[
            { name: "Python 3.12", role: "Analytics Runtime", badge: "Core" },
            { name: "FastAPI", role: "Async REST API", badge: ":8000" },
            { name: "NetworkX", role: "Graph Topology", badge: "Engine" },
            { name: "scikit-learn", role: "TF-IDF / Cosine", badge: "ML" },
            { name: "React 19", role: "UI Framework", badge: "Client" },
            { name: "TypeScript", role: "Type Safety", badge: "v7" },
            { name: "Tailwind CSS", role: "Utility Styling", badge: "v4" },
            { name: "Framer Motion", role: "Cinematic Micro-UI", badge: "v13" },
            { name: "SQLite", role: "Deterministic DB", badge: "Storage" },
            { name: "Vite 8", role: "Modern Bundler", badge: "Build" },
            { name: "yt-dlp", role: "Zero-Key YouTube", badge: "Connector" },
            { name: "VADER", role: "Lexical Sentiment", badge: "NLP" },
          ].map((item, idx) => (
            <SectionReveal key={item.name} delay={idx * 0.04}>
              <div className="glass-card rounded-xl p-4 border border-[#213047] flex flex-col justify-between h-28 hover:border-[#5b8cff]/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#5b8cff] uppercase">{item.badge}</span>
                  <Server className="w-3.5 h-3.5 text-[#5b8cff]" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm leading-tight">{item.name}</h4>
                  <p className="text-[11px] text-[#718299]">{item.role}</p>
                </div>
              </div>
            </SectionReveal>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. FINAL "ENTER THE LAB" CTA                                 */}
      {/* ============================================================ */}
      <section id="enter-lab" className="py-24 sm:py-32 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto border-t border-[#1c2638]/60 relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1d3568]/30 via-transparent to-transparent" />

        <SectionReveal>
          <div className="glass-card rounded-3xl p-8 sm:p-12 md:p-16 border border-[#2c4066] relative overflow-hidden text-center max-w-4xl mx-auto shadow-[0_20px_80px_-20px_rgba(55,109,246,0.3)]">
            
            {/* Background glowing rings */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#5b8cff]/15 rounded-full blur-3xl pointer-events-none" />
            
            {/* Live System Pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#112338] border border-[#26446e] text-xs font-mono text-[#87b5ff] mb-8">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4ee1a0] animate-pulse" />
              <span>NEXUS Engine Ready · 67 Seeded Replay Events</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-6 leading-tight">
              Ready to Investigate? <br />
              <span className="text-[#E1E0CC]">Step into the Analyst Workspace.</span>
            </h2>

            <p className="text-sm sm:text-base text-[#9ab0ce] max-w-xl mx-auto mb-10 leading-relaxed">
              Explore live intelligence streams, examine influence network graphs,
              and verify narrative evidence certificates.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleCtaClick}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#E1E0CC] hover:bg-white text-black font-semibold text-base transition-all duration-300 shadow-[0_0_30px_rgba(225,224,204,0.3)] hover:shadow-[0_0_40px_rgba(225,224,204,0.6)] flex items-center justify-center gap-3 cursor-pointer active:scale-95"
              >
                <span>Enter Analyst Workspace</span>
                <ArrowRight className="w-5 h-5 text-black" />
              </button>

              <a
                href="#about"
                onClick={(e) => handleAnchorClick(e, "#about")}
                className="w-full sm:w-auto px-6 py-4 rounded-full bg-[#101a2b] hover:bg-[#16243b] text-[#c9d8ee] text-sm font-medium transition-all border border-[#273a57] flex items-center justify-center gap-2"
              >
                <span>Back to Overview</span>
              </a>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 pt-8 border-t border-[#1e2f47] text-left">
              <div>
                <div className="text-xl font-mono font-bold text-white">4 Vectors</div>
                <div className="text-xs text-[#75879f]">Sentiment to Topology</div>
              </div>
              <div>
                <div className="text-xl font-mono font-bold text-[#4ee1a0]">Zero-Key</div>
                <div className="text-xs text-[#75879f]">Free Source Matrix</div>
              </div>
              <div>
                <div className="text-xl font-mono font-bold text-[#87b5ff]">SHA-256</div>
                <div className="text-xs text-[#75879f]">Cryptographic Hashes</div>
              </div>
              <div>
                <div className="text-xl font-mono font-bold text-[#E1E0CC]">Audit-Safe</div>
                <div className="text-xs text-[#75879f]">Explicit ABSTAIN Logic</div>
              </div>
            </div>

          </div>
        </SectionReveal>
      </section>

      {/* ============================================================ */}
      {/* 9. CANONICAL FOOTER COMPONENT                                */}
      {/* ============================================================ */}
      <Footer onNavigateDashboard={handleCtaClick} />

    </div>
  );
};

export default PrismaHero;
