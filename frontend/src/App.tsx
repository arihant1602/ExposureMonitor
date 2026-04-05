import { useState, useEffect, useMemo } from 'react';
import { Check, Loader2, ArrowLeft, Database, Flame, BarChart3, KeyRound, CalendarDays, Search, ShieldAlert, ShieldCheck, Globe, TrendingUp, ArrowRight, FileImage, FileText } from 'lucide-react';
import { checkExposure, checkDomain, checkPassword, getBreaches, getBreachSamples, getStats, type CheckExposureResponse, type DomainCheckResponse, type Breach, type GlobalStats } from './services/api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type NoticeLevel = 'info' | 'success' | 'warning' | 'error';
type AppNotice = {
  id: number;
  message: string;
  level: NoticeLevel;
};

const emitInAppNotice = (message: string, level: NoticeLevel = 'info') => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('exposure:notice', { detail: { message, level } }));
};

const GlobalAtmosphereBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <iframe
      src="https://app.spline.design/file/7dd82dc9-4060-4afb-b232-a420e061e8e5?view=preview"
      className="h-full w-full border-0 opacity-55 scale-[2.2] origin-center transform-gpu will-change-transform"
      title="Global Spline Background"
    />
    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,8,20,0.1),rgba(0,8,20,0.18))]" />
    <div className="absolute inset-0 backdrop-blur-[2px]" />
    <div className="absolute inset-0 overflow-hidden">
      <div className="mist-layer mist-one" />
      <div className="mist-layer mist-two" />
      <div className="mist-layer mist-three" />
      <div className="particle-field">
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={`particle-${i}`}
            className="flow-particle"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              width: `${2 + (i % 4)}px`,
              height: `${2 + (i % 4)}px`,
              opacity: 0.18 + ((i % 5) * 0.08),
              animationDuration: `${10 + ((i % 7) * 2)}s`,
              animationDelay: `${(i % 9) * -1.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

const PageShell = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("relative z-10 route-enter", className)}>{children}</div>
);

const FullPageLoader = ({ title, subtitle }: { title: string, subtitle: string }) => (
  <PageShell className="w-full min-h-screen flex items-center justify-center px-6">
    <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[rgba(255,255,255,0.04)] backdrop-blur-md p-10 text-center">
      <div className="loader-orb mx-auto mb-6" />
      <h3 className="text-2xl text-white font-medium mb-3">{title}</h3>
      <p className="text-white/65 font-light mb-6">{subtitle}</p>
      <div className="loader-bars mx-auto">
        <span />
        <span />
        <span />
      </div>
    </div>
  </PageShell>
);

// Circular Progress Component
const CircularProgress = ({ score, status }: { score: number, status: string }) => {
  const radius = 85;
  const stroke = 15;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = 'rgba(255,255,255,0.1)'; // gray empty
  let textClass = 'text-white';
  if (score > 0) {
    if (score < 40) { color = '#10b981'; textClass = 'text-[#10b981]'; }
    else if (score < 70) { color = '#f59e0b'; textClass = 'text-[#f59e0b]'; }
    else { color = '#ef4444'; textClass = 'text-[#ef4444]'; }
  }

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="relative flex items-center justify-center">
        {/* Background Circle */}
        <svg height={radius * 2} width={radius * 2} className="opacity-40">
          <circle
            stroke="rgba(255,255,255,0.1)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        {/* Progress Circle */}
        <svg
          height={radius * 2}
          width={radius * 2}
          className="absolute top-0 left-0 progress-ring__circle"
        >
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        {/* Score Text */}
        <span className={cn("absolute text-6xl font-light", textClass)}>
          {score}
        </span>
      </div>
      <span className="mt-10 text-base text-[rgba(255,255,255,0.6)] tracking-wide font-light text-center">
        {status}
      </span>
    </div>
  );
};

// Card Component
const Card = ({ title, children, className, action }: { title: string, children: React.ReactNode, className?: string, action?: React.ReactNode }) => (
  <div className={cn("bg-gradient-to-br from-[rgba(0,255,210,0.08)] to-[#0C0F29] border border-[rgba(255,255,255,0.1)] rounded-[1.5rem] p-6 shadow-2xl backdrop-blur-sm", className)}>
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xs font-semibold tracking-wider text-[rgba(255,255,255,0.6)] uppercase text-center w-full">{title}</h3>
      {action && <div className="text-xs font-medium tracking-wider text-[rgba(255,255,255,0.6)] uppercase">{action}</div>}
    </div>
    {children}
  </div>
);

// Inner nested card row (like in EXPOSURE SUMMARY)
const InnerRow = ({ value, label, valueColor = "text-white" }: { value: string | number, label: string, valueColor?: string }) => (
  <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 flex flex-col justify-center items-center text-center">
    <div className={cn("text-2xl font-light mb-1", valueColor)}>{value}</div>
    <div className="text-[10px] text-[rgba(255,255,255,0.6)] tracking-wider uppercase">{label}</div>
  </div>
);

function HomePage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'email' | 'domain' | 'password'>('email');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
        setError(`Please enter a valid ${searchType}.`);
        return;
    }
    setError('');
    
    if (searchType === 'email') navigate('/dashboard', { state: { email: query } });
    else if (searchType === 'domain') navigate('/domain', { state: { domain: query } });
    else if (searchType === 'password') navigate('/password', { state: { password: query } });
  };

  return (
    <PageShell className="w-full flex flex-col justify-center items-center px-6 sm:px-12 py-16 min-h-screen text-center">
      {/* Top Navigation / Explorer Link */}
      <div className="absolute top-8 right-8 z-20">
        <button 
            onClick={() => navigate('/explorer')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white/70 hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-all text-sm font-medium"
        >
            <Database className="h-4 w-4" />
            Database Explorer
        </button>
      </div>

      <div className="max-w-2xl w-full mx-auto flex flex-col items-center text-center relative z-10">
        <p className="text-xs font-semibold tracking-wider text-[rgba(255,255,255,0.6)] mb-6 uppercase">
          Cyber Threat Intelligence Prototype
        </p>
        
        <h1 className="text-[clamp(1.75rem,4.6vw,3.5rem)] font-semibold tracking-tight text-white mb-6 leading-none whitespace-nowrap">
          Dark Web Exposure Monitor
        </h1>
        
        <p className="text-xl text-[rgba(255,255,255,0.8)] mb-12 max-w-xl leading-relaxed font-light mx-auto">
          Check if your credentials are compromised across simulated leak intelligence feeds.
        </p>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-4 mb-8 justify-center">
          {(['email', 'domain', 'password'] as const).map(type => (
            <button
              key={type}
              onClick={() => { setSearchType(type); setError(''); setQuery(''); }}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center gap-2", 
                searchType === type 
                  ? "bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.2)] text-white shadow-lg" 
                  : "bg-transparent border-transparent text-[rgba(255,255,255,0.6)] hover:text-white"
              )}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} Search
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mb-4 w-full">
          <div className="relative flex flex-col sm:flex-row items-center w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] sm:rounded-full rounded-2xl p-1.5 shadow-inner">
            <input
              type={searchType === 'password' ? 'password' : 'text'}
              className="w-full bg-transparent text-white placeholder-[rgba(255,255,255,0.4)] px-6 py-4 outline-none border-none text-lg rounded-t-2xl sm:rounded-full font-light text-center"
              placeholder={`Enter your ${searchType}`}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setError(''); }}
            />
            <button
              type="submit"
              className="w-full sm:w-auto sm:absolute sm:right-1.5 mt-2 sm:mt-0 px-8 py-3.5 rounded-xl sm:rounded-[2rem] text-white font-medium bg-gradient-to-r from-[#00A1A1] to-[#3038D1] hover:brightness-110 transition-all duration-300 shadow-md flex items-center justify-center whitespace-nowrap"
            >
              Scan for Exposure
            </button>
          </div>
        </form>
        
        {/* Custom Error Message */}
        {error && <p className="text-[#ef4444] text-sm mb-8 font-medium text-center">{error}</p>}
        {!error && <div className="mb-12"></div>}

        <div className="bg-gradient-to-br from-[rgba(0,255,210,0.08)] to-[#0C0F29] border border-[rgba(255,255,255,0.1)] rounded-3xl p-8 w-full max-w-md mx-auto shadow-2xl backdrop-blur-sm">
          <ul className="space-y-6">
            {[
              'Connected to breach database',
              'Monitoring 500K+ leaked records',
              'Real-time threat analysis active'
            ].map((text, i) => (
              <li key={i} className="flex items-center text-white text-[15px] sm:text-[17px] font-light justify-center">
                <Check className="h-6 w-6 text-[#00ff66] mr-4 flex-shrink-0" />
                <span className="tracking-wide">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageShell>
  );
}

function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email as string | undefined;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<CheckExposureResponse | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/');
      return;
    }

    let isMounted = true;
    setLoading(true);
    setHasScanned(true);

    checkExposure(email)
      .then((data) => {
        if (isMounted) {
          setResult(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        emitInAppNotice('Could not fetch exposure data. Showing fallback results.', 'warning');
        if (isMounted) {
          setResult({
            email,
            is_exposed: false,
            breaches: [],
            risk_score: 0,
            recommendations: []
          });
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [email, navigate]);

  const getPasswordStatus = () => {
    if (!hasScanned) return 'Safe';
    if (loading) return 'Scanning...';
    if (!result?.is_exposed) return 'Safe';
    const hasPasswordLeak = result.breaches.some(b => b.compromised_data.includes('Password'));
    return hasPasswordLeak ? 'Compromised' : 'Safe';
  };

  const getPasswordStatusColor = () => {
    const status = getPasswordStatus();
    if (status === 'Compromised') return 'text-[#ef4444]';
    if (status === 'Safe') return 'text-[#10b981]';
    return 'text-white';
  };

  const getRiskScore = () => {
    if (!hasScanned || loading) return 0;
    return result?.risk_score || 0;
  };

  const getStatusText = () => {
    if (!hasScanned) return 'Awaiting scan';
    if (loading) return 'Scanning...';
    return result?.is_exposed ? 'High Risk' : 'Low Risk';
  };

  // Compile unique mitigations
  const getMitigations = () => {
    if (!hasScanned) return ['Automated guidance appears after a scan.'];
    if (loading) return ['Loading recommendations...'];
    if (!result?.is_exposed || result.breaches.length === 0) return ['Maintain good security hygiene. Enable 2FA where possible.'];
    
    if (result.recommendations && result.recommendations.length > 0) {
      return result.recommendations;
    }

    const allData = new Set<string>();
    result.breaches.forEach(b => b.compromised_data.forEach(d => allData.add(d)));
    
    const recs: string[] = [];
    if (allData.has('Password')) recs.push('Change your passwords immediately and use a password manager.');
    if (allData.has('SSN')) recs.push('Place a fraud alert or freeze on your credit reports.');
    if (allData.has('Phone Numbers')) recs.push('Be cautious of SIM swapping or SMS phishing attacks.');
    
    if (recs.length === 0) recs.push('Monitor your accounts for suspicious activity.');
    return recs;
  };

  const attackPath = useMemo(() => {
    const breaches = result?.breaches || [];
    const hasPassword = breaches.some((b) => b.compromised_data.includes('Password'));
    const hasIdentityData = breaches.some((b) => b.compromised_data.some((d) => ['SSN', 'DOB', 'Phone Numbers', 'Names'].includes(d)));
    const base = result?.risk_score || 0;

    const credentialStuffing = Math.min(98, Math.round(base * (hasPassword ? 0.95 : 0.45) + breaches.length * 4));
    const accountTakeover = Math.min(98, Math.round(credentialStuffing * (hasPassword ? 0.78 : 0.42)));
    const identityFraud = Math.min(98, Math.round(base * (hasIdentityData ? 0.88 : 0.35)));
    const businessImpact = Math.min(98, Math.round((accountTakeover * 0.55) + (identityFraud * 0.45)));

    return [
      {
        id: 'entry',
        title: 'Initial Compromise',
        subtitle: `${breaches.length} known breach matches`,
        score: Math.min(98, Math.max(5, Math.round(base * 0.9))),
        color: 'from-[#22d3ee] to-[#3b82f6]'
      },
      {
        id: 'stuffing',
        title: 'Credential Stuffing',
        subtitle: hasPassword ? 'Leaked password material present' : 'Password leak signal is limited',
        score: credentialStuffing,
        color: 'from-[#60a5fa] to-[#a78bfa]'
      },
      {
        id: 'takeover',
        title: 'Account Takeover',
        subtitle: hasPassword ? 'Elevated ATO probability' : 'Medium ATO probability',
        score: accountTakeover,
        color: 'from-[#f59e0b] to-[#f97316]'
      },
      {
        id: 'impact',
        title: 'Business / Identity Impact',
        subtitle: hasIdentityData ? 'Identity fields increase downstream risk' : 'Lower identity abuse potential',
        score: businessImpact,
        color: 'from-[#ef4444] to-[#f43f5e]'
      }
    ];
  }, [result]);

  const reportSummary = useMemo(() => {
    const breaches = result?.breaches || [];
    const topBreach = breaches[0]?.name || 'No match';
    const compromisedSet = new Set<string>();
    breaches.forEach((b) => b.compromised_data.forEach((d) => compromisedSet.add(d)));
    return {
      email: result?.email || email || 'unknown',
      riskScore: result?.risk_score || 0,
      breachCount: breaches.length,
      topBreach,
      compromisedData: Array.from(compromisedSet),
      generatedAt: new Date().toISOString(),
      recommendations: getMitigations(),
      attackPath: attackPath.map((step) => ({ title: step.title, score: step.score, subtitle: step.subtitle }))
    };
  }, [result, email, attackPath]);

  const buildExecutiveReportCanvas = () => {
    const width = 1400;
    const height = 1900;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#020817');
    gradient.addColorStop(0.4, '#0b1538');
    gradient.addColorStop(1, '#1f2f74');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(80, 80, width - 160, height - 160);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 54px Inter, system-ui, sans-serif';
    ctx.fillText('Executive Exposure Report', 130, 190);

    ctx.font = '400 30px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText(`Target: ${reportSummary.email}`, 130, 250);
    ctx.fillText(`Generated: ${new Date(reportSummary.generatedAt).toLocaleString()}`, 130, 295);

    const statCard = (x: number, y: number, label: string, value: string, color: string) => {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, y, 360, 170);
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.font = '600 22px Inter, system-ui, sans-serif';
      ctx.fillText(label.toUpperCase(), x + 24, y + 48);
      ctx.fillStyle = color;
      ctx.font = '700 52px Inter, system-ui, sans-serif';
      ctx.fillText(value, x + 24, y + 122);
    };

    statCard(130, 360, 'Risk Score', `${reportSummary.riskScore}/100`, '#fca5a5');
    statCard(520, 360, 'Breaches', String(reportSummary.breachCount), '#93c5fd');
    statCard(910, 360, 'Top Breach', reportSummary.topBreach.slice(0, 12), '#67e8f9');

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px Inter, system-ui, sans-serif';
    ctx.fillText('Attack Path Simulator', 130, 620);

    reportSummary.attackPath.forEach((step, index) => {
      const y = 680 + (index * 150);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(130, y, 1140, 108);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 28px Inter, system-ui, sans-serif';
      ctx.fillText(step.title, 160, y + 42);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '400 22px Inter, system-ui, sans-serif';
      ctx.fillText(step.subtitle.slice(0, 80), 160, y + 78);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(760, y + 30, 470, 20);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(760, y + 30, (470 * step.score) / 100, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 24px Inter, system-ui, sans-serif';
      ctx.fillText(`${step.score}%`, 1180, y + 82);
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px Inter, system-ui, sans-serif';
    ctx.fillText('Immediate Recommended Actions', 130, 1360);
    ctx.font = '400 24px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    reportSummary.recommendations.slice(0, 6).forEach((rec, idx) => {
      ctx.fillText(`• ${rec}`, 150, 1420 + (idx * 52));
    });

    return canvas;
  };

  const downloadExecutiveReportPng = () => {
    try {
      const canvas = buildExecutiveReportCanvas();
      if (!canvas) throw new Error('Canvas creation failed');
      const fileName = `executive-report-${reportSummary.email.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      emitInAppNotice('Executive report exported as PNG.', 'success');
    } catch (err) {
      console.error(err);
      emitInAppNotice('Could not generate executive report export.', 'error');
    }
  };

  const exportExecutiveReportPdf = () => {
    try {
      const canvas = buildExecutiveReportCanvas();
      if (!canvas) throw new Error('Canvas creation failed');

      const dataUrl = canvas.toDataURL('image/png');
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const html = `
        <html>
          <head>
            <title>Executive Report</title>
            <style>
              html, body { margin: 0; padding: 0; background: #0b1020; }
              img { width: 100%; max-width: 1200px; display: block; margin: 0 auto; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="Executive Report" />
          </body>
        </html>
      `;

      const onLoad = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          emitInAppNotice('Print dialog opened. Choose "Save as PDF" to export.', 'info');
        } finally {
          window.setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1200);
        }
      };

      iframe.onload = onLoad;
      const doc = iframe.contentWindow?.document;
      if (!doc) throw new Error('Print frame unavailable');
      doc.open();
      doc.write(html);
      doc.close();
    } catch (err) {
      console.error(err);
      emitInAppNotice('Could not prepare PDF export flow.', 'error');
    }
  };

  if (loading) {
    return (
      <FullPageLoader
        title="Scanning Exposure Records"
        subtitle="Correlating breach feeds and generating your risk profile."
      />
    );
  }

  return (
    <PageShell className="w-full flex flex-col justify-center items-center px-6 py-12 lg:py-16 min-h-screen text-center">
      <div className="max-w-[1000px] w-full mx-auto flex flex-col items-center">
        <button 
          onClick={() => navigate('/')}
          className="mb-8 flex items-center text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm uppercase tracking-widest font-semibold"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> New Scan
        </button>

        <p className="text-xs font-semibold tracking-wider text-[rgba(255,255,255,0.6)] mb-12 uppercase text-center">
          Automated mitigation guidance and breach-risk scoring included
        </p>

        <div className="mb-8 w-full flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={downloadExecutiveReportPng}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#06b6d4] text-white font-semibold tracking-wide flex items-center justify-center gap-2 shadow-lg hover:brightness-110 transition-all"
          >
            <FileImage className="h-4 w-4" />
            Export Executive Report (PNG)
          </button>
          <button
            onClick={exportExecutiveReportPdf}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white font-semibold tracking-wide flex items-center justify-center gap-2 shadow-lg hover:brightness-110 transition-all"
          >
            <FileText className="h-4 w-4" />
            Export Executive Report (PDF)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 w-full">
          {/* Risk Score Card */}
          <Card title="Risk Score">
            <CircularProgress score={getRiskScore()} status={getStatusText()} />
          </Card>

          {/* Exposure Summary Card */}
          <Card title="Exposure Summary">
            <div className="flex flex-col gap-3">
              <InnerRow 
                value={loading ? '-' : (result?.breaches?.length || 0)} 
                label="Breaches Found" 
                valueColor={result?.is_exposed ? 'text-[#ef4444]' : 'text-white'}
              />
              <InnerRow 
                value={getPasswordStatus()} 
                label="Password Status" 
                valueColor={getPasswordStatusColor()}
              />
              <InnerRow 
                value={!hasScanned ? 'Not yet' : (loading ? 'Scanning...' : 'Just now')} 
                label="Last Scan" 
              />
            </div>
          </Card>
        </div>

        <Card title="Attack Path Simulator" className="mb-10 w-full text-left">
          <p className="text-sm text-white/70 mb-4">
            Simulated adversary progression based on observed breach signals and compromised data categories.
          </p>
          <div className="space-y-4">
            {attackPath.map((step, idx) => (
              <div key={step.id} className="relative rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
                {idx < attackPath.length - 1 && (
                  <div className="absolute left-6 -bottom-4 text-white/40">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="text-white font-medium text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[#93c5fd]" />
                      {step.title}
                    </p>
                    <p className="text-xs text-white/60 mt-1">{step.subtitle}</p>
                  </div>
                  <span className="text-sm font-semibold text-white">{step.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full bg-gradient-to-r', step.color)}
                    style={{ width: `${step.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Threat Findings Card */}
        <Card title="Threat Findings" action={hasScanned && result?.is_exposed ? `${result.breaches.length} TARGETS` : 'NO TARGET'} className="mb-10 w-full text-center">
          <h4 className="text-xl font-normal text-white mb-3 text-center">
            Matched breach records
          </h4>
          
          {!hasScanned ? (
             <p className="text-[15px] text-[rgba(255,255,255,0.6)] leading-relaxed font-light text-center">
              Run a scan to populate breach exposure records and intelligence tags.
             </p>
          ) : result?.is_exposed && result.breaches.length > 0 ? (
             <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar text-center">
               {result.breaches.map((breach, idx) => (
                 <div key={idx} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                   <div>
                     <span className="text-white font-medium text-lg block mb-1">{breach.name}</span>
                     <div className="flex flex-wrap gap-2">
                       {breach.compromised_data.map((d, i) => (
                         <span key={i} className="text-[11px] px-2 py-0.5 bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.8)] rounded-sm uppercase tracking-wider">{d}</span>
                       ))}
                     </div>
                   </div>
                   <span className="text-[10px] px-3 py-1 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 rounded-full uppercase tracking-widest font-semibold whitespace-nowrap self-start sm:self-auto">Exposed</span>
                 </div>
               ))}
             </div>
          ) : (
             <p className="text-[15px] text-[#10b981] leading-relaxed font-light text-center">
               No compromised records found for this email address.
             </p>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Mitigation Card */}
          <Card title="Mitigation" className="h-full text-center">
            <h4 className="text-lg font-normal text-white mb-3 text-center">
              Recommended next actions
            </h4>
            <div className="text-[15px] text-[rgba(255,255,255,0.6)] leading-relaxed font-light space-y-2 text-center">
              {getMitigations().map((m, i) => <p key={i}>• {m}</p>)}
            </div>
          </Card>

          {/* Threat Intel Card */}
          <Card title="Threat Intel" className="h-full text-center">
            <h4 className="text-lg font-normal text-white mb-3 text-center">
              Risk breakdown
            </h4>
            <p className="text-[15px] text-[rgba(255,255,255,0.6)] leading-relaxed font-light text-center">
              {!hasScanned ? 'Severity reasons and credential risk signals will appear here.' :
               result?.is_exposed ? `High risk score (${result.risk_score}) derived from ${result.breaches.length} historical leaks.` :
               'No significant risk signals detected in current dataset.'}
            </p>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function DomainDashboardPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const domain = location.state?.domain as string | undefined;

    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<DomainCheckResponse | null>(null);

    useEffect(() => {
        if (!domain) {
            navigate('/');
            return;
        }

        let isMounted = true;
        setLoading(true);

        checkDomain(domain)
            .then((data) => {
                if (isMounted) {
                    setResult(data);
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.error(err);
                emitInAppNotice('Could not fetch domain intelligence. Showing fallback results.', 'warning');
                if (isMounted) {
                    setResult({
                        domain,
                        exposed_emails: []
                    });
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [domain, navigate]);

    const exposedCount = result?.exposed_emails.length || 0;
    const breachCountByName = useMemo(() => {
        const map = new Map<string, number>();
        (result?.exposed_emails || []).forEach((record) => {
            record.breaches.forEach((breachName) => {
                map.set(breachName, (map.get(breachName) || 0) + 1);
            });
        });
        return Array.from(map.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [result]);

    const uniqueBreachTypes = breachCountByName.length;
    const avgBreachesPerExposedAccount = exposedCount > 0
        ? (breachCountByName.reduce((acc, row) => acc + row.count, 0) / exposedCount)
        : 0;

    const domainRiskScore = exposedCount === 0
        ? 92
        : Math.max(5, Math.round(100 - (Math.log10(exposedCount + 1) * 22 + exposedCount * 1.8)));

    const domainRisk = domainRiskScore >= 80
        ? {
            label: 'Low Observed Risk',
            color: 'text-[#10b981]',
            bar: 'from-[#10b981] to-[#34d399]',
            icon: <ShieldCheck className="h-4 w-4" />
        }
        : domainRiskScore >= 60
            ? {
                label: 'Moderate Risk',
                color: 'text-[#f59e0b]',
                bar: 'from-[#f59e0b] to-[#f97316]',
                icon: <ShieldAlert className="h-4 w-4" />
            }
            : {
                label: 'High Risk',
                color: 'text-[#ef4444]',
                bar: 'from-[#ef4444] to-[#f43f5e]',
                icon: <ShieldAlert className="h-4 w-4" />
            };

    if (loading) {
        return (
            <FullPageLoader
                title="Analyzing Domain Exposure"
                subtitle="Aggregating breach density and preparing privacy-safe domain intelligence."
            />
        );
    }

    return (
        <PageShell className="w-full flex flex-col justify-center items-center px-6 py-12 lg:py-16 min-h-screen text-center">
          <div className="max-w-[1000px] w-full mx-auto flex flex-col items-center">
            <button onClick={() => navigate('/')} className="mb-8 flex items-center text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm uppercase tracking-widest font-semibold">
              <ArrowLeft className="h-4 w-4 mr-2" /> New Scan
            </button>
            <Card title="Domain Intelligence" className="w-full">
                <h4 className="text-xl font-normal text-white mb-6 text-center">Target Domain Analysed: {domain}</h4>
                    <div className="flex flex-col items-center">
                        <div className="mb-8 w-full">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <InnerRow value={exposedCount} label="Exposed Accounts (Aggregated)" valueColor={exposedCount > 0 ? "text-[#ef4444]" : "text-[#10b981]"} />
                                <InnerRow value={uniqueBreachTypes} label="Unique Breach Types" />
                                <InnerRow value={avgBreachesPerExposedAccount.toFixed(1)} label="Avg Breaches / Exposed Account" />
                            </div>
                        </div>

                        <div className="w-full max-w-2xl mb-6 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4 text-left">
                            <div className={cn('mb-2 flex items-center gap-2 text-sm font-semibold', domainRisk.color)}>
                                {domainRisk.icon}
                                {domainRisk.label}
                            </div>
                            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                                <div className={cn('h-full rounded-full bg-gradient-to-r', domainRisk.bar)} style={{ width: `${domainRiskScore}%` }} />
                            </div>
                            <p className="text-xs text-white/55">
                                Domain safety score: <span className="text-white/85">{domainRiskScore}/100</span>
                            </p>
                            <p className="text-xs text-white/50 mt-2">
                                Privacy mode enabled: individual email addresses are intentionally hidden.
                            </p>
                        </div>

                        {exposedCount > 0 ? (
                            <div className="w-full max-w-2xl space-y-3">
                                <p className="text-xs text-white/50 uppercase tracking-widest text-left">Breach Type Distribution</p>
                                {breachCountByName.slice(0, 8).map((row) => (
                                    <div key={row.name}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm text-white/80">{row.name}</span>
                                            <span className="text-xs text-white/60">{row.count}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-[#22d3ee] to-[#3b82f6]"
                                                style={{ width: `${(row.count / Math.max(breachCountByName[0]?.count || 1, 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[15px] text-[#10b981] leading-relaxed font-light text-center">No breached accounts detected for this domain.</p>
                        )}
                    </div>
            </Card>
          </div>
        </PageShell>
    );
}

function PasswordDashboardPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const password = location.state?.password as string | undefined;

    const [loading, setLoading] = useState(true);
    const [exposedCount, setExposedCount] = useState<number | null>(null);

    useEffect(() => {
        if (!password) {
            navigate('/');
            return;
        }

        let isMounted = true;
        setLoading(true);

        const checkHash = async () => {
            try {
                // Compute SHA-1 locally (k-Anonymity)
                const msgUint8 = new TextEncoder().encode(password);
                const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
                
                const prefix = hashHex.slice(0, 5);
                const suffix = hashHex.slice(5);

                const data = await checkPassword(prefix);
                
                let matches = 0;
                if (data && data.suffixes) {
                    const match = data.suffixes.find((s: any) => s.suffix === suffix);
                    if (match) matches = match.count;
                }

                if (isMounted) {
                    setExposedCount(matches);
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                emitInAppNotice('Password intelligence request failed. Showing fallback result.', 'warning');
                if (isMounted) {
                    setExposedCount(0);
                    setLoading(false);
                }
            }
        };

        checkHash();

        return () => {
            isMounted = false;
        };
    }, [password, navigate]);

    if (loading) {
        return (
            <FullPageLoader
                title="Querying Password Intelligence"
                subtitle="Hash prefix lookup in progress using privacy-preserving k-anonymity."
            />
        );
    }

    return (
        <PageShell className="w-full flex flex-col justify-center items-center px-6 py-12 lg:py-16 min-h-screen text-center">
          <div className="max-w-[1000px] w-full mx-auto flex flex-col items-center">
            <button onClick={() => navigate('/')} className="mb-8 flex items-center text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm uppercase tracking-widest font-semibold">
              <ArrowLeft className="h-4 w-4 mr-2" /> New Scan
            </button>
            <Card title="Password Intelligence" className="w-full text-center">
                <h4 className="text-xl font-normal text-white mb-6 text-center">Hash Analyzed (k-Anonymity)</h4>
                <div className="flex flex-col items-center">
                    <div className="mb-10 w-full max-w-md mx-auto">
                       <InnerRow value={exposedCount || 0} label="Times Exposed in Data Breaches" valueColor={exposedCount && exposedCount > 0 ? "text-[#ef4444]" : "text-[#10b981]"} />
                    </div>
                    {exposedCount && exposedCount > 0 ? (
                        <div className="p-6 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-xl w-full max-w-2xl text-center">
                            <p className="text-[#ef4444] font-medium text-lg mb-2">Warning: This password has been exposed in data breaches!</p>
                            <p className="text-[15px] text-[rgba(255,255,255,0.7)] font-light leading-relaxed">It has been seen {exposedCount.toLocaleString()} times. You should absolutely not use this password, as hackers use lists of compromised passwords in brute-force attacks.</p>
                        </div>
                    ) : (
                        <div className="p-6 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] rounded-xl w-full max-w-2xl text-center">
                            <p className="text-[#10b981] font-medium text-lg mb-2">Good News: This password was not found in our database.</p>
                            <p className="text-[15px] text-[rgba(255,255,255,0.7)] font-light leading-relaxed">While it hasn't been exposed in known breaches, you should still ensure it's long, complex, and unique for every account.</p>
                        </div>
                    )}
                </div>
            </Card>
          </div>
        </PageShell>
    );
}

function ExplorerDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [breaches, setBreaches] = useState<Breach[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [expandedBreach, setExpandedBreach] = useState<number | null>(null);
  const [samples, setSamples] = useState<Record<number, string[]>>({});
  const [samplesLoading, setSamplesLoading] = useState<number | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(true);
  const [passwordIntel, setPasswordIntel] = useState<Array<{ password: string, count: number }>>([]);
  const [domainQuery, setDomainQuery] = useState('');
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainResult, setDomainResult] = useState<DomainCheckResponse | null>(null);

  const commonPasswords = useMemo(
    () => [
      'password123', 'qwerty', 'admin', '123456', 'iloveyou', 'password', '12345678', '123456789',
      'letmein', 'sunshine', 'monkey', 'dragon', 'football', 'baseball', 'superman', 'welcome',
      'master', 'hunter2', 'ashley', 'mustang', 'shadow', 'princess', '123123', 'qazwsx'
    ],
    []
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [breachData, statsData] = await Promise.all([getBreaches(), getStats()]);
        setBreaches(breachData);
        setStats(statsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const sha1Hex = async (text: string) => {
      const msgUint8 = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    };

    const fetchPasswordIntel = async () => {
      try {
        const rows = await Promise.all(commonPasswords.map(async (password) => {
          const hash = await sha1Hex(password);
          const prefix = hash.slice(0, 5);
          const suffix = hash.slice(5);
          const data = await checkPassword(prefix);
          const match = data.suffixes.find(s => s.suffix === suffix);
          return { password, count: match?.count || 0 };
        }));

        if (!cancelled) {
          const sorted = rows.sort((a, b) => b.count - a.count);
          setPasswordIntel(sorted);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setPasswordLoading(false);
      }
    };

    fetchPasswordIntel();

    return () => {
      cancelled = true;
    };
  }, [commonPasswords]);

  const normalizedBreaches = useMemo(() => {
    return breaches.map((b) => {
      const dateValue = b.date || b.breach_date || '';
      const parsed = dateValue ? new Date(dateValue) : null;
      return {
        ...b,
        dateLabel: dateValue || 'Date Unknown',
        year: parsed && !Number.isNaN(parsed.getTime()) ? parsed.getFullYear() : null,
        severity: b.severity ?? 0
      };
    });
  }, [breaches]);

  const breachesByYear = useMemo(() => {
    const map = new Map<number, number>();
    normalizedBreaches.forEach((b) => {
      if (b.year !== null) map.set(b.year, (map.get(b.year) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count }));
  }, [normalizedBreaches]);

  const topDataTypes = useMemo(() => {
    const map = new Map<string, number>();
    normalizedBreaches.forEach((b) => {
      b.compromised_data.forEach((type) => map.set(type, (map.get(type) || 0) + 1));
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [normalizedBreaches]);

  const highestRiskBreaches = useMemo(() => {
    return [...normalizedBreaches]
      .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))
      .slice(0, 6);
  }, [normalizedBreaches]);

  const averageSeverity = useMemo(() => {
    if (normalizedBreaches.length === 0) return 0;
    const total = normalizedBreaches.reduce((acc, b) => acc + (b.severity ?? 0), 0);
    return total / normalizedBreaches.length;
  }, [normalizedBreaches]);

  const maxYearCount = Math.max(...breachesByYear.map(d => d.count), 1);
  const maxDataTypeCount = Math.max(...topDataTypes.map(d => d.count), 1);
  const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

  const timeline = useMemo(() => {
    if (breachesByYear.length === 0) return { linePath: '', areaPath: '', points: [] as Array<{ x: number, y: number, year: number, count: number }> };
    const width = 640;
    const height = 220;
    const left = 30;
    const right = 20;
    const top = 20;
    const bottom = 28;
    const usableW = width - left - right;
    const usableH = height - top - bottom;

    const points = breachesByYear.map((d, i) => {
      const x = breachesByYear.length === 1 ? left + usableW / 2 : left + (i / (breachesByYear.length - 1)) * usableW;
      const y = top + usableH - (d.count / maxYearCount) * usableH;
      return { x, y, year: d.year, count: d.count };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const first = points[0];
    const last = points[points.length - 1];
    const areaPath = `${linePath} L ${last.x},${height - bottom} L ${first.x},${height - bottom} Z`;

    return { linePath, areaPath, points };
  }, [breachesByYear, maxYearCount]);

  const toggleSamples = async (id: number) => {
    if (expandedBreach === id) {
      setExpandedBreach(null);
      return;
    }
    setExpandedBreach(id);
    if (!samples[id]) {
      setSamplesLoading(id);
      try {
        const data = await getBreachSamples(id);
        setSamples(prev => ({ ...prev, [id]: data }));
      } catch (err) {
        console.error(err);
      } finally {
        setSamplesLoading(null);
      }
    }
  };

  const getLengthBucket = (password: string) => {
    const len = password.length;
    if (len <= 6) return '1-6';
    if (len <= 8) return '7-8';
    if (len <= 10) return '9-10';
    return '11+';
  };

  const getComplexityBucket = (password: string) => {
    const hasLetter = /[a-z]/i.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);

    if (!hasLetter && hasDigit && !hasSymbol) return 'Numeric only';
    if (hasLetter && !hasDigit && !hasSymbol) return 'Letters only';
    if (hasLetter && hasDigit && !hasSymbol) return 'Alphanumeric';
    if (hasSymbol) return 'Includes symbols';
    return 'Other';
  };

  const heatRows = ['1-6', '7-8', '9-10', '11+'];
  const heatCols = ['Numeric only', 'Letters only', 'Alphanumeric', 'Includes symbols'];

  const passwordHeatmap = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    heatRows.forEach((r) => {
      matrix[r] = {};
      heatCols.forEach((c) => {
        matrix[r][c] = 0;
      });
    });

    passwordIntel.forEach(({ password, count }) => {
      const row = getLengthBucket(password);
      const col = getComplexityBucket(password);
      if (matrix[row] && matrix[row][col] !== undefined) {
        matrix[row][col] += count;
      }
    });

    return matrix;
  }, [passwordIntel]);

  const maxHeatCellValue = useMemo(() => {
    let max = 1;
    heatRows.forEach((r) => {
      heatCols.forEach((c) => {
        max = Math.max(max, passwordHeatmap[r][c]);
      });
    });
    return max;
  }, [passwordHeatmap]);

  const matrixHeatColor = (count: number) => {
    const ratio = Math.log10(count + 1) / Math.log10(maxHeatCellValue + 1);
    const alpha = 0.1 + (ratio * 0.82);
    return `rgba(248,113,113,${alpha})`;
  };

  const checkDomainSafety = async () => {
    const trimmed = domainQuery.trim().toLowerCase();
    if (!trimmed) return;
    setDomainLoading(true);
    try {
      const result = await checkDomain(trimmed);
      setDomainResult(result);
    } catch (err) {
      console.error(err);
      emitInAppNotice('Domain analysis failed. Showing fallback values.', 'warning');
      setDomainResult({ domain: trimmed, exposed_emails: [] });
    } finally {
      setDomainLoading(false);
    }
  };

  const domainAssessment = useMemo(() => {
    if (!domainResult) return null;
    const exposedCount = domainResult.exposed_emails.length;
    const score = exposedCount === 0
      ? 92
      : Math.max(5, Math.round(100 - (Math.log10(exposedCount + 1) * 22 + exposedCount * 1.8)));

    if (score >= 80) {
      return {
        score,
        label: 'Low Observed Risk',
        color: 'text-[#10b981]',
        bar: 'from-[#10b981] to-[#34d399]',
        icon: <ShieldCheck className="h-4 w-4" />,
        note: 'No significant exposure density observed for this domain in the current dataset.'
      };
    }
    if (score >= 60) {
      return {
        score,
        label: 'Moderate Risk',
        color: 'text-[#f59e0b]',
        bar: 'from-[#f59e0b] to-[#f97316]',
        icon: <ShieldAlert className="h-4 w-4" />,
        note: 'Some exposed accounts were found. Use unique credentials and enforce MFA.'
      };
    }
    return {
      score,
      label: 'High Risk',
      color: 'text-[#ef4444]',
      bar: 'from-[#ef4444] to-[#f43f5e]',
      icon: <ShieldAlert className="h-4 w-4" />,
      note: 'High exposure density observed. Signing up is riskier without strong account protections.'
    };
  }, [domainResult]);

  const severityDistribution = useMemo(() => {
    const low = normalizedBreaches.filter((b) => (b.severity ?? 0) <= 4).length;
    const medium = normalizedBreaches.filter((b) => (b.severity ?? 0) >= 5 && (b.severity ?? 0) <= 7).length;
    const high = normalizedBreaches.filter((b) => (b.severity ?? 0) >= 8).length;
    return [
      { label: 'Low (1-4)', value: low, color: '#10b981' },
      { label: 'Medium (5-7)', value: medium, color: '#f59e0b' },
      { label: 'High (8-10)', value: high, color: '#ef4444' }
    ];
  }, [normalizedBreaches]);

  const severityTotal = Math.max(severityDistribution.reduce((acc, d) => acc + d.value, 0), 1);

  const severityDonut = useMemo(() => {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return severityDistribution.map((d) => {
      const dash = (d.value / severityTotal) * circumference;
      const segment = {
        ...d,
        circumference,
        radius,
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: -offset
      };
      offset += dash;
      return segment;
    });
  }, [severityDistribution, severityTotal]);

  const domainExposureTop = useMemo(() => {
    const map = new Map<string, number>();
    normalizedBreaches.forEach((b) => {
      (b.domains || []).forEach((domain) => {
        if (!domain) return;
        map.set(domain, (map.get(domain) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [normalizedBreaches]);

  const maxDomainExposureCount = Math.max(...domainExposureTop.map((d) => d.count), 1);

  const monthlyBreachCounts = useMemo(() => {
    const counts = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      label: new Date(2025, i, 1).toLocaleString('en-US', { month: 'short' }),
      count: 0
    }));
    normalizedBreaches.forEach((b) => {
      const raw = b.date || b.breach_date;
      if (!raw) return;
      const dt = new Date(raw);
      if (Number.isNaN(dt.getTime())) return;
      counts[dt.getMonth()].count += 1;
    });
    return counts;
  }, [normalizedBreaches]);

  const maxMonthlyCount = Math.max(...monthlyBreachCounts.map((m) => m.count), 1);

  const radar = useMemo(() => {
    const items = topDataTypes.slice(0, 6);
    const center = 120;
    const radius = 82;
    const angleStep = (Math.PI * 2) / Math.max(items.length, 1);

    const points = items.map((item, i) => {
      const angle = -Math.PI / 2 + (i * angleStep);
      const factor = item.count / Math.max(maxDataTypeCount, 1);
      const r = radius * factor;
      return {
        ...item,
        x: center + (Math.cos(angle) * r),
        y: center + (Math.sin(angle) * r),
        lx: center + (Math.cos(angle) * (radius + 22)),
        ly: center + (Math.sin(angle) * (radius + 22))
      };
    });

    const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');
    return { points, polygon, center, radius };
  }, [topDataTypes, maxDataTypeCount]);

  if (loading) {
    return (
      <FullPageLoader
        title="Loading Threat Analytics"
        subtitle="Building charts, heatmaps, and trend intelligence from breach data."
      />
    );
  }

  return (
    <PageShell className="w-full flex flex-col justify-center items-center px-6 py-12 lg:py-16 min-h-screen">
      <div className="max-w-[1200px] w-full mx-auto">
        <button onClick={() => navigate('/')} className="mb-8 flex items-center text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm uppercase tracking-widest font-semibold">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </button>

        <div className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-wider text-[rgba(255,255,255,0.6)] uppercase mb-4">Database Explorer</p>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">Threat Analytics Console</h2>
          <p className="text-[rgba(255,255,255,0.7)] font-light max-w-3xl mx-auto leading-relaxed">
            Explore breach trends, sensitive data leakage patterns, and common-password exposure intelligence from the seeded threat dataset.
          </p>
        </div>

        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[10px] tracking-widest uppercase text-white/60 mb-2">Total Breaches</p>
                <p className="text-3xl text-white font-light">{stats?.total_breaches ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[10px] tracking-widest uppercase text-white/60 mb-2">Total Exposures</p>
                <p className="text-3xl text-[#ef4444] font-light">{(stats?.total_exposures ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[10px] tracking-widest uppercase text-white/60 mb-2">Monitored Emails</p>
                <p className="text-3xl text-white font-light">{(stats?.unique_emails ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[10px] tracking-widest uppercase text-white/60 mb-2">Average Severity</p>
                <p className="text-3xl text-[#f59e0b] font-light">{averageSeverity.toFixed(1)}/10</p>
              </div>
            </div>

            <Card title="Domain Signup Safety Checker" className="mb-8">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
                <div className="flex-1 relative">
                  <Globe className="h-4 w-4 text-white/50 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    value={domainQuery}
                    onChange={(e) => setDomainQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') checkDomainSafety();
                    }}
                    placeholder="example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/25 border border-white/15 text-white placeholder:text-white/35 outline-none focus:border-white/30"
                  />
                </div>
                <button
                  onClick={checkDomainSafety}
                  disabled={domainLoading}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#00A1A1] to-[#3038D1] text-white font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {domainLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Analyze Domain
                </button>
              </div>

              {domainAssessment && domainResult && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-white/55 mb-1">Domain</p>
                      <p className="text-white font-medium">{domainResult.domain}</p>
                    </div>
                    <div className={cn('flex items-center gap-2 text-sm font-semibold', domainAssessment.color)}>
                      {domainAssessment.icon}
                      {domainAssessment.label}
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>Signup Safety Score</span>
                      <span>{domainAssessment.score}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r', domainAssessment.bar)}
                        style={{ width: `${domainAssessment.score}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-white/70 mb-3">{domainAssessment.note}</p>
                  <p className="text-xs text-white/55">
                    Exposed accounts found: <span className="text-white/80">{domainResult.exposed_emails.length}</span>
                  </p>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card title="Breach Timeline">
                {breachesByYear.length > 0 ? (
                  <div className="w-full">
                    <svg viewBox="0 0 640 220" className="w-full h-[220px]">
                      <defs>
                        <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(59,130,246,0.5)" />
                          <stop offset="100%" stopColor="rgba(59,130,246,0.02)" />
                        </linearGradient>
                      </defs>
                      <path d={timeline.areaPath} fill="url(#timelineFill)" />
                      <path d={timeline.linePath} fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
                      {timeline.points.map((p, i) => (
                        <g key={`${p.year}-${i}`}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#93c5fd" />
                          <text x={p.x} y={210} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="11">{p.year}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                ) : (
                  <p className="text-white/60 text-sm">No dated breaches available.</p>
                )}
              </Card>

              <Card title="Compromised Data Types">
                <div className="space-y-3">
                  {topDataTypes.map((item) => (
                    <div key={item.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white/80">{item.name}</span>
                        <span className="text-xs text-white/60">{item.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#22d3ee] to-[#3b82f6]"
                          style={{ width: `${(item.count / maxDataTypeCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card title="High-Risk Breaches">
                <div className="space-y-3">
                  {highestRiskBreaches.map((breach) => (
                    <div key={breach.id} className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-[#f97316]" />
                          <span className="text-white font-medium">{breach.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-[#fca5a5] uppercase tracking-wider">Severity {breach.severity}/10</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#ef4444]"
                          style={{ width: `${((breach.severity ?? 0) / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Common Password Exposure Heatmap">
                {passwordLoading ? (
                  <div className="h-[250px] flex items-center justify-center text-white/60">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Analyzing common passwords...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <div className="min-w-[560px]">
                        <div className="grid grid-cols-5 gap-2 mb-2">
                          <div />
                          {heatCols.map((col) => (
                            <div key={col} className="text-[11px] uppercase tracking-wider text-white/55 text-center">
                              {col}
                            </div>
                          ))}
                        </div>
                        {heatRows.map((row) => (
                          <div key={row} className="grid grid-cols-5 gap-2 mb-2">
                            <div className="flex items-center text-[11px] uppercase tracking-wider text-white/55">
                              {row}
                            </div>
                            {heatCols.map((col) => {
                              const value = passwordHeatmap[row][col];
                              return (
                                <div
                                  key={`${row}-${col}`}
                                  className="rounded-lg border border-white/10 px-2 py-3 text-center"
                                  style={{ backgroundColor: matrixHeatColor(value) }}
                                >
                                  <p className="text-sm text-white font-medium">{compactNumber.format(value)}</p>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">
                      Real heatmap view: rows are password length buckets, columns are complexity buckets, and each cell intensity is log-scaled by total breach hits.
                    </p>
                  </div>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Card title="Severity Distribution">
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <svg width="240" height="240" viewBox="0 0 240 240">
                      <circle cx="120" cy="120" r="52" stroke="rgba(255,255,255,0.1)" strokeWidth="22" fill="none" />
                      {severityDonut.map((slice) => (
                        <circle
                          key={slice.label}
                          cx="120"
                          cy="120"
                          r={slice.radius}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth="22"
                          strokeDasharray={slice.dashArray}
                          strokeDashoffset={slice.dashOffset}
                          transform="rotate(-90 120 120)"
                          strokeLinecap="round"
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-[10px] tracking-widest uppercase text-white/55">Breaches</p>
                      <p className="text-3xl text-white font-light">{severityTotal}</p>
                    </div>
                  </div>
                  <div className="w-full space-y-2">
                    {severityDistribution.map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-white/75">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.label}
                        </div>
                        <span className="text-white/90">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card title="Yearly Breach Bars">
                <div className="h-[280px] flex items-end gap-2">
                  {breachesByYear.map((y) => (
                    <div key={y.year} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-2">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-[#3b82f6] to-[#22d3ee]"
                        style={{ height: `${Math.max(8, (y.count / maxYearCount) * 210)}px` }}
                        title={`${y.year}: ${y.count} breaches`}
                      />
                      <span className="text-[10px] text-white/55">{y.year}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Monthly Breach Heat Strip">
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-2">
                    {monthlyBreachCounts.map((m) => {
                      const ratio = Math.log10(m.count + 1) / Math.log10(maxMonthlyCount + 1);
                      const alpha = 0.1 + (ratio * 0.82);
                      return (
                        <div key={m.label} className="rounded-lg border border-white/10 p-3 text-center" style={{ backgroundColor: `rgba(56,189,248,${alpha})` }}>
                          <p className="text-[11px] text-white/70 uppercase">{m.label}</p>
                          <p className="text-base text-white font-medium">{m.count}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-white/50">Higher intensity indicates more breaches with dates falling in that month.</p>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card title="Compromised Data Radar">
                <div className="flex justify-center overflow-x-auto">
                  <svg width="320" height="260" viewBox="0 0 320 260">
                    <g transform="translate(40,0)">
                      {[0.25, 0.5, 0.75, 1].map((scale) => (
                        <circle
                          key={scale}
                          cx={radar.center}
                          cy={radar.center}
                          r={radar.radius * scale}
                          fill="none"
                          stroke="rgba(255,255,255,0.12)"
                        />
                      ))}
                      <polygon points={radar.polygon} fill="rgba(34,211,238,0.28)" stroke="#22d3ee" strokeWidth="2" />
                      {radar.points.map((p) => (
                        <g key={p.name}>
                          <circle cx={p.x} cy={p.y} r="3.5" fill="#67e8f9" />
                          <text x={p.lx} y={p.ly} fill="rgba(255,255,255,0.65)" textAnchor="middle" fontSize="10">{p.name}</text>
                        </g>
                      ))}
                    </g>
                  </svg>
                </div>
              </Card>

              <Card title="Top Affected Domains">
                <div className="space-y-3">
                  {domainExposureTop.map((d) => (
                    <div key={d.domain}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white/80">{d.domain}</span>
                        <span className="text-xs text-white/60">{d.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#60a5fa]"
                          style={{ width: `${(d.count / maxDomainExposureCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card title="Breach Records">
              <div className="space-y-4">
                {normalizedBreaches.map((breach) => (
                  <div key={breach.id} className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-4 w-4 text-[#22d3ee]" />
                        <div>
                          <p className="text-white font-medium">{breach.name}</p>
                          <p className="text-xs text-white/55 flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" /> {breach.dateLabel}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        'text-xs uppercase tracking-wider font-semibold px-3 py-1 rounded-full border w-fit',
                        (breach.severity ?? 0) >= 8
                          ? 'text-[#ef4444] border-[#ef4444]/40 bg-[#ef4444]/10'
                          : (breach.severity ?? 0) >= 5
                            ? 'text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10'
                            : 'text-[#10b981] border-[#10b981]/40 bg-[#10b981]/10'
                      )}>
                        Severity {breach.severity}/10
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {breach.compromised_data.map((d, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-white/10 text-white/80 rounded-sm uppercase tracking-wider">
                          {d}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => toggleSamples(breach.id)}
                      className="text-xs font-semibold uppercase tracking-widest py-2 px-4 border border-white/10 rounded-full hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      {expandedBreach === breach.id ? 'Hide Sample Emails' : 'View Sample Emails'}
                      {samplesLoading === breach.id && <Loader2 className="animate-spin h-3 w-3" />}
                    </button>

                    {expandedBreach === breach.id && samples[breach.id] && (
                      <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {samples[breach.id].map((email, i) => (
                          <div key={i} className="text-[13px] font-mono text-white/75 bg-black/20 px-3 py-2 rounded-md truncate">
                            {email}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
        </>
      </div>
    </PageShell>
  );
}

function App() {
  const [notices, setNotices] = useState<AppNotice[]>([]);

  useEffect(() => {
    const onNotice = (event: Event) => {
      const custom = event as CustomEvent<{ message: string, level?: NoticeLevel }>;
      const message = custom.detail?.message?.trim();
      if (!message) return;
      const level = custom.detail?.level || 'info';
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setNotices((prev) => [...prev, { id, message, level }].slice(-5));
      window.setTimeout(() => {
        setNotices((prev) => prev.filter((n) => n.id !== id));
      }, 4200);
    };

    window.addEventListener('exposure:notice', onNotice as EventListener);
    return () => window.removeEventListener('exposure:notice', onNotice as EventListener);
  }, []);

  useEffect(() => {
    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);
    const nativePrompt = window.prompt.bind(window);

    window.alert = (message?: any) => {
      emitInAppNotice(String(message ?? 'Notification'), 'info');
    };
    window.confirm = (message?: string) => {
      emitInAppNotice(String(message ?? 'Confirmation requested'), 'warning');
      return false;
    };
    window.prompt = (message?: string) => {
      emitInAppNotice(String(message ?? 'Input requested'), 'warning');
      return null;
    };

    return () => {
      window.alert = nativeAlert;
      window.confirm = nativeConfirm;
      window.prompt = nativePrompt;
    };
  }, []);

  const noticeStyle = (level: NoticeLevel) => {
    if (level === 'error') return 'border-[#ef4444]/40 bg-[#ef4444]/12 text-[#fecaca]';
    if (level === 'warning') return 'border-[#f59e0b]/40 bg-[#f59e0b]/12 text-[#fde68a]';
    if (level === 'success') return 'border-[#10b981]/40 bg-[#10b981]/12 text-[#bbf7d0]';
    return 'border-[#60a5fa]/40 bg-[#60a5fa]/12 text-[#bfdbfe]';
  };

  return (
    <BrowserRouter>
      {/* Container holding the single solid background gradient */}
      <div className="min-h-screen relative overflow-x-hidden font-sans">
        <GlobalAtmosphereBackground />
        <div className="fixed top-5 right-5 z-[70] w-[min(380px,calc(100vw-2rem))] space-y-2 pointer-events-none">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={cn(
                'rounded-xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-md route-enter',
                noticeStyle(notice.level)
              )}
            >
              {notice.message}
            </div>
          ))}
        </div>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/domain" element={<DomainDashboardPage />} />
          <Route path="/password" element={<PasswordDashboardPage />} />
          <Route path="/explorer" element={<ExplorerDashboardPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
