import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "강명균 ♥ 임결아 결혼합니다",
  description: "10월 18일, 저희 두 사람의 새로운 시작에 함께해 주세요.",
  openGraph: {
    title: "강명균 ♥ 임결아 결혼합니다",
    description: "10월 3일, 저희 두 사람의 새로운 시작에 함께해 주세요.",
    images: [
      {
        url: "https://firebasestorage.googleapis.com/v0/b/wedding-invite-e1ddc.firebasestorage.app/o/weddingInvites%2Fphoto_2026-07-18_16-25-21.jpg?alt=media&token=f3443ff3-d06d-4290-930c-c4e3e06312ee",
        width: 800,
        height: 800,
      },
    ],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
