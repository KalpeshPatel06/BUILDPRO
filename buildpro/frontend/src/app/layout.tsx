import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/hooks/useAuth';
import './globals.css';

export const metadata: Metadata = {
  title: 'BuildPro — Construction Material Supplier',
  description: 'Premium bulk construction materials: Cement, Iron Rods, Concrete Blocks, Cement Pipes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontFamily: 'DM Sans, sans-serif', borderRadius: '12px', fontSize: '14px' },
              success: { iconTheme: { primary: '#F5A623', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
