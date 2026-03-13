import React, { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";

interface CameraState {
  id: string;
  source: string; // The index for the backend (0, 1, 2...)
  deviceId: string | null; // The deviceId for react-webcam
  label: string;
  isActive: boolean;
  isMLRunning: boolean;
  isLoading: boolean;
  analysisResult: string | null;
}

export default function CameraAccessButton(): JSX.Element {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameras, setCameras] = useState<CameraState[]>([
    { id: "cam1", source: "0", deviceId: null, label: "Phone Camera (Source 0)", isActive: false, isMLRunning: false, isLoading: false, analysisResult: null },
    { id: "cam2", source: "2", deviceId: null, label: "Laptop Camera (Source 2)", isActive: false, isMLRunning: false, isLoading: false, analysisResult: null }
  ]);

  const webcamRefs = useRef<{ [key: string]: Webcam | null }>({});
  const navigate = useNavigate();

  // Enumerate devices on mount
  const handleDevices = useCallback(
    (mediaDevices: MediaDeviceInfo[]) => {
      const videoDevices = mediaDevices.filter(({ kind }) => kind === "videoinput");
      setDevices(videoDevices);
      
      // Auto-assign first two devices if available and not already assigned
      setCameras(prev => {
        const next = [...prev];
        // Camera 1 -> First video device (Source 0)
        if (videoDevices.length > 0 && !next[0].deviceId) {
          next[0].deviceId = videoDevices[0].deviceId;
          next[0].source = "0";
        }
        // Camera 2 -> Second video device if exists, otherwise first (Source 2)
        if (videoDevices.length > 1 && !next[1].deviceId) {
          next[1].deviceId = videoDevices[1].deviceId;
          next[1].source = "2";
        } else if (videoDevices.length > 0 && !next[1].deviceId) {
          next[1].deviceId = videoDevices[0].deviceId;
          next[1].source = "2";
        }
        return next;
      });
    },
    [setDevices]
  );

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(handleDevices);
  }, [handleDevices]);

  const updateCameraState = (id: string, updates: Partial<CameraState>) => {
    setCameras(prev => prev.map(cam => cam.id === id ? { ...cam, ...updates } : cam));
  };

  const handleDeviceChange = (id: string, deviceId: string) => {
    // Find the device index in the current devices list
    const deviceIndex = devices.findIndex(d => d.deviceId === deviceId);
    
    // We want the PHYSICAL index in the OS list, which matches how cv2.VideoCapture works
    // Browsers often randomize deviceId but usually keep order consistent in enumerateDevices
    updateCameraState(id, { 
      deviceId, 
      source: deviceIndex >= 0 ? deviceIndex.toString() : "0" 
    });
  };

  const startAnalysis = async (id: string, source: string) => {
    try {
      updateCameraState(id, { isLoading: true, analysisResult: "Initializing AI..." });
      const resp = await fetch(`/api/ml/start-webcam?source=${source}`);
      const data = await resp.json();
      
      if (resp.ok && data.started) {
        updateCameraState(id, { 
          isMLRunning: true, 
          analysisResult: "AI Live Monitoring Active" 
        });
      } else {
        updateCameraState(id, { 
          isMLRunning: false, 
          analysisResult: `Error: ${data.error || "Could not start camera"}` 
        });
      }
    } catch (err) {
      updateCameraState(id, { analysisResult: `Connection failed: ${String(err)}` });
    } finally {
      updateCameraState(id, { isLoading: false });
    }
  };

  const stopAnalysis = async (id: string, source: string) => {
    try {
      await fetch("/api/ml/stop-webcam", { 
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      });
      updateCameraState(id, { isMLRunning: false, analysisResult: "AI Analysis stopped" });
    } catch (err) {
      console.error(`Failed to stop ML for ${id}:`, err);
    }
  };

  const toggleCamera = async (id: string) => {
    const cam = cameras.find(c => c.id === id);
    if (!cam) return;

    if (cam.isActive) {
      await stopAnalysis(id, cam.source);
      updateCameraState(id, { isActive: false, analysisResult: null });
    } else {
      updateCameraState(id, { isActive: true, analysisResult: "Camera enabled. Ready for analysis." });
    }
  };

  const closeAllAndExit = async () => {
    for (const cam of cameras) {
      if (cam.isMLRunning) {
        await stopAnalysis(cam.id, cam.source);
      }
    }
    navigate("/");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cameras.forEach(cam => {
        fetch("/api/ml/stop-webcam", { 
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: cam.source })
        }).catch(() => {});
      });
    };
  }, []);

  return (
    <div className="flex flex-col items-center p-6 min-h-screen bg-black/90">
      <div className="w-full max-w-7xl flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Multi-Camera Safety Command Center</h2>
          <p className="text-gray-400">Monitor multiple zones with real-time AI PPE detection</p>
        </div>
        <button 
          onClick={closeAllAndExit} 
          className="px-6 py-2 rounded-lg bg-red-600/20 text-red-400 border border-red-600/50 hover:bg-red-600 hover:text-white transition-all font-bold"
        >
          Exit to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full max-w-7xl">
        {cameras.map((cam) => (
          <div key={cam.id} className="glass-card p-6 flex flex-col border border-white/10 hover:border-white/20 transition-all shadow-2xl">
            <div className="flex flex-col mb-4 gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${cam.isActive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></div>
                  <h3 className="text-xl font-bold text-white">{cam.label}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cam.isMLRunning ? 'bg-neon-orange animate-pulse shadow-[0_0_8px_rgba(255,94,0,0.8)]' : 'bg-gray-600'}`}></div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">AI Analysis: {cam.isMLRunning ? 'Active' : 'Standby'}</span>
                </div>
              </div>

              {/* Physical Camera Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Select Physical Camera</label>
                <select 
                  className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-neon-cyan transition-colors"
                  value={cam.deviceId || ""}
                  onChange={(e) => handleDeviceChange(cam.id, e.target.value)}
                  disabled={cam.isActive}
                >
                  {devices.length === 0 ? (
                    <option value="">No cameras detected</option>
                  ) : (
                    devices.map((device, idx) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${idx + 1}`}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="relative aspect-video bg-black/60 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center shadow-inner">
              {cam.isActive ? (
                <Webcam
                  audio={false}
                  ref={el => webcamRefs.current[cam.id] = el}
                  screenshotFormat="image/png"
                  videoConstraints={{ 
                    deviceId: cam.deviceId || undefined,
                    facingMode: "environment" 
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 text-gray-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Camera source {cam.source} is offline</p>
                </div>
              )}

              {cam.isLoading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-20">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-neon-orange border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-white font-bold tracking-widest text-sm uppercase">Loading AI Model...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button 
                onClick={() => toggleCamera(cam.id)}
                className={`py-3 rounded-lg font-bold transition-all text-sm uppercase tracking-wide border ${
                  cam.isActive 
                    ? 'bg-gray-800 text-gray-300 border-white/10 hover:bg-gray-700' 
                    : 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30 hover:bg-neon-cyan hover:text-black'
                }`}
              >
                {cam.isActive ? 'Disable Feed' : 'Enable Feed'}
              </button>

              <button
                onClick={() => cam.isMLRunning ? stopAnalysis(cam.id, cam.source) : startAnalysis(cam.id, cam.source)}
                disabled={!cam.isActive || cam.isLoading}
                className={`py-3 rounded-lg font-bold transition-all text-sm uppercase tracking-wide border ${
                  cam.isMLRunning
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500 hover:text-black'
                    : 'bg-neon-orange/10 text-neon-orange border-neon-orange/30 hover:bg-neon-orange hover:text-black disabled:opacity-30 disabled:grayscale'
                }`}
              >
                {cam.isMLRunning ? 'Pause AI' : 'Start AI'}
              </button>
            </div>

            {cam.analysisResult && (
              <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/5">
                <p className="text-gray-400 text-xs italic text-center">{cam.analysisResult}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-gray-600 text-xs uppercase tracking-[0.2em]">
        SiteGuard Multi-Stream AI Infrastructure v1.2
      </div>
    </div>
  );
}
