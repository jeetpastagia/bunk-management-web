import { createWorker } from 'tesseract.js';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_ALIASES = {
  monday: ['mon', 'monday'],
  tuesday: ['tue', 'tues', 'tuesday'],
  wednesday: ['wed', 'weds', 'wednesday'],
  thursday: ['thu', 'thur', 'thurs', 'thursday'],
  friday: ['fri', 'friday'],
  saturday: ['sat', 'saturday'],
};

/** Runs the uploaded timetable photo through Tesseract and returns word-level positions (real OCR, not a stub). */
export async function runTimetableOcr(imageFile) {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(imageFile);
    const words = (data.words || []).map((w) => ({
      text: w.text,
      x0: w.bbox.x0,
      y0: w.bbox.y0,
      x1: w.bbox.x1,
      y1: w.bbox.y1,
    }));
    return { words, rawText: data.text };
  } finally {
    await worker.terminate();
  }
}

function centerX(word) {
  return (word.x0 + word.x1) / 2;
}
function centerY(word) {
  return (word.y0 + word.y1) / 2;
}

function matchDay(word) {
  const norm = word.text.toLowerCase().replace(/[^a-z]/g, '');
  for (const day of DAYS) {
    if (DAY_ALIASES[day].includes(norm)) return day;
  }
  return null;
}

/**
 * Groups OCR words into rows (by vertical proximity) then columns (by
 * horizontal position, anchored to wherever the day names were detected —
 * falling back to 6 evenly-sized columns across the image width if no day
 * header row was found). This is real table reconstruction from word
 * positions, not a fixed template — accuracy depends on photo quality, which
 * is exactly why the result feeds into an editable confirmation grid rather
 * than being saved directly.
 */
export function buildGridFromWords(words) {
  if (!words.length) return { cells: {}, dayColumns: {} };

  const sorted = [...words].sort((a, b) => centerY(a) - centerY(b));
  const avgHeight = sorted.reduce((sum, w) => sum + (w.y1 - w.y0), 0) / sorted.length;
  const rowThreshold = avgHeight * 0.7;

  const rows = [];
  for (const word of sorted) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(centerY(word) - lastRow.y) < rowThreshold) {
      lastRow.words.push(word);
      lastRow.y = (lastRow.y * (lastRow.words.length - 1) + centerY(word)) / lastRow.words.length;
    } else {
      rows.push({ y: centerY(word), words: [word] });
    }
  }
  rows.forEach((r) => r.words.sort((a, b) => a.x0 - b.x0));

  // Find the header row with the most recognizable day names.
  let headerRowIndex = -1;
  let dayColumns = {};
  let bestDayCount = 0;
  rows.forEach((row, i) => {
    const found = {};
    for (const w of row.words) {
      const day = matchDay(w);
      if (day) found[day] = centerX(w);
    }
    const count = Object.keys(found).length;
    if (count > bestDayCount) {
      bestDayCount = count;
      headerRowIndex = i;
      dayColumns = found;
    }
  });

  const minX = Math.min(...words.map((w) => w.x0));
  const maxX = Math.max(...words.map((w) => w.x1));
  if (bestDayCount < 2) {
    // No usable day header found — fall back to 6 even columns as a best guess.
    dayColumns = {};
    DAYS.forEach((day, i) => {
      dayColumns[day] = minX + ((i + 0.5) * (maxX - minX)) / 6;
    });
  }

  const dayEntries = Object.entries(dayColumns).sort((a, b) => a[1] - b[1]);
  function nearestDay(x) {
    let best = null;
    let bestDist = Infinity;
    for (const [day, colX] of dayEntries) {
      const dist = Math.abs(x - colX);
      if (dist < bestDist) {
        bestDist = dist;
        best = day;
      }
    }
    return best;
  }

  const cells = {}; // `${day}-${lectureNumber}` -> guessed text
  let lectureNumber = 0;
  rows.forEach((row, i) => {
    if (i === headerRowIndex) return;
    // Skip rows that are entirely to the left of the first day column (row/lecture-number labels only).
    const meaningfulWords = row.words.filter((w) => !matchDay(w));
    if (!meaningfulWords.length) return;
    lectureNumber += 1;
    if (lectureNumber > 10) return; // sanity cap

    const byDay = {};
    for (const w of meaningfulWords) {
      const day = nearestDay(centerX(w));
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(w.text);
    }
    for (const [day, textParts] of Object.entries(byDay)) {
      cells[`${day}-${lectureNumber}`] = textParts.join(' ').trim();
    }
  });

  return { cells, dayColumns };
}

/**
 * Best-effort match of an OCR-guessed cell string to one of the user's
 * real subjects (case-insensitive, either-direction substring match on
 * name or code). Returns null rather than guessing wrong when nothing
 * reasonably matches — the confirmation UI lets the user pick manually.
 */
export function matchSubjectName(cellText, subjects) {
  const norm = (cellText || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!norm) return null;

  for (const subject of subjects) {
    const name = (subject.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const code = (subject.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (name && (norm.includes(name) || name.includes(norm))) return subject._id;
    if (code && (norm.includes(code) || code.includes(norm))) return subject._id;
  }
  return null;
}

export { DAYS };
