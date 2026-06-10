import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShoppingCart, 
  Zap, 
  TrendingUp, 
  Users, 
  Activity, 
  Package, 
  ShieldCheck, 
  Clock,
  ExternalLink,
  MousePointer2
} from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
}

interface LeaderboardItem {
  productId: string;
  salesCount: number;
}

const App = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [visitorCount, setVisitorCount] = useState(0);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'error' | 'success'}[]>([]);
  const [loading, setLoading] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<Record<string, 'HIT' | 'MISS' | null>>({});

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => 
    setLogs(prev => [{msg, type}, ...prev.slice(0, 14)]);

  const fetchInitialData = async () => {
    try {
      const prodRes = await axios.post('/api/products/seed');
      setProducts(prodRes.data);
      updateStats();
      addLog('🚀 Environment ready. Products seeded into MongoDB.', 'success');
    } catch (err) {
      addLog('❌ Failed to connect to backend.', 'error');
    }
  };

  const updateStats = async () => {
    try {
      const [lbRes, visRes] = await Promise.all([
        axios.get('/api/deals/leaderboard'),
        axios.get('/api/analytics/stats')
      ]);
      setLeaderboard(lbRes.data);
      console.log(lbRes, "lbRes")
      console.log(visRes, "visRes")
      setVisitorCount(visRes.data.uniqueVisitorsToday);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInitialData();
    const userId = 'user_' + Math.random().toString(36).substring(7);
    axios.post('/api/analytics/view', { userId });
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleProductClick = async (id: string) => {
    try {
      const res = await axios.get(`/api/products/${id}`);
      setCacheStatus(prev => ({ ...prev, [id]: res.data.source === 'cache' ? 'HIT' : 'MISS' }));
      addLog(`GET /api/products/${id.slice(-4)} -> Served from ${res.data.source.toUpperCase()}`, 'info');
    } catch (err: any) {
      if (err.response?.status === 429) {
        addLog('⚠️ RATE LIMIT EXCEEDED: 429 Too Many Requests', 'error');
      }
    }
  };

  const handleStressTest = async (productId: string) => {
    setLoading(true);
    addLog(`🔥 Stress Test: Firing 10 concurrent checkouts for ${productId.slice(-4)}`, 'info');
    
    const requests = Array.from({ length: 10 }).map((_, i) => 
      axios.post('/api/deals/checkout', { productId, userId: `stress_user_${i}` })
        .then(res => ({ success: true, msg: res.data.message }))
        .catch(err => ({ success: false, msg: err.response?.data?.message || 'Error' }))
    );

    const results = await Promise.all(requests);
    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;

    addLog(`🏁 Result: ${successes} Success, ${failures} Failures. (Check Redis Locks)`, successes > 0 ? 'success' : 'error');
    
    // RE-FETCH PRODUCTS: This ensures stock levels are updated in the UI
    try {
      const prodRes = await axios.get('/api/products'); 
      setProducts(prodRes.data);
    } catch (e) {
      console.error("Failed to refresh products", e);
    }

    updateStats();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-indigo-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-purple-500/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 border-b border-slate-800 pb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-4">
              <Zap size={14} className="fill-current" /> Distributed Systems Lab
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-white mb-3">
              Redis <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Mastery</span> POC
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl">
              High-concurrency flash sale simulation demonstrating distributed locking, 
              real-time analytics, and advanced caching patterns.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl shadow-xl min-w-[160px]">
              <div className="flex items-center gap-2 text-indigo-400 mb-2 text-xs font-bold uppercase tracking-wider">
                <Users size={16} /> Live Visitors
              </div>
              <div className="text-3xl font-mono font-bold text-white">{visitorCount.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 mt-1 italic">Stored via HyperLogLog</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Use Case 1 & 5: Products Section */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Package className="text-indigo-400" /> Inventory & Checkout
              </h2>
              <div className="flex items-center gap-4 text-xs">
                 <span className="flex items-center gap-1.5 text-slate-500"><ShieldCheck size={14} /> Distributed Locking Active</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {products.map(p => (
                <div key={p._id} className="group bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 relative overflow-hidden">
                  {/* Cache Badge */}
                  {cacheStatus[p._id] && (
                    <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-tighter transition-colors ${
                      cacheStatus[p._id] === 'HIT' ? 'bg-green-500/20 text-green-400 border-l border-b border-green-500/30' : 'bg-orange-500/20 text-orange-400 border-l border-b border-orange-500/30'
                    }`}>
                      {cacheStatus[p._id]}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">{p.name}</h3>
                      <p className="text-slate-400 text-sm mt-1 leading-relaxed">{p.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Price</div>
                        <div className="text-3xl font-mono font-bold text-indigo-400">${p.price}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Stock</div>
                        <div className={`text-xl font-mono font-bold ${p.stock < 5 ? 'text-red-400' : 'text-slate-300'}`}>
                          {p.stock}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button 
                        onClick={() => handleProductClick(p._id)}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 border border-slate-700"
                      >
                        <Clock size={14} /> GET DETAILS
                      </button>
                      <button 
                        disabled={loading || p.stock <= 0}
                        onClick={() => handleStressTest(p._id)}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:opacity-50 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                      >
                        <ShoppingCart size={14} /> BUY (STRESS)
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar: Stats & Logs */}
          <div className="lg:col-span-4 space-y-8">
            {/* Use Case 4: Leaderboard */}
            <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp className="text-purple-400" /> Trending Now
              </h2>
              <div className="space-y-5">
                {leaderboard.length === 0 && (
                  <div className="text-center py-8 text-slate-600 text-sm italic border-2 border-dashed border-slate-800 rounded-2xl">
                    Waiting for sales data...
                  </div>
                )}
                {leaderboard.map((item, i) => {
                  const p = products.find(x => x._id === item.productId);
                  return (
                    <div key={item.productId} className="relative flex items-center gap-4 p-3 rounded-2xl bg-slate-800/30 border border-transparent hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-indigo-400 text-xs font-black ring-1 ring-slate-700">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-200 truncate">{p?.name || 'Loading...'}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.salesCount} units sold</div>
                      </div>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                          style={{ width: `${Math.min((item.salesCount / 20) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* System Monitor (Activity Log) */}
            <section className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 font-mono text-[11px] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
               <h2 className="text-slate-500 mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
                <Activity size={12} className="text-indigo-500" /> System Monitor
              </h2>
              <div className="space-y-3 h-[380px] overflow-y-auto scrollbar-hide pr-2">
                {logs.length === 0 && <div className="text-slate-700 italic">Listening for system events...</div>}
                {logs.map((log, i) => (
                  <div key={i} className={`flex gap-3 leading-relaxed border-l-2 pl-3 py-0.5 transition-all animate-in fade-in slide-in-from-left-2 ${
                    log.type === 'success' ? 'border-green-500/50 text-green-400/90' : 
                    log.type === 'error' ? 'border-red-500/50 text-red-400' : 
                    'border-slate-700 text-slate-400'
                  }`}>
                    <span className="opacity-30 shrink-0 tabular-nums">{new Date().toLocaleTimeString([], { hour12: false })}</span>
                    <span className="break-all">{log.msg}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Redis Connection Active</div>
                </div>
                <button 
                  onClick={() => setLogs([])}
                  className="text-[9px] text-slate-600 hover:text-indigo-400 font-bold uppercase tracking-widest transition-colors"
                >
                  Clear Console
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Technical Breakdown */}
        <footer className="mt-20 pt-12 border-t border-slate-800">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'Caching', tech: 'Redis STRINGS', desc: 'JSON TTL-based store' },
                { label: 'Throttling', tech: 'Redis ATOMIC', desc: 'INCR/EXPIRE limiting' },
                { label: 'Leaderboard', tech: 'Redis ZSET', desc: 'Real-time sorting' },
                { label: 'Concurrency', tech: 'Redis SETNX', desc: 'Distributed Locking' }
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-indigo-400 font-bold text-xs uppercase tracking-tighter">{item.label}</div>
                  <div className="text-white text-sm font-mono">{item.tech}</div>
                  <div className="text-slate-500 text-[10px]">{item.desc}</div>
                </div>
              ))}
           </div>
           <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-600 text-[11px] font-medium uppercase tracking-[0.1em]">
              <p>© 2026 Redis Advanced Systems Lab</p>
              <div className="flex gap-6">
                <a href="#" className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"><ShieldCheck size={12}/> Security Protocol</a>
                <a href="#" className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"><ExternalLink size={12}/> RedisInsight API</a>
              </div>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
