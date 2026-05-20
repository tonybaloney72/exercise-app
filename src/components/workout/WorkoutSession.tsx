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
import {
  isCompletedWorkoutLog,
  sessionPlanForWorkoutEdit,
  stretchEntriesFromLogs,
} from "@/lib/workoutEditSession";
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
		saveEditedWorkout,
		cancelEditingWorkout,
	} = useWorkoutStore();

	const isEditing = isCompletedWorkoutLog(activeWorkout);
	const sessionPlan = useMemo(
		() =>
			activeWorkout && isEditing
				? sessionPlanForWorkoutEdit(activeWorkout, plan)
				: plan,
		[activeWorkout, isEditing, plan],
	);

	const exerciseSettingsById = useExerciseSettingsStore((s) => s.byExerciseId);
	const { warmUp: resolvedWarmUp, coolDown: resolvedCoolDown } =
		useResolvedStretches(sessionPlan);
	const warmUp = useMemo(
		() =>
			isEditing && activeWorkout
				? stretchEntriesFromLogs(activeWorkout.warmUpExercises)
				: resolvedWarmUp,
		[isEditing, activeWorkout, resolvedWarmUp],
	);
	const coolDown = useMemo(
		() =>
			isEditing && activeWorkout
				? stretchEntriesFromLogs(activeWorkout.coolDownExercises)
				: resolvedCoolDown,
		[isEditing, activeWorkout, resolvedCoolDown],
	);
	const cardioActivities = useMemo(
		() => resolveCardioActivities(sessionPlan),
		[sessionPlan],
	);
	const skipStretches = shouldSkipStretchesForPlan(sessionPlan);

	useEffect(() => {
		if (!activeWorkout || isEditing) return;
		syncStretchTargetsFromLibrary();
	}, [
		activeWorkout?.id,
		exerciseSettingsById,
		isEditing,
		syncStretchTargetsFromLibrary,
	]);

	if (!activeWorkout) return null;

	const handleSaveEdits = async () => {
		const log = await saveEditedWorkout();
		if (!log) return;
		toast.success("Workout updated", {
			description: "Your changes to this session were saved.",
			duration: 3500,
		});
	};

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
			{isEditing && (
				<div className='rounded-xl border border-accent/30 bg-accent/10 px-4 py-3'>
					<p className='text-sm font-medium text-foreground'>Editing completed workout</p>
					<p className='text-xs text-muted mt-0.5'>
						Fix sets, skips, swaps, or cardio — then save. Cancel discards changes.
					</p>
				</div>
			)}

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
			{sessionPlan.rounds.map((round, i) => (
				<RoundCard
					key={round.roundNumber}
					round={round}
					roundLog={activeWorkout.rounds[i]}
					disableRestTimer={isEditing}
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
					{isEditing
						? "Notes are saved when you tap Save changes."
						: (
							<>
								Progress saves automatically. Notes are saved when you tap{" "}
								<span className='font-medium text-foreground'>Complete Workout</span>.
							</>
						)}
				</p>
			</div>

			{!isEditing && (
				<button
					type='button'
					onClick={pauseWorkout}
					className='w-full rounded-xl border border-border bg-surface py-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40'>
					Save for later
				</button>
			)}

			<div className='flex gap-3'>
				{isEditing ? (
					<>
						<button
							type='button'
							onClick={cancelEditingWorkout}
							className='flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-muted transition-colors hover:text-foreground hover:border-foreground/20'>
							Cancel
						</button>
						<button
							type='button'
							onClick={() => void handleSaveEdits()}
							className='flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white transition-colors hover:bg-accent/90 active:bg-accent/80'>
							Save changes
						</button>
					</>
				) : (
					<>
						<button
							type='button'
							onClick={discardWorkout}
							className='flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-muted transition-colors hover:text-foreground hover:border-foreground/20'>
							Discard
						</button>
						<button
							type='button'
							onClick={() => void handleComplete()}
							className='flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white transition-colors hover:bg-accent/90 active:bg-accent/80'>
							Complete Workout
						</button>
					</>
				)}
			</div>
		</div>
	);
}
