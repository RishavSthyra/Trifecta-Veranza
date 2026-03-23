"use client";

import { User } from "lucide-react";
import { usePathname } from "next/navigation";
import { BiHome } from "react-icons/bi";
import { IoMapOutline } from "react-icons/io5";
import { PiMapPinAreaFill } from "react-icons/pi";
import QuoteRequestController from "@/components/QuoteRequestController";
import { FloatingDock } from "@/components/ui/floating-dock";

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

export default function RouteChrome() {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return null;
  }

  return (
    <>
      <FloatingDock
        items={dockItems}
        desktopClassName="fixed left-6 top-1/2 z-50 hidden -translate-y-1/2 md:flex"
        mobileClassName="fixed bottom-4 right-4 z-50 md:hidden"
      />

      <QuoteRequestController />
    </>
  );
}
