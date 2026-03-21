import type { Metadata } from "next";
import { FloatingDock } from "@/components/ui/floating-dock";
import { User, Briefcase, FileText } from "lucide-react";
import { PiMapPinAreaFill } from "react-icons/pi";
import { IoMapOutline } from "react-icons/io5";
import { BiHome } from "react-icons/bi";
import "./globals.css";
import UpperLayoutCTA from "@/components/UpperLayoutCTA";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "My App",
  description: "Portfolio / walkthrough app",
};

const dockItems = [
  {
    title: "Home",
    icon: <BiHome className="h-full w-full text-neutral-100" />,
    href: "/",
  },
  {
    title: "Project Overview",
    icon: <User className="h-full w-full text-neutral-100" />,
    href: "/project-overview",
  },
  {
    title: "Master Plan",
    icon: <PiMapPinAreaFill className="h-full w-full text-neutral-100" />,
    href: "/master-plan",
  },
  {
    title: "Map",
    icon: <IoMapOutline className="h-full w-full text-neutral-100" />,
    href: "/area-map",
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", "font-sans", geist.variable)}>
      <body className="min-h-dvh w-full bg-zinc-50 text-zinc-900 antialiased dark:bg-black dark:text-white">
        <div className="relative min-h-dvh w-full overflow-x-hidden">
          <FloatingDock
            items={dockItems}
            desktopClassName="fixed left-6 top-1/2 z-50 hidden -translate-y-1/2 md:flex"
            mobileClassName="fixed bottom-4 right-4 z-50 md:hidden"
          />

          <UpperLayoutCTA />

          <main className="min-h-dvh w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}