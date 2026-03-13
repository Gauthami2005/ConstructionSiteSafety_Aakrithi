import React, { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";

export default function CameraAccessButton(): JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isMLRunning, setIsMLRunning] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  const webcamRef = useRef<Webcam | null>(null);
  const navigate = useNavigate();

  const startAnalysis = useCallback(async () => {
    try {
      setIsLoading(true);
      const resp = await fetch("/api/ml/start-webcam");
      const data = await resp.json();
      setAnalysisResult(data?.message || "Webcam ML started");
      setIsMLRunning(true);
    } catch (err) {
      setAnalysisResult(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopAnalysis = async () => {
    try {
      await fetch("/api/ml/stop-webcam", { method: "POST" });
      setIsMLRunning(false);
      setAnalysisResult("Analysis stopped");
    } catch (err) {
      console.error("Failed to stop ML:", err);
    }
  };

  const startCamera = () => {
    setIsCameraActive(true);
    setAnalysisResult("Camera active. Ready for analysis.");
  };

  const stopCamera = async () => {
    await stopAnalysis();
    setIsCameraActive(false);
    setAnalysisResult(null);
  };

  const closeCamera = async () => {
    await stopCamera();
    navigate("/");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fetch("/api/ml/stop-webcam", { method: "POST" }).catch(() => {});
    };
  }, []);

  return (
    <div className="flex justify-center p-8">
      <div style={{ width: "85%", maxWidth: "1000px" }} className="glass-card p-6 flex flex-col items-center">
        <div className="flex justify-between w-full mb-6">
          <h3 className="text-2xl font-bold text-white">Live AI Safety Analysis</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isCameraActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-300">Camera {isCameraActive ? 'ON' : 'OFF'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isMLRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-300">AI {isMLRunning ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>

        <div className="w-full relative rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl bg-black/40 min-h-[400px] flex items-center justify-center">
          {isCameraActive ? (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/png"
              videoConstraints={{ facingMode: "environment" }}
              className="w-full h-auto"
            />
          ) : (
            <div className="text-center p-12">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-400 mb-6">Camera is currently disabled</p>
              <button 
                onClick={startCamera}
                className="px-6 py-2 rounded-lg bg-neon-cyan text-black font-bold hover:scale-105 transition-transform"
              >
                Enable Camera
              </button>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
              <div className="text-white flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-neon-orange border-t-transparent rounded-full animate-spin"></div>
                <span className="font-semibold">Initializing AI Model...</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-8">
          {isCameraActive && (
            <>
              {!isMLRunning ? (
                <button
                  onClick={startAnalysis}
                  disabled={isLoading}
                  className="px-8 py-3 rounded-lg bg-neon-orange text-black font-bold hover:scale-105 transition-transform disabled:opacity-50"
                >
                  Start AI Analysis
                </button>
              ) : (
                <button
                  onClick={stopAnalysis}
                  className="px-8 py-3 rounded-lg bg-amber-500 text-black font-bold hover:scale-105 transition-transform"
                >
                  Pause AI Analysis
                </button>
              )}
              <button 
                onClick={stopCamera} 
                className="px-8 py-3 rounded-lg bg-gray-700 text-white font-bold hover:scale-105 transition-transform"
              >
                Disable Camera
              </button>
            </>
          )}

          <button 
            onClick={closeCamera} 
            className="px-8 py-3 rounded-lg bg-red-600 text-white font-bold hover:scale-105 transition-transform"
          >
            Exit to Dashboard
          </button>
        </div>

        {analysisResult && (
          <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10 w-full text-center">
            <p className="text-gray-400 text-sm italic">{String(analysisResult)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
