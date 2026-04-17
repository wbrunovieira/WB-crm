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
  ChevronDown,
  TrendingUp,
  ScanSearch,
  MessageCircle,
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
    children: [
      { name: "Prospectos", href: "/leads/prospects", icon: ScanSearch },
    ],
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
    name: "Campanhas",
    href: "/campaigns",
    icon: MessageCircle,
  },
  {
    name: "Funil",
    href: "/calls",
    icon: TrendingUp,
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
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [submenuLeft, setSubmenuLeft] = useState(0);
  const submenuContainerRef = useRef<HTMLDivElement>(null);
  const chevronBtnRef = useRef<HTMLButtonElement>(null);
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
    // /leads should not match /leads/prospects (which has its own nav item)
    if (href === "/leads") {
      return pathname.startsWith("/leads") && !pathname.startsWith("/leads/prospects");
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

  // Close submenu when clicking outside the submenu container
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (submenuContainerRef.current && !submenuContainerRef.current.contains(e.target as Node)) {
        setOpenSubmenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = openSubmenu === item.href;
            const childActive = hasChildren && item.children!.some((c) => pathname.startsWith(c.href));

            const baseClass = cn(
              "group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap",
              active || childActive
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
                  className={baseClass}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden lg:inline">{item.name}</span>
                </a>
              );
            }

            if (hasChildren) {
              return (
                <div key={item.href} ref={submenuContainerRef} className="relative">
                  <div className="flex items-center">
                    <Link href={item.href} className={cn(baseClass, "rounded-r-none pr-1.5")}>
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden lg:inline">{item.name}</span>
                      {(active || childActive) && (
                        <div className="absolute -bottom-[13px] left-1/2 h-0.5 w-8 -translate-x-1/2 bg-primary rounded-full" />
                      )}
                    </Link>
                    <button
                      ref={chevronBtnRef}
                      onClick={() => {
                        const rect = chevronBtnRef.current?.getBoundingClientRect();
                        if (rect) setSubmenuLeft(rect.left - rect.width * 2);
                        setOpenSubmenu(isOpen ? null : item.href);
                      }}
                      className={cn(
                        "flex h-full items-center rounded-r-lg px-1 py-1.5 transition-all duration-200",
                        active || childActive
                          ? "bg-primary text-white hover:bg-primary/80"
                          : "text-gray-300 hover:bg-purple-900/50 hover:text-white"
                      )}
                      aria-label="Expandir submenu"
                    >
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>

                  {/* Submenu dropdown — fixed to escape overflow-x-auto clipping */}
                  <div
                    style={{ left: submenuLeft }}
                    className={cn(
                      "fixed top-[60px] z-50 min-w-[160px] rounded-lg border border-[#792990]/40 bg-[#1a0022] shadow-xl transition-all duration-200",
                      isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"
                    )}
                  >
                    {item.children!.map((child) => {
                      const ChildIcon = child.icon;
                      const childIsActive = pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpenSubmenu(null)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors",
                            childIsActive
                              ? "bg-primary/20 text-white"
                              : "text-gray-300 hover:bg-purple-900/50 hover:text-white"
                          )}
                        >
                          <ChildIcon className="h-4 w-4 flex-shrink-0" />
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={baseClass}
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
                const hasChildren = item.children && item.children.length > 0;
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
                  <div key={item.href}>
                    <Link
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
                    {hasChildren && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-[#792990]/30 pl-3">
                        {item.children!.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = pathname.startsWith(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                childActive
                                  ? "bg-primary text-white shadow-md"
                                  : "text-gray-400 hover:bg-purple-900/50 hover:text-white"
                              )}
                            >
                              <ChildIcon className="h-4 w-4 flex-shrink-0" />
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
