import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { 
  Dumbbell, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Clock, 
  Flame, 
  Sparkles, 
  ChevronRight,
  Plus,
  RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';

export const MemberWorkoutsView: React.FC = () => {
  const { showToast } = useToast();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0);

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const res = await api.getMemberWorkouts();
      setWorkouts(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load workouts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const currentWorkout = workouts[selectedWorkoutIndex] || null;

  const handleToggleExercise = async (exerciseIdx: number) => {
    if (!currentWorkout) return;
    try {
      let exs: any[] = [];
      try {
        exs = JSON.parse(currentWorkout.exercises);
      } catch {
        exs = [];
      }

      exs[exerciseIdx].completed = !exs[exerciseIdx].completed;

      // Check if all exercises are completed
      const allCompleted = exs.every((e: any) => e.completed);
      const newStatus = allCompleted ? 'COMPLETED' : 'ASSIGNED';

      const updated = await api.updateMemberWorkout(currentWorkout.id, {
        exercises: JSON.stringify(exs),
        status: newStatus,
      });

      setWorkouts(prev => prev.map((w, idx) => idx === selectedWorkoutIndex ? updated : w));

      if (allCompleted && currentWorkout.status !== 'COMPLETED') {
        showToast('🏆 High five! Entire workout routine completed.', 'success');
      }
    } catch (err: any) {
      showToast('Failed to update exercise completion', 'error');
    }
  };

  const handleSetWorkoutStatus = async (status: 'COMPLETED' | 'ASSIGNED' | 'SKIPPED') => {
    if (!currentWorkout) return;
    try {
      const updated = await api.updateMemberWorkout(currentWorkout.id, { status });
      setWorkouts(prev => prev.map((w, idx) => idx === selectedWorkoutIndex ? updated : w));
      showToast(`Workout marked as ${status.toLowerCase()}`, 'success');
    } catch (err: any) {
      showToast('Failed to update status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#86868b]">Loading your workout routines...</p>
      </div>
    );
  }

  let exercises: any[] = [];
  if (currentWorkout?.exercises) {
    try {
      exercises = JSON.parse(currentWorkout.exercises);
    } catch {
      exercises = [];
    }
  }

  const completedCount = exercises.filter(e => e.completed).length;
  const progressPercent = exercises.length > 0 ? Math.round((completedCount / exercises.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-[#86868b] tracking-wider uppercase">
            TRAINING & ROUTINES
          </span>
          <h1 className="text-[24px] font-bold text-[#1d1d1f] tracking-tight mt-0.5">
            Personal Exercise Plan
          </h1>
          <p className="text-[13px] text-[#6e6e73]">
            Track sets, check off reps, and log your progress.
          </p>
        </div>

        {/* Date / Plan switcher */}
        {workouts.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 bg-[#f5f5f7] rounded-full border border-[#e5e5ea] text-[12px] font-medium overflow-x-auto">
            {workouts.map((w, idx) => (
              <button
                key={w.id}
                onClick={() => setSelectedWorkoutIndex(idx)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                  selectedWorkoutIndex === idx
                    ? 'bg-white text-[#1d1d1f] shadow-xs font-semibold'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                {new Date(w.scheduledDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </button>
            ))}
          </div>
        )}
      </div>

      {currentWorkout ? (
        <div className="space-y-4">
          {/* Active Workout Card */}
          <div className="bg-white p-6 rounded-[24px] border border-[#e5e5ea] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f0f0f2]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    currentWorkout.status === 'COMPLETED'
                      ? 'bg-[#f4fcf6] text-[#34c759] border-[#34c759]/30'
                      : currentWorkout.status === 'SKIPPED'
                      ? 'bg-[#fff2f2] text-[#ff3b30] border-[#ff3b30]/30'
                      : 'bg-[#f0f4ff] text-[#0071e3] border-[#0071e3]/30'
                  }`}>
                    {currentWorkout.status}
                  </span>
                  <span className="text-[12px] text-[#86868b]">
                    Scheduled for {new Date(currentWorkout.scheduledDate).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-[20px] font-bold text-[#1d1d1f]">
                  {currentWorkout.title}
                </h2>
                {currentWorkout.description && (
                  <p className="text-[13px] text-[#6e6e73] mt-1">
                    {currentWorkout.description}
                  </p>
                )}
              </div>

              {/* Progress Ring / Bar */}
              <div className="sm:text-right">
                <div className="text-[20px] font-bold text-[#1d1d1f]">
                  {completedCount} <span className="text-[14px] text-[#86868b] font-normal">/ {exercises.length}</span>
                </div>
                <div className="text-[11px] text-[#86868b] font-medium">Exercises Done</div>
                <div className="w-32 h-2 bg-[#f5f5f7] rounded-full overflow-hidden mt-1.5 sm:ml-auto">
                  <div 
                    className="h-full bg-[#34c759] transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Exercise Checklist */}
            <div className="space-y-3">
              <h3 className="text-[13px] font-bold text-[#86868b] uppercase tracking-wider">
                Exercise Breakdown
              </h3>

              {exercises.map((ex, idx) => {
                const isDone = ex.completed || false;
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleExercise(idx)}
                    className={`p-4 rounded-[18px] border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isDone 
                        ? 'bg-[#f8fdf9] border-[#34c759]/40 text-[#1d1d1f]' 
                        : 'bg-[#fafafc] border-[#e5e5ea] hover:border-[#b0b0b5]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isDone ? 'bg-[#34c759] text-white' : 'border border-[#d2d2d7] bg-white text-transparent'
                      }`}>
                        <CheckCircle2 size={18} className={isDone ? 'block' : 'hidden'} />
                      </div>
                      <div>
                        <div className={`font-semibold text-[14px] ${isDone ? 'line-through text-[#6e6e73]' : 'text-[#1d1d1f]'}`}>
                          {ex.name}
                        </div>
                        <div className="text-[12px] text-[#86868b] flex items-center gap-2 mt-0.5">
                          <span>{ex.sets} Sets</span>
                          <span>•</span>
                          <span>{ex.reps} Reps</span>
                          {ex.weight && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-[#0071e3]">{ex.weight}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-[12px] font-medium text-[#86868b]">
                      {isDone ? (
                        <span className="text-[#34c759] font-semibold">Done</span>
                      ) : (
                        <span>Tap to check</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Workout Coach Notes */}
            {currentWorkout.notes && (
              <div className="p-4 bg-[#f0f4ff] border border-[#0071e3]/20 rounded-[18px] text-[13px] text-[#1d1d1f] space-y-1">
                <div className="text-[11px] font-semibold text-[#0071e3] uppercase tracking-wider">
                  Trainer's Note
                </div>
                <p className="text-[#3a3a3c]">{currentWorkout.notes}</p>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => handleSetWorkoutStatus('COMPLETED')}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#34c759] hover:bg-[#30b753] text-white font-semibold text-[13px] rounded-full shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Mark Entire Routine Complete</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleSetWorkoutStatus('SKIPPED')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#86868b] font-medium text-[12px] rounded-full transition-all cursor-pointer"
                >
                  Rest Day / Skip
                </button>
                <button
                  onClick={() => handleSetWorkoutStatus('ASSIGNED')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] font-medium text-[12px] rounded-full transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-[24px] border border-[#e5e5ea] text-center space-y-3">
          <Dumbbell size={32} className="text-[#86868b] mx-auto" />
          <h2 className="text-[17px] font-bold text-[#1d1d1f]">No Workouts Assigned</h2>
          <p className="text-[13px] text-[#86868b] max-w-sm mx-auto">
            Your gym trainer hasn't scheduled a workout for today. Enjoy your recovery session!
          </p>
        </div>
      )}
    </div>
  );
};
