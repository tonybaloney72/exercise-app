/**
 * Form-cue notes and unilateral defaultReps for Hybrid Calisthenics catalog rows.
 * Run: node scripts/enrich-hc-notes.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

/** @typedef {{ pattern: RegExp; note: string }} NoteRule */

/** @type {NoteRule[]} */
const NOTE_RULES = [
  {
    pattern: /45 degree back raise/i,
    note: "Hinge at hips over the pad; raise torso to a neutral line, pause briefly, lower with control.",
  },
  {
    pattern: /lying back extension/i,
    note: "Prone on the floor; lift chest slightly by extending the spine-no equipment needed.",
  },
  {
    pattern: /back extension machine|weighted back extension/i,
    note: "Pad at hips; extend spine to neutral and lower under control. Add load only when form is solid.",
  },
  {
    pattern: /reverse hyperextension machine|reverse hyperextension/i,
    note: "Torso on bench or pad; swing legs up to hip height with control, avoid jerking at the top.",
  },
  {
    pattern: /back bridge/i,
    note: "Press through feet and shoulders to lift hips; keep knees aligned and avoid cranking the neck.",
  },
  {
    pattern: /jefferson curl|weighted jefferson curl/i,
    note: "Stand on a bench or box; round down segment by segment, then reverse with control.",
  },
  {
    pattern: /good morning|smith machine good morning/i,
    note: "Bar on upper back; hinge at hips with a flat back, then drive hips forward to stand.",
  },
  {
    pattern: /bird dog|weighted bird dog/i,
    note: "On all fours, extend opposite arm and leg; keep hips level and avoid rotating the torso.",
  },
  {
    pattern: /dead bug|weighted dead bug/i,
    note: "Low back flat on floor; extend opposite arm and leg without letting ribs flare.",
  },
  {
    pattern: /hollow body hold|weighted hollow body hold/i,
    note: "Lower back pressed down; lift shoulders and legs off floor and hold a tight hollow shape.",
  },
  {
    pattern:
      /wall toe raise|weighted wall toe|weighted seated toe raise|seated toe raise|heel walk/i,
    note: "Back against wall or seated; lift toes toward shins with heels down to target tibialis.",
  },
  {
    pattern:
      /band resisted toe raise|cable toe raise|tibialis anterior machine/i,
    note: "Dorsiflex against resistance; lift toes toward shins, pause, lower slowly.",
  },
  {
    pattern: /ab crunch machine|band resisted crunch|weighted crunch|crunch$/i,
    note: "Curl ribs toward hips; exhale on the effort and avoid pulling on the neck.",
  },
  {
    pattern: /cable crunch|ab roll-out|barbell ab roll-out|ring roll-out/i,
    note: "Brace core; roll or crunch through a controlled range without sagging the lower back.",
  },
  {
    pattern:
      /leg raise|band resisted leg raise|band resisted hanging leg raise|cable leg raise/i,
    note: "Raise legs with control; keep lower back stable and avoid swinging or momentum.",
  },
  {
    pattern:
      /hanging oblique raise|oblique crunch|band oblique crunch|cable oblique crunch/i,
    note: "Crunch or raise toward one side; move slowly and keep hips from swinging.",
  },
  {
    pattern:
      /russian twist|weighted russian twist|barbell tight twist|oblique twist machine/i,
    note: "Rotate torso side to side with control; keep chest up and core braced throughout.",
  },
  {
    pattern: /woodchopper|band woodchopper|cable woodchopper/i,
    note: "Chop diagonally across the body; rotate through the torso, not the arms alone.",
  },
  {
    pattern: /pallof press|band pallof press|cable pallof press/i,
    note: "Press band or cable straight out from chest; resist rotation and hold a tall posture.",
  },
  {
    pattern:
      /side plank|weighted side plank|copenhagen plank|weighted copenhagen plank/i,
    note: "Stack shoulders over elbow or wrist; lift hips in a straight line and breathe steadily.",
  },
  {
    pattern: /plank to dolphin|plank$/i,
    note: "Hold a rigid plank from shoulders to heels; keep ribs down and glutes engaged.",
  },
  {
    pattern:
      /push-up|pushup|band-resisted push-up|band-resisted serratus push-up|serratus push-up/i,
    note: "Body in one line; lower chest toward floor, press back up without sagging hips.",
  },
  {
    pattern: /decline push-up|decline pushup/i,
    note: "Feet elevated; keep core tight and lower chest with control on the incline.",
  },
  {
    pattern:
      /pike push-up|pike pushup|handstand push-up|pseudo planche push-up/i,
    note: "Hips high; bend elbows to lower head toward floor, then press back to start.",
  },
  {
    pattern: /dip|triceps press machine|triceps extension machine/i,
    note: "Lower until upper arms are roughly parallel; press up without flaring elbows wide.",
  },
  {
    pattern: /pullup|chin up|commando pullup|pelican curl/i,
    note: "Full hang to start; pull until chin clears the bar, lower with control.",
  },
  {
    pattern: /dead hang/i,
    note: "Hang with shoulders engaged; build grip and shoulder stability without swinging.",
  },
  {
    pattern: /front lever raise|elbow press/i,
    note: "Pull shoulders down and back; lift or press through the lats with a braced core.",
  },
  {
    pattern:
      /row|ring row|t bar row|machine row|band row|cable row|bent-over|inverted deadlift/i,
    note: "Pull toward the torso; squeeze shoulder blades together and control the return.",
  },
  {
    pattern:
      /lat pulldown|band lat pulldown|cable lat pulldown|lat pullover machine/i,
    note: "Pull to upper chest; lean slightly back and drive elbows down, not behind the neck.",
  },
  {
    pattern: /lat pushdown|cable lat pushdown/i,
    note: "Push handles down in an arc; keep ribs down and finish with lats engaged.",
  },
  {
    pattern: /face pull|ring face pull|band face pull|cable face pull/i,
    note: "Pull toward face with elbows high; externally rotate at the end of the rep.",
  },
  {
    pattern:
      /reverse fly|band reverse fly|cable reverse fly|machine reverse fly|ring reverse fly|rear delt fly/i,
    note: "Hinge slightly; open arms wide to shoulder height, squeeze rear delts, lower slowly.",
  },
  {
    pattern: /pull-apart|band pull-apart/i,
    note: "Arms straight; pull band apart by squeezing shoulder blades, control the return.",
  },
  {
    pattern:
      /shrug|band shrug|barbell shrug|dumbbell shrug|cable shrug|upside down shrug/i,
    note: "Elevate shoulders straight up; pause briefly, lower without rolling forward.",
  },
  {
    pattern:
      /bench press|chest press|machine chest press|machine incline|machine decline|close grip bench|close grip dumbbell bench/i,
    note: "Press weight away with control; keep feet planted and avoid bouncing at the bottom.",
  },
  {
    pattern:
      /incline bench|cable chest press|decline cable chest press|incline cable chest press/i,
    note: "Press on the set incline; path follows rib cage with a controlled eccentric.",
  },
  {
    pattern:
      /fly|machine chest fly|cable chest fly|dumbbell fly|press-around|band press-around|cable press-around/i,
    note: "Arc arms wide in a hugging motion; slight elbow bend, squeeze chest at the top.",
  },
  {
    pattern: /pullover|dumbbell pullover/i,
    note: "Arms extended; lower weight behind head with control, pull back over the chest.",
  },
  {
    pattern:
      /overhead press|machine overhead press|band overhead press|barbell overhead press|dumbbell overhead press|cable overhead press/i,
    note: "Press overhead in line with ears; brace core and avoid excessive lower-back arch.",
  },
  {
    pattern:
      /front raise|band front raise|barbell front raise|dumbbell front raise|cable front raise|full rom front raise/i,
    note: "Raise arms to shoulder height with soft elbows; lower without swinging.",
  },
  {
    pattern:
      /lateral raise|wall lateral raise|egyptian dumbbell lateral raise|side-lying dumbbell lateral raise|machine lateral raise|band lateral raise|dumbbell lateral raise|cable lateral raise/i,
    note: "Raise arms out to the sides to shoulder height; lead with elbows, not hands.",
  },
  {
    pattern: /y-raise|y-raise|ring y-raise|dumbbell y-raise|cable y-raise/i,
    note: "Raise arms in a Y shape; thumbs up, squeeze upper back at the top.",
  },
  {
    pattern:
      /upright row|band upright row|barbell upright row|dumbbell upright row|cable upright row/i,
    note: "Pull elbows up along the body; keep bar or handles close and wrists neutral.",
  },
  {
    pattern: /lu raise|dumbbell lu raise/i,
    note: "Lying on side; raise arm through Lu raise path with control, keep shoulder packed.",
  },
  {
    pattern:
      /external rotation|internal rotation|side-lying external|side-lying internal/i,
    note: "Elbow at side, forearm rotates through range; move slowly, no momentum.",
  },
  {
    pattern:
      /curl|zottman|spider curl|preacher curl|face away cable curl|high cable curl|ring curl|reverse ring curl|pelican curl/i,
    note: "Curl with elbows fixed; full range up and controlled lower on the way down.",
  },
  {
    pattern:
      /hammer curl|band hammer curl|dumbbell hammer curl|cable hammer curl/i,
    note: "Neutral grip; curl without swinging, elbows stay at your sides.",
  },
  {
    pattern:
      /reverse curl|band reverse curl|barbell reverse curl|dumbbell reverse curl|cable reverse curl/i,
    note: "Overhand grip; curl with elbows pinned, emphasize forearms and brachialis.",
  },
  {
    pattern:
      /wrist curl|wrist extension|wrist flexion|band wrist|barbell wrist|cable wrist|dumbbell wrist|reverse wrist/i,
    note: "Forearms supported; flex or extend wrists through full range under control.",
  },
  {
    pattern: /pronation|supination|band pronation|band supination/i,
    note: "Rotate forearm slowly against band resistance; keep elbow stable at your side.",
  },
  {
    pattern:
      /skull crusher|overhead triceps extension|triceps pushdown|cross cable pushdown|cable triceps|band triceps|rings overhead triceps/i,
    note: "Keep upper arms still; extend elbows fully, lower weight with control.",
  },
  {
    pattern:
      /reach|band-resisted reach|cable reach|wall-slide|uppercut|dumbbell uppercut/i,
    note: "Protract shoulder blades forward; reach through full range without shrugging.",
  },
  {
    pattern:
      /deadlift|band deadlift|band-resisted deadlift|romanian deadlift|band-resisted romanian|straight legged deadlift|sumo deadlift/i,
    note: "Hinge at hips with flat back; drive hips forward to stand, control the descent.",
  },
  {
    pattern:
      /squat|goblet squat|front squat|back squat|hack squat|pendulum squat|leg press|smith machine squat|band resisted squat|band resisted split squat/i,
    note: "Sit hips back and down; knees track toes, chest up, drive through mid-foot to stand.",
  },
  {
    pattern:
      /split squat|bulgarian|barbell split squat|dumbbell split squat|weighted split squat|smith machine split|smith machine bulgarian/i,
    note: "Split stance; lower back knee toward floor, front knee over ankle, press up tall.",
  },
  {
    pattern:
      /lunge|deep lunge|weighted lunge|weighted deep lunge|band resisted deep lunge|smith machine deep lunge|pike pulse/i,
    note: "Long step; lower until back knee nears floor, front shin stays relatively vertical.",
  },
  {
    pattern:
      /cossack|weighted cossack|sumo squat|weighted sumo|deep squat|weighted deep squat/i,
    note: "Wide stance; shift into one hip while keeping the other leg straight, alternate sides.",
  },
  {
    pattern: /sissy squat|reverse nordic|nordic curl|hamstring slide/i,
    note: "Control the eccentric; use padding under knees and progress range gradually.",
  },
  {
    pattern: /hip thrust|single leg\) hip thrust|hip thrust machine/i,
    note: "Upper back on bench; drive hips up, squeeze glutes at top, lower under control.",
  },
  {
    pattern: /glute bridge/i,
    note: "Feet flat; drive hips up until body forms a straight line, squeeze glutes at top.",
  },
  {
    pattern:
      /kickback|glute med kickback|glute kickback machine|band kickback|band glute med|cable kickback|cable glute med/i,
    note: "Extend leg back from hip; squeeze glute at end range, avoid arching the lower back.",
  },
  {
    pattern:
      /hip abduction|abductor machine|band hip abduction|cable hip abduction/i,
    note: "Press leg out against resistance; control the return without letting weight slam.",
  },
  {
    pattern:
      /hip adduction|adductor machine|band hip adduction|cable hip adduction/i,
    note: "Squeeze legs together against resistance; smooth motion, full controlled range.",
  },
  {
    pattern:
      /leg extension|band resisted leg extension|cable leg extension|leg extension machine/i,
    note: "Extend knees to straight; pause at top, lower without dropping the weight.",
  },
  {
    pattern:
      /hamstring curl|lying hamstring|sitting hamstring|standing cable hamstring|lying cable hamstring|band resisted lying hamstring|band resisted sitting hamstring/i,
    note: "Curl heel toward glute; keep hips down and control the eccentric.",
  },
  {
    pattern:
      /calf raise|toe raise|bent knee calf|straight leg calf|band resisted.*calf|cable resisted.*calf|barbell.*calf|dumbbell.*calf/i,
    note: "Rise onto toes with control; pause at top, lower heels below platform if available.",
  },
  {
    pattern: /side bend|dumbbell side bend/i,
    note: "Stand tall; bend laterally toward one side, return to center without twisting.",
  },
  {
    pattern: /side-lying leg raise/i,
    note: "Lying on side; lift top leg with control, keep hips stacked and toes forward.",
  },
  {
    pattern: /hip flexor machine/i,
    note: "Lift knee against pad resistance; avoid rocking the torso, control the lowering phase.",
  },
];

