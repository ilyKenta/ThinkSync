
import type { Metadata } from "next";
import "./globals.css";
import { Inter } from 'next/font/google';
import { ChakraProvider } from '@chakra-ui/react';
import { AuthProvider } from './context/AuthContext';

const inter = Inter({
  variable:"--font-primary",
  subsets: ['latin'] });



export const metadata: Metadata = {
  title: "ThinkSync",
  description: "ThinkSync collaboration web app",
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true} className={inter.variable}>
        <ChakraProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ChakraProvider>
      </body>
    </html>
  );
}