import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Patina Calendar',
  description: 'Online orders calendar powered by Supabase and fed by the local Excel watcher.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
