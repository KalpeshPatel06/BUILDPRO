'use client';
import { useState, useEffect } from 'react';
import { chatbotAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Brain, Save, X } from 'lucide-react';

const CATEGORIES = ['product', 'delivery', 'business', 'order', 'payment', 'contact', 'faq'];

export default function ChatbotPage() {
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: 'product', question: '', answer: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  const load = async () => {
    setLoading(true);
    try { const { data } = await chatbotAPI.getKnowledge(); setKnowledge(data); }
    catch { toast.error('Failed to load knowledge base'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) return toast.error('Question and answer required');
    setSaving(true);
    try {
      if (editId) {
        await chatbotAPI.updateKnowledge(editId, form);
        toast.success('Knowledge updated');
      } else {
        await chatbotAPI.addKnowledge(form);
        toast.success('Knowledge added');
      }
      setForm({ category: 'product', question: '', answer: '' });
      setEditId(null); load();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleEdit = (item: any) => {
    setEditId(item.id);
    setForm({ category: item.category, question: item.question, answer: item.answer });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this knowledge entry?')) return;
    try { await chatbotAPI.deleteKnowledge(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const filtered = filterCat === 'all' ? knowledge : knowledge.filter(k => k.category === filterCat);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-syne font-bold text-2xl text-construction-dark">AI & Insights</h1>
        <p className="text-construction-mid text-sm">Manage the chatbot's knowledge base</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Add/Edit Form */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={18} className="text-yellow-dark" />
              <h3 className="font-syne font-bold text-sm text-construction-dark">
                {editId ? 'Edit Entry' : 'Add Knowledge'}
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Category</label>
                <select className="input-field" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Question</label>
                <input className="input-field" value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  placeholder="e.g. What is the price of cement?" />
              </div>
              <div>
                <label className="text-xs font-medium text-construction-mid mb-1 block">Answer</label>
                <textarea className="input-field resize-none h-28" value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                  placeholder="Detailed answer the chatbot will use..." />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="btn-primary flex items-center gap-2 flex-1 justify-center">
                  <Save size={14} />{saving ? 'Saving...' : editId ? 'Update' : 'Add Entry'}
                </button>
                {editId && (
                  <button onClick={() => { setEditId(null); setForm({ category: 'product', question: '', answer: '' }); }}
                    className="btn-outline px-3">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card p-5 mt-4">
            <h3 className="font-syne font-bold text-sm text-construction-dark mb-3">Knowledge Stats</h3>
            <div className="space-y-2">
              {CATEGORIES.map(cat => {
                const count = knowledge.filter(k => k.category === cat).length;
                if (!count) return null;
                return (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="text-construction-mid capitalize">{cat}</span>
                    <span className="font-medium text-construction-dark">{count} entries</span>
                  </div>
                );
              })}
              <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-medium">
                <span>Total</span><span>{knowledge.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge List */}
        <div className="lg:col-span-3">
          <div className="flex flex-wrap gap-2 mb-3">
            {['all', ...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize ${filterCat === cat ? 'bg-yellow-DEFAULT text-white' : 'bg-white border border-gray-200 text-construction-mid hover:border-yellow-DEFAULT'}`}>
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">{Array(4).fill(0).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-200 rounded w-full" />
                <div className="h-2 bg-gray-200 rounded w-2/3" />
              </div>
            ))}</div>
          ) : filtered.length === 0 ? (
            <div className="card p-8 text-center">
              <Brain size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-construction-mid text-sm">No entries in this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(item => (
                <div key={item.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs px-2 py-0.5 bg-yellow-light text-yellow-dark rounded-full font-medium capitalize">{item.category}</span>
                        {!item.is_active && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Inactive</span>}
                      </div>
                      <p className="text-sm font-medium text-construction-dark mb-1">{item.question}</p>
                      <p className="text-xs text-construction-mid line-clamp-2">{item.answer}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleEdit(item)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
