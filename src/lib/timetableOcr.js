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

/**
 * Flattens Tesseract's hierarchical output (blocks -> paragraphs -> lines ->
 * words) into one flat word list with absolute bounding boxes.
 */
function flattenWords(blocks) {
  const words = [];
  for (const block of blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        for (const word of line.words || []) {
          words.push({ text: word.text, x0: word.bbox.x0, y0: word.bbox.y0, x1: word.bbox.x1, y1: word.bbox.y1 });
        }
      }
    }
  }
  return words;
}

/**
 * Runs the uploaded timetable photo through Tesseract and returns word-level
 * positions (real OCR, not a stub). Tesseract.js v5+ only returns `data.text`
 * by default — word/line/block bounding boxes require explicitly requesting
 * the `blocks` output, otherwise `data.words` doesn't exist at all and every
 * upload silently detects 0 words. That was the actual cause behind "Filled
 * in 0 of 0 detected slot(s)" on every photo, not photo quality.
 */
export async function runTimetableOcr(imageFile) {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(imageFile, {}, { blocks: true });
    const words = flattenWords(data.blocks);
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

function isRecessWord(word) {
  return /^recess$/i.test(word.text.replace(/[^a-z]/gi, ''));
}

/** Groups a sorted list of numbers into clusters wherever the gap between consecutive values is unusually large. */
function clusterByGaps(sortedValues) {
  if (!sortedValues.length) return [];
  const gaps = [];
  for (let i = 1; i < sortedValues.length; i += 1) gaps.push(sortedValues[i] - sortedValues[i - 1]);
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const threshold = Math.max(avgGap * 1.8, 20);

  const clusters = [[sortedValues[0]]];
  for (let i = 1; i < sortedValues.length; i += 1) {
    if (sortedValues[i] - sortedValues[i - 1] > threshold) clusters.push([]);
    clusters[clusters.length - 1].push(sortedValues[i]);
  }
  return clusters.map((c) => c.reduce((a, b) => a + b, 0) / c.length);
}

function nearestIndex(value, anchors) {
  let best = 0;
  let bestDist = Infinity;
  anchors.forEach((anchor, i) => {
    const dist = Math.abs(value - anchor);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

/** Day-per-ROW layout: day names run down the left column, time slots run across as columns (the common Indian college timetable format). */
function buildGridDayPerRow(words, dayWords) {
  const sortedDayWords = [...dayWords].sort((a, b) => centerY(a) - centerY(b));
  const dayRowAnchors = sortedDayWords.map((w) => ({ day: matchDay(w), y: centerY(w) }));
  const ranges = dayRowAnchors.map((anchor, i) => ({
    day: anchor.day,
    lo: i === 0 ? -Infinity : (dayRowAnchors[i - 1].y + anchor.y) / 2,
    hi: i === dayRowAnchors.length - 1 ? Infinity : (anchor.y + dayRowAnchors[i + 1].y) / 2,
  }));

  const dayColumnRightEdge = Math.max(...dayWords.map((w) => w.x1));
  const cellWords = words.filter((w) => !matchDay(w) && !isRecessWord(w) && w.x0 > dayColumnRightEdge - 5);

  const columnAnchors = clusterByGaps(cellWords.map(centerX).sort((a, b) => a - b));
  if (!columnAnchors.length) return {};

  const cells = {};
  for (const { day, lo, hi } of ranges) {
    const rowWords = cellWords.filter((w) => centerY(w) >= lo && centerY(w) < hi);
    const byColumn = new Map();
    for (const w of rowWords) {
      const col = nearestIndex(centerX(w), columnAnchors);
      if (!byColumn.has(col)) byColumn.set(col, []);
      byColumn.get(col).push(w);
    }
    for (const [col, wds] of byColumn.entries()) {
      wds.sort((a, b) => centerY(a) - centerY(b) || a.x0 - b.x0);
      cells[`${day}-${col + 1}`] = wds.map((w) => w.text).join(' ').trim();
    }
  }
  return cells;
}

/** Day-per-COLUMN layout: one header row with all day names, lecture rows underneath. */
function buildGridDayPerColumn(words, dayWords) {
  const dayColumns = {};
  for (const w of dayWords) dayColumns[matchDay(w)] = centerX(w);
  const dayEntries = Object.entries(dayColumns).sort((a, b) => a[1] - b[1]);
  const headerY = dayWords.reduce((sum, w) => sum + centerY(w), 0) / dayWords.length;

  const sorted = [...words].sort((a, b) => centerY(a) - centerY(b));
  const avgHeight = sorted.reduce((sum, w) => sum + (w.y1 - w.y0), 0) / sorted.length;
  const rowThreshold = avgHeight * 0.7;

  const rows = [];
  for (const word of sorted) {
    if (Math.abs(centerY(word) - headerY) < rowThreshold) continue; // skip the header row itself
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(centerY(word) - lastRow.y) < rowThreshold) {
      lastRow.words.push(word);
    } else {
      rows.push({ y: centerY(word), words: [word] });
    }
  }

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

  const cells = {};
  let lectureNumber = 0;
  for (const row of rows) {
    const meaningfulWords = row.words.filter((w) => !matchDay(w) && !isRecessWord(w));
    if (!meaningfulWords.length) continue;
    lectureNumber += 1;
    if (lectureNumber > 10) break;

    const byDay = new Map();
    for (const w of meaningfulWords) {
      const day = nearestDay(centerX(w));
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(w.text);
    }
    for (const [day, textParts] of byDay.entries()) {
      cells[`${day}-${lectureNumber}`] = textParts.join(' ').trim();
    }
  }
  return cells;
}

/**
 * Reconstructs a day/lecture-number grid from OCR word positions. Detects
 * whether the photo has days running down the rows (time-slots as columns
 * — the common Indian college timetable format) or across a header row
 * (days as columns, lecture numbers as rows), based on whether the
 * detected day-name words are spread out more vertically or horizontally.
 * Real reconstruction from actual word positions, not a fixed template —
 * accuracy depends on photo quality and layout, which is exactly why the
 * result feeds into an editable confirmation grid rather than being saved
 * directly.
 */
export function buildGridFromWords(words) {
  if (!words.length) return { cells: {} };

  const dayWords = words.filter((w) => matchDay(w));
  if (dayWords.length < 2) return { cells: {} }; // not enough day labels to anchor a layout

  const ys = dayWords.map(centerY);
  const xs = dayWords.map(centerX);
  const spreadY = Math.max(...ys) - Math.min(...ys);
  const spreadX = Math.max(...xs) - Math.min(...xs);

  const cells = spreadY > spreadX ? buildGridDayPerRow(words, dayWords) : buildGridDayPerColumn(words, dayWords);
  return { cells };
}

/**
 * Best-effort match of an OCR-guessed cell string to one of the user's
 * real subjects (case-insensitive, either-direction substring match on
 * name or code — cell text often carries extra faculty/room text too,
 * e.g. "ARDBMS (RC) K-203", so containment rather than equality). Returns
 * null rather than guessing wrong when nothing reasonably matches — the
 * confirmation UI lets the user pick manually.
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