const CATEGORY_FALLBACK = {
  CF: "Brace core; move through a controlled range without straining the neck.",
  CR: "Rotate or crunch with control; keep hips stable and breathe steadily.",
  CS: "Extend or brace the spine with control; avoid jerking at end range.",
  CL: "Lift legs smoothly; keep lower back stable throughout.",
  UP: "Press or push with control; full range without locking joints aggressively.",
  UPL: "Pull or curl with shoulders packed; squeeze at the peak, control the return.",
  LB: "Lower with control; drive through the working leg or both feet to complete the rep.",
  SW: "Move slowly through range; prioritize control over speed.",
};

export function isGenericHcNote(notes) {
  return (
    typeof notes === "string" &&
    (notes.includes("Muscle focus:") ||
      notes.includes("Reference: Hybrid Calisthenics exercise library") ||
      notes.includes("Perform with controlled tempo; see the linked video"))
  );
}

/**
 * @param {string} name
 * @param {string} [category]
 */
export function generateHcNote(name, category = "UP") {
  for (const { pattern, note } of NOTE_RULES) {
    if (pattern.test(name)) return note;
  }
  return (
    CATEGORY_FALLBACK[category] ??
    "Controlled tempo; full range of motion on every rep."
  );
}

/**
 * @param {string} name
 * @param {string} defaultReps
 * @param {boolean} isTimeBased
 */
