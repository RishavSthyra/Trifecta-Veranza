import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import RouteChrome from "@/components/RouteChrome";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "My App",
  description: "Portfolio / walkthrough app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", "font-sans", geist.variable)}>
      <body className="custom-scrollbar min-h-dvh w-full bg-zinc-50 text-zinc-900 antialiased dark:bg-black dark:text-white">
        <div className="relative min-h-dvh w-full overflow-x-hidden">
          <RouteChrome />

          <main className="min-h-dvh w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
