import { Sidebar } from "@/components/Sidebar";
import { HeroSection } from "@/components/HeroSection";
import { StatCards } from "@/components/StatCards";
import { AlertFeed } from "@/components/AlertFeed";
import { DailyViolationsChart } from "@/components/DailyViolationsChart";
import { PPEComplianceChart } from "@/components/PPEComplianceChart";
import MLAlertFeed from "@/components/MLAlertFeed";

export default function Index() {
  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 ml-20 lg:ml-64 px-4 lg:px-8 py-8">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-neon-orange/5 via-transparent to-transparent blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-t from-neon-cyan/5 via-transparent to-transparent blur-3xl"></div>
        </div>

        {/* Container */}
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 animate-fade-in">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-400">
              Monitor your construction sites in real-time with AI-powered safety intelligence
            </p>
          </div>

          {/* Hero Section */}
          <HeroSection />

          {/* Stats Grid */}
          <StatCards />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            <DailyViolationsChart />
            <PPEComplianceChart />
          </div>

          {/* ML Alert Feed */}
          <div className="mt-8 mb-6">
            <MLAlertFeed />
          </div>

          {/* Alert Feed */}
          <AlertFeed />

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
            <p>SiteGuard AI • Construction Safety Intelligence • v1.0</p>
            <p className="mt-2">© 2024 All Rights Reserved</p>
          </div>
        </div>
      </main>
    </div>
  );
}
