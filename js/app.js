import { GymExercise, CompoundLift, IsolationLift } from "./models/GymExercise.js";
import { FoodItem, DesiBoosterItem } from "./models/FoodItem.js";
import { calculateDailyMacros, calculateMealNutrition, calculateTotalTonnage } from "./utils/calculator.js";
import { StorageService } from "./services/storage.js";
import { soundFx } from "./services/audio.js";


const AppState = {
  currentSplit: 'All',
  selectedMuscle: 'chest', // Default to chest so exercises load immediately on first visit
  peak1RM: 0,
  exercises: [],
  foods: [],
  desiBooster: [],
  loggedFoods: [],

  // Workout volume tracking (reset each session)
  workoutVolume: {
    totalKg: 0,
    setsCompleted: 0,
    totalSets: 0
  },

  profile: {
    name: '',
    weightKg: 76,
    heightCm: 180,
    age: 21,
    gender: 'male',
    activityMultiplier: 1.55,
    goal: 'hypertrophy'
  },

  targets: {
    bmmi: 24.5,
    bmr: 1720,
    tdee: 2666,
    calories: 2200,
    protein: 150,
    carbs: 220,
    fats: 60
  },

  timer: {
    duration: 60,
    remaining: 60,
    intervalId: null,
    isPaused: false
  }
}

// Expose API immediately so inline onclick handlers never encounter undefined
window.HealthPulseApp = {
  startRestTimer,
  setRestTimerDuration,
  openFoodSearchModal,
  filterFoodModal,
  logFood,
  logFoodWithGrams,
  previewFoodMacros,
  deleteLoggedFood,
  saveNewExercise,
  previewProfile,
  saveProfile,
  logSet,
  setMuscleFilter,
  rotateBody,
  toggleBodyRotation,
  streakPrevMonth,
  streakNextMonth,
  toggleBlueprint,
  toggleChecklistCue
};

function calculateFitnessTargets(profile) {
  const heightM = profile.heightCm / 100;
  const fats = Math.round(profile.weightKg * 0.9);


  const bmi = Math.round((profile.weightKg / (heightM * heightM)) * 10) / 10;

  let bmr = (10 * profile.weightKg) + (6.25 * profile.heightCm) - (5 * profile.age);
  bmr = profile.gender === 'male' ? bmr + 5 : bmr - 161;
  bmr = Math.round(bmr);


  const tdee = Math.round(bmr * profile.activityMultiplier);

  let targetCalories = tdee;

  if (profile.goal == 'hypertrophy') {
    targetCalories += 300;
  } else if (profile.goal == 'weightloss') {
    targetCalories -= 500;
  }

  const protein = Math.round(profile.weightKg * 1.85);
  const proteinCals = protein * 4;
  const fatCals = fats * 9;
  const remainingCals = targetCalories - (proteinCals + fatCals);
  const carbs = Math.round(remainingCals / 4);

  AppState.targets = {
    bmi,
    bmr,
    tdee,
    calories: targetCalories,
    protein,
    carbs,
    fats
  }

  return AppState.targets;

}
// initial data loader 
async function loadInitialData() {
  try {
    const exResponse = await fetch('./data/gym_exercises.json');
    const rawExerciseData = await exResponse.json();


    AppState.exercises = rawExerciseData.map(ex => {
      const Model = ex.type === 'CompoundLift' ? CompoundLift : IsolationLift;
      return new Model(
        ex.name, ex.split, ex.targetMuscle, ex.sets, ex.reps, ex.weightKg,
        ex.id, ex.primaryMuscle, ex.secondaryMuscles, ex.muscleKey,
        ex.blueprint
      );
    });

    const foodResponse = await fetch('./data/indian_foods.json');
    const rawFoodData = await foodResponse.json();


    AppState.foods = rawFoodData.map(f => {
      if (f.isDesiBooster) {
        return new DesiBoosterItem(
          f.id, f.name, f.calories, f.protein, f.carbs, f.fats,
          f.servingUnit, f.servingGrams, f.category, f.diet,
          f.inputType, f.countUnit,
          f.leucineGrams, f.proteinQuality, f.aminoLimiting,
          f.recommendedPairing, f.pToCRatio, f.costPer25gP, f.canHaveTadka
        );
      }
      return new FoodItem(
        f.id, f.name, f.calories, f.protein, f.carbs, f.fats,
        f.servingUnit, f.servingGrams, f.category, f.diet,
        false, f.inputType, f.countUnit,
        f.leucineGrams, f.proteinQuality, f.aminoLimiting,
        f.recommendedPairing, f.pToCRatio, f.costPer25gP, f.canHaveTadka
      );
    });

    AppState.desiBooster = AppState.foods.filter(food => food.isDesiBooster);

    // Re-hydrate any persisted food entries with full FoodItem class instances
    if (AppState.loggedFoods && AppState.loggedFoods.length > 0) {
      AppState.loggedFoods = AppState.loggedFoods.map(entry => {
        const fullFood = AppState.foods.find(f => f.id === entry.food?.id) || entry.food;
        let meal = entry.meal;
        if (meal === 'PreWorkout') meal = 'Breakfast';
        if (meal === 'PostWorkout' || meal === 'PrePostWorkout') meal = 'Snacks';
        if (!['Breakfast', 'Lunch', 'Snacks', 'Dinner'].includes(meal)) meal = 'Breakfast';
        return {
          ...entry,
          food: fullFood,
          meal,
          tadkaLevel: entry.tadkaLevel || (fullFood.canHaveTadka ? 'light' : 'none')
        };
      });
    }

    console.log(`Loaded ${AppState.exercises.length} exercises and ${AppState.foods.length} Indian foods into OOP models!`);
  } catch (error) {
    console.error('Error loading datasets:', error);
  }
}



//store the data - web storage

function loadPersistedData() {

  const savedFoodLog = StorageService.get(StorageService.KEYS.DAILY_FOOD_LOG, []);
  AppState.loggedFoods = savedFoodLog.map(entry => {
    let meal = entry.meal;
    if (meal === 'PreWorkout') meal = 'Breakfast';
    if (meal === 'PostWorkout' || meal === 'PrePostWorkout') meal = 'Snacks';
    if (!['Breakfast', 'Lunch', 'Snacks', 'Dinner'].includes(meal)) meal = 'Breakfast';
    const fullFood = (AppState.foods && AppState.foods.length > 0)
      ? (AppState.foods.find(f => f.id === entry.food?.id) || entry.food)
      : entry.food;
    return {
      ...entry,
      food: fullFood,
      meal,
      tadkaLevel: entry.tadkaLevel || 'none'
    };
  });

  const savedProfile = StorageService.get(StorageService.KEYS.USER_GOALS);
  if (savedProfile) {
    AppState.profile = savedProfile;
    calculateFitnessTargets(AppState.profile);
  }
}

function savedFoodLog() {
  StorageService.set(StorageService.KEYS.DAILY_FOOD_LOG, AppState.loggedFoods);
}

// ─── PROTEIN STREAK ────────────────────────────────────────────────────────────

// Tracks which month the calendar is showing (always 1st of the month)
let _streakViewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function checkAndSaveProteinStreak() {
  const totals = calculateDailyMacros(AppState.loggedFoods);
  const proteinGoalMet = Math.round(totals.protein) >= AppState.targets.protein;

  const streakLog = StorageService.get(StorageService.KEYS.PROTEIN_STREAK, {});
  const todayKey  = getTodayKey();

  if (proteinGoalMet) {
    streakLog[todayKey] = true;
  } else {
    delete streakLog[todayKey];
  }

  StorageService.set(StorageService.KEYS.PROTEIN_STREAK, streakLog);
  renderProteinStreakCalendar();
}

function getCurrentStreak(streakLog) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (streakLog[key]) {
      streak++;
    } else if (i > 0) {  // allow today to be incomplete
      break;
    }
  }
  return streak;
}

function streakPrevMonth() {
  _streakViewDate = new Date(_streakViewDate.getFullYear(), _streakViewDate.getMonth() - 1, 1);
  renderProteinStreakCalendar();
}

function streakNextMonth() {
  _streakViewDate = new Date(_streakViewDate.getFullYear(), _streakViewDate.getMonth() + 1, 1);
  renderProteinStreakCalendar();
}

