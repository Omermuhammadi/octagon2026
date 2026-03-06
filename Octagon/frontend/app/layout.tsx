import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Chatbot } from "@/components/Chatbot";
import { MobileNav } from "@/components/MobileNav";
import { AuthProvider } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "OctagonOracle | Fight Analytics & Training",
  description: "Advanced fight prediction, fighter comparison, and martial arts training platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} font-sans bg-black text-white antialiased`}>
        <AuthProvider>
          <Navbar />
          <main className="pb-16 md:pb-0">
            {children}
          </main>
          <MobileNav />
          <Footer />
          <Chatbot />
        </AuthProvider>
      </body>
    </html>
  );
}
