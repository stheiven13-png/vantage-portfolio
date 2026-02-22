import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  TrendingUp,
  PieChart,
  Settings,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Upload,
  FileText
} from 'lucide-react';

// --- UI Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-gray-900 border border-gray-800 rounded-xl shadow-sm ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, type = "neutral" }) => {
  const styles = {
    success: "bg-emerald-900/30 text-emerald-400 border-emerald-800",
    danger: "bg-rose-900/30 text-rose-400 border-rose-800",
    neutral: "bg-gray-800 text-gray-300 border-gray-700"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[type]}`}>
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- New Chart Components ---

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444'];

const DonutChart = ({ data, totalValue }) => {
  if (!data || data.length === 0 || totalValue === 0) return null;

  let cumulativePercent = 0;

  // Sort data by market value descending for a cleaner chart
  const sortedData = [...data].sort((a, b) => b.marketValue - a.marketValue);

  return (
    <div className="flex flex-col md:flex-row items-center gap-8 bg-gray-900/50 p-6 rounded-xl border border-gray-800">
      <div className="relative w-48 h-48 shrink-0">
        <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
          {sortedData.map((item, i) => {
            const percent = (item.marketValue / totalValue) * 100;
            const dashArray = `${percent} ${100 - percent}`;
            const dashOffset = -cumulativePercent;
            cumulativePercent += percent;

            return (
              <circle
                key={item.ticker}
                r="15.91549430918954" // Radius to make circumference exactly 100
                cx="21"
                cy="21"
                fill="transparent"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth="6"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                className="transition-all duration-500 ease-in-out hover:stroke-[7px]"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Total</span>
          <span className="text-white font-bold text-lg">Mix</span>
        </div>
      </div>

      <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sortedData.map((item, i) => (
          <div key={item.ticker} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-200">{item.ticker}</span>
              <span className="text-xs text-gray-500">
                {((item.marketValue / totalValue) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AssetLineChart = ({ currentPrice, ticker }) => {
  const [range, setRange] = useState('30D');

  // NOTE: This is MOCK data generation for visual purposes. 
  // Your API needs to return historical arrays for this to be real.
  const mockDataPoints = useMemo(() => {
    let points = [];
    let count = range === '30D' ? 30 : range === '6M' ? 30 : range === '1Y' ? 50 : 100;
    let volatility = range === '30D' ? 0.02 : range === '6M' ? 0.05 : 0.1;
    let basePrice = currentPrice * (1 - (Math.random() * 0.2 - 0.1)); // Start somewhere near current

    for (let i = 0; i < count; i++) {
      points.push(basePrice);
      basePrice = basePrice * (1 + (Math.random() * volatility - (volatility / 2)));
    }
    points[points.length - 1] = currentPrice; // End exactly at current price
    return points;
  }, [range, currentPrice]);

  const min = Math.min(...mockDataPoints);
  const max = Math.max(...mockDataPoints);
  const spread = max - min || 1;

  // Generate SVG Path
  const pointsString = mockDataPoints.map((val, i) => {
    const x = (i / (mockDataPoints.length - 1)) * 100;
    const y = 100 - (((val - min) / spread) * 100);
    return `${x},${y}`;
  }).join(' ');

  const isPositive = mockDataPoints[mockDataPoints.length - 1] >= mockDataPoints[0];
  const strokeColor = isPositive ? '#10b981' : '#ef4444'; // Emerald or Rose

  return (
    <div className="w-full flex flex-col gap-2 mt-4 pt-4 border-t border-gray-800">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Price History (Mock Data)</span>
        <div className="flex bg-gray-950 rounded-md border border-gray-800 overflow-hidden">
          {['30D', '6M', '1Y', '3Y'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 text-[10px] font-medium transition-colors ${range === r
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
                }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-16 w-full relative">
        <svg viewBox="0 -5 100 110" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <polyline
            points={pointsString}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
};

// --- Main Application ---

export default function App() {
  // --- State ---
  const [apiUrl, setApiUrl] = useState(() => {
    try {
      return localStorage.getItem('portfolio_api_url') || '';
    } catch {
      return '';
    }
  });

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({ ticker: '', quantity: '', costBasis: '' });
  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState('');

  // --- Formatters ---
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatPct = (val) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(val);

  // --- Actions ---

  useEffect(() => {
    if (apiUrl) {
      fetchData();
    } else {
      setShowSettings(true);
    }
  }, []);

  const fetchData = async () => {
    if (!apiUrl) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}?action=read&t=${new Date().getTime()}`);
      const json = await response.json();

      if (json.error) {
        throw new Error(json.error);
      }

      if (json.data) {
        setData(json.data);
        setTotalValue(json.totalValue);
      }
    } catch (err) {
      console.error("Failed to fetch", err);
      setError("Failed to connect to Google Sheet. Check your URL and internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('portfolio_api_url', apiUrl);
    setShowSettings(false);
    fetchData();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'add',
          ticker: formData.ticker.trim(),
          quantity: parseFloat(formData.quantity),