function renderProteinStreakCalendar() {
  const container = document.getElementById('proteinStreakCalendar');
  if (!container) return;

  const streakLog     = StorageService.get(StorageService.KEYS.PROTEIN_STREAK, {});
  const currentStreak = getCurrentStreak(streakLog);

  // Update header badge
  const streakText = document.getElementById('streakCountText');
  if (streakText) streakText.textContent = `${currentStreak} Day Streak`;

  const today      = new Date();
  const year       = _streakViewDate.getFullYear();
  const month      = _streakViewDate.getMonth();         // 0-indexed
  const monthName  = _streakViewDate.toLocaleString('default', { month: 'long' });
  const firstDOW   = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Is the viewer on the current real month?
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

  // Count goal-met days this month
  let metCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    if (streakLog[key]) metCount++;
  }

  const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const headerHtml = dayNames.map(d => `<div class="streak-day-header">${d}</div>`).join('');
  const blanks     = Array.from({ length: firstDOW }, () => '<div class="streak-cell blank"></div>').join('');

  const cellsHtml = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum   = i + 1;
    const key      = `${year}-${String(month + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    const isToday  = isThisMonth && today.getDate() === dayNum;
    const isFuture = new Date(year, month, dayNum) > today;
    const met      = !!streakLog[key];

    let cls = 'streak-cell';
    if (met)      cls += ' met';
    if (isToday)  cls += ' today';
    if (isFuture) cls += ' future';

    const label = isFuture
      ? `${monthName} ${dayNum}`
      : `${monthName} ${dayNum}: ${met ? 'Target Met' : 'Not Met'}`;

    return `<div class="${cls}" title="${label}">
      <span class="streak-day-num">${dayNum}</span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="streak-nav">
      <button class="streak-nav-btn" id="streakPrevBtn"
        onclick="window.HealthPulseApp.streakPrevMonth()" aria-label="Previous month">&#8249;</button>
      <div class="streak-month-title">${monthName} ${year}</div>
      <button class="streak-nav-btn" id="streakNextBtn"
        onclick="window.HealthPulseApp.streakNextMonth()" aria-label="Next month">&#8250;</button>
    </div>

    <div class="streak-month-meta">
      <span>${metCount} / ${daysInMonth} days goal met</span>
      <span class="streak-month-pct" style="color: ${metCount > 0 ? 'var(--accent-saffron)' : 'var(--text-muted)'}">${Math.round((metCount / daysInMonth) * 100)}%</span>
    </div>

    <div class="streak-grid">
      ${headerHtml}
      ${blanks}
      ${cellsHtml}
    </div>

    <div class="streak-legend">
      <span class="legend-dot met-dot"></span><span>Goal met</span>
      <span class="legend-dot empty-dot"></span><span>Missed</span>
      <span class="legend-dot today-dot"></span><span>Today</span>
    </div>
  `;
}

function setupNavigation() {
  const tabGym = document.getElementById('tabGymWorkouts');
  const tabNut = document.getElementById('tabNutrition');
  const viewGym = document.getElementById('viewGymWorkouts');
  const viewNut = document.getElementById('viewNutrition');


  tabGym?.addEventListener('click', () => {
    tabGym.classList.add('active');
    tabNut.classList.remove('active');
    viewGym.classList.add('active');
    viewNut.classList.remove('active')
  });

  tabNut?.addEventListener('click', () => {
    tabNut.classList.add('active');
    tabGym.classList.remove('active');
    viewNut.classList.add('active');
    viewGym.classList.remove('active');
    renderNutritionView();
  });

}

function setupWorkoutSplits() {
  syncMuscleMapUI();
}

// ─── 3D ROTATABLE ANATOMY STAGE & MUSCLE MAP FOCUS MODE ─────────────────────────

let bodyRotationAngle = 0;
let isDraggingBody = false;
let startDragX = 0;
let startAngle = 0;
let hasDragged = false;

const BACK_MUSCLES = ['glutes', 'traps', 'triceps', 'hamstrings', 'back'];
const FRONT_MUSCLES = ['chest', 'biceps', 'obliques', 'core', 'quads', 'forearms'];

function rotateBody(targetAngle) {
  bodyRotationAngle = targetAngle;
  applyBodyRotation();
}

function toggleBodyRotation() {
  const norm = ((Math.round(bodyRotationAngle) % 360) + 360) % 360;
  if (norm >= 90 && norm < 270) {
    rotateBody(0);
  } else {
    rotateBody(180);
  }
}

function applyBodyRotation() {
  const flipper = document.getElementById('bodyRotatorFlipper');
  const norm = ((Math.round(bodyRotationAngle) % 360) + 360) % 360;
  const isBack = norm >= 90 && norm < 270;

  if (flipper) {
    flipper.style.transform = `rotateY(${bodyRotationAngle}deg)`;
    flipper.classList.toggle('facing-back', isBack);
  }

  const frontFace = document.querySelector('.body-face-front');
  const backFace = document.querySelector('.body-face-back');
  if (frontFace && backFace) {
    if (isBack) {
      frontFace.style.pointerEvents = 'none';
      frontFace.style.zIndex = '1';
      backFace.style.pointerEvents = 'auto';
      backFace.style.zIndex = '2';
    } else {
      frontFace.style.pointerEvents = 'auto';
      frontFace.style.zIndex = '2';
      backFace.style.pointerEvents = 'none';
      backFace.style.zIndex = '1';
    }
  }

  const btnFront = document.getElementById('btnViewFront');
  const btnBack = document.getElementById('btnViewBack');

  if (btnFront) btnFront.classList.toggle('active', !isBack);
  if (btnBack) btnBack.classList.toggle('active', isBack);
}

function setupBodyRotatorDrag() {
  const stage = document.getElementById('bodyRotatorStage');
  if (!stage) return;

  let isPointerDown = false;
  let isActivelyDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartAngle = 0;

  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    isPointerDown = true;
    isActivelyDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartAngle = bodyRotationAngle;
  });

  stage.addEventListener('pointermove', (e) => {
    if (!isPointerDown) return;
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    if (!isActivelyDragging) {
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isActivelyDragging = true;
        stage.classList.add('is-dragging');
        try {
          stage.setPointerCapture(e.pointerId);
        } catch (_) {}
      } else {
        return;
      }
    }

    bodyRotationAngle = dragStartAngle + deltaX * 1.3;
    applyBodyRotation();
  });

  const onPointerUpOrCancel = (e) => {
    if (!isPointerDown) return;
    isPointerDown = false;

    if (isActivelyDragging) {
      isActivelyDragging = false;
      stage.classList.remove('is-dragging');
      try {
        if (e.pointerId && stage.hasPointerCapture(e.pointerId)) {
          stage.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      // Snap to nearest 0deg or 180deg
      const norm = ((Math.round(bodyRotationAngle) % 360) + 360) % 360;
      if (norm >= 90 && norm < 270) {
        bodyRotationAngle = Math.round((bodyRotationAngle - 180) / 360) * 360 + 180;
      } else {
        bodyRotationAngle = Math.round(bodyRotationAngle / 360) * 360;
      }
      applyBodyRotation();
    } else {
      // Clean tap or click - resolve clicked muscle
      let targetMuscleGroup = e.target ? e.target.closest('.muscle-group') : null;
      if (!targetMuscleGroup && e.clientX && e.clientY) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el) targetMuscleGroup = el.closest('.muscle-group');
      }
      if (targetMuscleGroup) {
        const m = targetMuscleGroup.getAttribute('data-muscle');
        if (m) {
          setMuscleFilter(m);
        }
      }
    }
  };

  stage.addEventListener('pointerup', onPointerUpOrCancel);
  stage.addEventListener('pointercancel', onPointerUpOrCancel);

  // Delegated click handler on stage as a backup
  stage.addEventListener('click', (e) => {
    if (isActivelyDragging) return;
    const mg = e.target.closest('.muscle-group');
    if (mg) {
      const m = mg.getAttribute('data-muscle');
      if (m) {
        setMuscleFilter(m);
      }
    }
  });
}

function getFilteredExercises() {
  if (!AppState.selectedMuscle) {
    return AppState.exercises;
  }

  if (AppState.selectedMuscle === 'all') {
    return AppState.exercises;
  }

  const filter = AppState.selectedMuscle.toLowerCase();
  return AppState.exercises.filter(ex => {
    const key = (ex.muscleKey || '').toLowerCase();
    const primary = (ex.primaryMuscle || ex.targetMuscle || '').toLowerCase();
    const target = (ex.targetMuscle || '').toLowerCase();
    const secondaries = (ex.secondaryMuscles || []).map(s => s.toLowerCase());

    return key === filter ||
      primary.includes(filter) ||
      target.includes(filter) ||
      secondaries.some(s => s.includes(filter)) ||
      (filter === 'core' && (key === 'obliques' || target.includes('core'))) ||
      (filter === 'obliques' && (key === 'core' || target.includes('oblique')));
  });
}

function setMuscleFilter(muscleKey) {
  if (!muscleKey) return;
  AppState.selectedMuscle = muscleKey;

  // Smart auto-rotate: rotate to show the selected muscle if on opposite side
  const norm = ((Math.round(bodyRotationAngle) % 360) + 360) % 360;
  const isFacingBack = norm >= 90 && norm < 270;

  if (BACK_MUSCLES.includes(muscleKey) && !isFacingBack) {
    rotateBody(180);
  } else if (FRONT_MUSCLES.includes(muscleKey) && isFacingBack) {
    rotateBody(0);
  }

  syncMuscleMapUI();
  renderWorkoutView();
}

function syncMuscleMapUI() {
  // Update SVG highlights across both Front and Back SVGs
  document.querySelectorAll('.muscle-group').forEach(group => {
    const m = group.getAttribute('data-muscle');
    if (AppState.selectedMuscle && (AppState.selectedMuscle === 'all' || m === AppState.selectedMuscle)) {
      group.classList.add('active-filter');
    } else {
      group.classList.remove('active-filter');
    }
  });

  // Update title
  const titleEl = document.getElementById('muscleFocusTitle');
  if (titleEl) {
    if (!AppState.selectedMuscle) {
      titleEl.textContent = 'Tap any muscle on the 3D model to reveal exercises';
    } else if (AppState.selectedMuscle === 'all') {
      titleEl.textContent = `Viewing All Exercises (${AppState.exercises.length} Total)`;
    } else {
      const prettyName = AppState.selectedMuscle.charAt(0).toUpperCase() + AppState.selectedMuscle.slice(1);
      const count = getFilteredExercises().length;
      titleEl.textContent = `Targeting: ${prettyName} (${count} Exercise${count !== 1 ? 's' : ''})`;
    }
  }

  renderMuscleQuickChips();
}

function renderMuscleQuickChips() {
  const container = document.getElementById('muscleQuickChips');
  if (!container) return;

  const bodyMuscles = [
    { key: 'chest', label: 'Chest' },
    { key: 'back', label: 'Back & Lats' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'biceps', label: 'Biceps' },
    { key: 'triceps', label: 'Triceps' },
    { key: 'glutes', label: 'Glutes' },
    { key: 'quads', label: 'Quads' },
    { key: 'hamstrings', label: 'Hamstrings' },
    { key: 'obliques', label: 'Obliques' },
    { key: 'calves', label: 'Calves' },
    { key: 'all', label: 'All Exercises' }
  ];

  container.innerHTML = bodyMuscles.map(chip => `
    <button
      class="muscle-chip ${AppState.selectedMuscle === chip.key ? 'active' : ''}"
      onclick="window.HealthPulseApp.setMuscleFilter('${chip.key}')"
    >
      ${chip.label}
    </button>
  `).join('');
}

// ─── PROGRESSIVE OVERLOAD TRACKER ENGINE ───────────────────────────────────────

function getOverloadData(exerciseId, defaultKg, defaultReps) {
  const history = StorageService.get(StorageService.KEYS.OVERLOAD_HISTORY, {});
  const entry = history[exerciseId];

  if (entry) {
    const lastKg = entry.lastKg;
    const lastReps = entry.lastReps;
    return {
      lastKg,
      lastReps,
      prKg: entry.prKg || lastKg,
      prReps: entry.prReps || lastReps,
      targetKg: entry.targetKg || (lastKg + 2.5),
      targetReps: entry.targetReps || lastReps,
      status: entry.status || 'ready'
    };
  }

  // Sensible default benchmark from baseline if never logged before
  const lastKg = Math.max(2.5, defaultKg);
  const lastReps = defaultReps;
  const targetKg = lastKg + 2.5;
  const targetReps = lastReps;

  return {
    lastKg,
    lastReps,
    prKg: lastKg,
    prReps: lastReps,
    targetKg,
    targetReps,
    status: 'ready'
  };
}

function updateOverloadSummary() {
  const history = StorageService.get(StorageService.KEYS.OVERLOAD_HISTORY, {});
  const visibleExercises = getFilteredExercises();

  let hits = 0;
  visibleExercises.forEach(ex => {
    const exKey = ex.id || ex.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const data = history[exKey];
    if (data && (data.status === 'pr' || data.status === 'on-track')) {
      hits++;
    }
  });

  const scoreEl = document.getElementById('overloadScoreVal');
  if (scoreEl) {
    scoreEl.textContent = `${hits} / ${visibleExercises.length || 0} Targets`;
  }
}

function renderWorkoutView() {
  const container = document.getElementById('exerciseListContainer');
  const splitTitleEl = document.getElementById('activeSplitTitle');
  if (!container) return;

  // If no muscle is selected yet
  if (!AppState.selectedMuscle) {
    if (splitTitleEl) splitTitleEl.textContent = 'Target Exercises';
    container.innerHTML = `
      <div class="empty-muscle-hero">
        <div class="empty-hero-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 3v18M3 12h18"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </div>
        <h3 class="empty-hero-title">Select a Muscle on the Model</h3>
        <p class="empty-hero-subtitle">
          Rotate the body above and tap any muscle (like <strong>Glutes</strong>, <strong>Chest</strong>, <strong>Back</strong>, or <strong>Obliques</strong>) to reveal exercises, progressive overload targets & form blueprints.
        </p>
      </div>
    `;
    return;
  }

  const visibleExercises = getFilteredExercises();

  if (splitTitleEl) {
    if (AppState.selectedMuscle === 'all') {
      splitTitleEl.textContent = `All Exercises (${visibleExercises.length})`;
    } else {
      const prettyName = AppState.selectedMuscle.charAt(0).toUpperCase() + AppState.selectedMuscle.slice(1);
      splitTitleEl.textContent = `${prettyName} Exercises (${visibleExercises.length})`;
    }
  }

  if (visibleExercises.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
        <p style="font-size: 1.05rem; margin-bottom: 12px; color: var(--text-primary);">
          No exercises currently registered for "${AppState.selectedMuscle}".
        </p>
        <button class="muscle-reset-btn" onclick="window.HealthPulseApp.setMuscleFilter('all')">
          View All Exercises
        </button>
      </div>
    `;
    return;
  }

  // Volume tracking
  AppState.workoutVolume = {
    totalKg: 0,
    setsCompleted: 0,
    totalSets: visibleExercises.reduce((sum, ex) => sum + ex.sets, 0)
  };
  updateVolumeDisplay();
  updateOverloadSummary();

  container.innerHTML = visibleExercises.map((ex, index) => {
    const exKey = ex.id || ex.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const bench = getOverloadData(exKey, ex.weightKg, ex.reps);

    const primaryTag = ex.primaryMuscle || ex.targetMuscle || 'General';
    const secondaryList = (ex.secondaryMuscles && ex.secondaryMuscles.length > 0)
      ? ex.secondaryMuscles.join(', ')
      : null;

    let statusBadgeHtml = '';
    if (bench.status === 'pr') {
      statusBadgeHtml = `<span class="overload-badge-status pr" id="overloadStatus_${index}">PR: ${bench.prKg}kg × ${bench.prReps}</span>`;
    } else if (bench.status === 'on-track') {
      statusBadgeHtml = `<span class="overload-badge-status on-track" id="overloadStatus_${index}">Overload Hit</span>`;
    } else if (bench.status === 'below') {
      statusBadgeHtml = `<span class="overload-badge-status below" id="overloadStatus_${index}">Below Target</span>`;
    } else {
      statusBadgeHtml = `<span class="overload-badge-status ready" id="overloadStatus_${index}">Target: Beat Last Session</span>`;
    }

    // Biomechanics & Form Execution Blueprint
    let blueprintHtml = '';
    if (ex.blueprint) {
      const bp = ex.blueprint;
      const tempoParts = (bp.tempo || '3-1-1-0').split('-');
      const storageKey = `checklist_${exKey}`;
      const checkedCues = StorageService.get(storageKey, []);
      const verifiedCount = Array.isArray(checkedCues) ? checkedCues.length : 0;
      const totalCues = bp.checklist ? bp.checklist.length : 0;

      blueprintHtml = `
        <div class="blueprint-card" id="blueprintCard_${index}">
          <button
            class="blueprint-accordion-toggle"
            onclick="window.HealthPulseApp.toggleBlueprint(${index})"
            aria-expanded="true"
            id="bpToggle_${index}"
          >
            <div class="blueprint-toggle-left">
              <span class="blueprint-icon-badge">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="2 12 12 17 22 12"/>
                  <polyline points="2 7 12 12 22 7"/>
                  <polyline points="2 17 12 22 22 17"/>
                </svg>
              </span>
              <div>
                <div class="blueprint-title">Biomechanics & Execution Blueprint</div>
                <div class="blueprint-subtitle">Hypertrophy tempo, joint vectors & tension curve</div>
              </div>
            </div>
            <div class="blueprint-toggle-right">
              <span class="bp-status-pill" id="bpStatusPill_${index}">Expanded</span>
              <span class="bp-chevron" id="bpChevron_${index}">▲</span>
            </div>
          </button>

          <div class="blueprint-panel-content" id="bpContent_${index}">
            <div class="blueprint-grid">
              <!-- Tempo Meter -->
              <div class="blueprint-subcard tempo-meter">
                <div class="subcard-header">
                  <span class="subcard-tag">HYPERTROPHY TEMPO</span>
                  <span class="tempo-code-badge">${bp.tempo}</span>
                </div>
                <div class="tempo-visualizer">
                  <div class="tempo-phase-box">
                    <span class="t-seconds">${tempoParts[0] || '3'}s</span>
                    <span class="t-phase-name">Eccentric</span>
                  </div>
                  <div class="tempo-phase-box">
                    <span class="t-seconds">${tempoParts[1] || '1'}s</span>
                    <span class="t-phase-name">Stretch</span>
                  </div>
                  <div class="tempo-phase-box">
                    <span class="t-seconds">${tempoParts[2] || '1'}s</span>
                    <span class="t-phase-name">Concentric</span>
                  </div>
                  <div class="tempo-phase-box">
                    <span class="t-seconds">${tempoParts[3] || '0'}s</span>
                    <span class="t-phase-name">Pause</span>
                  </div>
                </div>
                <div class="tempo-legend">${bp.tempoDesc}</div>
              </div>

              <!-- Tension Profile -->
              <div class="blueprint-subcard tension-profile">
                <div class="subcard-header">
                  <span class="subcard-tag">PEAK TENSION PROFILE</span>
                </div>
                <div class="tension-highlight">
                  ${bp.peakTension}
                </div>
                <div class="setup-joint-cue">
                  <strong>Setup & Alignment:</strong> ${bp.setupCue}
                </div>
              </div>
            </div>

            <!-- Pre-Flight Form Checklist -->
            ${bp.checklist && bp.checklist.length > 0 ? `
              <div class="blueprint-checklist-card">
                <div class="checklist-card-top">
                  <span class="checklist-card-title">PRE-LIFT FORM CHECKLIST</span>
                  <span class="checklist-counter-badge ${verifiedCount === totalCues ? 'all-verified' : ''}" id="checklistCounter_${index}">
                    ${verifiedCount}/${totalCues} Verified
                  </span>
                </div>
                <div class="checklist-grid">
                  ${bp.checklist.map((cue, cueIdx) => {
                    const isChecked = Array.isArray(checkedCues) && checkedCues.includes(cueIdx);
                    return `
                      <label class="form-check-label ${isChecked ? 'checked' : ''}" id="checkLabel_${index}_${cueIdx}">
                        <input
                          type="checkbox"
                          class="form-check-input"
                          ${isChecked ? 'checked' : ''}
                          onchange="window.HealthPulseApp.toggleChecklistCue('${exKey}', ${cueIdx}, this.checked, ${index})"
                        >
                        <span class="custom-checkbox"></span>
                        <span class="form-check-text">${cue}</span>
                      </label>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Critical Pitfall / Injury Avoidance Warning -->
            ${bp.pitfall ? `
              <div class="blueprint-pitfall-alert">
                <div class="pitfall-alert-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <div class="pitfall-alert-body">
                  <span class="pitfall-alert-title">Injury Avoidance Cue:</span>
                  <span class="pitfall-alert-text">${bp.pitfall}</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Option B: Athlete Working Weight & PR Benchmark Card
    const targetKg = bench.targetKg || ex.weightKg;
    const targetReps = bench.targetReps || ex.reps;
    const estimated1RM = Math.round(bench.lastKg * (1 + bench.lastReps / 30) * 10) / 10;

    return `
      <div class="exercise-card" id="exCard_${index}">
        <div class="exercise-card-header">
          <div>
            <div class="exercise-name">${ex.name}</div>
            <div class="exercise-muscle-tags">
              <span class="muscle-tag primary">${primaryTag}</span>
              ${secondaryList ? `<span class="muscle-tag secondary">${secondaryList}</span>` : ''}
            </div>
          </div>
          <span class="badge ${ex.type === 'CompoundLift' ? 'badge-blue' : 'badge-cyan'}">
            ${ex.type === 'CompoundLift' ? 'Compound' : 'Isolation'}
          </span>
        </div>

        <!-- Progressive Overload Benchmark Banner -->
        <div class="overload-card-banner">
          <div class="overload-bench-group">
            <div class="overload-bench">
              Current Baseline: <strong>${bench.lastKg}kg × ${bench.lastReps}</strong>
            </div>
            <div class="overload-target">
              Next Goal: <strong>${bench.targetKg}kg × ${bench.targetReps}</strong> (↑ Overload)
            </div>
          </div>
          ${statusBadgeHtml}
        </div>

        <!-- Biomechanics Blueprint -->
        ${blueprintHtml}

        <!-- Athlete Working Weight & PR Benchmark Matrix (Option B) -->
        <div class="athlete-benchmark-card">
          <div class="athlete-benchmark-header">
            <div class="athlete-benchmark-title">
              <span class="athlete-badge-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
              </span>
              <span>WORKING WEIGHT & ATHLETE BASELINE</span>
            </div>
            <div class="athlete-prescription-tag">
              Prescription: <strong>${ex.sets} Sets · ${ex.reps} Reps</strong>
            </div>
          </div>

          <div class="benchmark-metrics-grid">
            <!-- Working Weight Stepper -->
            <div class="benchmark-cell">
              <div class="benchmark-cell-label">CURRENT WORKING LOAD</div>
              <div class="stepper-control-row">
                <button class="btn-stepper-btn" onclick="window.HealthPulseApp.adjustWorkingWeight('${exKey}', -2.5)" title="Decrease 2.5 kg">
                  -2.5
                </button>
                <div class="stepper-value-display">
                  <span class="stepper-number" id="workingWeightVal_${exKey}">${bench.lastKg}</span>
                  <span class="stepper-unit">kg</span>
                </div>
                <button class="btn-stepper-btn" onclick="window.HealthPulseApp.adjustWorkingWeight('${exKey}', 2.5)" title="Increase 2.5 kg">
                  +2.5
                </button>
              </div>
              <div class="benchmark-cell-sub">Working baseline for ${ex.sets} sets</div>
            </div>

            <!-- All-Time Best PR -->
            <div class="benchmark-cell pr-cell">
              <div class="benchmark-cell-label">ALL-TIME BEST (PR)</div>
              <div class="benchmark-metric-value pr-val">
                <span class="metric-num">${bench.prKg}</span>
                <span class="metric-unit">kg × ${bench.prReps}</span>
              </div>
              <div class="benchmark-cell-sub">Verified personal record</div>
            </div>

            <!-- Estimated 1RM -->
            <div class="benchmark-cell">
              <div class="benchmark-cell-label">ESTIMATED 1-REP MAX</div>
              <div class="benchmark-metric-value">
                <span class="metric-num">${estimated1RM}</span>
                <span class="metric-unit">kg</span>
              </div>
              <div class="benchmark-cell-sub">Calculated via Epley formula</div>
            </div>

            <!-- Next Progressive Target -->
            <div class="benchmark-cell target-cell">
              <div class="benchmark-cell-label">NEXT PROGRESSIVE GOAL</div>
              <div class="benchmark-metric-value target-val">
                <span class="metric-num">${bench.targetKg}</span>
                <span class="metric-unit">kg (${bench.targetReps} reps)</span>
              </div>
              <div class="benchmark-cell-sub">+2.5 kg overload increment</div>
            </div>
          </div>

          <!-- Quick Actions Bar -->
          <div class="benchmark-action-bar">
            <button class="btn-action-rest" onclick="window.HealthPulseApp.startRestTimer(${ex.type === 'IsolationLift' ? 45 : 90})" title="Start recovery rest interval">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="14" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="14" x2="15" y2="11"/></svg>
              Rest ${ex.type === 'IsolationLift' ? '45s' : '90s'}
            </button>
            <button class="btn-action-pr" onclick="window.HealthPulseApp.setCustomPR('${exKey}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Update PR
            </button>
            <button class="btn-action-achieve ${bench.status === 'on-track' || bench.status === 'pr' ? 'achieved' : ''}" onclick="window.HealthPulseApp.markOverloadCompleted('${exKey}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              ${bench.status === 'on-track' || bench.status === 'pr' ? 'Target Achieved (+2.5kg)' : 'Mark Target Hit (+2.5kg)'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── OPTION B: ATHLETE PERFORMANCE & WORKING WEIGHT CONTROLLERS ──────────────

function adjustWorkingWeight(exKey, deltaKg) {
  const history = StorageService.get(StorageService.KEYS.OVERLOAD_HISTORY, {});
  const ex = AppState.exercises.find(e => (e.id === exKey || e.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === exKey));
  const defaultKg = ex ? ex.weightKg : 50;
  const defaultReps = ex ? ex.reps : 8;

  const bench = history[exKey] || getOverloadData(exKey, defaultKg, defaultReps);
  bench.lastKg = Math.max(2.5, Math.round((bench.lastKg + deltaKg) * 10) / 10);
  bench.targetKg = Math.round((bench.lastKg + 2.5) * 10) / 10;

  if (bench.lastKg > bench.prKg) {
    bench.prKg = bench.lastKg;
    bench.prReps = bench.lastReps;
    bench.status = 'pr';
  }

  history[exKey] = bench;
  StorageService.set(StorageService.KEYS.OVERLOAD_HISTORY, history);

  const current1RM = Math.round(bench.lastKg * (1 + bench.lastReps / 30) * 10) / 10;
  if (current1RM > AppState.peak1RM) {
    AppState.peak1RM = current1RM;
    const peak1rmEl = document.getElementById('peak1rmVal');
    if (peak1rmEl) peak1rmEl.textContent = `${AppState.peak1RM} kg`;
  }

  updateOverloadSummary();
  renderWorkoutView();
}

function markOverloadCompleted(exKey) {
  const history = StorageService.get(StorageService.KEYS.OVERLOAD_HISTORY, {});
  const ex = AppState.exercises.find(e => (e.id === exKey || e.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === exKey));
  const defaultKg = ex ? ex.weightKg : 50;
  const defaultReps = ex ? ex.reps : 8;

  const bench = history[exKey] || getOverloadData(exKey, defaultKg, defaultReps);
  bench.lastKg = bench.targetKg;
  bench.targetKg = Math.round((bench.lastKg + 2.5) * 10) / 10;
  bench.status = 'on-track';

  if (bench.lastKg > bench.prKg) {
    bench.prKg = bench.lastKg;
    bench.prReps = bench.lastReps;
    bench.status = 'pr';
    try { soundFx.playChime(); } catch (_) {}
  }

  history[exKey] = bench;
  StorageService.set(StorageService.KEYS.OVERLOAD_HISTORY, history);

  const current1RM = Math.round(bench.lastKg * (1 + bench.lastReps / 30) * 10) / 10;
  if (current1RM > AppState.peak1RM) {
    AppState.peak1RM = current1RM;
    const peak1rmEl = document.getElementById('peak1rmVal');
    if (peak1rmEl) peak1rmEl.textContent = `${AppState.peak1RM} kg`;
  }

  updateOverloadSummary();
  renderWorkoutView();

  // Automatically launch rest interval timer
  const restSec = (ex && ex.type === 'IsolationLift') ? 45 : 90;
  startRestTimer(restSec);
}

function setCustomPR(exKey) {
  const history = StorageService.get(StorageService.KEYS.OVERLOAD_HISTORY, {});
  const ex = AppState.exercises.find(e => (e.id === exKey || e.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === exKey));
  const defaultKg = ex ? ex.weightKg : 50;
  const defaultReps = ex ? ex.reps : 8;

  const bench = history[exKey] || getOverloadData(exKey, defaultKg, defaultReps);
  const input = prompt(`Enter your new PR weight for ${ex ? ex.name : 'exercise'} (kg):`, bench.prKg);
  if (!input) return;
  const num = parseFloat(input);
  if (isNaN(num) || num <= 0) return;

  bench.prKg = Math.round(num * 10) / 10;
  bench.status = 'pr';
  try { soundFx.playChime(); } catch (_) {}

  history[exKey] = bench;
  StorageService.set(StorageService.KEYS.OVERLOAD_HISTORY, history);

  const current1RM = Math.round(bench.prKg * (1 + bench.prReps / 30) * 10) / 10;
  if (current1RM > AppState.peak1RM) {
    AppState.peak1RM = current1RM;
    const peak1rmEl = document.getElementById('peak1rmVal');
    if (peak1rmEl) peak1rmEl.textContent = `${AppState.peak1RM} kg`;
  }

  updateOverloadSummary();
  renderWorkoutView();
}

function logSet(exerciseIndex, setIndex) {
  // Maintained for backward compatibility
}

// ─── BIOMECHANICS CONTROLLERS ──────────────────────────────────────────────────

function toggleBlueprint(index) {
  const content = document.getElementById(`bpContent_${index}`);
  const toggle = document.getElementById(`bpToggle_${index}`);
  const chevron = document.getElementById(`bpChevron_${index}`);
  const status = document.getElementById(`bpStatusPill_${index}`);
  if (!content) return;

  const isCollapsed = content.classList.contains('collapsed');
  if (isCollapsed) {
    content.classList.remove('collapsed');
    if (chevron) chevron.textContent = '▲';
    if (status) status.textContent = 'Expanded';
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  } else {
    content.classList.add('collapsed');
    if (chevron) chevron.textContent = '▼';
    if (status) status.textContent = 'Collapsed';
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
}

function toggleChecklistCue(exKey, cueIdx, isChecked, exerciseIndex) {
  const storageKey = `checklist_${exKey}`;
  let list = StorageService.get(storageKey, []);
  if (!Array.isArray(list)) list = [];

  if (isChecked) {
    if (!list.includes(cueIdx)) list.push(cueIdx);
  } else {
    list = list.filter(id => id !== cueIdx);
  }
  StorageService.set(storageKey, list);

  const label = document.getElementById(`checkLabel_${exerciseIndex}_${cueIdx}`);
  if (label) {
    if (isChecked) label.classList.add('checked');
    else label.classList.remove('checked');
  }

  const counterEl = document.getElementById(`checklistCounter_${exerciseIndex}`);
  if (counterEl) {
    const visibleExercises = getFilteredExercises();
    const ex = visibleExercises[exerciseIndex];
    const total = ex?.blueprint?.checklist?.length || 4;
    counterEl.textContent = `${list.length}/${total} Verified`;
    if (list.length === total) {
      counterEl.classList.add('all-verified');
    } else {
      counterEl.classList.remove('all-verified');
    }
  }
}

function updateVolumeDisplay() {
  const { totalKg, setsCompleted, totalSets } = AppState.workoutVolume;

  const tonnageEl    = document.getElementById('totalTonnageNumber');
  const setsEl       = document.getElementById('setsCompletedCountText');
  const calBurnEl    = document.getElementById('estCalBurnText');

  if (tonnageEl) tonnageEl.textContent = Math.round(totalKg).toLocaleString('en-IN');
  if (setsEl)    setsEl.textContent    = `${setsCompleted} / ${totalSets} Sets Completed`;

  // Rough calorie burn estimate: ~5 kcal per 1000 kg-reps of volume
  const estBurn = Math.round((totalKg / 1000) * 5 * 60);
  if (calBurnEl) calBurnEl.textContent = `${estBurn} kcal`;

  // Update tonnage badge
  const badge = document.getElementById('tonnageBadge');
  if (badge) {
    badge.textContent = setsCompleted === totalSets && totalSets > 0 ? 'Session Complete' : 'Active Session';
    badge.className   = setsCompleted === totalSets && totalSets > 0 ? 'badge badge-emerald' : 'badge badge-blue';
  }
}

// ─── DAILY NUTRITION ENGINE ───────────────────────────────────────────────────

function renderNutritionView() {
  const totals = calculateDailyMacros(AppState.loggedFoods);
  const target = AppState.targets;

  // 1. Energy Flux Dial
  const remainingCalories = document.getElementById('caloriesRemainingNumber');
  const remCals = Math.max(0, target.calories - Math.round(totals.calories));
  if (remainingCalories) remainingCalories.innerText = remCals.toLocaleString('en-IN');

  const consumedCalsSub = document.getElementById('consumedCalsSub');
  if (consumedCalsSub) consumedCalsSub.innerText = `${Math.round(totals.calories).toLocaleString('en-IN')} / ${target.calories.toLocaleString('en-IN')} kcal`;

  const percentEaten = Math.min(totals.calories / target.calories, 1);
  const offset = 427.25 - (percentEaten * 427.25);
  const calCircle = document.getElementById('calorieSvgCircle');
  if (calCircle) calCircle.style.strokeDashoffset = offset;

  // Metabolic Status Pill
  const metabolicPill = document.getElementById('metabolicStatusPill');
  if (metabolicPill) {
    if (totals.calories > target.calories) {
      metabolicPill.innerText = `Surplus (+${totals.calories - target.calories} kcal)`;
      metabolicPill.style.color = 'var(--accent-danger)';
    } else {
      metabolicPill.innerText = `Deficit (-${target.calories - totals.calories} kcal)`;
      metabolicPill.style.color = 'var(--accent-primary-light)';
    }
  }

  // 2. Hypertrophy Protein Quality Dial
  const proteinHero = document.getElementById('consumedProteinHero');
  if (proteinHero) proteinHero.innerText = `${Math.round(totals.protein)}g`;

  const proteinTargetSub = document.getElementById('proteinTargetSub');
  if (proteinTargetSub) proteinTargetSub.innerText = `Target: ${target.protein}g`;

  const protPercent = Math.min(totals.protein / target.protein, 1);
  const protOffset = 427.25 - (protPercent * 427.25);
  const protCircle = document.getElementById('proteinSvgCircle');
  if (protCircle) protCircle.style.strokeDashoffset = protOffset;

  const mpsPill = document.getElementById('mpsTriggersPill');
  if (mpsPill) {
    const protPercent = Math.round((totals.protein / target.protein) * 100);
    mpsPill.innerText = `${protPercent}% of Goal`;
  }

  // 3. Macro Breakdown Gauges
  const consumedProtEl = document.getElementById('consumedProteinVal');
  if (consumedProtEl) consumedProtEl.textContent = Math.round(totals.protein);

  const consumedCarbsEl = document.getElementById('consumedCarbsVal');
  if (consumedCarbsEl) consumedCarbsEl.textContent = Math.round(totals.carbs);

  const consumedFatsEl = document.getElementById('consumedFatsVal');
  if (consumedFatsEl) consumedFatsEl.textContent = Math.round(totals.fats);

  const pBar = document.getElementById('proteinBarFill');
  if (pBar) pBar.style.width = `${Math.min((totals.protein / target.protein) * 100, 100)}%`;

  const cBar = document.getElementById('carbsBarFill');
  if (cBar) cBar.style.width = `${Math.min((totals.carbs / target.carbs) * 100, 100)}%`;

  const fBar = document.getElementById('fatsBarFill');
  if (fBar) fBar.style.width = `${Math.min((totals.fats / target.fats) * 100, 100)}%`;

  const compProtText = document.getElementById('completeProteinText');
  if (compProtText) compProtText.textContent = `${totals.completeProtein}g Complete Bioavailable`;

  const plantProtText = document.getElementById('plantProteinText');
  if (plantProtText) plantProtText.textContent = `${totals.plantProtein}g Incomplete Plant`;

  const carbsRatioEl = document.getElementById('carbsRatioText');
  if (carbsRatioEl) {
    const pcRatio = totals.carbs > 0 ? (totals.protein / totals.carbs).toFixed(2) : '0.00';
    const statusNote = pcRatio >= 0.8 ? 'High Protein Efficiency' : 'Standard Glycogen Fuel';
    carbsRatioEl.textContent = `P:C Ratio: ${pcRatio} · ${statusNote}`;
  }

  // 4. Render Everyday Indian Meals
  const everydayMeals = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

  everydayMeals.forEach(mealName => {
    const mealContainer = document.getElementById(`mealItems${mealName}`);
    const summaryPill = document.getElementById(`mealSummary_${mealName}`);
    if (!mealContainer) return;

    const mealEntries = AppState.loggedFoods
      .map((entry, realIndex) => ({ entry, realIndex }))
      .filter(({ entry }) => entry.meal === mealName);

    const mealNut = calculateMealNutrition(mealEntries.map(m => m.entry));

    if (summaryPill) {
      summaryPill.textContent = `${mealNut.calories} kcal · ${mealNut.protein}g P`;
    }

    if (mealEntries.length === 0) {
      const placeholders = {
        Breakfast: 'No breakfast logged yet. Tap "+ Log Food" to add eggs, oats, or chilla.',
        Lunch: 'No lunch logged yet. Tap "+ Log Food" to add Dal Tadka, Rotis, Rice, or Sabzi.',
        Snacks: 'No evening snacks logged yet. Track your chai or add roasted makhana/sprouts.',
        Dinner: 'No dinner logged yet. Tap "+ Log Food" to add dinner or nighttime haldi milk.'
      };
      mealContainer.innerHTML = `
        <div class="empty-meal-box" onclick="window.HealthPulseApp.openFoodSearchModal('${mealName}')" style="cursor: pointer; padding: 10px 0;" title="Click to log ${mealName}">
          <p class="empty-meal-text">${placeholders[mealName] || 'No foods logged yet. Click to add.'}</p>
        </div>
      `;
      return;
    }

    mealContainer.innerHTML = mealEntries.map(({ entry, realIndex }) => {
      const food = entry.food;
      const quantityLabel = food.inputType === 'count'
        ? `${entry.serving} ${food.countUnit || 'units'}`
        : `${Math.round(entry.grams || (food.servingGrams * entry.serving))}g`;

      const eff = typeof food.getEffectiveMacros === 'function'
        ? food.getEffectiveMacros(entry.serving, 'none')
        : {
            calories: Math.round(food.calories * entry.serving),
            protein: +(food.protein * entry.serving).toFixed(1),
            carbs: +(food.carbs * entry.serving).toFixed(1),
            fats: +(food.fats * entry.serving).toFixed(1),
            leucine: +(0.5 * entry.serving).toFixed(2),
            isComplete: food.proteinQuality === 'complete'
          };

      const dietIndicator = `<span class="diet-indicator ${food.diet === 'Veg' ? 'veg' : 'non-veg'}" title="${food.diet}"></span>`;

      return `
        <div class="meal-food-item">
          <div class="meal-food-left">
            <div class="meal-food-name-row">
              <span class="meal-food-name">${dietIndicator} ${food.name}</span>
              <span class="food-quality-tag ${eff.isComplete ? 'complete' : 'incomplete'}">
                ${eff.isComplete ? 'Complete Protein' : 'Plant Protein'}
              </span>
            </div>
            <div class="meal-food-macros">
              ${eff.calories} kcal &middot; ${eff.protein}g P &middot; ${eff.carbs}g C &middot; ${eff.fats}g F
              <span style="color: var(--text-muted);">&middot; ${quantityLabel}</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button
              class="btn-delete-food"
              onclick="window.HealthPulseApp.deleteLoggedFood(${realIndex})"
              title="Remove entry"
              aria-label="Delete ${food.name}"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>`;
    }).join('');
  });
}

function deleteLoggedFood(realIndex) {
  AppState.loggedFoods.splice(realIndex, 1);
  savedFoodLog();
  checkAndSaveProteinStreak();
  renderNutritionView();
}


// ─── REST TIMER ────────────────────────────────────────────────────────────────

function startRestTimer(duration = 60) {
  if (AppState.timer && AppState.timer.intervalId) {
    clearInterval(AppState.timer.intervalId);
    AppState.timer.intervalId = null;
  }

  const num = parseInt(duration, 10) || 60;
  if (!AppState.timer) {
    AppState.timer = {};
  }
  AppState.timer.duration  = num;
  AppState.timer.remaining = num;
  AppState.timer.isPaused  = false;

  const modal = document.getElementById('restTimerModal');
  if (modal) modal.classList.add('active');

  const secDisplay = document.getElementById('timerSecondsDisplay');
  if (secDisplay) secDisplay.textContent = num;

  const playIcon = document.getElementById('timerPlayIcon');
  if (playIcon) playIcon.textContent = '⏸';

  const playText = document.getElementById('timerPlayText');
  if (playText) playText.textContent = 'Pause';

  // Highlight active preset button in timer modal
  document.querySelectorAll('.timer-preset-row .preset-btn').forEach(btn => {
    const text = btn.textContent.trim();
    btn.classList.toggle('active', text === `${num}s`);
  });

  // Play short starting blip to prime audio context
  try {
    soundFx.init();
    soundFx.playBeep(700, 60);
  } catch (_) {}

  AppState.timer.intervalId = setInterval(() => {
    if (AppState.timer.isPaused) return;

    AppState.timer.remaining -= 1;
    const secDisp = document.getElementById('timerSecondsDisplay');
    if (secDisp) secDisp.textContent = AppState.timer.remaining;

    if (AppState.timer.remaining <= 3 && AppState.timer.remaining > 0) {
      try { soundFx.playTick(); } catch (_) {}
    }

    if (AppState.timer.remaining <= 0) {
      clearInterval(AppState.timer.intervalId);
      AppState.timer.intervalId = null;
      try { soundFx.playCompletionChime(); } catch (_) {}
      const m = document.getElementById('restTimerModal');
      if (m) m.classList.remove('active');
    }
  }, 1000);
}

function setRestTimerDuration(duration) {
  startRestTimer(duration);
}

// ─── FOOD SEARCH MODAL ─────────────────────────────────────────────────────────

let _activeMeal = 'Breakfast';

function openFoodSearchModal(mealName) {
  _activeMeal = mealName || 'Breakfast';
  const titleEl = document.getElementById('foodSearchModalTitle');
  if (titleEl) {
    titleEl.textContent = `Search & Log Food (${_activeMeal})`;
  }
  const modal = document.getElementById('foodSearchModal');
  if (modal) modal.classList.add('active');
  const searchInput = document.getElementById('foodSearchInput');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  renderFoodSearchResults(AppState.foods);
}

function renderFoodSearchResults(foodList) {
  const container = document.getElementById('foodSearchResultsContainer');
  if (!container) return;

  if (!foodList || foodList.length === 0) {
    const isStillLoading = !AppState.foods || AppState.foods.length === 0;
    container.innerHTML = `<p style="color: var(--text-muted); padding: 1.5rem; text-align:center;">${
      isStillLoading ? 'Loading Indian food database...' : 'No Indian foods found matching search.'
    }</p>`;
    return;
  }

  container.innerHTML = foodList.map(food => {
    const isCount = food.inputType === 'count';

    const inputHtml = isCount
      ? `<div class="gram-input-group">
           <input type="number" class="gram-input" id="gramInput_${food.id}"
             value="1" min="1" step="1"
             oninput="window.HealthPulseApp.previewFoodMacros('${food.id}')">
           <span class="gram-label">${food.countUnit || 'units'}</span>
         </div>`
      : `<div class="gram-input-group">
           <input type="number" class="gram-input" id="gramInput_${food.id}"
             value="${food.servingGrams}" min="1" step="5"
             oninput="window.HealthPulseApp.previewFoodMacros('${food.id}')">
           <span class="gram-label">g</span>
         </div>`;

    let pcBadgeClass = 'carb-dense';
    let pcBadgeLabel = `Carb-Dense (P:C ${food.pToCRatio})`;
    if (food.pToCRatio >= 1.5) {
      pcBadgeClass = 'pure';
      pcBadgeLabel = `Pure Protein (P:C ${food.pToCRatio})`;
    } else if (food.pToCRatio >= 0.5) {
      pcBadgeClass = 'balanced';
      pcBadgeLabel = `Balanced (P:C ${food.pToCRatio})`;
    }

    const dietIndicator = `<span class="diet-indicator ${food.diet === 'Veg' ? 'veg' : 'non-veg'}" title="${food.diet}"></span>`;

    let tadkaSelectHtml = '';
    return `
      <div class="food-result-item">
        <div class="food-result-info">
          <div class="food-result-name">${dietIndicator} ${food.name}</div>
          <div class="food-result-meta">Per ${food.servingUnit}: ${food.calories} kcal &middot; ${food.protein}g P &middot; ${food.carbs}g C &middot; ${food.fats}g F</div>
          <div class="food-result-pills">
            <span class="pc-ratio-pill ${pcBadgeClass}">${pcBadgeLabel}</span>
            <span class="food-quality-tag ${food.proteinQuality === 'complete' ? 'complete' : 'incomplete'}">
              ${food.proteinQuality === 'complete' ? 'Complete Protein' : 'Plant Protein'}
            </span>
          </div>
        </div>

        <div class="food-log-controls">
          ${inputHtml}
          <div class="food-preview-macros" id="preview_${food.id}">
            ${food.calories} kcal &middot; ${food.protein}g P
          </div>
          <button class="btn-quick-add" onclick="window.HealthPulseApp.logFoodWithGrams('${food.id}')">+ Log Food</button>
        </div>
      </div>`;
  }).join('');
}

function filterFoodModal(category) {
  if (category === 'All') {
    renderFoodSearchResults(AppState.foods);
  } else if (category === 'High-Protein') {
    renderFoodSearchResults(AppState.foods.filter(f => f.isHighProtein()));
  } else if (category === 'Veg') {
    renderFoodSearchResults(AppState.foods.filter(f => f.diet === 'Veg'));
  } else if (category === 'Non-Veg') {
    renderFoodSearchResults(AppState.foods.filter(f => f.diet === 'Non-Veg'));
  } else {
    renderFoodSearchResults(AppState.foods.filter(f => f.category === category));
  }
}

function logFood(foodId) {
  logFoodWithGrams(foodId);
}

function previewFoodMacros(foodId) {
  const food = AppState.foods.find(f => f.id === foodId);
  if (!food) return;

  const input = document.getElementById(`gramInput_${foodId}`);
  const val = parseFloat(input?.value) || 1;

  const multiplier = food.inputType === 'count'
    ? val
    : val / food.servingGrams;

  const preview = document.getElementById(`preview_${foodId}`);
  if (preview) {
    const totalC = Math.round(food.calories * multiplier);
    const totalP = (food.protein * multiplier).toFixed(1);
    preview.textContent = `${totalC} kcal · ${totalP}g P`;
  }
}

function logFoodWithGrams(foodId) {
  const food = AppState.foods.find(f => f.id === foodId);
  if (!food) {
    console.warn(`Food item "${foodId}" not found in database.`);
    return;
  }

  const input = document.getElementById(`gramInput_${foodId}`);
  const val = parseFloat(input?.value) || 1;

  let serving, grams;
  if (food.inputType === 'count') {
    serving = val;
    grams = null;
  } else {
    grams = val;
    serving = val / food.servingGrams;
  }

  const targetMeal = _activeMeal || 'Breakfast';

  AppState.loggedFoods.push({
    food,
    meal: targetMeal,
    serving,
    grams,
    tadkaLevel: 'none'
  });

  savedFoodLog();
  checkAndSaveProteinStreak();

  try {
    soundFx.playSuccess();
  } catch (e) {
    console.warn('Audio feedback failed:', e);
  }

  const modal = document.getElementById('foodSearchModal');
  if (modal) modal.classList.remove('active');

  renderNutritionView();
}

// ─── ADD CUSTOM EXERCISE MODAL ─────────────────────────────────────────────────

function saveNewExercise() {
  const name     = document.getElementById('newExName').value.trim();
  const split    = document.getElementById('newExSplit').value;
  const muscle   = document.getElementById('newExMuscle').value.trim();
  const type     = document.getElementById('newExType').value;
  const sets     = parseInt(document.getElementById('newExSets').value);
  const reps     = parseInt(document.getElementById('newExReps').value);
  const weightKg = parseFloat(document.getElementById('newExWeight').value);

  const exId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const muscleKey = muscle.toLowerCase().includes('chest') ? 'chest'
    : muscle.toLowerCase().includes('shoulder') ? 'shoulders'
    : muscle.toLowerCase().includes('tricep') ? 'triceps'
    : muscle.toLowerCase().includes('bicep') ? 'biceps'
    : (muscle.toLowerCase().includes('back') || muscle.toLowerCase().includes('lat')) ? 'back'
    : muscle.toLowerCase().includes('quad') ? 'quads'
    : muscle.toLowerCase().includes('hamstring') ? 'hamstrings'
    : muscle.toLowerCase().includes('calf') ? 'calves'
    : 'general';

  const newEx = type === 'CompoundLift'
    ? new CompoundLift(name, split, muscle, sets, reps, weightKg, exId, muscle, [], muscleKey)
    : new IsolationLift(name, split, muscle, sets, reps, weightKg, exId, muscle, [], muscleKey);

  AppState.exercises.push(newEx);
  document.getElementById('addExerciseModal').classList.remove('active');
  renderWorkoutView();
}

// ─── FOOD SEARCH INPUT LISTENER ────────────────────────────────────────────────

function setupFoodSearch() {
  document.getElementById('foodSearchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = AppState.foods.filter(f => f.name.toLowerCase().includes(query));
    renderFoodSearchResults(filtered);
  });
}

// ─── MODAL CLOSE BUTTONS ───────────────────────────────────────────────────────

function setupModalCloseButtons() {
  document.getElementById('closeFoodModalBtn').addEventListener('click', () => {
    document.getElementById('foodSearchModal').classList.remove('active');
  });

  document.getElementById('closeExerciseModalBtn').addEventListener('click', () => {
    document.getElementById('addExerciseModal').classList.remove('active');
  });

  document.getElementById('cancelExerciseModalBtn').addEventListener('click', () => {
    document.getElementById('addExerciseModal').classList.remove('active');
  });

  document.getElementById('closeRestTimerBtn').addEventListener('click', () => {
    clearInterval(AppState.timer.intervalId);
    AppState.timer.intervalId = null;
    document.getElementById('restTimerModal').classList.remove('active');
  });

  document.getElementById('btnToggleTimer').addEventListener('click', () => {
    AppState.timer.isPaused = !AppState.timer.isPaused;
    const playIcon = document.getElementById('timerPlayIcon');
    if (playIcon) playIcon.textContent = AppState.timer.isPaused ? '▶' : '⏸';
    const playText = document.getElementById('timerPlayText');
    if (playText) playText.textContent = AppState.timer.isPaused ? 'Resume' : 'Pause';
  });

  document.getElementById('btnSkipTimer').addEventListener('click', () => {
    clearInterval(AppState.timer.intervalId);
    AppState.timer.intervalId = null;
    document.getElementById('restTimerModal').classList.remove('active');
  });

  document.getElementById('btnAddCustomExerciseBtn').addEventListener('click', () => {
    document.getElementById('addExerciseModal').classList.add('active');
  });

  // Profile modal
  document.getElementById('closeProfileModalBtn').addEventListener('click', () => {
    document.getElementById('profileModal').classList.remove('active');
  });
  document.getElementById('cancelProfileModalBtn').addEventListener('click', () => {
    document.getElementById('profileModal').classList.remove('active');
  });
}

// ─── PROFILE MODAL ─────────────────────────────────────────────────────────────

function setupProfileModal() {
  // Open profile modal
  document.getElementById('openProfileModalBtn').addEventListener('click', () => {
    const p = AppState.profile;

    // Update modal greeting
    const greeting = document.getElementById('profileModalGreeting');
    if (greeting) {
      greeting.textContent = p.name ? `Welcome, ${p.name}` : 'Your Fitness Profile';
    }

    // Pre-fill form
  document.getElementById('profileName').value     = p.name || '';
    document.getElementById('profileWeight').value   = p.weightKg;
    document.getElementById('profileHeight').value   = p.heightCm;
    document.getElementById('profileAge').value      = p.age;
    document.getElementById('profileGender').value   = p.gender;
    document.getElementById('profileActivity').value = p.activityMultiplier;
    document.getElementById('profileGoal').value     = p.goal;
    document.getElementById('profileTargetsPreview').style.display = 'none';
    document.getElementById('profileModal').classList.add('active');
  });
}

function _readProfileForm() {
  return {
    name:               document.getElementById('profileName').value.trim(),
    weightKg:           parseFloat(document.getElementById('profileWeight').value),
    heightCm:           parseFloat(document.getElementById('profileHeight').value),
    age:                parseInt(document.getElementById('profileAge').value),
    gender:             document.getElementById('profileGender').value,
    activityMultiplier: parseFloat(document.getElementById('profileActivity').value),
    goal:               document.getElementById('profileGoal').value
  };
}

function previewProfile() {
  const profile = _readProfileForm();
  const t = calculateFitnessTargets(profile); // updates AppState.targets

  document.getElementById('prevBMI').textContent     = t.bmi;
  document.getElementById('prevBMR').textContent     = t.bmr;
  document.getElementById('prevTDEE').textContent    = t.tdee;
  document.getElementById('prevCals').textContent    = t.calories;
  document.getElementById('prevProtein').textContent = t.protein + 'g';
  document.getElementById('prevCarbs').textContent   = t.carbs + 'g';
  document.getElementById('prevFats').textContent    = t.fats + 'g';

  document.getElementById('profileTargetsPreview').style.display = 'block';

  // Restore AppState.targets to the saved profile (don't commit yet)
  calculateFitnessTargets(AppState.profile);
}

function saveProfile() {
  const profile = _readProfileForm();

  // Update AppState
  AppState.profile = profile;

  // Recalculate all targets
  const targets = calculateFitnessTargets(profile);

  // Persist to localStorage
  StorageService.set(StorageService.KEYS.USER_GOALS, profile);

  // Update header calorie badge
  document.getElementById('headerCalBudget').textContent = targets.calories.toLocaleString('en-IN') + ' kcal';

  // Show name / initials on avatar button
  const btn = document.getElementById('openProfileModalBtn');
  if (profile.name) {
    const initials = profile.name.trim().split(' ').map(w => w[0].toUpperCase()).slice(0, 2).join('');
    btn.textContent = initials;
    btn.style.fontSize = '0.85rem';
    btn.style.fontWeight = '700';
    btn.style.fontFamily = 'var(--font-display)';
  }

  // Update macro target labels in nutrition view
  document.getElementById('targetProteinVal').textContent = targets.protein;
  document.getElementById('targetCarbsVal').textContent   = targets.carbs;
  document.getElementById('targetFatsVal').textContent    = targets.fats;

  // Close modal
  document.getElementById('profileModal').classList.remove('active');

  // Re-render nutrition if it's visible
  const nutView = document.getElementById('viewNutrition');
  if (nutView?.classList.contains('active')) {
    renderNutritionView();
  }

  console.log('Profile saved:', profile, '| Targets:', targets);
}

// ─── APP INIT (DOMContentLoaded) ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadInitialData();
  loadPersistedData();

  setupNavigation();
  setupWorkoutSplits();
  syncMuscleMapUI();
  renderWorkoutView();

  setupModalCloseButtons();
  setupFoodSearch();
  setupProfileModal();

  // Sync header badge with current targets on load
  document.getElementById('headerCalBudget').textContent =
    AppState.targets.calories.toLocaleString('en-IN') + ' kcal';

  // Render protein streak calendar on load
  renderProteinStreakCalendar();
  // Check streak based on persisted food log
  checkAndSaveProteinStreak();

  setupBodyRotatorDrag();
  renderNutritionView();

  window.HealthPulseApp = {
    startRestTimer,
    setRestTimerDuration,
    openFoodSearchModal,
    filterFoodModal,
    logFood,
    logFoodWithGrams,
    previewFoodMacros,
    deleteLoggedFood,
    saveNewExercise,
    previewProfile,
    saveProfile,
    logSet,
    adjustWorkingWeight,
    markOverloadCompleted,
    setCustomPR,
    setMuscleFilter,
    rotateBody,
    toggleBodyRotation,
    streakPrevMonth,
    streakNextMonth,
    toggleBlueprint,
    toggleChecklistCue
  };

  console.log('HealthPulse App initialized.');
});
