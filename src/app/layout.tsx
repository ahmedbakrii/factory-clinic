import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast"; 
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Energya Clinic",
  description: "نظام إدارة العيادة والسلامة والصحة المهنية",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f8fafc]" suppressHydrationWarning>
        
        {/* تصميم فاجر للإشعارات (Toasts) */}
        <Toaster 
          position="top-center" 
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '100px', // شكل بيضاوي شيك
              padding: '16px 24px',
              fontWeight: '900',
              fontFamily: 'inherit',
              direction: 'rtl',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', // ظل فخم
            },
            success: {
              style: {
                background: '#ecfdf5', // خلفية خضراء فاتحة
                color: '#065f46',
                border: '1px solid #34d399',
              },
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              style: {
                background: '#fef2f2', // خلفية حمراء فاتحة
                color: '#991b1b',
                border: '1px solid #f87171',
              },
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }} 
        />

        {children}
      </body>
    </html>
  );
}
