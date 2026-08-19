import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast"; // ⚠️ استدعاء مكتبة الإشعارات
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
  themeColor: "#ffffff", // خليناه أبيض عشان النافبار الجديد
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* سطر suppressHydrationWarning هو اللي بيحل مشكلة Grammarly */}
      <body className="min-h-full flex flex-col bg-[#f8fafc]" suppressHydrationWarning>
        
        {/* ⚠️ إضافة المكون ده عشان الإشعارات تظهر فوق في النص بشياكة */}
        <Toaster 
          position="top-center" 
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
              fontWeight: 'bold',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '16px 24px',
            },
          }} 
        />

        {children}
      </body>
    </html>
  );
}