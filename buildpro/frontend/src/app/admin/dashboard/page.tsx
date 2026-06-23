'use client';
import { useState, useEffect } from 'react';
import { analyticsAPI, notificationsAPI } from '@/lib/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Package, ShoppingCart, Clock, AlertTriangle } from 'lucide-react';

const COLORS = ['#F5A623', '#2D9A5B', '#2B6CB0', '#D94F3D'];

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    analyticsAPI.getDashboard().then(r => setStats(r.data)).catch(() => {});
    analyticsAPI.getRevenue({ period: 'monthly' }).then(r => setRevenue(r.data)).catch(() => {});
    analyticsAPI.getProducts().then(r => setProducts(r.data)).catch(() => {});
    analyticsAPI.getOrderBreakdown().then(r => setBreakdown(r.data)).catch(() => {});
    notificationsAPI.getAll().then(r => setNotifications(r.data.slice(0,5))).catch(() => {});
  }, []);

  const KPIs = stats ? [
    { label: 'Monthly Revenue', value: `$${(stats.monthlyRevenue/1000).toFixed(1)}K`, icon: TrendingUp, trend: `+${stats.monthlyGrowth}%`, up: parseFloat(stats.monthlyGrowth) > 0 },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart, trend: 'All time', up: true },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: Clock, trend: 'Needs review', up: false },
    { label: 'Low Stock Alerts', value: stats.lowStockCount, icon: AlertTriangle, trend: 'Action needed', up: false },
  ] : [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-syne font-bold text-2xl text-construction-dark">Dashboard</h1>
        <p className="text-construction-mid text-sm">Welcome back — here's what's happening today</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KPIs.map(({ label, value, icon: Icon, trend, up }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-construction-mid uppercase tracking-wide font-medium">{label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${up ? 'bg-green-50' : 'bg-red-50'}`}>
                <Icon size={16} className={up ? 'text-green-600' : 'text-red-500'} />
              </div>
            </div>
            <p className="font-syne font-bold text-2xl text-construction-dark mb-1">{value ?? '—'}</p>
            <p className={`text-xs font-medium ${up ? 'text-green-600' : 'text-amber-600'}`}>{trend}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-syne font-bold text-sm text-construction-dark mb-4">Monthly Revenue 2026</h3>
          {revenue.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenue}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}K`} />
                <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#F5A623" strokeWidth={2.5} dot={{ fill: '#F5A623', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-syne font-bold text-sm text-construction-dark mb-4">Orders by Status</h3>
          {breakdown.length > 0 && (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={breakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="count" paddingAngle={3}>
                    {breakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, _: any, p: any) => [v, p.payload.status]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {breakdown.map((b: any, i: number) => (
                  <div key={b.status} className="flex items-center gap-1.5 text-xs text-construction-mid">
                    <div className="w-2 h-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    {b.status} {b.percentage}%
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Product Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-syne font-bold text-sm text-construction-dark mb-4">Product Performance</h3>
          {products.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={products} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="total_revenue" fill="#F5A623" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-syne font-bold text-sm text-construction-dark mb-3">Recent Notifications</h3>
          <div className="space-y-3">
            {notifications.length === 0 && <p className="text-construction-mid text-sm">No notifications</p>}
            {notifications.map((n: any) => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl ${n.is_read ? 'bg-gray-50' : 'bg-yellow-light'}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.is_read ? 'bg-gray-300' : 'bg-yellow-DEFAULT'}`} />
                <div>
                  <p className="text-xs font-medium text-construction-dark">{n.title}</p>
                  <p className="text-xs text-construction-mid mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
