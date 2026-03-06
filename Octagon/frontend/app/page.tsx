"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { 
  ArrowRight, BarChart2, Users, MapPin, Video, Brain, Target, Shield, 
  Trophy, TrendingUp, Loader2, Zap, ChevronRight, Play, CheckCircle2,
  Sparkles, Activity, Dumbbell, Eye, Star
} from "lucide-react";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform, Variants } from "framer-motion";
import { HeroScene } from "@/components/3d/HeroScene";
import { useAuth } from "@/contexts/AuthContext";
import { TOP_CONTENDERS } from "@/lib/data";
import gsap from "gsap";

// Typewriter Text Component
function TypewriterText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const [displayText, setDisplayText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    let currentIndex = 0;
    const startDelay = setTimeout(() => {
      const typeInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          setIsComplete(true);
          // Keep cursor blinking for a moment then hide
          setTimeout(() => setShowCursor(false), 1500);
        }
      }, 80); // Speed of typing
      
      return () => clearInterval(typeInterval);
    }, delay);
    
    return () => clearTimeout(startDelay);
  }, [text, delay]);
  
  // Cursor blink effect
  useEffect(() => {
    if (!isComplete) return;
    const blinkInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    
    const hideTimeout = setTimeout(() => {
      clearInterval(blinkInterval);
      setShowCursor(false);
    }, 1500);
    
    return () => {
      clearInterval(blinkInterval);
      clearTimeout(hideTimeout);
    };
  }, [isComplete]);
  
  return (
    <span className={className}>
      {displayText}
      <span className={`inline-block w-[4px] h-[0.9em] bg-current ml-1 align-middle transition-opacity ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
    </span>
  );
}

// Animated Counter Component
function AnimatedCounter({ value, suffix = "", duration = 2 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  useEffect(() => {
    if (!isInView) return;
    
    const startTime = Date.now();
    const endValue = value;
    
    const updateCounter = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(easeOutQuart * endValue);
      
      setCount(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };
    
    requestAnimationFrame(updateCounter);
  }, [isInView, value, duration]);
  
  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

// Animation variants for reuse
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } }
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } }
};

// Animated Section wrapper component
function AnimatedSection({ children, className = "", delay = 0, id }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] } }
      }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const dashboardPath = user.role === "coach" ? "/dashboard/coach" : "/dashboard/fan";
      router.push(dashboardPath);
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading while checking auth state or if authenticated (redirecting)
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Loader2 className="w-8 h-8 animate-spin text-octagon-red" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/70 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-octagon-red/10 via-transparent to-transparent" />
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(210,10,10,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(210,10,10,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>
        
        <HeroScene />

        <motion.div 
          style={{ opacity: heroOpacity }}
          className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4 max-w-6xl mx-auto pt-20"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-octagon-red opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-octagon-red"></span>
              </span>
              <span className="text-[11px] font-mono text-gray-300 uppercase tracking-widest">AI-Powered MMA Analytics</span>
              <Sparkles className="w-3 h-3 text-octagon-gold" />
            </div>
          </motion.div>

          {/* Main Headline with Typewriter Effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black font-display uppercase tracking-tighter leading-[0.85] mb-2">
              <span className="block text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                <TypewriterText text="OCTAGON" delay={300} />
              </span>
              <span className="block relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-octagon-red via-red-500 to-octagon-gold">
                  <TypewriterText text="ORACLE" delay={900} />
                </span>
                <motion.span 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 1.8, ease: "easeOut" }}
                  className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-octagon-red to-octagon-gold rounded-full"
                />
              </span>
            </h1>
          </motion.div>

          {/* Tagline with typewriter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 1.5 }}
            className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            <TypewriterText text="Your edge in the octagon starts here" delay={1800} />
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-4 mb-16"
          >
            <Link href="/register">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="h-14 px-8 bg-octagon-red hover:bg-red-600 text-white font-bold uppercase tracking-wider rounded-lg text-sm transition-all shadow-[0_0_30px_rgba(210,10,10,0.4)] hover:shadow-[0_0_50px_rgba(210,10,10,0.6)] flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Start Your Journey
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </Link>
            <Link href="/login">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" className="h-14 px-8 border-white/20 hover:bg-white/5 text-gray-300 font-bold uppercase tracking-wider rounded-lg text-sm transition-all">
                  Member Login
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-3 gap-8 md:gap-16"
          >
            {[
              { value: 4400, suffix: "+", label: "Fighters Analyzed" },
              { value: 750, suffix: "+", label: "UFC Events" },
              { value: 16000, suffix: "+", label: "Fight Stats" }
            ].map((stat, i) => (
              <motion.div key={i} variants={fadeInUp} className="text-center group">
                <motion.div 
                  className="text-2xl md:text-3xl font-display text-white mb-1"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={2.5} />
                </motion.div>
                <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider group-hover:text-octagon-red transition-colors">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2"
            >
              <motion.div className="w-1.5 h-1.5 bg-white rounded-full" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES SECTION */}
      <AnimatedSection className="py-24 bg-black relative" id="features">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-octagon-red/5 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <span className="text-octagon-red text-xs font-bold uppercase tracking-widest mb-4 block">Why Choose Us</span>
              <h2 className="text-4xl md:text-5xl font-display italic text-white mb-4">
                POWERFUL <span className="text-octagon-red">FEATURES</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Everything you need to elevate your MMA knowledge and training to the next level.
              </p>
            </motion.div>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <FeatureCard
              icon={<Brain className="w-8 h-8" />}
              title="AI Fight Predictions"
              desc="Get accurate predictions powered by machine learning algorithms analyzing thousands of fights."
              color="red"
            />
            <FeatureCard
              icon={<BarChart2 className="w-8 h-8" />}
              title="Fighter Comparison"
              desc="Compare any two fighters with detailed stat breakdowns and head-to-head analysis."
              color="gold"
            />
            <FeatureCard
              icon={<Video className="w-8 h-8" />}
              title="Form Correction"
              desc="Upload training videos and get AI-powered feedback on your technique."
              color="blue"
            />
            <FeatureCard
              icon={<Dumbbell className="w-8 h-8" />}
              title="Training Roadmaps"
              desc="Structured training programs from beginner to professional levels."
              color="green"
            />
            <FeatureCard
              icon={<MapPin className="w-8 h-8" />}
              title="Gym Finder"
              desc="Discover MMA, BJJ, and boxing gyms near you with ratings and reviews."
              color="purple"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Self-Defense Guide"
              desc="Learn practical self-defense techniques with video tutorials and scenarios."
              color="orange"
            />
          </motion.div>
        </div>
      </AnimatedSection>

      {/* HOW IT WORKS SECTION */}
      <AnimatedSection className="py-24 bg-neutral-900/30 border-y border-white/5 relative overflow-hidden" id="how-it-works">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-octagon-red/50 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <span className="text-octagon-gold text-xs font-bold uppercase tracking-widest mb-4 block">Get Started</span>
              <h2 className="text-4xl md:text-5xl font-display italic text-white mb-4">
                HOW IT <span className="text-octagon-gold">WORKS</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Three simple steps to unlock the power of AI-driven MMA analytics.
              </p>
            </motion.div>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                step: "01",
                title: "Create Account",
                desc: "Sign up as a Coach/Fighter or Fan and customize your profile.",
                icon: <Users className="w-6 h-6" />
              },
              {
                step: "02",
                title: "Explore Features",
                desc: "Access predictions, comparisons, training tools, and more.",
                icon: <Eye className="w-6 h-6" />
              },
              {
                step: "03",
                title: "Level Up",
                desc: "Train smarter, predict better, and dominate your competition.",
                icon: <Trophy className="w-6 h-6" />
              }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInUp} className="relative">
                <div className="p-8 rounded-2xl border border-white/10 bg-black/50 hover:bg-white/5 transition-all duration-300 group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-octagon-gold/10 flex items-center justify-center text-octagon-gold group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="text-5xl font-display text-white/10 group-hover:text-white/20 transition-colors">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-display uppercase text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ChevronRight className="w-8 h-8 text-white/10" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* SAMPLE ANALYSIS: CONOR VS KHABIB */}
      <AnimatedSection className="py-24 bg-black relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <span className="text-octagon-red text-xs font-bold uppercase tracking-widest mb-4 block">Live Demo</span>
              <h2 className="text-4xl md:text-5xl font-display italic text-white mb-4">
                LEGENDARY <span className="text-octagon-red">ANALYSIS</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                See how our AI breaks down historic matchups with incredible precision.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-center">
            {/* Fighter A: Conor */}
            <motion.div 
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-col items-center"
            >
              <div className="relative w-full max-w-[350px] h-[400px] mb-4 group">
                <div className="absolute inset-0 bg-octagon-gold/20 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  src="/images/conor.png"
                  alt="Conor McGregor"
                  className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(197,179,88,0.3)]"
                />
              </div>
              <h3 className="text-2xl md:text-3xl font-display text-white uppercase">Conor McGregor</h3>
              <p className="text-octagon-gold font-bold uppercase text-sm tracking-widest">&quot;The Notorious&quot;</p>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span>22-6-0</span>
                <span>•</span>
                <span>Striker</span>
              </div>
            </motion.div>

            {/* VS / Stats */}
            <motion.div 
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative"
            >
              <Card variant="glass" className="p-6 md:p-8 border-octagon-red/30 bg-black/80">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-octagon-red to-red-700 text-white px-6 py-2 rounded-full font-bold uppercase text-xs tracking-widest shadow-lg">
                  AI Prediction
                </div>

                <div className="space-y-6 mt-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 font-heading uppercase mb-3">Win Probability</div>
                    <div className="flex items-end justify-center gap-4">
                      <div className="text-center">
                        <span className="text-3xl md:text-4xl font-display text-gray-400">35%</span>
                        <p className="text-[10px] text-gray-600 uppercase mt-1">McGregor</p>
                      </div>
                      <span className="text-2xl font-display text-white/30 pb-1">VS</span>
                      <div className="text-center">
                        <span className="text-4xl md:text-5xl font-display text-octagon-red">65%</span>
                        <p className="text-[10px] text-gray-600 uppercase mt-1">Khabib</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <StatBar label="Striking Accuracy" valueA={45} valueB={60} />
                    <StatBar label="Grappling Control" valueA={20} valueB={90} />
                    <StatBar label="Cardio / Pace" valueA={40} valueB={85} />
                  </div>

                  <div className="pt-4 border-t border-white/10 text-center">
                    <p className="text-gray-300 text-sm italic leading-relaxed">
                      &quot;Khabib&apos;s relentless pressure and elite grappling neutralize McGregor&apos;s power striking.&quot;
                    </p>
                    <p className="text-octagon-red text-xs font-bold mt-2">— Octagon Oracle AI</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Fighter B: Khabib */}
            <motion.div 
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-col items-center"
            >
              <div className="relative w-full max-w-[350px] h-[400px] mb-4 group">
                <div className="absolute inset-0 bg-octagon-red/20 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  src="/images/khabib.png"
                  alt="Khabib Nurmagomedov"
                  className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(210,10,10,0.3)]"
                />
              </div>
              <h3 className="text-2xl md:text-3xl font-display text-white uppercase">Khabib Nurmagomedov</h3>
              <p className="text-octagon-red font-bold uppercase text-sm tracking-widest">&quot;The Eagle&quot;</p>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span>29-0-0</span>
                <span>•</span>
                <span>Grappler</span>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* TOP CONTENDERS SPOTLIGHT */}
      <AnimatedSection className="py-24 bg-neutral-900/20 border-y border-white/5" id="fighters">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <span className="text-octagon-gold text-xs font-bold uppercase tracking-widest mb-4 block">Featured</span>
              <h2 className="text-4xl md:text-5xl font-display italic text-white mb-2">
                TOP <span className="text-white">CONTENDERS</span>
              </h2>
              <p className="text-gray-400">Rising stars and champions dominating the octagon.</p>
            </motion.div>
            <Link href="/register" className="group">
              <motion.div 
                whileHover={{ x: 5 }}
                className="flex items-center gap-2 text-octagon-red text-sm font-bold uppercase tracking-wider"
              >
                View All Fighters
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.div>
            </Link>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {TOP_CONTENDERS.map((fighter, index) => (
              <motion.div 
                key={fighter.id} 
                variants={fadeInUp}
                className="group relative h-[420px] rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/50 cursor-pointer"
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
                <img
                  src={fighter.image}
                  alt={fighter.name}
                  className="absolute inset-0 w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                />

                <div className="absolute top-4 right-4 z-20">
                  <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10">
                    <span className="text-xs font-bold text-white">#{index + 1}</span>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="inline-block px-3 py-1 bg-octagon-red text-white text-[10px] font-bold uppercase tracking-wider mb-3 rounded"
                  >
                    {fighter.status}
                  </motion.div>
                  <h3 className="text-xl md:text-2xl font-display text-white uppercase leading-none mb-1">{fighter.name}</h3>
                  <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">{fighter.nickname}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* TESTIMONIALS / SOCIAL PROOF */}
      <AnimatedSection className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <span className="text-octagon-red text-xs font-bold uppercase tracking-widest mb-4 block">Trusted By</span>
              <h2 className="text-4xl md:text-5xl font-display italic text-white mb-4">
                WHAT USERS <span className="text-octagon-red">SAY</span>
              </h2>
            </motion.div>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                quote: "The AI predictions are surprisingly accurate. Helped me win my fantasy league!",
                author: "Mike T.",
                role: "MMA Fan",
                rating: 5
              },
              {
                quote: "As a coach, the fighter comparison tool is invaluable for game planning.",
                author: "Coach Rahman",
                role: "BJJ Black Belt",
                rating: 5
              },
              {
                quote: "Finally found a great gym nearby thanks to Octagon Oracle's gym finder.",
                author: "Sarah K.",
                role: "Amateur Fighter",
                rating: 5
              }
            ].map((testimonial, i) => (
              <motion.div 
                key={i} 
                variants={fadeInUp}
                className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-octagon-gold text-octagon-gold" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4 italic">&quot;{testimonial.quote}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-octagon-red/20 flex items-center justify-center">
                    <span className="text-octagon-red font-bold text-sm">{testimonial.author[0]}</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{testimonial.author}</p>
                    <p className="text-gray-500 text-xs">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* CTA SECTION */}
      <AnimatedSection className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-octagon-red/20 via-black to-octagon-gold/20" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=2070')] bg-cover bg-center opacity-10" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-4xl md:text-6xl font-display italic text-white mb-6">
              READY TO <span className="text-octagon-red">DOMINATE?</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of fighters, coaches, and fans using Octagon Oracle to gain the competitive edge.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="h-14 px-10 bg-octagon-red hover:bg-red-600 text-white font-bold uppercase tracking-wider rounded-lg text-sm shadow-[0_0_30px_rgba(210,10,10,0.4)]">
                    Create Free Account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              </Link>
              <Link href="/login">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="h-14 px-10 border-white/20 text-white font-bold uppercase tracking-wider rounded-lg text-sm">
                    Sign In
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>
    </div>
  );
}

// Feature Card Component with hover animations
function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  const colorClasses: Record<string, string> = {
    red: "bg-octagon-red/10 text-octagon-red group-hover:bg-octagon-red group-hover:text-white",
    gold: "bg-octagon-gold/10 text-octagon-gold group-hover:bg-octagon-gold group-hover:text-black",
    blue: "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white",
    green: "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white",
    purple: "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white",
    orange: "bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white",
  };

  return (
    <motion.div 
      variants={fadeInUp}
      whileHover={{ y: -5, scale: 1.02 }}
      className="group p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer"
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="text-lg font-display uppercase text-white mb-2 group-hover:text-octagon-red transition-colors">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}

// Stat Bar Component
function StatBar({ label, valueA, valueB }: { label: string; valueA: number; valueB: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs uppercase font-bold text-gray-500 mb-2">
        <span className="text-gray-400">{valueA}%</span>
        <span className="text-gray-600">{label}</span>
        <span className="text-octagon-red">{valueB}%</span>
      </div>
      <div className="flex h-2 bg-gray-800/50 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          whileInView={{ width: `${valueA}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-gray-500 to-gray-400 h-full rounded-l-full" 
        />
        <div className="flex-grow bg-gray-800/30" />
        <motion.div 
          initial={{ width: 0 }}
          whileInView={{ width: `${valueB}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-red-600 to-octagon-red h-full rounded-r-full" 
        />
      </div>
    </div>
  );
}
