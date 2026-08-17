import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // السطر ده هو الحل اللي هيخلي الـ build يعدي من غير اعتراض
  experimental: {
    turbopack: undefined, 
  },
};

export default withPWA(nextConfig);