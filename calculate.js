const datesMap = require('bazi-calculator-by-alvamind/src/dates_mapping.json');

// Heavenly Stems
const STEMS = [null, '甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const STEMS_PY = [null, 'Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
const STEMS_EL = [null, 'Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];
const STEMS_YY = [null, 'Yang','Yin','Yang','Yin','Yang','Yin','Yang','Yin','Yang','Yin'];

// Earthly Branches
const BRANCHES = [null, '子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const BRANCHES_PY = [null, 'Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
const BRANCHES_EL = [null, 'Water','Earth','Wood','Wood','Earth','Fire','Fire','Earth','Metal','Metal','Earth','Water'];
const ANIMALS = [null, 'Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'];

// Hidden Stems for each Branch
const HIDDEN_STEMS = {
  1: [10],
  2: [6,10,2],
  3: [1,3,5],
  4: [2],
  5: [5,2,10],
  6: [3,5,7],
  7: [4,6],
  8: [6,4,2],
  9: [7,5,10],
  10: [8],
  11: [5,8,4],
  12: [10,1],
};

function getTenGod(dmStem, targetStem) {
  const dmEl = STEMS_EL[dmStem];
  const tEl = STEMS_EL[targetStem];
  const dmYY = STEMS_YY[dmStem];
  const tYY = STEMS_YY[targetStem];
  const same = dmYY === tYY;
  const cycle = {
    Wood: { Wood: 'Companion', Fire: 'Output', Earth: 'Wealth', Metal: 'Officer', Water: 'Resource' },
    Fire: { Fire: 'Companion', Earth: 'Output', Metal: 'Wealth', Water: 'Officer', Wood: 'Resource' },
    Earth: { Earth: 'Companion', Metal: 'Output', Water: 'Wealth', Wood: 'Officer', Fire: 'Resource' },
    Metal: { Metal: 'Companion', Water: 'Output', Wood: 'Wealth', Fire: 'Officer', Earth: 'Resource' },
    Water: { Water: 'Companion', Wood: 'Output', Fire: 'Wealth', Earth: 'Officer', Metal: 'Resource' }
  };
  const base = cycle[dmEl][tEl];
  const gods = {
    Companion: [same ? 'Rob Wealth' : 'Friend', same ? 'Friend' : 'Rob Wealth'],
    Output: [same ? 'Eating God' : 'Hurting Officer', same ? 'Hurting Officer' : 'Eating God'],
    Wealth: [same ? 'Direct Wealth' : 'Indirect Wealth', same ? 'Indirect Wealth' : 'Direct Wealth'],
    Officer: [same ? 'Seven Killings' : 'Direct Officer', same ? 'Direct Officer' : 'Seven Killings'],
    Resource: [same ? 'Indirect Resource' : 'Direct Resource', same ? 'Direct Resource' : 'Indirect Resource']
  };
  return gods[base][same ? 0 : 1];
}

function getHourBranch(hour) {
  const map = [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12];
  return map[hour] || 1;
}

function getHourStem(dayStem, hourBranch) {
  const base = ((parseInt(dayStem) - 1) % 5) * 2;
  return ((base + hourBranch - 1) % 10) + 1;
}

function calculateBaZi(year, month, day, hour) {
  const data = datesMap[String(year)]?.[String(month)]?.[String(day)];
  if (!data) return { error: 'Date not found in calendar (supported range: 1930-2048)' };

  const yearStem = parseInt(data.HYear);
  const yearBranch = parseInt(data.EYear);
  const monthStem = parseInt(data.HMonth);
  const monthBranch = parseInt(data.EMonth);
  const dayStem = parseInt(data.HDay);
  const dayBranch = parseInt(data.EDay);
  const season = parseInt(data.season);

  let hourStem = null, hourBranch = null;
  if (hour !== undefined && hour !== null && hour !== '') {
    hourBranch = getHourBranch(hour);
    hourStem = getHourStem(dayStem, hourBranch);
  }

  const pillars = {
    year: { stem: yearStem, branch: yearBranch },
    month: { stem: monthStem, branch: monthBranch },
    day: { stem: dayStem, branch: dayBranch },
  };
  if (hourStem) pillars.hour = { stem: hourStem, branch: hourBranch };

  for (const [key, p] of Object.entries(pillars)) {
    p.stemChar = STEMS[p.stem];
    p.stemPinyin = STEMS_PY[p.stem];
    p.stemElement = STEMS_EL[p.stem];
    p.stemYinYang = STEMS_YY[p.stem];
    p.branchChar = BRANCHES[p.branch];
    p.branchPinyin = BRANCHES_PY[p.branch];
    p.branchElement = BRANCHES_EL[p.branch];
    p.animal = ANIMALS[p.branch];
    p.hiddenStems = (HIDDEN_STEMS[p.branch] || []).map(s => ({
      stem: s,
      char: STEMS[s],
      pinyin: STEMS_PY[s],
      element: STEMS_EL[s],
      tenGod: getTenGod(dayStem, s)
    }));
    p.tenGod = key === 'day' ? 'Day Master' : getTenGod(dayStem, p.stem);
    p.ganZhi = p.stemChar + p.branchChar;
  }

  const elements = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const p of Object.values(pillars)) {
    elements[p.stemElement]++;
    elements[p.branchElement]++;
  }

  const dayMaster = {
    stem: dayStem,
    char: STEMS[dayStem],
    pinyin: STEMS_PY[dayStem],
    element: STEMS_EL[dayStem],
    yinYang: STEMS_YY[dayStem]
  };

  const parts = [pillars.year, pillars.month, pillars.day];
  if (pillars.hour) parts.push(pillars.hour);
  const chineseString = parts.map(p => p.ganZhi).join(' ');

  return { pillars, dayMaster, elements, season, chineseString };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { email, year, month, day, hour, gender, birthPlace } = req.body || {};

    if (!email || !year || !month || !day || !gender) {
      return res.status(400).json({
        error: 'Missing required fields: email, year, month, day, gender'
      });
    }

    const result = calculateBaZi(
      parseInt(year, 10),
      parseInt(month, 10),
      parseInt(day, 10),
      hour === '' || hour === undefined || hour === null ? null : parseInt(hour, 10)
    );

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({
      ok: true,
      email,
      gender,
      birthPlace: birthPlace || '',
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      detail: String(error.message || error)
    });
  }
};