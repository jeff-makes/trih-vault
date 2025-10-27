import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Rest Is History Timeline',
  description: 'A visual, searchable timeline of The Rest Is History podcast',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
