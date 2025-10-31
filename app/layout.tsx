import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Rest Is History Explorer',
  description: 'Browse The Rest Is History episodes and series along a chronological timeline.'
};

export default function RootLayout(props: Readonly<{ children: React.ReactNode }>) {
  const { children } = props;

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

