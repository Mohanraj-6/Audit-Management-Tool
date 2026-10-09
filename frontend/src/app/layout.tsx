import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Audit Management System',
  description: 'Internal audit, finding and corrective action management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
