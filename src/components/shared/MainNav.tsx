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
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

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
    href: "/projects",
    icon: FolderKanban,
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
];

export function MainNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap",
                active
                  ? "bg-primary text-white shadow-lg"
                  : "text-gray-300 hover:bg-purple-900/50 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.name}</span>
              {active && (
                <div className="absolute -bottom-[17px] left-1/2 h-0.5 w-12 -translate-x-1/2 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden p-2 rounded-md text-gray-300 hover:bg-purple-900/50 hover:text-white transition-colors"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-40 bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1a0022] border-t border-[#792990] p-4 shadow-xl">
            <div className="grid gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-primary text-white shadow-md"
                        : "text-gray-300 hover:bg-purple-900/50 hover:text-white"
                    )}
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
