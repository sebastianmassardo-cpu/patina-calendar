import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Patina Orders Dashboard',
  description: 'A polished orders dashboard powered by Supabase and kept up to date by the local Excel watcher.',
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
