"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Users,
  Receipt,
  FileText,
  Calendar,
  BarChart3,
  Bell,
  ClipboardList,
  Settings,
  ChevronDown,
  ChevronRight,
  Landmark,
  Wallet,
  LogOut,
  Calculator,
  BookOpen,
  ListChecks,
  FolderOpen,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Businesses", href: "/businesses", icon: Building2 },
  {
    label: "Compliance",
    icon: ShieldCheck,
    children: [
      { label: "Overview", href: "/compliance", icon: ShieldCheck },
      { label: "PACRA", href: "/compliance/pacra", icon: Landmark },
      { label: "ZRA", href: "/compliance/zra", icon: Receipt },
      { label: "NAPSA", href: "/compliance/napsa", icon: Users },
      { label: "NHIMA", href: "/compliance/nhima", icon: Users },
    ],
  },
  {
    label: "Tax Prep",
    icon: Calculator,
    children: [
      { label: "Overview", href: "/tax", icon: Calculator },
      { label: "Returns", href: "/tax/returns", icon: ListChecks },
      { label: "Documents", href: "/tax/documents", icon: FolderOpen },
      { label: "Tax Rules", href: "/tax/rules", icon: BookOpen },
    ],
  },
  { label: "Employees", href: "/employees", icon: Users },
  { label: "Payroll", href: "/payroll", icon: Wallet },
  { label: "Payments", href: "/payments", icon: Receipt },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Audit Log", href: "/audit", icon: ClipboardList },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  user?: { name?: string | null; email?: string | null; image?: string | null };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(["Compliance", "Tax Prep"]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-slate-100">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none">ComplianceHub</p>
          <p className="text-xs text-slate-400 mt-0.5">Zambia</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            if (item.children) {
              const isOpen = openGroups.includes(item.label);
              const isGroupActive = item.children.some((c) => c.href && isActive(c.href));
              return (
                <li key={item.label}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isGroupActive
                        ? "text-white"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {isOpen && (
                    <ul className="mt-0.5 ml-4 pl-3 border-l border-slate-700/50 space-y-0.5">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href!}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                              child.href && isActive(child.href)
                                ? "bg-blue-600 text-white font-medium"
                                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                            )}
                          >
                            <child.icon className="h-3.5 w-3.5 shrink-0" />
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }
            return (
              <li key={item.label}>
                <Link
                  href={item.href!}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive(item.href!)
                      ? "bg-blue-600 text-white font-medium"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-slate-700/50 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.image ?? undefined} />
            <AvatarFallback className="bg-blue-600 text-white text-xs">
              {getInitials(user?.name ?? user?.email ?? "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name ?? "User"}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="text-slate-400 hover:text-slate-100 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-4 pb-4">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          ComplianceHub Zambia is an independent platform and is not affiliated with or endorsed by ZRA, NAPSA, NHIMA or PACRA.
        </p>
      </div>
    </aside>
  );
}
