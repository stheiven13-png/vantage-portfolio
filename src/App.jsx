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
          costBasis: parseFloat(formData.costBasis)
        })
      });
      setShowAddModal(false);
      setFormData({ ticker: '', quantity: '', costBasis: '' });
      await fetchData();
    } catch (err) {
      alert("Error adding position");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'update',
          rowIndex: editingItem.rowIndex,
          quantity: parseFloat(formData.quantity),
          costBasis: parseFloat(formData.costBasis)
        })
      });
      setEditingItem(null);
      setFormData({ ticker: '', quantity: '', costBasis: '' });
      await fetchData();
      setShowAddModal(false);
    } catch (err) {
      alert("Error updating position");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rowIndex) => {
    if (!confirm("Are you sure you want to remove this position? The entire row will be deleted.")) return;
    setLoading(true);
    try {
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          rowIndex: rowIndex
        })
      });
      await fetchData();
    } catch (err) {
      alert("Error deleting position");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportStatus('Reading file...');
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const rows = text.split('\n');
        const positions = [];

        // Parse CSV
        // Simple parser: assumes Ticker, Quantity, Cost Basis columns exist in that order or by header name
        // We'll look for header indices to be smart
        let tickerIdx = 0, qtyIdx = 1, costIdx = 2;

        // Check first row for headers
        const headers = rows[0].toLowerCase().split(',').map(h => h.trim());
        if (headers.includes('ticker')) tickerIdx = headers.indexOf('ticker');
        if (headers.includes('quantity')) qtyIdx = headers.indexOf('quantity');
        if (headers.includes('cost basis')) costIdx = headers.indexOf('cost basis');

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',');
          if (cols.length < 2) continue;

          const ticker = cols[tickerIdx]?.trim();
          const qty = parseFloat(cols[qtyIdx]);
          const cost = parseFloat(cols[costIdx]);

          if (ticker && !isNaN(qty)) {
            positions.push({
              ticker: ticker.toUpperCase(),
              quantity: qty,
              costBasis: isNaN(cost) ? 0 : cost
            });
          }
        }

        if (positions.length === 0) {
          setImportStatus('Error: No valid positions found in CSV.');
          return;
        }

        setImportStatus(`Uploading ${positions.length} positions...`);
        setLoading(true);

        await fetch(apiUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'bulkAdd',
            positions: positions
          })
        });

        setShowImportModal(false);
        setImportStatus('');
        await fetchData();

      } catch (err) {
        console.error(err);
        setImportStatus('Error processing file.');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ ticker: '', quantity: '', costBasis: '' });
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      ticker: item.ticker,
      quantity: item.quantity,
      costBasis: item.costBasis
    });
    setShowAddModal(true);
  };

  // --- Derived Metrics ---
  const totalCost = useMemo(() => data.reduce((acc, item) => acc + (item.quantity * item.costBasis), 0), [data]);
  const totalReturn = totalValue - totalCost;
  const totalReturnPct = totalCost > 0 ? (totalReturn / totalCost) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-emerald-900 selection:text-emerald-100 pb-20">

      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-teal-700 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Vantage</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className={`p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-emerald-400 transition-all ${loading ? 'animate-spin text-emerald-500' : ''}`}
              title="Refresh Data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 pt-8">

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl flex items-center gap-3 text-red-200">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Empty State / Onboarding */}
        {!apiUrl && !showSettings && (
          <div className="mb-8 p-6 bg-blue-900/10 border border-blue-800/50 rounded-xl flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="p-3 bg-blue-900/30 rounded-full shrink-0">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-100 text-lg">Connect your Portfolio</h3>
              <p className="text-sm text-blue-300/80 mt-1">
                Enter your Google Apps Script Web App URL in settings to start tracking your assets.
              </p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              Configure API
            </button>
          </div>
        )}

        {/* Portfolio Summary */}
        <section className="mb-10">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Net Liquidity</span>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mt-2">
            <h1 className="text-5xl font-bold tracking-tight text-white">
              {formatCurrency(totalValue)}
            </h1>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${totalReturn >= 0 ? 'bg-emerald-950/50 border-emerald-900 text-emerald-400' : 'bg-rose-950/50 border-rose-900 text-rose-400'}`}>
              {totalReturn >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span className="font-bold">{formatCurrency(Math.abs(totalReturn))}</span>
              <span className="opacity-75 text-xs font-medium">({formatPct(Math.abs(totalReturnPct))})</span>
            </div>
            <span className="text-gray-500 text-sm font-medium">All Time Return</span>
          </div>
        </section>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-200">Assets</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors active:scale-95 border border-gray-700"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-900/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Position</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Assets List */}
        <div className="grid gap-3">
          {data.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl bg-gray-900/30">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <PieChart className="text-gray-600 w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-300">No positions yet</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                Add a stock or crypto ticker or import a CSV to see your performance.
              </p>
            </div>
          ) : (
            data.map((item) => (
              <Card key={item.rowIndex} className="group hover:border-gray-700 transition-all relative overflow-hidden bg-gray-900/50 hover:bg-gray-900">
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">

                  {/* Left: Identity */}
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-sm font-bold text-white shadow-inner shrink-0">
                      {item.ticker.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-white">{item.ticker}</h3>
                        <Badge type={item.changePct >= 0 ? 'success' : 'danger'}>
                          {item.changePct >= 0 ? '+' : ''}{formatPct(item.changePct)}
                        </Badge>
                      </div>
                      <p className="text-gray-500 text-xs truncate max-w-[180px] mt-0.5">{item.name}</p>
                    </div>
                  </div>

                  {/* Middle: Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 text-sm flex-1">
                    <div>
                      <span className="block text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Price</span>
                      <span className="font-medium text-gray-200">{formatCurrency(item.price)}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Quantity</span>
                      <span className="font-medium text-gray-200">{item.quantity}</span>
                    </div>
                    <div className="hidden md:block">
                      <span className="block text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Total Return</span>
                      <span className={`font-medium ${item.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.totalReturn >= 0 ? '+' : ''}{formatCurrency(item.totalReturn)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Value & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-6 md:min-w-[160px]">
                    <div className="text-right">
                      <span className="block text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Market Value</span>
                      <span className="font-bold text-lg text-white block">{formatCurrency(item.marketValue)}</span>
                    </div>

                    {/* Hover Actions */}
                    <div className="flex flex-col gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity pl-4 border-l border-gray-800 md:border-0 md:pl-0">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 hover:bg-gray-800 rounded-md text-gray-500 hover:text-emerald-400 transition-colors"
                        title="Edit Position"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.rowIndex)}
                        className="p-1.5 hover:bg-gray-800 rounded-md text-gray-500 hover:text-rose-400 transition-colors"
                        title="Delete Position"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
                {/* Progress bar for portfolio % */}
                <div
                  className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-emerald-600 to-teal-400 opacity-50"
                  style={{ width: `${(item.marketValue / totalValue) * 100}%` }}
                />
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Configuration"
      >
        <form onSubmit={handleSaveSettings}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Google Apps Script URL</label>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Deploy your Google Sheet script as a Web App (Execute as: Me, Access: Anyone) and paste the URL here.
              </p>
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors">
              Save Connection
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportStatus('');
        }}
        title="Import CSV"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="text-emerald-500 w-5 h-5" />
              <h4 className="font-semibold text-white">CSV Format</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your CSV file should have headers. We look for columns named:
              <br />
              <code className="text-gray-300">Ticker</code>, <code className="text-gray-300">Quantity</code>, <code className="text-gray-300">Cost Basis</code>.
            </p>
          </div>

          <div className="relative border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-emerald-500/50 transition-colors">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-300 font-medium">Click to upload CSV</p>
            <p className="text-xs text-gray-500 mt-1">Max 50 rows recommended per batch</p>
          </div>

          {importStatus && (
            <div className={`text-sm text-center ${importStatus.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
              {importStatus}
            </div>
          )}
        </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        title={editingItem ? "Edit Position" : "Add New Asset"}
      >
        <form onSubmit={editingItem ? handleEditSubmit : handleAddSubmit}>
          {!editingItem && (
            <div className="mb-5">
              <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Ticker Symbol</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.ticker}
                  onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                  placeholder="e.g. AAPL, BTCUSD"
                  className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 pl-10 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 uppercase font-mono"
                  required
                />
                <DollarSign className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Stocks: <span className="font-mono text-gray-400">AAPL</span> ·
                Crypto: <span className="font-mono text-gray-400">CURRENCY:BTCUSD</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Quantity</label>
              <input
                type="number"
                step="any"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0.00"
                className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Avg Cost Basis</label>
              <input
                type="number"
                step="any"
                value={formData.costBasis}
                onChange={(e) => setFormData({ ...formData, costBasis: e.target.value })}
                placeholder="0.00"
                className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {editingItem ? 'Update Position' : 'Add to Portfolio'}
          </button>
        </form>
      </Modal>

    </div>
  );
}
