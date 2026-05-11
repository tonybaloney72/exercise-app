import type { Exercise } from "@/types";

export const exercises: Exercise[] = [
  // ── Core – Front/Flexion (CF) ──
  { id: "CF-1", name: "Toe Reach", category: "CF", defaultReps: "12", notes: "Lie on back, legs vertical, reach toward toes", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CF-2", name: "Crunch 1½ Reps", category: "CF", defaultReps: "10", notes: "Full crunch, halfway down, back up = 1 rep", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CF-3", name: "Sit Up", category: "CF", defaultReps: "12", notes: "Full sit-up, control the descent", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CF-4", name: "½ Recline Sit Up", category: "CF", defaultReps: "10", notes: "Start seated, recline halfway, return", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CF-5", name: "Crunch Pulses", category: "CF", defaultReps: "15", notes: "Small pulsing crunches at the top", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CF-6", name: "Crunch Reach Through", category: "CF", defaultReps: "12", notes: "Crunch up and reach hands through legs", source: "Video 2", videoUrl: "https://youtu.be/fZPS3DrShuE?si=mEE9MHh9QA4SdSnR", isTimeBased: false },
  { id: "CF-7", name: "Chair Sit Ups", category: "CF", defaultReps: "10", notes: "Feet on chair, full sit-up", source: "Video 2", videoUrl: "https://youtu.be/fZPS3DrShuE?si=mEE9MHh9QA4SdSnR", isTimeBased: false },

  // ── Core – Lower Abs (CL) ──
  { id: "CL-1", name: "Reverse Crunch", category: "CL", defaultReps: "12", notes: "Knees to chest, lift hips off ground", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CL-2", name: "Leg Lower to Tuck", category: "CL", defaultReps: "10", notes: "Extend legs out, tuck back in", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CL-3", name: "Alternating Leg Lower", category: "CL", defaultReps: "12 each", notes: "One leg lowers at a time, keep other vertical", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CL-4", name: "Tuck to Extend", category: "CL", defaultReps: "10", notes: "Tucked position, extend legs out, return", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CL-5", name: "Hip Raises", category: "CL", defaultReps: "12", notes: "Legs vertical, push hips toward ceiling", source: "Video 2", videoUrl: "https://youtu.be/fZPS3DrShuE?si=mEE9MHh9QA4SdSnR", isTimeBased: false },
  { id: "CL-6", name: "Ins and Outs", category: "CL", defaultReps: "12", notes: "Bouncy mountain climbers; legs in/out from plank", source: "Video 2", videoUrl: "https://youtu.be/fZPS3DrShuE?si=mEE9MHh9QA4SdSnR", isTimeBased: false, secondaryCategory: "CP" },

  // ── Core – Rotational/Obliques (CR) ──
  { id: "CR-1", name: "Bicycle", category: "CR", defaultReps: "12 each", notes: "Opposite elbow to knee, alternating", source: "Video 1 & 2", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CR-2", name: "Straight Leg Bicycle", category: "CR", defaultReps: "12 each", notes: "Same as bicycle but legs stay straight", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CR-3", name: "Legs Only Bicycle", category: "CR", defaultReps: "12 each", notes: "Bicycle motion, hands behind head, no upper body twist", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CR-4", name: "Russian Twists", category: "CR", defaultReps: "15 each", notes: "Seated, lean back, twist side to side", source: "Video 2", videoUrl: "https://youtu.be/fZPS3DrShuE?si=mEE9MHh9QA4SdSnR", isTimeBased: false },
  { id: "CR-5", name: "Alternating Side Crunch", category: "CR", defaultReps: "12 each", notes: "Side crunch, alternate sides", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CR-6", name: "Side Planks", category: "CR", defaultReps: "20–30 sec each", notes: "Hold side plank position, each side", source: "Video 2", videoUrl: "https://youtu.be/fZPS3DrShuE?si=mEE9MHh9QA4SdSnR", isTimeBased: true },

  // ── Core – Stability/Anti-Extension (CS) ──
  { id: "CS-1", name: "Hollow to Tuck", category: "CS", defaultReps: "10", notes: "Hollow body hold, tuck knees in, extend back out", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CS-2", name: "Hover to Opposite Foot Reach", category: "CS", defaultReps: "10 each", notes: "From all-fours hover, reach to opposite foot", source: "Video 1", videoUrl: "https://youtu.be/Z_dgrjRlD_4?si=xq2mmzzkb0_FbaFY", isTimeBased: false },
  { id: "CS-3", name: "Dead Bug", category: "CS", defaultReps: "10 each", notes: "On back, opposite arm/leg extend, alternate", source: "Video 2", videoUrl: "https://youtu.be/fZPS3DrShuE?si=mEE9MHh9QA4SdSnR", isTimeBased: false },
  { id: "CS-4", name: "Regular Plank", category: "CS", defaultReps: "30–45 sec", notes: "Standard forearm plank", source: "Video 2", videoUrl: "https://youtu.be/fZPS3DrShuE?si=mEE9MHh9QA4SdSnR", isTimeBased: true },
  { id: "CS-5", name: "Glute Bridge", category: "CS", defaultReps: "15", notes: "On back, drive hips up, squeeze glutes at top", source: "Video 2", videoUrl: "https://youtu.be/fZPS3DrShuE?si=mEE9MHh9QA4SdSnR", isTimeBased: false, secondaryCategory: "LB" },

  // ── Upper Body – Push (UP) ──
  { id: "UP-1", name: "Knee Push-Ups", category: "UP", defaultReps: "10–13", notes: "Standard push-up from knees. PROGRESSION: work toward full push-ups", source: "Current routine", isTimeBased: false },
  { id: "UP-2", name: "Diamond Knee Push-Ups", category: "UP", defaultReps: "8–10", notes: "Hands close together in diamond shape, from knees. Tricep emphasis", source: "New", isTimeBased: false },
  { id: "UP-3", name: "Pike Push-Ups (Knee)", category: "UP", defaultReps: "8–10", notes: "Hips high, push head toward floor. Shoulder emphasis. Progress to feet", source: "New", isTimeBased: false },
  { id: "UP-4", name: "Wide Knee Push-Ups", category: "UP", defaultReps: "10–12", notes: "Hands wider than shoulders, from knees. Chest emphasis", source: "New", isTimeBased: false },
  { id: "UP-5", name: "Chair/Bench Dips", category: "UP", defaultReps: "8–12", notes: "Hands on chair edge behind you, dip down. Tricep emphasis", source: "New", isTimeBased: false },
  { id: "UP-6", name: "Incline Push-Ups", category: "UP", defaultReps: "10–15", notes: "Hands on elevated surface (table/counter). Easier than floor — good for volume", source: "New", isTimeBased: false },
  { id: "UP-7", name: "Decline Knee Push-Ups", category: "UP", defaultReps: "8–10", notes: "Feet elevated on chair, knees on ground. Upper chest emphasis. ADVANCED", source: "New", isTimeBased: false },

  // ── Upper Body – Pull (UPL) ──
  { id: "UPL-1", name: "Table Rows", category: "UPL", defaultReps: "8–12", notes: "Lie under sturdy table, grip edge, pull chest to table", source: "New", isTimeBased: false },
  { id: "UPL-2", name: "Resistance Band Rows", category: "UPL", defaultReps: "12–15", notes: "Anchor band at mid-height, pull toward torso, squeeze shoulder blades", source: "New", isTimeBased: false },
  { id: "UPL-3", name: "Resistance Band Bicep Curls", category: "UPL", defaultReps: "12–15", notes: "Stand on band, curl up. Bicep isolation", source: "New", isTimeBased: false },
  { id: "UPL-4", name: "Resistance Band Pull-Aparts", category: "UPL", defaultReps: "12–15", notes: "Hold band in front, pull apart to sides. Rear delt + upper back", source: "New", isTimeBased: false },
  { id: "UPL-5", name: "Resistance Band Face Pulls", category: "UPL", defaultReps: "12–15", notes: "Anchor band high, pull toward face with elbows high. Rear delt + rotator cuff", source: "New", isTimeBased: false },
  { id: "UPL-6", name: "Resistance Band Lat Pulldowns", category: "UPL", defaultReps: "10–12", notes: "Anchor band high, pull down to sides. Lat emphasis", source: "New", isTimeBased: false },

  // ── Lower Body (LB) ──
  { id: "LB-1", name: "Bodyweight Squats", category: "LB", defaultReps: "15", notes: "Feet shoulder-width, sit back and down", source: "Current routine", isTimeBased: false },
  { id: "LB-2", name: "Forward Lunges", category: "LB", defaultReps: "10 each", notes: "Step forward, lower back knee toward ground", source: "New", isTimeBased: false },
  { id: "LB-3", name: "Reverse Lunges", category: "LB", defaultReps: "10 each", notes: "Step backward into lunge. Easier on knees than forward", source: "New", isTimeBased: false },
  { id: "LB-4", name: "Bulgarian Split Squats", category: "LB", defaultReps: "8 each", notes: "Rear foot elevated on chair. ADVANCED — add when squats feel easy", source: "New", isTimeBased: false },
  { id: "LB-5", name: "Wall Sit", category: "LB", defaultReps: "30–45 sec", notes: "Back against wall, thighs parallel to floor, hold", source: "New", isTimeBased: true },
  { id: "LB-6", name: "Calf Raises", category: "LB", defaultReps: "15–20", notes: "Stand on edge of step or flat ground, raise onto toes", source: "New", isTimeBased: false },
  { id: "LB-7", name: "Sumo Squats", category: "LB", defaultReps: "12", notes: "Wide stance, toes pointed out. Inner thigh emphasis", source: "New", isTimeBased: false },
  { id: "LB-8", name: "Step-Ups", category: "LB", defaultReps: "10 each", notes: "Step onto sturdy chair or step, alternate legs", source: "New", isTimeBased: false },
  { id: "LB-9", name: "Glute Bridge (Single Leg)", category: "LB", defaultReps: "8 each", notes: "One leg extended, drive hips up with other. ADVANCED version of CS-5", source: "New", isTimeBased: false },

  // ── Cardio/Plyometric (CP) ──
  { id: "CP-1", name: "Jumping Jacks", category: "CP", defaultReps: "20–25", notes: "Classic jumping jacks", source: "Current routine", isTimeBased: false },
  { id: "CP-2", name: "Standing Elbows to Knees", category: "CP", defaultReps: "20 each", notes: "Standing cross-body — elbow to opposite knee", source: "Current routine", isTimeBased: false },
  { id: "CP-3", name: "Switch Mountain Climbers", category: "CP", defaultReps: "20 each", notes: "Alternating mountain climbers with a switch/hop", source: "Video 2", videoUrl: "https://youtu.be/fZPS3DrShuE?si=mEE9MHh9QA4SdSnR", isTimeBased: false },
  { id: "CP-4", name: "Burpees", category: "CP", defaultReps: "5–8", notes: "Squat, jump back to plank, push-up (knee), jump forward, stand. START LOW", source: "New", isTimeBased: false },
  { id: "CP-5", name: "High Knees", category: "CP", defaultReps: "20 each", notes: "Running in place, knees high", source: "New", isTimeBased: false },
  { id: "CP-6", name: "Squat Jumps", category: "CP", defaultReps: "8–10", notes: "Squat down, explode upward. PLYOMETRIC", source: "New", isTimeBased: false },
  { id: "CP-7", name: "Inner Thigh Pulses", category: "CP", defaultReps: "15 each", notes: "Standing leg lifts inward", source: "Current routine", isTimeBased: false },
];

export const exerciseMap: Record<string, Exercise> = Object.fromEntries(
  exercises.map((e) => [e.id, e])
);
