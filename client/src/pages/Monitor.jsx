import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Play, Database, Server, RefreshCcw } from 'lucide-react';

const Monitor = () => {
  const [formData, setFormData] = useState({
    cardId: 'CARD-' + Math.floor(Math.random() * 90000 + 10000),
    amount: '',
    merchant: '',
    location: '',
    hour: new Date().getHours(),
    international: false,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { user } = useAuth();

  const handleSimulate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      };

      const payload = {
        ...formData,
        amount: Number(formData.amount),
        hour: Number(formData.hour),
      };

      const { data } = await axios.post(
        'http://localhost:5000/api/transaction/analyze',
        payload,
        config
      );
      
      // Artificial delay for better UX scanning effect
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 1200);

    } catch (error) {
      console.error(error);
      setLoading(false);
      alert('Error simulating transaction');
    }
  };

  const getRiskColor = (risk) => {
    if (risk === 'high') return 'text-red-500 bg-red-50 border-red-200';
    if (risk === 'medium') return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-emerald-500 bg-emerald-50 border-emerald-200';
  };

  const getRiskBg = (risk) => {
     if (risk === 'high') return 'bg-red-500';
     if (risk === 'medium') return 'bg-amber-500';
     return 'bg-emerald-500';
  }

  return (
    <div className="animate-fade-in pb-10 max-w-5xl mx-auto">
      <header className="mb-8">
         <div className="inline-flex py-1 px-3 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold mb-3 tracking-wide uppercase">
            Live Testing Environment
         </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Transaction Monitor</h1>
        <p className="text-slate-500 mt-1">Submit test transactions to evaluate the detection engine.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
           <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <Database className="text-blue-500" size={20} />
                Input Parameters
              </h2>
              <button onClick={() => setFormData({ ...formData, cardId: 'CARD-' + Math.floor(Math.random() * 90000 + 10000) })} className="text-slate-400 hover:text-blue-500">
                  <RefreshCcw size={16} />
              </button>
           </div>
           
           <form onSubmit={handleSimulate} className="space-y-5">
             <div className="grid grid-cols-2 gap-5">
               <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Card ID</label>
                  <input type="text" value={formData.cardId} onChange={(e) => setFormData({...formData, cardId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-mono" required />
               </div>
               <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Amount ($)</label>
                  <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3.5 text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold text-lg" required />
               </div>
             </div>

             <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Merchant</label>
                <select value={formData.merchant} onChange={(e) => setFormData({...formData, merchant: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg py-3 px-3.5 text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm appearance-none" required>
                  <option value="">Select a merchant category...</option>
                  <option value="electronics">Electronics</option>
                  <option value="groceries">Groceries</option>
                  <option value="travel">Travel</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="crypto">Crypto/High Risk</option>
                </select>
             </div>

             <div className="grid grid-cols-2 gap-5">
               <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="City, Country" className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3.5 text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
               </div>
               <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Hour (0-23)</label>
                  <input type="number" min="0" max="23" value={formData.hour} onChange={(e) => setFormData({...formData, hour: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3.5 text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" required />
               </div>
             </div>

             <div className="flex items-center gap-3 pt-2">
                <input type="checkbox" id="intl" checked={formData.international} onChange={(e) => setFormData({...formData, international: e.target.checked})} className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2 cursor-pointer" />
                <label htmlFor="intl" className="text-sm font-medium text-slate-700 cursor-pointer select-none">International Transaction</label>
             </div>

             <button type="submit" disabled={loading} className={`w-full relative overflow-hidden group mt-6 py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] ${
               loading ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'
             }`}>
                {loading ? (
                   <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="tracking-wide">Analyzing Patterns...</span>
                   </>
                ) : (
                   <>
                    <Play size={18} />
                    <span className="tracking-wide">Run Evaluation Engine</span>
                   </>
                )}
             </button>
           </form>
        </div>

        {/* Output Panel */}
        <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl p-8 text-white relative overflow-hidden flex flex-col">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]"></div>
           
           <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6 z-10">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-200">
                <Server className="text-emerald-400" size={20} />
                Analysis Output
              </h2>
           </div>

           <div className="flex-1 flex flex-col justify-center relative z-10">
              {!loading && !result ? (
                 <div className="text-center text-slate-500">
                    <ShieldAlert size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Engine Standing By</p>
                    <p className="text-sm mt-1">Submit a transaction to view hybrid ML + Rule-based scoring.</p>
                 </div>
              ) : loading ? (
                 <div className="w-full flex-1 flex flex-col gap-4 max-w-sm mx-auto justify-center">
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 w-1/3 animate-pulse rounded-full"></div>
                    </div>
                    <p className="text-xs font-mono text-center text-blue-400 animate-pulse uppercase tracking-widest">Running Inference... [ML + Rules]</p>
                 </div>
              ) : (
                 <div className="animate-slide-up space-y-8">
                    {/* Main Score Display */}
                    <div className={`p-6 rounded-2xl border ${getRiskColor(result.riskScore).replace('text-', 'border-').replace('50', '500/20')} bg-slate-900/50 backdrop-blur-sm text-center`}>
                       <p className="text-sm uppercase tracking-widest text-slate-400 font-semibold mb-2">Final Verdict</p>
                       <div className="flex items-center justify-center gap-3">
                          <span className={`w-4 h-4 rounded-full animate-pulse shadow-[0_0_15px_rgba(0,0,0,0.5)] ${getRiskBg(result.riskScore)}`}></span>
                          <h3 className={`text-4xl font-extrabold capitalize ${getRiskColor(result.riskScore).split(' ')[0]}`}>
                            {result.riskScore} Risk
                          </h3>
                       </div>
                       {result.fraud && (
                          <div className="inline-block mt-4 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold uppercase tracking-widest rounded-lg">
                            Transaction Blocked
                          </div>
                       )}
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 font-semibold">ML Confidence</p>
                          <p className="text-2xl font-bold font-mono text-slate-200">
                             {(result.confidence * 100).toFixed(1)}%
                          </p>
                       </div>
                       <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 font-semibold">Rule Triggers</p>
                          <p className="text-2xl font-bold font-mono text-slate-200">
                             {result.reasons.length} Flags
                          </p>
                       </div>
                    </div>

                    {/* Reasons */}
                    {result.reasons.length > 0 && (
                       <div>
                          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold border-b border-slate-800 pb-2">Analysis Log</p>
                          <ul className="space-y-2">
                             {result.reasons.map((r, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-slate-300 font-mono bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                                   <span className="text-amber-500 mt-0.5">▶</span> {r}
                                </li>
                             ))}
                          </ul>
                       </div>
                    )}
                    
                    <div className="text-center pt-2">
                       <p className="text-xs font-mono text-slate-500">Trace ID: {result.id}</p>
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Monitor;
