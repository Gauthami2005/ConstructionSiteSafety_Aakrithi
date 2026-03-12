import { Sidebar } from "@/components/Sidebar";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <main className="flex-1 ml-20 lg:ml-64 px-4 lg:px-8 py-8">
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-neon-orange/5 via-transparent to-transparent blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-t from-neon-cyan/5 via-transparent to-transparent blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="mb-12 animate-fade-in">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2 flex items-center gap-3">
              <SettingsIcon className="w-10 h-10 text-neon-orange" />
              Settings
            </h1>
            <p className="text-gray-400">
              Manage your account and preferences
            </p>
          </div>

          <div className="glass-card p-12 text-center">
            <p className="text-gray-400 text-lg">
              Settings page coming soon. Continue building this section by providing more details.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
