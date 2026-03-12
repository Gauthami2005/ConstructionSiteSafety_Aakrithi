import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  AlertCircle,
  Upload,
  Users,
  BarChart3,
  FileText,
  Settings,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={24} />, path: "/" },
  { id: "alerts", label: "Alerts", icon: <AlertCircle size={24} />, path: "/alerts" },
  { id: "uploads", label: "Uploads", icon: <Upload size={24} />, path: "/uploads" },
  { id: "workers", label: "Workers", icon: <Users size={24} />, path: "/workers" }
];

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 lg:w-64 bg-black border-r border-white border-opacity-10 flex flex-col items-center lg:items-start px-4 lg:px-6 py-8 z-50">
      {/* Logo */}
      <div className="mb-12 flex items-center gap-3 w-full">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-orange to-neon-orange flex items-center justify-center glow-neon-orange">
          <svg
            className="w-6 h-6 text-black"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 7h2v6H9V7zm0 8h2v2H9v-2z" />
          </svg>
        </div>
        <div className="hidden lg:block">
          <h1 className="text-lg font-bold text-white">SiteGuard</h1>
          <p className="text-xs text-gray-400">AI Safety</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-4 w-full flex-1">
        {navItems.map((item) => {
          // determine active by route. For root use exact match, otherwise startsWith
          const isActive = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);
          return (
            <Link key={item.id} to={item.path} className="w-full">
              <button
                className={`sidebar-nav-item w-full group flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 relative overflow-hidden lg:justify-start justify-center ${
                  isActive ? "text-white glow-neon-orange active" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-orange/20 to-transparent animate-glow-pulse"></div>
                )}
                <div
                  className={`relative z-10 transition-all duration-300 ${
                    isActive ? "text-neon-orange" : "group-hover:text-neon-orange"
                  }`}
                >
                  {item.icon}
                </div>
                <span className="hidden lg:inline text-sm font-medium relative z-10">
                  {item.label}
                </span>
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="w-full pt-8 border-t border-white border-opacity-10">
        <div className="w-full h-10 rounded-lg bg-gradient-to-r from-neon-green/20 to-neon-cyan/20 flex items-center justify-center cursor-pointer hover:from-neon-green/30 hover:to-neon-cyan/30 transition-all">
          <span className="hidden lg:inline text-xs text-gray-300">v1.0</span>
          <span className="lg:hidden text-xs text-gray-300">1.0</span>
        </div>
      </div>
    </aside>
  );
}
