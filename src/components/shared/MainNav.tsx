"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  GitBranch,
  DollarSign,
  FolderKanban,
  Layers,
  CheckSquare,
  Settings,
  Menu,
  X,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";

interface MainNavProps {
  userRole?: string;
}

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Leads",
    href: "/leads",
    icon: Users,
  },
  {
    name: "Contatos",
    href: "/contacts",
    icon: Users,
  },
  {
    name: "Organizações",
    href: "/organizations",
    icon: Building2,
  },
  {
    name: "Parceiros",
    href: "/partners",
    icon: Handshake,
  },
  {
    name: "Pipelines",
    href: "/pipelines",
    icon: GitBranch,
  },
  {
    name: "Negócios",
    href: "/deals",
    icon: DollarSign,
  },
  {
    name: "Projetos",
    href: "https://projects.wbdigitalsolutions.com/projects",
    icon: FolderKanban,
    external: true,
  },
  {
    name: "Pipeline",
    href: "/pipeline",
    icon: Layers,
  },
  {
    name: "Atividades",
    href: "/activities",
    icon: CheckSquare,
  },
  {
    name: "Manager",
    href: "/admin/manager",
    icon: BarChart3,
  },
  {
    name: "Admin",
    href: "/admin",
    icon: Settings,
  },
];

// Routes restricted by role (roles that CANNOT access)
const restrictedRoutes: Record<string, string[]> = {
  "/pipelines": ["sdr", "closer"],
};

// Routes only for specific roles (roles that CAN access)
const adminOnlyRoutes = ["/admin/manager"];

export function MainNav({ userRole: role }: MainNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const userRole = role?.toLowerCase() || "";

  // Filter nav items based on user role
  const filteredNavItems = useMemo(() => {
    return navItems.filter((item) => {
      // Check if route is restricted for this role
      const restrictedRoles = restrictedRoutes[item.href];
      if (restrictedRoles && restrictedRoles.includes(userRole)) {
        return false;
      }
      // Check if route is admin-only
      if (adminOnlyRoutes.includes(item.href) && userRole !== "admin") {
        return false;
      }
      return true;
    });
  }, [userRole]);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    // Manager has its own check - exact match only
    if (href === "/admin/manager") {
      return pathname === "/admin/manager";
    }
    // Admin matches any /admin path except /admin/manager
    if (href === "/admin") {
      return pathname.startsWith("/admin") && pathname !== "/admin/manager";
    }
    return pathname.startsWith(href);
  };

  // Check scroll position to show/hide arrows
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [filteredNavItems]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = 200;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-1 relative flex-1 min-w-0">
        {/* Left scroll arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#1a0022] border border-[#792990] text-gray-300 hover:bg-purple-900/50 hover:text-white shadow-lg transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Left fade gradient */}
        {showLeftArrow && (
          <div className="absolute left-8 top-0 bottom-0 w-8 bg-gradient-to-r from-[#1a0022] to-transparent z-[5] pointer-events-none" />
        )}

        {/* Scrollable nav container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-center gap-1 overflow-x-auto px-1 py-1 nav-scroll-container"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#792990 #1a0022",
          }}
        >
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = !item.external && isActive(item.href);
            const className = cn(
              "group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap",
              active
                ? "bg-primary text-white shadow-lg"
                : "text-gray-300 hover:bg-purple-900/50 hover:text-white"
            );

            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden lg:inline">{item.name}</span>
                </a>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={className}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden lg:inline">{item.name}</span>
                {active && (
                  <div className="absolute -bottom-[13px] left-1/2 h-0.5 w-8 -translate-x-1/2 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right fade gradient */}
        {showRightArrow && (
          <div className="absolute right-8 top-0 bottom-0 w-8 bg-gradient-to-l from-[#1a0022] to-transparent z-[5] pointer-events-none" />
        )}

        {/* Right scroll arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#1a0022] border border-[#792990] text-gray-300 hover:bg-purple-900/50 hover:text-white shadow-lg transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-2 rounded-md text-gray-300 hover:bg-purple-900/50 hover:text-white transition-colors"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1a0022] border-t border-[#792990] p-4 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="grid gap-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const active = !item.external && isActive(item.href);
                const className = cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-white shadow-md"
                    : "text-gray-300 hover:bg-purple-900/50 hover:text-white"
                );

                if (item.external) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className={className}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.name}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={className}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                    {active && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-white" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
