import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Common Sense Exchange',
  description:
    'A learning and dialogue platform that combines learning modules, mastery quizzes, and respectful conversations with people who see the world a little differently.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
