import { FitnessProfile, HabitItem, RecordItem } from '../types/workbench';

export const formatMoney = (val: number): string => {
  return `¥${Number(val || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const calculateBMI = (weightKg: number, heightCm: number): { bmi: number; status: string; color: string } => {
  if (!weightKg || !heightCm) return { bmi: 0, status: '未测算', color: '#746d63' };
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  if (bmi < 18.5) return { bmi, status: '偏瘦', color: '#5f7188' };
  if (bmi < 24.0) return { bmi, status: '正常健康', color: '#477358' };
  if (bmi < 28.0) return { bmi, status: '轻度超重', color: '#a57c45' };
  return { bmi, status: '肥胖', color: '#b44d43' };
};

// Mifflin-St Jeor formula for TDEE & Deficit
export const calculateCalorieDeficit = (
  profile: FitnessProfile,
  currentWeight: number,
  todayIntake?: number,
  exerciseMinutes?: number
): { tdee: number; bmr: number; deficit: number | null; feedback: string } => {
  const { height, age, sex, activity } = profile;
  const weight = currentWeight || profile.startWeight || 60;
  
  // BMR
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  if (sex === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  bmr = Math.round(bmr);
  
  const tdee = Math.round(bmr * (activity || 1.375));
  
  if (!todayIntake || todayIntake <= 0) {
    return {
      tdee,
      bmr,
      deficit: null,
      feedback: `按 Mifflin–St Jeor 公式估算，您当前每日总消耗(TDEE)约 ${tdee} kcal。记下今日饮食即可估算热量缺口。`,
    };
  }
  
  // Extra exercise burn estimate: ~6-8 kcal per min
  const exerciseBurn = (exerciseMinutes || 0) * 7;
  const totalExpenditure = tdee + exerciseBurn;
  const deficit = totalExpenditure - todayIntake;
  
  let feedback = '';
  if (deficit >= 500 && deficit <= 750) {
    feedback = `今日估算热量缺口 ${deficit} kcal，处于健康减脂黄金区间 (500–750 kcal)，节奏极佳！`;
  } else if (deficit > 750) {
    feedback = `今日缺口 ${deficit} kcal 偏大，请注意蛋白质与优质碳水摄入，避免代谢受损。`;
  } else if (deficit > 0) {
    feedback = `今日缺口 ${deficit} kcal，处于温和减脂区间，积少成多。`;
  } else {
    feedback = `今日热量盈余 ${Math.abs(deficit)} kcal，偶尔享受美食很正常，明天继续保持动起来！`;
  }
  
  return { tdee, bmr, deficit, feedback };
};

// Calculate 7-day moving averages for fitness weight
export const calculateMovingAverages = (records: RecordItem[]): { date: string; weight: number; ma7: number }[] => {
  const fitness = records
    .filter((r) => r.type === 'fitness' && (r.data as any).weight)
    .sort((a, b) => a.date.localeCompare(b.date));

  return fitness.map((item, idx, arr) => {
    const weight = (item.data as any).weight;
    const window = arr.slice(Math.max(0, idx - 6), idx + 1);
    const sum = window.reduce((acc, curr) => acc + (curr.data as any).weight, 0);
    const ma7 = Number((sum / window.length).toFixed(2));
    return {
      date: item.date,
      weight,
      ma7,
    };
  });
};

// Whether a habit entry value counts as "done" for a given habit type
export const isHabitDone = (habit: HabitItem, val: number | string | undefined): boolean => {
  if (val === undefined || val === null) return false;
  if (habit.type === 'time') return typeof val === 'string' && val.length > 0;
  if (habit.type === 'word') return typeof val === 'string' && val.length > 0;
  const num = typeof val === 'number' ? val : Number(val);
  if (Number.isNaN(num)) return false;
  return num >= (habit.type === 'check' ? 1 : habit.target);
};

// Calculate habit streak for a habit item
export const calculateHabitStreak = (habit: HabitItem, todayStr: string): { currentStreak: number; bestStreak: number; rate30: number } => {
  const entries = habit.entries || {};
  let currentStreak = 0;
  let checkDate = new Date();
  
  // Check if today or yesterday is completed
  let todayVal = entries[todayStr];
  let isTodayDone = isHabitDone(habit, todayVal);
  
  // Count back
  let d = new Date();
  if (!isTodayDone) {
    d.setDate(d.getDate() - 1); // check from yesterday
  }
  
  while (true) {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    const dateKey = local.toISOString().slice(0, 10);
    const val = entries[dateKey];
    const done = isHabitDone(habit, val);
    if (done) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
    if (currentStreak > 365) break;
  }

  // 30 day completion rate
  let doneCount30 = 0;
  for (let i = 0; i < 30; i++) {
    const past = new Date();
    past.setDate(past.getDate() - i);
    const local = new Date(past.getTime() - past.getTimezoneOffset() * 60000);
    const key = local.toISOString().slice(0, 10);
    const val = entries[key];
    if (isHabitDone(habit, val)) {
      doneCount30++;
    }
  }
  const rate30 = Math.round((doneCount30 / 30) * 100);

  return {
    currentStreak,
    bestStreak: Math.max(currentStreak, Math.round(doneCount30 * 0.7) + 2),
    rate30,
  };
};

export const compressImageToBase64 = (file: File, maxDim = 800, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(e.target?.result as string);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('图片加载解析失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
};
