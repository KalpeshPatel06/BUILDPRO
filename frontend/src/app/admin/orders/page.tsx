'use client';
import { useState, useEffect, useCallback } from 'react';
import { ordersAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, Filter, CheckCircle, XCircle, Truck, RefreshCw } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'badge-pending', approved: 'badge-approved',
  delivered: 'badge-delivered', rejected: 'badge-rejected', processing: 'badge-approved'
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ordersAPI.getAll({ search, status, page, limit: 15 });
      setOrders(data.orders); setTotal(data.total);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: number, newStatus: string) => {
    setUpdating(id);
    try {
      await ordersAPI.updateStatus(id, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      load();
    } catch { toast.error('Failed to update order'); }
    finally { setUpdating(null); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-syne font-bold text-2xl text-construction-dark">Orders</h1>
          <p className="text-construction-mid text-sm">{total} total orders</p>
        </div>
        <button onClick={load} className="btn-outline flex items-center gap-2 text-xs"><RefreshCw size={14} />Refresh</button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-construction-mid" />
          <input className="input-field pl-8" placeholder="Search orders, customers..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-construction-mid" />
          {['all','pending','approved','processing','delivered','rejected'].map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${status === s ? 'bg-yellow-DEFAULT text-white' : 'bg-gray-100 text-construction-mid hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Order #','Customer','Product','Qty','Total','Status','Date','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-construction-mid uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-construction-mid">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-construction-mid">No orders found</td></tr>
              ) : orders.map(order => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-construction-mid">{order.order_number}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-construction-dark">{order.customer_name}</div>
                    <div className="text-xs text-construction-mid">{order.customer_email}</div>
                  </td>
                  <td className="px-4 py-3 text-construction-dark">{order.product_name}</td>
                  <td className="px-4 py-3 text-construction-dark">{order.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-construction-dark">${parseFloat(order.total_amount).toFixed(2)}</td>
                  <td className="px-4 py-3"><span className={STATUS_COLORS[order.status] || 'badge-pending'}>{order.status}</span></td>
                  <td className="px-4 py-3 text-xs text-construction-mid">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {order.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(order.id, 'approved')} disabled={updating === order.id}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Approve">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => updateStatus(order.id, 'rejected')} disabled={updating === order.id}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Reject">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {order.status === 'approved' && (
                        <button onClick={() => updateStatus(order.id, 'delivered')} disabled={updating === order.id}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Mark Delivered">
                          <Truck size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-construction-mid">Page {page} of {Math.ceil(total/15)}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-outline text-xs py-1 px-3 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => p+1)} disabled={page>=Math.ceil(total/15)} className="btn-outline text-xs py-1 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
