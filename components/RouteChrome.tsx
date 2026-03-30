"use client";

import { User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [isMasterPlanFlatOpen, setIsMasterPlanFlatOpen] = useState(false);
  const isAdminRoute = pathname.startsWith("/admin");
  const isImmersiveRoute = pathname === "/tower-hover-test";
  const shouldHideDock = pathname === "/master-plan" && isMasterPlanFlatOpen;

  useEffect(() => {
    if (pathname !== "/master-plan" || typeof document === "undefined") {
      return;
    }

    const syncDockVisibility = () => {
      setIsMasterPlanFlatOpen(
        document.body.dataset.masterPlanFlatOpen === "true",
      );
    };

    syncDockVisibility();

    const observer = new MutationObserver(syncDockVisibility);
    observer.observe(document.body, {
      attributeFilter: ["data-master-plan-flat-open"],
      attributes: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  if (isAdminRoute || isImmersiveRoute) {
    return null;
  }

  return (
    <>
      {!shouldHideDock ? (
        <FloatingDock
          items={dockItems}
          desktopClassName="fixed left-6 top-1/2 z-50 hidden -translate-y-1/2 md:flex"
          mobileClassName="fixed bottom-4 right-4 z-50 md:hidden"
        />
      ) : null}

      <QuoteRequestController />
    </>
  );
}
