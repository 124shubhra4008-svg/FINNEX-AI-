import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { CurrencyProvider } from "@/lib/CurrencyContext";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FINNEX AI+ [build10] | Intelligent Financial Wellness",
  description: "AI-powered personal finance platform with budgeting, predictions, and a financial coach chatbot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body>
        <CurrencyProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 min-w-0">
              <MobileNav />
              <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fade-in-up">{children}</main>
            </div>
          </div>
        </CurrencyProvider>
      </body>
    </html>
  );
}
