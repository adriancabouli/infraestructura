import './globals.css';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata = {
  title: 'Control de expedientes',
  description: 'Sistema de expedientes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
        {children}
      </body>
    </html>
  );
}