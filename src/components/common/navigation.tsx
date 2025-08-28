"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calculator,
  LayoutDashboard,
  DollarSign,
  Target,
  TrendingUp,
  User,
  LogOut,
  ChevronDown,
  Calendar,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export function Navigation() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      // 1) Clear client session (localStorage) and broadcast auth change
      await signOut();
      // 2) Clear server-side cookies and force full reload
      window.location.assign("/auth/signout");
    } catch (error) {
      console.error("Failed to sign out:", error);
      setIsLoggingOut(false);
    }
  };

  const navigationItems: Array<{
    name: string;
    href: string;
    icon: LucideIcon;
    description: string;
    disabled?: boolean;
  }> = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Overview and quick actions",
    },
    {
      name: "Income",
      href: "/income",
      icon: DollarSign,
      description: "Manage income sources",
    },
    {
      name: "Budget",
      href: "/budget",
      icon: Target,
      description: "Configure budget items",
    },
    {
      name: "Pay Periods",
      href: "/pay-periods",
      icon: Calendar,
      description: "Manage pay periods and allocations",
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: TrendingUp,
      description: "Track spending",
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      description: "Expense analytics and reports",
    },
  ];

  const isActiveRoute = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Calculator className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                Budget Simple
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    item.disabled
                      ? "text-gray-400 cursor-not-allowed"
                      : isActive
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                  onClick={
                    item.disabled ? (e) => e.preventDefault() : undefined
                  }
                  title={item.disabled ? "Coming Soon" : item.description}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {item.disabled && (
                    <span className="text-xs text-gray-400 ml-1">(Soon)</span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {user?.user_metadata?.name ||
                      user?.email?.split("@")[0] ||
                      "User"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.user_metadata?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleSignOut();
                  }}
                  disabled={isLoggingOut}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button - For future mobile implementation */}
            <div className="md:hidden ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-700"
                onClick={() => {
                  // TODO: Implement mobile menu
                  console.log("Mobile menu - to be implemented");
                }}
              >
                <span className="sr-only">Open menu</span>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - Simple version for now */}
      <div className="md:hidden border-t border-gray-200 bg-gray-50">
        <div className="px-2 py-3 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium ${
                  item.disabled
                    ? "text-gray-400 cursor-not-allowed"
                    : isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:text-blue-600 hover:bg-white"
                }`}
                onClick={item.disabled ? (e) => e.preventDefault() : undefined}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
                {item.disabled && (
                  <span className="text-sm text-gray-400">(Coming Soon)</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
