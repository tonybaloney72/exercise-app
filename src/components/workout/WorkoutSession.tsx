"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RoundCard from "./RoundCard";
import StretchSection from "./StretchSection";
import { useWorkoutStore } from "@/stores/useWorkoutStore";

import { parseTimeInput, formatSecondsToMMSS } from "@/utils/time";
import { DEFAULT_WARM_UP, DEFAULT_COOL_DOWN } from "@/data/stretches";
import type { DayPlan } from "@/types";

interface WorkoutSessionProps {
	plan: DayPlan;
}

export default function WorkoutSession({ plan }: WorkoutSessionProps) {
	const {
		activeWorkout,
		toggleJog,
		skipJog,
		unskipJog,
		setJogDistance,
		setJogDurationSeconds,
		toggleWarmUpStretch,
		toggleCoolDownStretch,
		skipWarmUpStretch,
		unskipWarmUpStretch,
		skipCoolDownStretch,
		unskipCoolDownStretch,
		setWorkoutNotes,
		completeWorkout,
		discardWorkout,
	} = useWorkoutStore();

	const [isJogOpen, setIsJogOpen] = useState(false);
	const [distanceInput, setDistanceInput] = useState("");
	const [durationInput, setDurationInput] = useState("");

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

	const handleComplete = () => {
		completeWorkout();
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
			<StretchSection
				title="Warm-Up Stretches"
				stretches={DEFAULT_WARM_UP}
				exerciseLogs={activeWorkout.warmUpExercises}
				onToggle={toggleWarmUpStretch}
				onSkip={skipWarmUpStretch}
				onUnskip={unskipWarmUpStretch}
			/>

			{/* Jog section — shaped like a single-row stretch section so it sits
				as a true sibling to warm-up / rounds / cool-down. The header is a
				container summary; completion/skip lives on the inner Run row. */}
			{plan.hasJog && (() => {
				const jogDone = activeWorkout.jogCompleted || activeWorkout.jogSkipped;
				return (
					<div className='rounded-xl border border-border bg-surface overflow-hidden'>
						<button
							type='button'
							onClick={() => setIsJogOpen(!isJogOpen)}
							className='flex w-full items-center justify-between px-4 py-3 text-left'>
							<div className='flex items-center gap-2'>
								<h3 className='text-sm font-semibold text-foreground'>Jog</h3>
								{jogDone && (
									<motion.span
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										className='text-green-400 text-xs'>
										✓
									</motion.span>
								)}
							</div>
							<div className='flex items-center gap-2'>
								<span className='text-xs text-muted'>{jogDone ? 1 : 0}/1</span>
								<div className='h-1.5 w-16 rounded-full bg-border overflow-hidden'>
									<motion.div
										className='h-full rounded-full bg-accent'
										initial={{ width: 0 }}
										animate={{ width: `${jogDone ? 100 : 0}%` }}
										transition={{ duration: 0.3 }}
									/>
								</div>
								<svg
									width='16'
									height='16'
									viewBox='0 0 24 24'
									fill='none'
									stroke='currentColor'
									strokeWidth='2'
									strokeLinecap='round'
									strokeLinejoin='round'
									className={`text-muted transition-transform ${isJogOpen ? "rotate-180" : ""}`}>
									<polyline points='6 9 12 15 18 9' />
								</svg>
							</div>
						</button>

						<AnimatePresence initial={false}>
							{isJogOpen && (
								<motion.div
									initial={{ height: 0 }}
									animate={{ height: "auto" }}
									exit={{ height: 0 }}
									transition={{ duration: 0.25 }}
									className='overflow-hidden'>
									<div className='border-t border-border px-2 py-1 space-y-0.5'>
										{/* Run row: matches StretchRow shape (checkbox + label + skip). */}
										<div
											className={`transition-colors ${activeWorkout.jogSkipped ? "opacity-40" : ""}`}>
											<div className='flex items-center gap-2 px-1'>
												<button
													type='button'
													onClick={toggleJog}
													aria-pressed={activeWorkout.jogCompleted}
													className='flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-all active:scale-95'
													style={{
														borderColor: activeWorkout.jogCompleted
															? "var(--accent)"
															: "var(--border-color)",
														backgroundColor: activeWorkout.jogCompleted
															? "var(--accent)"
															: "transparent",
													}}>
													{activeWorkout.jogCompleted && (
														<motion.svg
															initial={{ scale: 0 }}
															animate={{ scale: 1 }}
															transition={{
																type: "spring",
																stiffness: 400,
																damping: 15,
															}}
															width='14'
															height='14'
															viewBox='0 0 14 14'
															fill='none'
															stroke='white'
															strokeWidth='2.5'
															strokeLinecap='round'
															strokeLinejoin='round'>
															<path d='M2.5 7.5L5.5 10.5L11.5 3.5' />
														</motion.svg>
													)}
												</button>

												<div className='flex-1 min-w-0 py-2'>
													<p
														className={`text-sm font-medium transition-all ${
															activeWorkout.jogCompleted || activeWorkout.jogSkipped
																? "text-muted line-through"
																: "text-foreground"
														}`}>
														Run
													</p>
													<p className='text-xs text-muted'>Distance + time</p>
												</div>

												{!activeWorkout.jogCompleted && !activeWorkout.jogSkipped && (
													<button
														type='button'
														onClick={skipJog}
														className='p-1.5 text-muted hover:text-foreground transition-colors'
														title='Skip'>
														<svg
															width='16'
															height='16'
															viewBox='0 0 24 24'
															fill='none'
															stroke='currentColor'
															strokeWidth='2'
															strokeLinecap='round'
															strokeLinejoin='round'>
															<polyline points='5 4 15 12 5 20 5 4' />
															<line x1='19' y1='5' x2='19' y2='19' />
														</svg>
													</button>
												)}
												{activeWorkout.jogSkipped && (
													<button
														type='button'
														onClick={unskipJog}
														className='p-1.5 text-muted hover:text-foreground transition-colors'
														title='Undo skip'>
														<svg
															width='16'
															height='16'
															viewBox='0 0 24 24'
															fill='none'
															stroke='currentColor'
															strokeWidth='2'
															strokeLinecap='round'
															strokeLinejoin='round'>
															<polyline points='1 4 1 10 7 10' />
															<path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10' />
														</svg>
													</button>
												)}
											</div>

											{/* Distance / Time inputs sit under the row, indented to align
												with the row label rather than the checkbox. */}
											<div className='pl-10 pr-1 pb-3 flex gap-3'>
												<div className='flex-1'>
													<label className='text-[10px] text-muted uppercase tracking-wider'>
														Distance (mi)
													</label>
													<input
														type='text'
														inputMode='decimal'
														value={
															distanceInput ||
															(activeWorkout.jogDistance != null
																? String(activeWorkout.jogDistance)
																: "")
														}
														onChange={e => setDistanceInput(e.target.value)}
														onBlur={() => {
															const val = distanceInput.trim();
															if (val === "") {
																setJogDistance(undefined);
															} else {
																const num = parseFloat(val);
																setJogDistance(isNaN(num) ? undefined : num);
															}
															setDistanceInput("");
														}}
														className='mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent'
														placeholder='1.3'
													/>
												</div>
												<div className='flex-1'>
													<label className='text-[10px] text-muted uppercase tracking-wider'>
														Time (MM:SS)
													</label>
													<input
														type='text'
														inputMode='numeric'
														value={
															durationInput ||
															formatSecondsToMMSS(activeWorkout.jogDurationSeconds)
														}
														onChange={e => setDurationInput(e.target.value)}
														onBlur={() => {
															const parsed = parseTimeInput(durationInput);
															setJogDurationSeconds(parsed);
															setDurationInput("");
														}}
														className='mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent'
														placeholder='17:35'
													/>
												</div>
											</div>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				);
			})()}

			{/* Rounds */}
			{plan.rounds.map((round, i) => (
				<RoundCard
					key={round.roundNumber}
					round={round}
					roundLog={activeWorkout.rounds[i]}
				/>
			))}

			{/* Cool-down */}
			<StretchSection
				title="Cool-Down Stretches"
				stretches={DEFAULT_COOL_DOWN}
				exerciseLogs={activeWorkout.coolDownExercises}
				onToggle={toggleCoolDownStretch}
				onSkip={skipCoolDownStretch}
				onUnskip={unskipCoolDownStretch}
			/>

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
			</div>

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
