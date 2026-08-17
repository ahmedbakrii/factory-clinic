"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // التأكد إن المستخدم مسجل دخول
    const session = localStorage.getItem("clinic_session");
    if (!session) {
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) {
    return <div className="h-screen flex items-center justify-center bg-[#f1f5f9]"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#f8fafc]" dir="rtl">
      <Navbar />
      <main className="flex-1 w-full relative">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}