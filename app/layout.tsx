import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReadMind — AI Study Platform',
  description: 'Study smarter with AI-powered PDF reading',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
