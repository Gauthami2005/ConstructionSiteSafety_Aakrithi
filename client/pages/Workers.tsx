import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import {
  Users,
  User,
  Calendar,
  MapPin,
  FileText,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Heart,
  Pill,
  AlertTriangle,
  Phone,
  UserCircle,
  Clock,
} from "lucide-react";
import {
  WorkerHealthRequest,
  WorkerHealthResponse,
  WorkerHealthEntry,
  WorkerHealthHistoryResponse,
} from "@shared/api";
import { computeRiskScore } from "@/lib/riskEvaluator.js";

const COMMON_HEALTH_CONDITIONS = [
  "High Blood Pressure",
  "Diabetes",
  "Asthma",
  "Heart Condition",
  "Back Problems",
  "Knee/Joint Issues",
  "Hearing Loss",
  "Vision Problems",
  "Respiratory Issues",
  "None",
];

export default function Workers() {
  const [workerName, setWorkerName] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [totalHoursWorked, setTotalHoursWorked] = useState<number | "">("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [siteLocation, setSiteLocation] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState("");
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [workers, setWorkers] = useState<WorkerHealthEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch worker health history
  const fetchWorkers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/workers");
      if (!response.ok) {
        throw new Error(`Failed to fetch workers: ${response.statusText}`);
      }
      const data: WorkerHealthHistoryResponse = await response.json();
      setWorkers(data.workers || []);
    } catch (error) {
      console.error("Error fetching workers:", error);
      setWorkers([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleConditionToggle = (condition: string) => {
    if (condition === "None") {
      setSelectedConditions(["None"]);
      return;
    }
    setSelectedConditions((prev) => {
      const filtered = prev.filter((c) => c !== "None");
      if (filtered.includes(condition)) {
        return filtered.filter((c) => c !== condition);
      } else {
        return [...filtered, condition];
      }
    });
  };

  const handleAddCustomCondition = () => {
    if (customCondition.trim() && !selectedConditions.includes(customCondition.trim())) {
      setSelectedConditions((prev) => [...prev.filter((c) => c !== "None"), customCondition.trim()]);
      setCustomCondition("");
    }
  };

  const handleRemoveCondition = (condition: string) => {
    setSelectedConditions((prev) => prev.filter((c) => c !== condition));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate required fields
      if (!workerName || !workerId || !age || totalHoursWorked === "" || !siteLocation || !supervisorName) {
        setSubmitStatus({
          type: "error",
          message: "Please fill in all required fields (Worker Name, Worker ID, Age, Total Hours Worked, Site Location, Supervisor Name)",
        });
        return;
      }

      if (selectedConditions.length === 0) {
        setSubmitStatus({
          type: "error",
          message: "Please select at least one health condition",
        });
        return;
      }

      setIsSubmitting(true);
      setSubmitStatus(null);

      try {
        // Step 1: Prepare worker data
        const workerData: WorkerHealthRequest = {
          workerName,
          workerId,
          age: Number(age),
          totalHoursWorked: Number(totalHoursWorked),
          date,
          siteLocation,
          supervisorName,
          healthConditions: selectedConditions,
          medications: medications || undefined,
          allergies: allergies || undefined,
          emergencyContact: emergencyContact || undefined,
          emergencyPhone: emergencyPhone || undefined,
          notes: notes || undefined,
        };

        // Step 2: Compute risk score from worker input
        const formDataForRisk = {
          worker_id: workerId,
          worker_name: workerName,
          age: Number(age),
          total_hours_worked: Number(totalHoursWorked),
          health_conditions: selectedConditions,
          medications: medications || "",
        };

        console.log("Computing risk score with data:", formDataForRisk);
        const riskResult = computeRiskScore(formDataForRisk);
        console.log("Risk score computed:", riskResult);

        // Step 3: Dispatch alert event for live alert feed
        const alertData = {
          worker_id: workerId,
          worker_name: workerName,
          alert_level: riskResult.alert_level,
          score: riskResult.score,
          reasons: riskResult.reasons,
          recommended_actions: riskResult.recommended_actions,
          timestamp: new Date().toISOString(),
        };

        console.log("Dispatching alert event with data:", alertData);
        
        // Save alert to localStorage for cross-page persistence
        try {
          const existingAlerts = JSON.parse(localStorage.getItem("construction-site-alerts") || "[]");
          const newAlert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            title: alertData.alert_level === "critical" 
              ? `Critical Risk: ${alertData.worker_name || "Worker"}`
              : alertData.alert_level === "warning"
              ? `Warning: ${alertData.worker_name || "Worker"}`
              : alertData.alert_level === "watch"
              ? `Watch: ${alertData.worker_name || "Worker"}`
              : `Worker Check: ${alertData.worker_name || "Worker"}`,
            description: alertData.reasons && Array.isArray(alertData.reasons) 
              ? alertData.reasons.join(". ") 
              : `Risk score: ${alertData.score}/100`,
            severity: alertData.alert_level === "critical" || alertData.alert_level === "warning" ? "high" 
              : alertData.alert_level === "watch" ? "medium" : "low",
            time: new Date().toISOString(),
            worker_id: alertData.worker_id,
            worker_name: alertData.worker_name,
            score: alertData.score,
            reasons: alertData.reasons,
            recommended_actions: alertData.recommended_actions,
          };
          const updated = [newAlert, ...existingAlerts].slice(0, 50);
          localStorage.setItem("construction-site-alerts", JSON.stringify(updated));
          console.log("Alert saved to localStorage");
          
          // Trigger storage event for cross-tab communication
          window.dispatchEvent(new StorageEvent("storage", {
            key: "construction-site-alerts",
            newValue: JSON.stringify(updated),
          }));
        } catch (error) {
          console.error("Error saving alert to localStorage:", error);
        }
        
        // Dispatch alert event immediately - AlertFeed should be listening
        const event = new CustomEvent("newAlert", { 
          detail: alertData,
          bubbles: true,
          cancelable: true
        });
        
        // Dispatch on both window and document for better compatibility
        // Use capture phase to ensure it's caught
        window.dispatchEvent(event);
        document.dispatchEvent(event);
        
        // Also try dispatching with a small delay to ensure listeners are ready
        setTimeout(() => {
          window.dispatchEvent(event);
          document.dispatchEvent(event);
        }, 100);
        
        console.log("Alert event dispatched successfully on window and document");

        // Step 4: Save worker data to API (including risk evaluation)
        const workerDataWithRisk = {
          ...workerData,
          riskScore: riskResult.score,
          alertLevel: riskResult.alert_level,
          riskReasons: riskResult.reasons,
          recommendedActions: riskResult.recommended_actions,
        };

        const response = await fetch("/api/workers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(workerDataWithRisk),
        });

        const result: WorkerHealthResponse = await response.json();

        if (result.success) {
          setSubmitStatus({
            type: "success",
            message: `Worker health record saved successfully! Risk Score: ${riskResult.score}/100 (${riskResult.alert_level.toUpperCase()})`,
          });

          // Reset form
          setWorkerName("");
          setWorkerId("");
          setAge("");
          setTotalHoursWorked("");
          setDate(() => {
            const today = new Date();
            return today.toISOString().split("T")[0];
          });
          setSiteLocation("");
          setSupervisorName("");
          setSelectedConditions([]);
          setCustomCondition("");
          setMedications("");
          setAllergies("");
          setEmergencyContact("");
          setEmergencyPhone("");
          setNotes("");

          // Refresh workers list
          fetchWorkers();

          // Clear success message after 5 seconds
          setTimeout(() => {
            setSubmitStatus(null);
          }, 5000);
        } else {
          setSubmitStatus({
            type: "error",
            message: result.message || "Failed to save worker health record",
          });
        }
      } catch (error) {
        console.error("Error submitting worker health:", error);
        setSubmitStatus({
          type: "error",
          message: "An error occurred while saving the record. Please try again.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      workerName,
      workerId,
      age,
      totalHoursWorked,
      date,
      siteLocation,
      supervisorName,
      selectedConditions,
      medications,
      allergies,
      emergencyContact,
      emergencyPhone,
      notes,
      fetchWorkers,
    ]
  );

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <main className="flex-1 ml-20 lg:ml-64 px-4 lg:px-8 py-8">
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-neon-orange/5 via-transparent to-transparent blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-t from-neon-cyan/5 via-transparent to-transparent blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="mb-12 animate-fade-in">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2 flex items-center gap-3">
              <Users className="w-10 h-10 text-neon-orange" />
              Worker Health Records
            </h1>
            <p className="text-gray-400 text-lg">
              Track and manage worker health conditions for safety compliance.
            </p>
          </div>

          {/* Toggle between form and history */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => setShowHistory(false)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                !showHistory
                  ? "bg-gradient-to-r from-neon-orange to-amber-600 text-black"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              Add New Record
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                showHistory
                  ? "bg-gradient-to-r from-neon-orange to-amber-600 text-black"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              View History
            </button>
          </div>

          {!showHistory ? (
            /* Add Worker Health Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="glass-card p-8 animate-fade-in">
                {/* Worker Information */}
                <div className="space-y-6 mb-8">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <UserCircle className="w-6 h-6 text-neon-orange" />
                    Worker Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                        <User className="w-5 h-5 text-neon-orange" />
                        Worker Name *
                      </label>
                      <input
                        type="text"
                        value={workerName}
                        onChange={(e) => setWorkerName(e.target.value)}
                        placeholder="Enter worker name"
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                        <User className="w-5 h-5 text-neon-orange" />
                        Worker ID *
                      </label>
                      <input
                        type="text"
                        value={workerId}
                        onChange={(e) => setWorkerId(e.target.value)}
                        placeholder="Enter worker ID"
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                        <UserCircle className="w-5 h-5 text-neon-orange" />
                        Age *
                      </label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Enter worker age"
                        min="18"
                        max="100"
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-neon-orange" />
                        Total Hours Worked *
                      </label>
                      <input
                        type="number"
                        value={totalHoursWorked}
                        onChange={(e) => setTotalHoursWorked(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Enter total hours worked"
                        min="0"
                        step="0.5"
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-neon-orange" />
                        Date *
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-neon-orange" />
                        Site Location *
                      </label>
                      <input
                        type="text"
                        value={siteLocation}
                        onChange={(e) => setSiteLocation(e.target.value)}
                        placeholder="Enter site location"
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                        <User className="w-5 h-5 text-neon-orange" />
                        Supervisor Name *
                      </label>
                      <input
                        type="text"
                        value={supervisorName}
                        onChange={(e) => setSupervisorName(e.target.value)}
                        placeholder="Enter supervisor name"
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Health Conditions */}
                <div className="space-y-6 mb-8">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Heart className="w-6 h-6 text-neon-orange" />
                    Health Conditions *
                  </h2>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {COMMON_HEALTH_CONDITIONS.map((condition) => (
                      <button
                        key={condition}
                        type="button"
                        onClick={() => handleConditionToggle(condition)}
                        className={`px-4 py-2 rounded-lg border transition-all duration-300 ${
                          selectedConditions.includes(condition)
                            ? "bg-neon-orange/20 border-neon-orange text-neon-orange"
                            : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20"
                        }`}
                      >
                        {condition}
                      </button>
                    ))}
                  </div>

                  {/* Custom Condition */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customCondition}
                      onChange={(e) => setCustomCondition(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomCondition();
                        }
                      }}
                      placeholder="Add custom condition"
                      className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomCondition}
                      className="px-6 py-3 rounded-lg bg-neon-orange/20 border border-neon-orange text-neon-orange hover:bg-neon-orange/30 transition-all duration-300"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Selected Conditions */}
                  {selectedConditions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedConditions.map((condition) => (
                        <div
                          key={condition}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-orange/20 border border-neon-orange text-neon-orange"
                        >
                          <span>{condition}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCondition(condition)}
                            className="hover:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional Information */}
                <div className="space-y-6 mb-8">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-neon-orange" />
                    Additional Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                        <Pill className="w-5 h-5 text-neon-orange" />
                        Medications
                      </label>
                      <input
                        type="text"
                        value={medications}
                        onChange={(e) => setMedications(e.target.value)}
                        placeholder="List any medications"
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                      />
                    </div>

                    <div>
                      <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-neon-orange" />
                        Allergies
                      </label>
                      <input
                        type="text"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="List any allergies"
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                      />
                    </div>

                    <div>
                      <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                        <User className="w-5 h-5 text-neon-orange" />
                        Emergency Contact
                      </label>
                      <input
                        type="text"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        placeholder="Emergency contact name"
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                      />
                    </div>

                    <div>
                      <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                        <Phone className="w-5 h-5 text-neon-orange" />
                        Emergency Phone
                      </label>
                      <input
                        type="tel"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="Emergency contact phone"
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-neon-orange" />
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes or comments..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/20 focus:outline-none transition-all duration-300 hover:border-white/20 resize-none"
                    />
                  </div>
                </div>

                {/* Submit Status Message */}
                {submitStatus && (
                  <div
                    className={`glass-card-sm p-4 flex items-center gap-3 animate-fade-in mb-6 ${
                      submitStatus.type === "success"
                        ? "border-neon-green/50 bg-neon-green/10"
                        : "border-red-500/50 bg-red-500/10"
                    }`}
                  >
                    {submitStatus.type === "success" ? (
                      <CheckCircle className="w-5 h-5 text-neon-green flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <p
                      className={`text-sm ${
                        submitStatus.type === "success" ? "text-neon-green" : "text-red-400"
                      }`}
                    >
                      {submitStatus.message}
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative px-8 py-4 rounded-lg font-semibold text-black bg-gradient-to-r from-neon-orange to-amber-600 hover:from-neon-orange hover:to-amber-500 transition-all duration-300 glow-strong-orange hover:glow-neon-orange overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="relative z-10 flex items-center gap-2">
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                          Save Worker Health Record
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Worker Health History */
            <div className="glass-card p-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-neon-orange" />
                Worker Health History
              </h2>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-neon-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-gray-400 mt-4">Loading worker records...</p>
                </div>
              ) : workers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No worker health records found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workers.map((worker) => (
                    <div
                      key={worker.id}
                      className="glass-card-sm p-6 border border-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xl font-bold text-white">{worker.workerName}</h3>
                            <span className="px-3 py-1 rounded-full bg-white/10 text-gray-300 text-sm">
                              ID: {worker.workerId}
                            </span>
                            {worker.age !== undefined && worker.age !== null && (
                              <span className="px-3 py-1 rounded-full bg-neon-orange/20 border border-neon-orange text-neon-orange text-sm">
                                Age: {worker.age}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center gap-2 text-gray-400">
                              <MapPin className="w-4 h-4" />
                              <span>{worker.siteLocation}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                              <User className="w-4 h-4" />
                              <span>Supervisor: {worker.supervisorName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(worker.date).toLocaleDateString()}</span>
                            </div>
                            {worker.totalHoursWorked !== undefined && worker.totalHoursWorked !== null && (
                              <div className="flex items-center gap-2 text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span>Hours Worked: {Number(worker.totalHoursWorked).toLocaleString()}</span>
                              </div>
                            )}
                            {worker.emergencyContact && (
                              <div className="flex items-center gap-2 text-gray-400">
                                <Phone className="w-4 h-4" />
                                <span>{worker.emergencyContact} {worker.emergencyPhone}</span>
                              </div>
                            )}
                          </div>

                          <div className="mb-4">
                            <p className="text-gray-400 text-sm mb-2 font-semibold">Health Conditions:</p>
                            <div className="flex flex-wrap gap-2">
                              {worker.healthConditions && Array.isArray(worker.healthConditions) && worker.healthConditions.length > 0 ? (
                                worker.healthConditions.map((condition, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 rounded-full bg-neon-orange/20 border border-neon-orange text-neon-orange text-sm"
                                  >
                                    {condition}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-sm">No health conditions recorded</span>
                              )}
                            </div>
                          </div>

                          {(worker.medications || worker.allergies || worker.notes) && (
                            <div className="space-y-2 text-sm">
                              {worker.medications && (
                                <div className="flex items-start gap-2 text-gray-400">
                                  <Pill className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <span>
                                    <span className="font-semibold">Medications:</span> {worker.medications}
                                  </span>
                                </div>
                              )}
                              {worker.allergies && (
                                <div className="flex items-start gap-2 text-gray-400">
                                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <span>
                                    <span className="font-semibold">Allergies:</span> {worker.allergies}
                                  </span>
                                </div>
                              )}
                              {worker.notes && (
                                <div className="flex items-start gap-2 text-gray-400">
                                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <span>
                                    <span className="font-semibold">Notes:</span> {worker.notes}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

