import { useNavigate } from "react-router-dom";

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <div className="mb-12 animate-fade-in">
      <div className="relative rounded-2xl overflow-hidden glass-card p-8 lg:p-12">
        {/* Background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/10 via-transparent to-neon-cyan/10"></div>

        {/* Content */}
        <div className="relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            Stay Alert.{" "}
            <span className="bg-gradient-to-r from-neon-orange to-neon-cyan bg-clip-text text-transparent">
              Stay Safe.
            </span>
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl">
            Real-time construction site monitoring with AI-powered safety intelligence. Detect hazards, 
            protect workers, prevent incidents before they happen.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Upload Site Data Button */}
            <button onClick={() => navigate('/uploads')} className="relative px-8 py-4 rounded-lg font-semibold text-black bg-gradient-to-r from-neon-orange to-amber-600 hover:from-neon-orange hover:to-amber-500 transition-all duration-300 glow-strong-orange hover:glow-neon-orange group overflow-hidden">
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative z-10 flex items-center gap-2">
                <svg
                  className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Upload Site Data
              </span>
            </button>

            {/* Start Live Analysis Button */}
            <button
              onClick={() => navigate('/camera')}
                className="relative px-8 py-4 rounded-lg font-semibold text-white bg-[#00BCD4] hover:bg-[#00a0b8] border-2 border-[#00BCD4] hover:border-[#00a0b8] transition-all duration-300 group overflow-hidden glow-neon-cyan hover:scale-105 pulsate-glow"
              style={{ boxShadow: '0 10px 30px rgba(0,188,212,0.16)' }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity" style={{ background: 'radial-gradient(circle at 20% 10%, rgba(0,188,212,0.10), transparent 30%)' }}></div>
              <span className="relative z-10 flex items-center gap-2">Start Live Analysis</span>
            </button>

            {/* View Alerts Button */}
            <button onClick={() => navigate('/alerts')} className="relative px-8 py-4 rounded-lg font-semibold text-white border-2 border-neon-cyan hover:border-neon-orange bg-transparent hover:bg-neon-orange/10 transition-all duration-300 glow-neon-cyan hover:glow-neon-orange group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative z-10 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                View Alerts
              </span>
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-neon-cyan/5 to-transparent rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-t from-neon-orange/5 to-transparent rounded-full blur-3xl -z-10"></div>
      </div>
    </div>
  );
}
