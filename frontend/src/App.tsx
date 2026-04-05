import { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Search, Loader2 } from 'lucide-react';
import { checkHealth, checkExposure, type CheckExposureResponse } from './services/api';

function App() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckExposureResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    checkHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await checkExposure(email);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred while checking exposure.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center items-center mb-4">
            <ShieldAlert className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">
            Dark Web Exposure Monitor
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Check if your credentials have been compromised in known data breaches.
          </p>
          <div className="mt-2 flex items-center justify-center space-x-2 text-sm">
            <span className="text-text-secondary">Backend Status:</span>
            {backendStatus === 'checking' && <span className="text-warning">Checking...</span>}
            {backendStatus === 'online' && <span className="text-success font-medium">Online</span>}
            {backendStatus === 'offline' && <span className="text-danger font-medium">Offline</span>}
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-surface p-8 rounded-2xl shadow-xl border border-border">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-text-secondary" />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Checking
                </>
              ) : (
                'Check Exposure'
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className={`p-8 rounded-2xl shadow-xl border ${result.is_exposed ? 'bg-red-950/20 border-red-900/50' : 'bg-green-950/20 border-green-900/50'}`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {result.is_exposed ? (
                  <ShieldAlert className="h-8 w-8 text-danger" />
                ) : (
                  <ShieldCheck className="h-8 w-8 text-success" />
                )}
              </div>
              <div className="ml-4 w-full">
                <h3 className={`text-xl font-semibold ${result.is_exposed ? 'text-danger' : 'text-success'}`}>
                  {result.is_exposed ? 'Compromised Credentials Found' : 'No Exposure Detected'}
                </h3>
                <div className="mt-2 text-text-secondary">
                  {result.is_exposed ? (
                    <p>Your email <span className="font-semibold text-text-primary">{result.email}</span> appeared in {result.breaches.length} known data breaches.</p>
                  ) : (
                    <p>Good news! We couldn't find <span className="font-semibold text-text-primary">{result.email}</span> in any of our dark web breach datasets.</p>
                  )}
                </div>

                {result.is_exposed && (
                  <div className="mt-6">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-medium text-text-secondary">Risk Score</span>
                      <span className="text-2xl font-bold text-danger">{result.risk_score}/100</span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2.5">
                      <div className="bg-danger h-2.5 rounded-full" style={{ width: `${result.risk_score}%` }}></div>
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-text-primary mb-3 uppercase tracking-wider">Breach Sources</h4>
                      <ul className="space-y-2">
                        {result.breaches.map((breach, index) => (
                          <li key={index} className="bg-surface border border-border px-4 py-3 rounded-md flex items-center justify-between">
                            <span className="text-text-primary font-medium">{breach}</span>
                            <span className="text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded-full">Exposed</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
