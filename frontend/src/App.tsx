import { useState, useEffect } from 'react';
import { Check, Loader2, ArrowLeft } from 'lucide-react';
import { checkExposure, checkDomain, checkPassword, type CheckExposureResponse, type DomainCheckResponse } from './services/api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
      <span className="mt-10 text-base text-[rgba(255,255,255,0.6)] tracking-wide font-light">
        {status}
      </span>
    </div>
  );
};

// Card Component
const Card = ({ title, children, className, action }: { title: string, children: React.ReactNode, className?: string, action?: React.ReactNode }) => (
  <div className={cn("bg-gradient-to-br from-[rgba(0,255,210,0.08)] to-[#0C0F29] border border-[rgba(255,255,255,0.1)] rounded-[1.5rem] p-6 shadow-2xl backdrop-blur-sm", className)}>
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xs font-semibold tracking-wider text-[rgba(255,255,255,0.6)] uppercase">{title}</h3>
      {action && <div className="text-xs font-medium tracking-wider text-[rgba(255,255,255,0.6)] uppercase">{action}</div>}
    </div>
    {children}
  </div>
);

// Inner nested card row (like in EXPOSURE SUMMARY)
const InnerRow = ({ value, label, valueColor = "text-white" }: { value: string | number, label: string, valueColor?: string }) => (
  <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 flex flex-col justify-center">
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
    <div className="w-full flex flex-col justify-center items-center relative z-10 px-6 sm:px-12 py-16 min-h-screen">
      <div className="max-w-2xl w-full mx-auto flex flex-col items-center text-center lg:items-start lg:text-left">
        <p className="text-xs font-semibold tracking-wider text-[rgba(255,255,255,0.6)] mb-6 uppercase">
          Cyber Threat Intelligence Prototype
        </p>
        
        <h1 className="text-5xl sm:text-[3.5rem] font-normal text-white mb-6 leading-tight">
          Dark Web Exposure Monitor
        </h1>
        
        <p className="text-xl text-[rgba(255,255,255,0.8)] mb-12 max-w-xl leading-relaxed font-light">
          Check if your credentials are compromised across simulated leak intelligence feeds.
        </p>

        {/* Tab Selector */}
        <div className="flex gap-4 mb-8">
          {(['email', 'domain', 'password'] as const).map(type => (
            <button
              key={type}
              onClick={() => { setSearchType(type); setError(''); setQuery(''); }}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors border", 
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
              className="w-full bg-transparent text-white placeholder-[rgba(255,255,255,0.4)] px-6 py-4 outline-none border-none text-lg rounded-t-2xl sm:rounded-full font-light"
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
        {error && <p className="text-[#ef4444] text-sm mb-8 font-medium">{error}</p>}
        {!error && <div className="mb-12"></div>}

        <div className="bg-gradient-to-br from-[rgba(0,255,210,0.08)] to-[#0C0F29] border border-[rgba(255,255,255,0.1)] rounded-3xl p-8 w-full max-w-md lg:mx-0 mx-auto shadow-2xl backdrop-blur-sm">
          <ul className="space-y-6">
            {[
              'Connected to breach database',
              'Monitoring 500K+ leaked records',
              'Real-time threat analysis active'
            ].map((text, i) => (
              <li key={i} className="flex items-center text-white text-[15px] sm:text-[17px] font-light">
                <Check className="h-6 w-6 text-[#00ff66] mr-4 flex-shrink-0" />
                <span className="tracking-wide">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
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

  return (
    <div className="w-full flex flex-col justify-center items-center relative z-10 px-6 py-12 lg:py-16 min-h-screen">
      <div className="max-w-[1000px] w-full mx-auto">
        <button 
          onClick={() => navigate('/')}
          className="mb-8 flex items-center text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm uppercase tracking-widest font-semibold"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> New Scan
        </button>

        <p className="text-xs font-semibold tracking-wider text-[rgba(255,255,255,0.6)] mb-12 uppercase">
          Automated mitigation guidance and breach-risk scoring included
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
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

        {/* Threat Findings Card */}
        <Card title="Threat Findings" action={hasScanned && result?.is_exposed ? `${result.breaches.length} TARGETS` : 'NO TARGET'} className="mb-10">
          <h4 className="text-xl font-normal text-white mb-3">
            Matched breach records
          </h4>
          
          {!hasScanned ? (
             <p className="text-[15px] text-[rgba(255,255,255,0.6)] leading-relaxed font-light">
               Run a scan to populate breach exposure records and intelligence tags.
             </p>
          ) : loading ? (
            <p className="text-[15px] text-[rgba(255,255,255,0.6)] leading-relaxed flex items-center font-light">
              <Loader2 className="animate-spin h-4 w-4 mr-2" /> Analyzing intelligence feeds...
             </p>
          ) : result?.is_exposed && result.breaches.length > 0 ? (
             <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
               {result.breaches.map((breach, idx) => (
                 <div key={idx} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
             <p className="text-[15px] text-[#10b981] leading-relaxed font-light">
               No compromised records found for this email address.
             </p>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mitigation Card */}
          <Card title="Mitigation" className="h-full">
            <h4 className="text-lg font-normal text-white mb-3">
              Recommended next actions
            </h4>
            <div className="text-[15px] text-[rgba(255,255,255,0.6)] leading-relaxed font-light space-y-2">
              {getMitigations().map((m, i) => <p key={i}>• {m}</p>)}
            </div>
          </Card>

          {/* Threat Intel Card */}
          <Card title="Threat Intel" className="h-full">
            <h4 className="text-lg font-normal text-white mb-3">
              Risk breakdown
            </h4>
            <p className="text-[15px] text-[rgba(255,255,255,0.6)] leading-relaxed font-light">
              {!hasScanned ? 'Severity reasons and credential risk signals will appear here.' :
               loading ? 'Compiling signals...' :
               result?.is_exposed ? `High risk score (${result.risk_score}) derived from ${result.breaches.length} historical leaks.` :
               'No significant risk signals detected in current dataset.'}
            </p>
          </Card>
        </div>
      </div>
    </div>
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

    return (
        <div className="w-full flex flex-col justify-center items-center relative z-10 px-6 py-12 lg:py-16 min-h-screen">
          <div className="max-w-[1000px] w-full mx-auto">
            <button onClick={() => navigate('/')} className="mb-6 flex items-center text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm uppercase tracking-widest font-semibold">
              <ArrowLeft className="h-4 w-4 mr-2" /> New Scan
            </button>
            <Card title="Domain Intelligence">
                <h4 className="text-xl font-normal text-white mb-3">Target Domain Analysed: {domain}</h4>
                {loading ? (
                    <p className="text-[15px] text-[rgba(255,255,255,0.6)] leading-relaxed flex items-center font-light">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" /> Analyzing domain infrastructure...
                    </p>
                ) : (
                    <div>
                        <div className="mb-6">
                            <InnerRow value={result?.exposed_emails.length || 0} label="Exposed Accounts Found" valueColor={result && result.exposed_emails.length > 0 ? "text-[#ef4444]" : "text-[#10b981]"} />
                        </div>
                        
                        {result && result.exposed_emails.length > 0 ? (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {result.exposed_emails.map((record, idx) => (
                                    <div key={idx} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] p-4 rounded-xl">
                                        <div className="text-white font-medium mb-2">{record.email}</div>
                                        <div className="flex flex-wrap gap-2">
                                            {record.breaches.map((b, i) => (
                                                <span key={i} className="text-[11px] px-2 py-0.5 bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.8)] rounded-sm uppercase tracking-wider">{b}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[15px] text-[#10b981] leading-relaxed font-light">No breached accounts detected for this domain.</p>
                        )}
                    </div>
                )}
            </Card>
          </div>
        </div>
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

    return (
        <div className="w-full flex flex-col justify-center items-center relative z-10 px-6 py-12 lg:py-16 min-h-screen">
          <div className="max-w-[1000px] w-full mx-auto">
            <button onClick={() => navigate('/')} className="mb-6 flex items-center text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm uppercase tracking-widest font-semibold">
              <ArrowLeft className="h-4 w-4 mr-2" /> New Scan
            </button>
            <Card title="Password Intelligence">
                <h4 className="text-xl font-normal text-white mb-3">Hash Analyzed (k-Anonymity)</h4>
                
                {loading ? (
                     <p className="text-[15px] text-[rgba(255,255,255,0.6)] leading-relaxed flex items-center font-light">
                       <Loader2 className="animate-spin h-4 w-4 mr-2" /> Querying global hash database...
                     </p>
                ) : (
                    <div>
                        <div className="mb-6">
                           <InnerRow value={exposedCount || 0} label="Times Exposed in Data Breaches" valueColor={exposedCount && exposedCount > 0 ? "text-[#ef4444]" : "text-[#10b981]"} />
                        </div>
                        {exposedCount && exposedCount > 0 ? (
                            <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-xl">
                                <p className="text-[#ef4444] font-medium">Warning: This password has been exposed in data breaches!</p>
                                <p className="text-[13px] text-[rgba(255,255,255,0.7)] mt-1 font-light">It has been seen {exposedCount.toLocaleString()} times. You should absolutely not use this password, as hackers use lists of compromised passwords in brute-force attacks.</p>
                            </div>
                        ) : (
                            <div className="p-4 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] rounded-xl">
                                <p className="text-[#10b981] font-medium">Good News: This password was not found in our database.</p>
                                <p className="text-[13px] text-[rgba(255,255,255,0.7)] mt-1 font-light">While it hasn't been exposed in known breaches, you should still ensure it's long, complex, and unique for every account.</p>
                            </div>
                        )}
                    </div>
                )}
            </Card>
          </div>
        </div>
    );
}

function App() {
  return (
    <BrowserRouter>
      {/* Container holding the single solid background gradient */}
      <div className="min-h-screen relative overflow-x-hidden font-sans">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/domain" element={<DomainDashboardPage />} />
          <Route path="/password" element={<PasswordDashboardPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
