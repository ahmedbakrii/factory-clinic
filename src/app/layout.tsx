import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 1. إعدادات الميتا واسم التطبيق والـ PWA
export const metadata: Metadata = {
  title: "Factory Clinic",
  description: "نظام إدارة العيادة والسلامة والصحة المهنية",
  manifest: "/manifest.json",
};

// 2. إعداد لون شريط الموبايل العلوي (Theme Color)
export const viewport: Viewport = {
  themeColor: "#1e293b",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}