import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { Activity, ShieldAlert, CheckCircle2, TrendingUp, AlertOctagon } from 'lucide-react';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    fraud: 0,
    safe: 0,
    highRisk: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const { user } = useAuth();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        };
        const { data } = await axios.get('http://localhost:5000/api/transactions?limit=100', config);
        
        setTransactions(data);
        
        const fraudCount = data.filter(t => t.fraud).length;
        const highRiskCount = data.filter(t => t.riskScore === 'high').length;
        
        setStats({
          total: data.length,
          fraud: fraudCount,
          safe: data.length - fraudCount,
          highRisk: highRiskCount,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    
    fetchData();
  }, []);

  // Risk Distribution Chart
  const doughnutData = {
    labels: ['Safe', 'Medium Risk', 'High Risk'],
    datasets: [
      {
         data: [
           transactions.filter(t => t.riskScore === 'low').length || 1,
           transactions.filter(t => t.riskScore === 'medium').length || 0,
           transactions.filter(t => t.riskScore === 'high').length || 0,
         ],
         backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
         borderWidth: 0,
         hoverOffset: 4,
      }
    ]
  };

  // Transaction Volume Line Chart
  const lineData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Safe Volume',
        data: [120, 190, 150, 220, 180, 250, 210],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Fraud Alerts',
        data: [12, 19, 15, 25, 22, 10, 5],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#64748b' } }
    },
    scales: {
      y: { grid: { color: '#e2e8f0', borderDash: [5, 5] }, ticks: { color: '#64748b' } },
      x: { grid: { display: false }, ticks: { color: '#64748b' } }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: { legend: { position: 'bottom', labels: { color: '#64748b' } } }
  };

  return (
    <div className="animate-fade-in pb-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Overview Dashboard</h1>
        <p className="text-slate-500 mt-1">Real-time credit card transaction monitoring metrics.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Processed" 
          value={stats.total} 
          icon={<Activity className="text-blue-500" />} 
          trend="+12%" 
          bg="bg-blue-50 border-blue-100" 
        />
         <StatCard 
          title="Safe Transactions" 
          value={stats.safe} 
          icon={<CheckCircle2 className="text-emerald-500" />} 
          trend="+14%" 
          bg="bg-emerald-50 border-emerald-100" 
        />
        <StatCard 
          title="Fraud Prevented" 
          value={stats.fraud} 
          icon={<ShieldAlert className="text-amber-500" />} 
          trend="-2%" 
          bg="bg-amber-50 border-amber-100" 
        />
        <StatCard 
          title="High Risk Alerts" 
          value={stats.highRisk} 
          icon={<AlertOctagon className="text-red-500" />} 
          trend="+5%" 
          bg="bg-red-50 border-red-100" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">Transaction Volume</h2>
              <select className="bg-slate-50 border border-slate-200 text-sm font-medium text-slate-600 rounded-lg py-1.5 px-3 outline-none">
                <option>This Week</option>
                <option>This Month</option>
                <option>This Year</option>
              </select>
           </div>
           <div className="h-72 w-full">
             <Line data={lineData} options={chartOptions} />
           </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative flex flex-col">
           <h2 className="text-lg font-bold text-slate-800 mb-6">Risk Distribution</h2>
           <div className="flex-1 min-h-[250px] relative flex justify-center items-center h-full w-full">
             <Doughnut data={doughnutData} options={doughnutOptions} />
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-800">{stats.total}</span>
                <span className="text-xs text-slate-500 font-medium tracking-wider uppercase">Scored</span>
             </div>
           </div>
        </div>
      </div>

      {/* Recent High Risk */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Recent High Risk Activity</h2>
          <button className="text-sm font-medium text-emerald-600 hover:text-emerald-500 transition-colors">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Merchant</th>
                <th className="px-6 py-4 text-center">Confidence</th>
                <th className="px-6 py-4">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.filter(t => t.riskScore === 'high' || t.riskScore === 'medium').slice(0, 5).map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 group-hover:text-slate-700">{t._id.substring(0, 8)}...</td>
                  <td className="px-6 py-4 font-medium text-slate-800">${t.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 capitalize">{t.merchant}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center justify-center w-12 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {(t.confidence * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                      ${t.riskScore === 'high' ? 'bg-red-50 text-red-700 border-red-200' : 
                        t.riskScore === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        'bg-emerald-50 text-emerald-700 border-emerald-200'}
                    `}>
                      <span className={`w-1.5 h-1.5 rounded-full ${t.riskScore === 'high' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                      <span className="capitalize">{t.riskScore}</span>
                    </span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                   <td colSpan="5" className="px-6 py-8 text-center text-slate-400">Loading recent alerts...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend, bg }) => (
  <div className={`rounded-2xl border p-5 transition-shadow hover:shadow-md ${bg}`}>
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-slate-500 font-medium text-sm mb-1">{title}</h3>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
        {icon}
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      <TrendingUp size={16} className={trend.startsWith('+') ? 'text-emerald-500 mr-1' : 'text-red-500 mr-1'} />
      <span className={trend.startsWith('+') ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
        {trend}
      </span>
      <span className="text-slate-400 ml-2">vs last week</span>
    </div>
  </div>
);

export default Dashboard;
