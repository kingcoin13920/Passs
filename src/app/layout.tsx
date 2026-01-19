import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Passworld - Voyage Surprise',
  description: 'Découvrez votre prochaine destination surprise',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
