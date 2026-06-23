'use client';
import { useState, useEffect } from 'react';
import { productsAPI, ordersAPI, appointmentsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Building2, Package, Phone, Mail, MapPin, MessageCircle, CheckCircle, AlertTriangle, XCircle, ChevronRight, Star } from 'lucide-react';
import ChatBot from '@/components/chat/ChatBot';

const PRODUCT_ICONS: Record<string, string> = {
  cement: '🏗️', 'iron-rods': '🔩', 'concrete-blocks': '🧱', 'cement-pipes': '🛢️'
};

const PRODUCT_COLORS: Record<string, string> = {
  cement: 'bg-amber-50', 'iron-rods': 'bg-blue-50', 'concrete-blocks': 'bg-green-50', 'cement-pipes': 'bg-purple-50'
};

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    delivery_address: '', product_id: '', quantity: '', notes: '', delivery_date: ''
  });
  const [aptForm, setAptForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    appointment_date: '', appointment_time: '09:00', purpose: 'Site consultation'
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submittingApt, setSubmittingApt] = useState(false);

  useEffect(() => {
    productsAPI.getAll().then(r => setProducts(r.data)).catch(() => {});
  }, []);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.product_id) return toast.error('Please select a product');
    setSubmittingOrder(true);
    try {
      await ordersAPI.create({ ...orderForm, quantity: parseInt(orderForm.quantity) });
      toast.success('Order submitted! We\'ll confirm within 24 hours.');
      setOrderForm({ customer_name: '', customer_email: '', customer_phone: '', delivery_address: '', product_id: '', quantity: '', notes: '', delivery_date: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingApt(true);
    try {
      await appointmentsAPI.create(aptForm);
      toast.success('Appointment booked! You\'ll receive a confirmation email.');
      setAptForm({ customer_name: '', customer_email: '', customer_phone: '', appointment_date: '', appointment_time: '09:00', purpose: 'Site consultation' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to book appointment');
    } finally {
      setSubmittingApt(false);
    }
  };

  const getStockStatus = (product: any) => {
    if (!product.current_stock || product.current_stock === 0) return { label: 'Out of Stock', icon: XCircle, class: 'text-red-600 bg-red-50' };
    if (product.current_stock <= product.low_stock_threshold) return { label: `${product.current_stock} (Low)`, icon: AlertTriangle, class: 'text-amber-600 bg-amber-50' };
    return { label: `${product.current_stock.toLocaleString()} available`, icon: CheckCircle, class: 'text-green-600 bg-green-50' };
  };

  return (
    <div className="min-h-screen bg-construction-light font-dm">
      {/* Navbar */}
      <nav className="bg-construction-dark sticky top-0 z-50 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-DEFAULT rounded-lg flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <span className="font-syne font-bold text-white text-lg">BuildPro</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#products" className="text-gray-400 hover:text-white text-sm transition-colors">Products</a>
          <a href="#order" className="text-gray-400 hover:text-white text-sm transition-colors">Order</a>
          <a href="#appointment" className="text-gray-400 hover:text-white text-sm transition-colors">Appointment</a>
          <a href="/admin/login" className="text-xs text-gray-500 hover:text-yellow-DEFAULT transition-colors">Admin</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-construction-dark text-white py-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-DEFAULT opacity-10 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-yellow-DEFAULT/20 text-yellow-DEFAULT text-xs px-3 py-1.5 rounded-full mb-4">
            <Star size={12} /> Premium Construction Supplier
          </div>
          <h1 className="font-syne font-extrabold text-4xl md:text-5xl leading-tight mb-4">
            Build Stronger,<br />Build Smarter
          </h1>
          <p className="text-gray-400 text-lg mb-8 max-w-xl">
            Bulk cement, iron rods, concrete blocks & cement pipes. Industrial-grade quality, competitive bulk pricing, reliable delivery.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#order" className="btn-primary">Place Bulk Order</a>
            <button onClick={() => setShowChat(true)} className="btn-outline text-white border-white/20 hover:border-yellow-DEFAULT hover:text-yellow-DEFAULT">
              Ask AI Assistant
            </button>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-syne font-bold text-2xl text-construction-dark mb-1">Our Products</h2>
          <p className="text-construction-mid text-sm mb-6">Industrial-grade materials sold in bulk quantities only</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map(p => {
              const stock = getStockStatus(p);
              const StockIcon = stock.icon;
              return (
                <div key={p.id} className="card p-5 hover:-translate-y-1 transition-transform cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${PRODUCT_COLORS[p.slug] || 'bg-gray-50'} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                      {PRODUCT_ICONS[p.slug] || '📦'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-syne font-bold text-construction-dark">{p.name}</h3>
                        <span className="font-bold text-yellow-dark text-sm">${p.price_per_unit}/{p.unit}</span>
                      </div>
                      <p className="text-construction-mid text-xs mb-3 line-clamp-2">{p.description}</p>
                      <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${stock.class}`}>
                        <StockIcon size={12} />
                        {stock.label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Order Form */}
      <section id="order" className="py-12 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-syne font-bold text-2xl text-construction-dark mb-1">Request a Bulk Order</h2>
          <p className="text-construction-mid text-sm mb-6">Fill in your details — we confirm within 24 hours</p>
          <form onSubmit={handleOrder} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Full Name *</label>
                <input className="input-field" required value={orderForm.customer_name}
                  onChange={e => setOrderForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="John Doe" />
              </div>
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Phone Number *</label>
                <input className="input-field" required value={orderForm.customer_phone}
                  onChange={e => setOrderForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="+1 234 567 8900" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Email *</label>
                <input className="input-field" type="email" required value={orderForm.customer_email}
                  onChange={e => setOrderForm(f => ({ ...f, customer_email: e.target.value }))} placeholder="john@example.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Delivery Address *</label>
                <input className="input-field" required value={orderForm.delivery_address}
                  onChange={e => setOrderForm(f => ({ ...f, delivery_address: e.target.value }))} placeholder="123 Site Rd, City" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-construction-mid mb-2 block">Select Product *</label>
              <div className="grid grid-cols-2 gap-2">
                {products.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => setOrderForm(f => ({ ...f, product_id: p.id.toString() }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm text-left transition-all ${orderForm.product_id === p.id.toString() ? 'border-yellow-DEFAULT bg-yellow-light text-yellow-dark' : 'border-gray-200 bg-gray-50 text-construction-gray hover:border-yellow-DEFAULT'}`}>
                    <span>{PRODUCT_ICONS[p.slug]}</span> {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Quantity *</label>
                <input className="input-field" type="number" required min="1" value={orderForm.quantity}
                  onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 500" />
              </div>
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Preferred Delivery Date</label>
                <input className="input-field" type="date" value={orderForm.delivery_date}
                  onChange={e => setOrderForm(f => ({ ...f, delivery_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-construction-mid mb-1 block">Notes</label>
              <input className="input-field" value={orderForm.notes}
                onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special requirements..." />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submittingOrder} className="btn-primary flex items-center gap-2">
                {submittingOrder ? 'Submitting...' : 'Submit Order Request'} <ChevronRight size={16} />
              </button>
              <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace('+','') || '15555555555'}?text=Hi, I'd like to place a bulk order`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>
          </form>
        </div>
      </section>

      {/* Appointment */}
      <section id="appointment" className="py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-syne font-bold text-2xl text-construction-dark mb-1">Book an Appointment</h2>
          <p className="text-construction-mid text-sm mb-6">Schedule a site visit or consultation — Mon to Fri, 9AM–5PM</p>
          <form onSubmit={handleAppointment} className="card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Your Name *</label>
                <input className="input-field" required value={aptForm.customer_name}
                  onChange={e => setAptForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Jane Smith" />
              </div>
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Phone *</label>
                <input className="input-field" required value={aptForm.customer_phone}
                  onChange={e => setAptForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="+1 234 567 8900" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-construction-mid mb-1 block">Email *</label>
              <input className="input-field" type="email" required value={aptForm.customer_email}
                onChange={e => setAptForm(f => ({ ...f, customer_email: e.target.value }))} placeholder="jane@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Date *</label>
                <input className="input-field" type="date" required value={aptForm.appointment_date}
                  onChange={e => setAptForm(f => ({ ...f, appointment_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Time *</label>
                <select className="input-field" value={aptForm.appointment_time}
                  onChange={e => setAptForm(f => ({ ...f, appointment_time: e.target.value }))}>
                  {['09:00','10:00','11:00','13:00','14:00','15:00','16:00'].map(t =>
                    <option key={t} value={t}>{t}</option>
                  )}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-construction-mid mb-1 block">Purpose *</label>
              <select className="input-field" value={aptForm.purpose}
                onChange={e => setAptForm(f => ({ ...f, purpose: e.target.value }))}>
                <option>Site consultation</option>
                <option>Product enquiry</option>
                <option>Bulk order discussion</option>
                <option>Delivery planning</option>
                <option>Other</option>
              </select>
            </div>
            <button type="submit" disabled={submittingApt} className="btn-primary">
              {submittingApt ? 'Booking...' : 'Book Appointment'}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-construction-dark text-white py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-yellow-DEFAULT rounded-lg flex items-center justify-center">
                <Building2 size={14} className="text-white" />
              </div>
              <span className="font-syne font-bold text-white">BuildPro</span>
            </div>
            <p className="text-gray-400 text-sm">Premium construction materials supplier. Quality you can build on.</p>
          </div>
          <div>
            <h4 className="font-syne font-bold text-sm mb-3">Contact</h4>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2"><Phone size={14} /> +1-555-BUILD</div>
              <div className="flex items-center gap-2"><Mail size={14} /> info@buildpro.com</div>
              <div className="flex items-center gap-2"><MapPin size={14} /> 123 Industrial Zone, City</div>
            </div>
          </div>
          <div>
            <h4 className="font-syne font-bold text-sm mb-3">Hours</h4>
            <div className="text-sm text-gray-400 space-y-1">
              <div>Mon–Fri: 7:30 AM – 5:30 PM</div>
              <div>Saturday: 8:00 AM – 2:00 PM</div>
              <div>Sunday: Closed</div>
            </div>
          </div>
        </div>
      </footer>

      {/* Chatbot toggle */}
      <button onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-yellow-DEFAULT text-white rounded-full shadow-lg flex items-center justify-center hover:bg-yellow-dark transition-colors z-50">
        <MessageCircle size={22} />
      </button>
      {showChat && <ChatBot onClose={() => setShowChat(false)} />}
    </div>
  );
}
