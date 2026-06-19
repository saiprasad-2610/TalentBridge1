import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft, ArrowRight, ShieldAlert, Timer, CheckCircle } from "lucide-react";
import api from "../../services/api.ts";
import { motion, AnimatePresence } from "motion/react";

interface Option {
  text: string;
  value?: number;
}

interface Question {
  id: number;
  question: string;
  options_json: Option[];
}

export default function IntelligenceTestView() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer: 5 minutes = 300 seconds
  const [timeLeft, setTimeLeft] = useState(300);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeSpentRef = useRef(0);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!type) return;
      try {
        setLoading(true);
        const res = await api.get(`/intelligence/questions/${type}`);
        if (res.data?.success && res.data?.questions) {
          setQuestions(res.data.questions);
        } else {
          setError("Failed to retrieve assessment data.");
        }
      } catch (err: any) {
        console.error("Error retrieving assessment questions:", err);
        setError("Unable to launch the live assessment server. Please check your network connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();

    // Start timer countdown
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        timeSpentRef.current += 1;
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [type]);

  const handleSelectOption = (questionId: number, optionText: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionText,
    }));
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const buildPayload = () => {
    return Object.entries(selectedAnswers).map(([qId, ansText]) => ({
      questionId: Number(qId),
      selectedOption: ansText,
    }));
  };

  const handleAutoSubmit = async () => {
    console.log("Time limit reached. Auto-submitting answers...");
    submitAnswers(true);
  };

  const submitAnswers = async (isAuto = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payloadAnswers = buildPayload();
      const res = await api.post(`/intelligence/submit/${type}`, {
        answers: payloadAnswers,
        timeTaken: timeSpentRef.current,
      });

      if (res.data?.success) {
        alert(`Assessment completed successfully! Your calculated score is: ${res.data.score || 0}%`);
        navigate("/student/intelligence");
      } else {
        setError("Error logging assessment completion.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError("Unable to catalog your answers. Please ensure you answered at least 1 question.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50/50 p-6 space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={36} />
        <p className="text-xs text-slate-500 font-black uppercase tracking-wider">Provisioning live test sandbox session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-6 bg-white border border-slate-100 rounded-3xl shadow-sm text-center space-y-4">
        <AlertCircle size={44} className="text-red-500 mx-auto" />
        <h3 className="font-black text-slate-900 text-base uppercase tracking-tight">System Outage Detected</h3>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed">{error}</p>
        <button
          onClick={() => navigate("/student/intelligence")}
          className="px-6 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-850 text-xs font-black uppercase tracking-wider cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-6 bg-white border border-slate-100 rounded-3xl shadow-sm text-center space-y-4">
        <ShieldAlert size={44} className="text-blue-500 mx-auto" />
        <h3 className="font-white text-slate-900 text-base uppercase tracking-tight font-black">Assessment Unprepared</h3>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed">No active questions have been seeded for this test type yet.</p>
        <button
          onClick={() => navigate("/student/intelligence")}
          className="px-6 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-850 text-xs font-black uppercase tracking-wider cursor-pointer"
        >
          Return to Panel
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 min-h-screen">
      {/* Test Header */}
      <div className="flex justify-between items-center bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to exit the assessment mid-way? Your progress will be discarded.")) {
              navigate("/student/intelligence");
            }
          }}
          className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest cursor-pointer"
        >
          <ArrowLeft size={14} /> Exit Sandbox
        </button>

        <div className="flex items-center gap-2 bg-red-50 text-red-600 font-mono font-bold px-4 py-2 rounded-2xl border border-red-100 text-xs">
          <Timer size={14} className="animate-pulse" /> {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress indicators wrapper */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{progressPercent}% Complete</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Question Card Box */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-left"
        >
          <h2 className="text-base font-bold text-slate-900 leading-normal font-black">
            {currentIndex + 1}. {currentQuestion.question}
          </h2>

          <div className="space-y-3 pt-2">
            {currentQuestion.options_json.map((opt, index) => {
              const isSelected = selectedAnswers[currentQuestion.id] === opt.text;
              return (
                <button
                  key={index}
                  onClick={() => handleSelectOption(currentQuestion.id, opt.text)}
                  className={`w-full p-4.5 rounded-2xl text-left font-bold text-xs transition-all border outline-none flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/50 border-blue-500 text-slate-900 shadow-sm"
                      : "bg-white border-slate-100 text-slate-700 hover:border-blue-300"
                  }`}
                >
                  <span>{opt.text}</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "border-blue-500 bg-blue-500" : "border-slate-300"
                  }`}>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-scaleUp" />}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Footer controls */}
      <div className="flex justify-between items-center gap-4">
        <button
          onClick={handleBack}
          disabled={currentIndex === 0}
          className={`px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
            currentIndex === 0
              ? "bg-slate-100 text-slate-400 border border-slate-150 cursor-not-allowed shadow-none"
              : "bg-white border border-slate-100 text-slate-500 hover:border-slate-300 active:scale-95"
          }`}
        >
          <ArrowLeft size={12} /> Back
        </button>

        {isLastQuestion ? (
          <button
            onClick={() => submitAnswers()}
            disabled={submitting}
            className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={12} /> Submitting...
              </>
            ) : (
              <>
                <CheckCircle size={14} /> Submit Assessment
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            Next <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