export function eachQualifier(name, defaultReps, isTimeBased) {
  if (/each (leg|arm|side)/i.test(defaultReps)) return defaultReps;

  const n = name.toLowerCase();
  const baseNum = defaultReps.match(/^(\d+)/)?.[1] ?? "10";

  const sidePattern =
    /cossack|copenhagen|side plank|side bend|wall lateral|woodchopper|pallof|oblique crunch|side-lying dumbbell lateral|weighted side plank|weighted cossack|bird dog/i;
  const legPattern =
    /lunge|split squat|bulgarian|kickback|single leg|deep lunge|weighted lunge|glute med|band resisted leg extension|cable leg extension|side-lying leg raise/i;
  const armPattern = /side-lying external|side-lying internal|lu raise/i;

  if (sidePattern.test(n)) {
    return isTimeBased ? `${baseNum} sec each side` : `${baseNum} each side`;
  }
  if (armPattern.test(n)) {
    return `${baseNum} each arm`;
  }
  if (legPattern.test(n) && !/leg extension machine/i.test(n)) {
    return `${baseNum} each leg`;
  }

  return defaultReps;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET = join(
  __dirname,
  "../src/core/catalog/data/hybridCalisthenicsExercises.ts",
);

function extractField(block, field) {
  const inline = block.match(new RegExp(`${field}:\\s*"([^"]*)"`));
  if (inline) return inline[1];

  const multiline = block.match(
    new RegExp(`${field}:\\s*\\n\\s*"([^"]*)"`, "m"),
  );
  return multiline?.[1] ?? null;
}

function setField(block, field, value) {
  const inlineRe = new RegExp(`(${field}:\\s*)"([^"]*)"`, "m");
  if (inlineRe.test(block)) {
    return block.replace(inlineRe, `$1${JSON.stringify(value)}`);
  }

  const multilineRe = new RegExp(`(${field}:\\s*\\n\\s*)"([^"]*)"`, "m");
  if (multilineRe.test(block)) {
    return block.replace(multilineRe, `$1${JSON.stringify(value)}`);
  }

  return block;
}

function enrichHybridCatalog() {
  const text = readFileSync(TARGET, "utf8");
  const blockRe = /\n  \{[\s\S]*?\n  \},/g;

  let noteChanges = 0;
  let repChanges = 0;

  const updated = text.replace(blockRe, (block) => {
    const name = extractField(block, "name");
    const category = extractField(block, "category");
    const notes = extractField(block, "notes");
    const defaultReps = extractField(block, "defaultReps") ?? "10";
    const isTimeBased = /isTimeBased:\s*true/.test(block);

    if (!name) return block;

    let out = block;

    if (notes && isGenericHcNote(notes)) {
      const newNote = generateHcNote(name, category ?? "UP");
      out = setField(out, "notes", newNote);
      noteChanges += 1;
    }

    const newReps = eachQualifier(name, defaultReps, isTimeBased);
    if (newReps !== defaultReps) {
      out = setField(out, "defaultReps", newReps);
      repChanges += 1;
    }

    return out;
  });

  if (noteChanges > 0 || repChanges > 0) {
    writeFileSync(TARGET, updated, "utf8");
  }

  console.log(
    `HC enrich: ${noteChanges} notes updated, ${repChanges} defaultReps updated`,
  );
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  enrichHybridCatalog();
}
