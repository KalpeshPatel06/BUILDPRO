'use client';
import { useState, useRef, useEffect } from 'react';
import { chatbotAPI } from '@/lib/api';
import { X, Send, Bot } from 'lucide-react';

interface Message { role: 'user' | 'assistant'; content: string; }

const QUICK_REPLIES = [
  'What products do you sell?',
  'Is cement in stock?',
  'How do I place a bulk order?',
  'What are your delivery times?',
  'I want to book an appointment',
];

export default function ChatBot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm BuildBot, your construction materials assistant. I can help with product info, pricing, stock, delivery, and appointments. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const { data } = await chatbotAPI.chat({ message: msg, history: messages.slice(-10) });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I\'m temporarily unavailable. Please contact us at info@buildpro.com.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-100" style={{ height: '480px' }}>
      {/* Header */}
      <div className="bg-construction-dark px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-yellow-DEFAULT rounded-full flex items-center justify-center flex-shrink-0">
          <Bot size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="font-syne font-bold text-white text-sm">BuildBot</div>
          <div className="text-gray-400 text-xs">AI Construction Assistant</div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
              msg.role === 'user'
                ? 'bg-yellow-DEFAULT text-white rounded-tr-sm'
                : 'bg-gray-100 text-construction-dark rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        {/* Quick replies on first message */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_REPLIES.map(qr => (
              <button key={qr} onClick={() => sendMessage(qr)}
                className="text-xs border border-yellow-DEFAULT text-yellow-dark px-2.5 py-1 rounded-full hover:bg-yellow-light transition-colors">
                {qr}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3 flex gap-2">
        <input
          className="flex-1 text-sm px-3 py-2 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:border-yellow-DEFAULT transition-colors"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about products, delivery..."
          disabled={loading}
        />
        <button onClick={() => sendMessage()}
          className="w-9 h-9 bg-yellow-DEFAULT rounded-full flex items-center justify-center text-white hover:bg-yellow-dark transition-colors flex-shrink-0 disabled:opacity-50"
          disabled={loading || !input.trim()}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
