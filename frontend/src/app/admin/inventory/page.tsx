'use client';
import { useState, useEffect } from 'react';
import { inventoryAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { AlertTriangle, XCircle, TrendingDown, Package, Plus, RefreshCw } from 'lucide-react';

const PRODUCT_ICONS: Record<string, string> = {
  cement: '🏗️', 'iron-rods': '🔩', 'concrete-blocks': '🧱', 'cement-pipes': '🛢️'
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restockModal, setRestockModal] = useState<any>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockType, setRestockType] = useState<'add'|'set'>('add');

  const load = async () => {
    setLoading(true);
    try {
      const [inv, fc] = await Promise.all([inventoryAPI.getAll(), inventoryAPI.getForecast()]);
      setInventory(inv.data); setForecast(fc.data);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRestock = async () => {
    if (!restockQty || !restockModal) return;
    try {
      await inventoryAPI.updateStock(restockModal.id, { quantity: parseInt(restockQty), type: restockType });
      toast.success(`Stock ${restockType === 'add' ? 'added' : 'updated'} for ${restockModal.name}`);
      setRestockModal(null); setRestockQty('');
      load();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to update stock'); }
  };

  const alertItems = inventory.filter(i => i.stock_status !== 'in_stock');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-syne font-bold text-2xl text-construction-dark">Inventory</h1>
          <p className="text-construction-mid text-sm">Real-time stock levels and forecasting</p>
        </div>
        <button onClick={load} className="btn-outline flex items-center gap-2 text-xs"><RefreshCw size={14} />Refresh</button>
      </div>

      {/* Alerts */}
      {alertItems.length > 0 && (
        <div className="space-y-3 mb-6">
          {alertItems.map(item => (
            <div key={item.id} className={`flex items-start gap-3 p-4 rounded-xl border ${
              item.stock_status === 'out_of_stock'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {item.stock_status === 'out_of_stock'
                ? <XCircle size={18} className="flex-shrink-0 mt-0.5" />
                : <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {item.name} — {item.stock_status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                  {item.stock_status === 'out_of_stock'
                    ? `Immediate reorder needed. Avg monthly sales: ${item.avg_monthly_sales} units.`
                    : `${item.current_stock} units left. At current rate, depletes in ~${item.days_until_depletion} days. Recommended reorder: ${item.recommended_reorder} units.`}
                </p>
              </div>
              <button onClick={() => { setRestockModal(item); setRestockQty(''); }}
                className="text-xs font-medium px-3 py-1.5 bg-white rounded-lg border border-current opacity-70 hover:opacity-100 transition-opacity flex-shrink-0">
                Restock
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stock Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {(loading ? Array(4).fill(null) : inventory).map((item, i) => (
          <div key={item?.id || i} className="card p-5">
            {!item ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-200 rounded" />
                <div className="h-8 bg-gray-200 rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{PRODUCT_ICONS[item.slug]}</span>
                    <span className="font-syne font-bold text-sm text-construction-dark">{item.name}</span>
                  </div>
                  <span className={`badge-${item.stock_status}`}>
                    {item.stock_status === 'in_stock' ? 'Good' : item.stock_status === 'low_stock' ? 'Low' : 'Out'}
                  </span>
                </div>

                {/* Stock bar */}
                <div className="mb-2">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((item.current_stock / item.max_capacity) * 100, 100)}%`,
                        background: item.stock_status === 'out_of_stock' ? '#D94F3D' : item.stock_status === 'low_stock' ? '#F5A623' : '#2D9A5B'
                      }} />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-construction-mid">
                    <span className="font-medium text-construction-dark">{item.current_stock.toLocaleString()} {item.unit}s</span>
                    <span>{item.max_capacity.toLocaleString()} max</span>
                  </div>
                </div>

                <div className="text-xs text-construction-mid space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span>Avg monthly sales</span>
                    <span className="font-medium">{item.avg_monthly_sales}</span>
                  </div>
                  {item.days_until_depletion && (
                    <div className="flex justify-between">
                      <span>Est. depletion</span>
                      <span className="font-medium">{item.days_until_depletion} days</span>
                    </div>
                  )}
                </div>

                <button onClick={() => { setRestockModal(item); setRestockQty(''); }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-yellow-dark bg-yellow-light hover:bg-yellow-DEFAULT hover:text-white rounded-lg transition-all">
                  <Plus size={13} /> Restock
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Forecast Table */}
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingDown size={16} className="text-yellow-dark" />
          <h2 className="font-syne font-bold text-sm text-construction-dark">Inventory Forecast — Next Month</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Product','Current Stock','Avg Monthly Sales','Next Month Demand','Reorder Qty','Est. Depletion Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-construction-mid uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forecast.map((row: any) => (
                <tr key={row.slug} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium text-construction-dark flex items-center gap-2">
                    <span>{PRODUCT_ICONS[row.slug]}</span>{row.name}
                  </td>
                  <td className="px-4 py-3">{Number(row.current_stock).toLocaleString()}</td>
                  <td className="px-4 py-3">{Number(row.avg_monthly_sales).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-amber-700">{Number(row.next_month_demand).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${Number(row.reorder_quantity) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {Number(row.reorder_quantity) > 0 ? `+${Number(row.reorder_quantity).toLocaleString()}` : '✓ Sufficient'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-construction-mid">
                    {row.estimated_depletion_date ? new Date(row.estimated_depletion_date).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-syne font-bold text-lg text-construction-dark mb-1">Restock {restockModal.name}</h3>
            <p className="text-sm text-construction-mid mb-4">Current stock: {restockModal.current_stock.toLocaleString()} units</p>
            <div className="mb-4">
              <label className="text-xs font-medium text-construction-mid mb-2 block">Update Type</label>
              <div className="flex gap-2">
                {(['add','set'] as const).map(t => (
                  <button key={t} onClick={() => setRestockType(t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all capitalize ${restockType === t ? 'bg-yellow-DEFAULT text-white' : 'bg-gray-100 text-construction-mid'}`}>
                    {t === 'add' ? '+ Add Stock' : 'Set to Value'}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="text-xs font-medium text-construction-mid mb-1 block">
                {restockType === 'add' ? 'Quantity to Add' : 'New Stock Level'}
              </label>
              <input className="input-field" type="number" min="1" value={restockQty}
                onChange={e => setRestockQty(e.target.value)} placeholder="Enter quantity" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRestockModal(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleRestock} disabled={!restockQty} className="btn-primary flex-1 disabled:opacity-50">Update Stock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
