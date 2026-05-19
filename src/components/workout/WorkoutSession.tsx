"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CardioSessionBlock from "./CardioSessionBlock";
import RoundCard from "./RoundCard";
import StretchSection from "./StretchSection";
import { resolveCardioActivities } from "@/lib/cardioActivities";
import { getCardioLog } from "@/lib/cardioWorkoutLog";
import { shouldSkipStretchesForPlan } from "@/lib/restDays";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";

import { celebrateWorkoutComplete } from "@/utils/workoutCelebration";
import { useResolvedStretches } from "@/hooks/useResolvedStretches";
import { toast } from "sonner";
import type { DayPlan } from "@/types";

interface WorkoutSessionProps {
	plan: DayPlan;
}

export default function WorkoutSession({ plan }: WorkoutSessionProps) {
	const {
		activeWorkout,
		toggleCardio,
		skipCardio,
		unskipCardio,
		setCardioDistance,
		setCardioDurationSeconds,
		toggleWarmUpStretch,
		toggleCoolDownStretch,
		skipWarmUpStretch,
		unskipWarmUpStretch,
		skipCoolDownStretch,
		unskipCoolDownStretch,
		setWarmUpStretchTargetDuration,
		setCoolDownStretchTargetDuration,
		setWarmUpStretchActualDuration,
		setCoolDownStretchActualDuration,
		syncStretchTargetsFromLibrary,
		setWorkoutNotes,
		completeWorkout,
		discardWorkout,
		pauseWorkout,
	} = useWorkoutStore();

	const exerciseSettingsById = useExerciseSettingsStore((s) => s.byExerciseId);
	const { warmUp, coolDown } = useResolvedStretches(plan);
	const cardioActivities = useMemo(() => resolveCardioActivities(plan), [plan]);
	const skipStretches = shouldSkipStretchesForPlan(plan);

	useEffect(() => {
		if (!activeWorkout) return;
		syncStretchTargetsFromLibrary();
	}, [activeWorkout?.id, exerciseSettingsById, syncStretchTargetsFromLibrary]);

	if (!activeWorkout) return null;

	const totalExercises = activeWorkout.rounds.reduce(
		(acc, r) => acc + r.exercises.length,
		0,
	);
	const completedExercises = activeWorkout.rounds.reduce(
		(acc, r) => acc + r.exercises.filter(e => e.completed || e.skipped).length,
		0,
	);
	const overallProgress =
		totalExercises > 0 ? completedExercises / totalExercises : 0;

	const handleComplete = async () => {
		const log = await completeWorkout();
		if (!log) return;
		void celebrateWorkoutComplete();
		toast.success("Workout complete!", {
			description: "Nice work — your session is saved.",
			duration: 4000,
		});
	};

	return (
		<div className='space-y-4 pb-4'>
			{/* Overall progress */}
			<div className='rounded-xl border border-border bg-surface p-4'>
				<div className='flex items-center justify-between mb-2'>
					<span className='text-xs font-medium text-muted'>
						Workout Progress
					</span>
					<span className='text-xs font-bold text-accent'>
						{Math.round(overallProgress * 100)}%
					</span>
				</div>
				<div className='h-2 rounded-full bg-border overflow-hidden'>
					<motion.div
						className='h-full rounded-full bg-linear-to-r from-accent to-purple-500'
						animate={{ width: `${overallProgress * 100}%` }}
						transition={{ duration: 0.4 }}
					/>
				</div>
			</div>

			{/* Warm-up */}
			{!skipStretches && (
			<StretchSection
				title="Warm-Up Stretches"
				stretches={warmUp}
				exerciseLogs={activeWorkout.warmUpExercises}
				onToggle={toggleWarmUpStretch}
				onSkip={skipWarmUpStretch}
				onUnskip={unskipWarmUpStretch}
				onSetTargetDuration={setWarmUpStretchTargetDuration}
				onSetActualDuration={setWarmUpStretchActualDuration}
			/>
			)}

			{cardioActivities.map((activity) => {
				const log = getCardioLog(activeWorkout, activity.exerciseId);
				if (!log) return null;
				return (
					<CardioSessionBlock
						key={activity.exerciseId}
						log={log}
						onToggle={() => toggleCardio(activity.exerciseId)}
						onSkip={() => skipCardio(activity.exerciseId)}
						onUnskip={() => unskipCardio(activity.exerciseId)}
						onSetDistance={(mi) => setCardioDistance(activity.exerciseId, mi)}
						onSetDurationSeconds={(sec) =>
							setCardioDurationSeconds(activity.exerciseId, sec)
						}
					/>
				);
			})}

			{/* Rounds */}
			{plan.rounds.map((round, i) => (
				<RoundCard
					key={round.roundNumber}
					round={round}
					roundLog={activeWorkout.rounds[i]}
				/>
			))}

			{/* Cool-down */}
			{!skipStretches && (
			<StretchSection
				title="Cool-Down Stretches"
				stretches={coolDown}
				exerciseLogs={activeWorkout.coolDownExercises}
				onToggle={toggleCoolDownStretch}
				onSkip={skipCoolDownStretch}
				onUnskip={unskipCoolDownStretch}
				onSetTargetDuration={setCoolDownStretchTargetDuration}
				onSetActualDuration={setCoolDownStretchActualDuration}
			/>
			)}

			{/* Notes */}
			<div className='rounded-xl border border-border bg-surface p-4'>
				<label className='text-xs font-medium text-muted'>
					Notes (optional)
				</label>
				<textarea
					rows={2}
					value={activeWorkout.notes ?? ""}
					onChange={e => setWorkoutNotes(e.target.value)}
					placeholder='How did it feel today?'
					className='mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted'
				/>
				<p className='mt-2 text-[11px] text-muted'>
					Progress saves automatically. Notes are saved when you tap{" "}
					<span className='font-medium text-foreground'>Complete Workout</span>.
				</p>
			</div>

			<button
				type='button'
				onClick={pauseWorkout}
				className='w-full rounded-xl border border-border bg-surface py-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40'>
				Save for later
			</button>

			{/* Actions */}
			<div className='flex gap-3'>
				<button
					onClick={discardWorkout}
					className='flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-muted transition-colors hover:text-foreground hover:border-foreground/20'>
					Discard
				</button>
				<button
					onClick={handleComplete}
					className='flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white transition-colors hover:bg-accent/90 active:bg-accent/80'>
					Complete Workout
				</button>
			</div>
		</div>
	);
}
