import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Convalt Energy | Interactive 3D Narrative',
  description: 'Six-scene browser-based 3D storytelling experience for Convalt Energy.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
