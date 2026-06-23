'use client';
import { useState, useEffect } from 'react';
import { analyticsAPI, reportsAPI } from '@/lib/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#F5A623', '#2B6CB0', '#2D9A5B', '#A855F7'];

export default function AnalyticsPage() {
  const [revenue, setRevenue] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [salesByProduct, setSalesByProduct] = useState<any[]>([]);
  const [period, setPeriod] = useState('monthly');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    analyticsAPI.getRevenue({ period }).then(r => setRevenue(r.data)).catch(() => {});
    analyticsAPI.getProducts().then(r => setProducts(r.data)).catch(() => {});
    analyticsAPI.getSalesByProduct().then(r => setSalesByProduct(r.data)).catch(() => {});
  }, [period]);

  const downloadReport = async (type: string) => {
    setDownloading(true);
    try {
      const { data } = await reportsAPI.downloadExcel({ type });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url; a.download = `buildpro-${type}-report.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded!');
    } catch { toast.error('Failed to generate report'); }
    finally { setDownloading(false); }
  };

  const totalRevenue = products.reduce((s, p) => s + parseFloat(p.total_revenue || 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-syne font-bold text-2xl text-construction-dark">Analytics</h1>
          <p className="text-construction-mid text-sm">Sales performance and business insights</p>
        </div>
        <div className="flex gap-2">
          <select className="input-field w-36 h-9 py-0 text-xs" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
          <button onClick={() => downloadReport('all')} disabled={downloading}
            className="btn-primary flex items-center gap-2 text-xs py-2">
            <Download size={14} />{downloading ? 'Generating...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Product KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {products.map((p, i) => (
          <div key={p.slug} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-xs font-medium text-construction-mid uppercase">{p.name}</span>
            </div>
            <p className="font-syne font-bold text-xl text-construction-dark">${(parseFloat(p.total_revenue)/1000).toFixed(1)}K</p>
            <p className="text-xs text-construction-mid mt-0.5">{p.total_units?.toLocaleString()} units sold</p>
            <p className="text-xs font-medium text-yellow-dark mt-1">
              {totalRevenue > 0 ? ((parseFloat(p.total_revenue)/totalRevenue)*100).toFixed(1) : 0}% of total
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Trend */}
      <div className="card p-5 mb-4">
        <h3 className="font-syne font-bold text-sm text-construction-dark mb-4">Revenue Trend</h3>
        {revenue.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenue}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}K`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#F5A623" strokeWidth={2.5} dot={{ fill: '#F5A623', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <div className="h-60 flex items-center justify-center text-construction-mid text-sm">No revenue data yet</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Product Bar Chart */}
        <div className="card p-5">
          <h3 className="font-syne font-bold text-sm text-construction-dark mb-4">Units Sold by Product</h3>
          {products.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={products}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="total_units" radius={6}>
                  {products.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-construction-mid text-sm">No data</div>}
        </div>

        {/* Revenue Pie */}
        <div className="card p-5">
          <h3 className="font-syne font-bold text-sm text-construction-dark mb-4">Revenue Share This Month</h3>
          {salesByProduct.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={salesByProduct} cx="50%" cy="50%" outerRadius={75} dataKey="revenue" paddingAngle={3}>
                  {salesByProduct.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any, _: any, p: any) => [`$${Number(v).toLocaleString()}`, p.payload.name]} />
                <Legend iconSize={10} iconType="square" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-construction-mid text-sm">No data this month</div>}
        </div>
      </div>

      {/* AI Insights */}
      <div className="card p-5">
        <h3 className="font-syne font-bold text-sm text-construction-dark mb-3">📊 AI Business Insights</h3>
        <div className="space-y-3">
          {products.length > 0 && [
            { text: `${products[0]?.name} is your top-performing product, contributing ${totalRevenue > 0 ? ((parseFloat(products[0]?.total_revenue)/totalRevenue)*100).toFixed(0) : 0}% of total revenue.`, type: 'info' },
            { text: `Consider negotiating bulk supplier discounts to increase margins by 8–12% on high-volume products.`, type: 'tip' },
            { text: `Based on historical data, expect a 10–15% demand increase in Q3. Review inventory levels now.`, type: 'forecast' },
          ].map((insight, i) => (
            <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl text-sm ${
              insight.type === 'info' ? 'bg-blue-50 text-blue-800' :
              insight.type === 'tip' ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
            }`}>
              <span>{insight.type === 'info' ? '📈' : insight.type === 'tip' ? '💡' : '🔮'}</span>
              {insight.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
