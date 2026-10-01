import { GymExercise, CompoundLift, IsolationLift } from "./models/GymExercise.js";
import { FoodItem, DesiBoosterItem } from "./models/FoodItem.js";
import { calculateDailyMacros, calculateTotalTonnage } from "./utils/calculator.js";
import { StorageService } from "./services/storage.js";
import { soundFx } from "./services/audio.js";


const AppState = {
  currentSplit: 'Push',
  exercises: [],
  foods: [],
  desiBooster: [],
  loggedFoods: [],


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
      if (ex.type === 'CompoundLift') {
        return new CompoundLift(ex.name, ex.split, ex.targetMuscle, ex.sets, ex.reps, ex.weightKg);
      }
      else {
        return new IsolationLift(ex.name, ex.split, ex.targetMuscle, ex.sets, ex.reps, ex.weightKg)
      }
    });

    const foodResponse = await fetch('./data/indian_foods.json');
    const rawFoodData = await foodResponse.json();


    AppState.foods = rawFoodData.map(f => {
      if (f.isDesiBooster) {
        return new DesiBoosterItem(f.id, f.name, f.calories, f.protein, f.carbs, f.fats, f.servingUnit, f.servingGrams, f.category, f.diet);
      }
      return new FoodItem(f.id, f.name, f.calories, f.protein, f.carbs, f.fats, f.servingUnit, f.servingGrams, f.category, f.diet, false, f.inputType, f.countUnit);
    });

    AppState.desiBooster = AppState.foods.filter(food => food.isDesiBooster);

    console.log(`Loaded ${AppState.exercises.length} exercises and ${AppState.foods.length} Indian foods into OOP models!`);
  } catch (error) {
    console.error('Error loading datasets:', error);
  }
}



//store the data - web storage

function loadPersistedData() {

  const savedFoodLog = StorageService.get(StorageService.KEYS.DAILY_FOOD_LOG, []);
  AppState.loggedFoods = savedFoodLog;

  const savedProfile = StorageService.get(StorageService.KEYS.USER_GOALS);
  if (savedProfile) {
    AppState.profile = savedProfile;
    calculateFitnessTargets(AppState.profile);
  }
}

function savedFoodLog() {
  StorageService.set(StorageService.KEYS.DAILY_FOOD_LOG, AppState.loggedFoods);
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
  const chips = document.querySelectorAll('.split-chip');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      AppState.currentSplit = chip.getAttribute('data-split');
      const title = document.getElementById('activeSplitTitle');

      if (title) {
        title.textContent = `${AppState.currentSplit} Day Workout`;
      }
      renderWorkoutView();
    });
  })
}

function renderWorkoutView() {
  const container = document.getElementById('exerciseListContainer');
  if (!container) return;


  const splitExercises = AppState.exercises.filter(
    ex => ex.split === AppState.currentSplit
  );

  if (splitExercises.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); padding: 1rem;">No exercises found for ${AppState.currentSplit} day.</p>`;
    return;
  }


  container.innerHTML = splitExercises.map((ex, index) => `
    <div class="exercise-card" id="exCard_${index}">
      <div class="exercise-card-header">
        <div>
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-meta">${ex.targetMuscle} · ${ex.type}</div>
        </div>
        <span class="badge ${ex.type === 'CompoundLift' ? 'badge-saffron' : 'badge-cyan'}">
          ${ex.type === 'CompoundLift' ? 'Compound' : 'Isolation'}
        </span>
      </div>

      <div class="sets-rep-grid">
        <div class="set-stat">
          <div class="set-stat-value">${ex.sets}</div>
          <div class="set-stat-label">Sets</div>
        </div>
        <div class="set-stat">
          <div class="set-stat-value">${ex.reps}</div>
          <div class="set-stat-label">Reps</div>
        </div>
        <div class="set-stat">
          <div class="set-stat-value">${ex.weightKg}</div>
          <div class="set-stat-label">kg</div>
        </div>
      </div>
    </div>
  `).join('');
}


function renderNutritionView() {
  const totals = calculateDailyMacros(AppState.loggedFoods);
  const target = AppState.targets;


  const remainingCalories = document.getElementById('caloriesRemainingNumber');
  remainingCalories.innerText = Math.max(0, target.calories - Math.round(totals.calories));


  const percentEaten = Math.min(totals.calories / target.calories, 1);
  const offset = 427.25 - (percentEaten * 427.25);
  document.getElementById('calorieSvgCircle').style.strokeDashoffset = offset;


  document.getElementById('consumedProteinVal').textContent = Math.round(totals.protein);
  document.getElementById('consumedCarbsVal').textContent = Math.round(totals.carbs);
  document.getElementById('consumedFatsVal').textContent = Math.round(totals.fats);


  document.getElementById('proteinBarFill').style.width = `${Math.min((totals.protein / target.protein) * 100, 100)}%`;
  document.getElementById('carbsBarFill').style.width = `${Math.min((totals.carbs / target.carbs) * 100, 100)}%`;
  document.getElementById('fatsBarFill').style.width = `${Math.min((totals.fats / target.fats) * 100, 100)}%`;


  const meals = ['Breakfast', 'Lunch', 'PrePostWorkout', 'Dinner'];

  meals.forEach(mealName => {
    const mealContainer = document.getElementById(`mealItems${mealName}`);
    if (!mealContainer) return;

    // Find entries AND their real index in the full loggedFoods array
    const mealEntries = AppState.loggedFoods
      .map((entry, realIndex) => ({ entry, realIndex }))
      .filter(({ entry }) => entry.meal === mealName);

    if (mealEntries.length === 0) {
      mealContainer.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); padding: 4px 0;">No foods logged yet.</p>`;
      return;
    }

    mealContainer.innerHTML = mealEntries.map(({ entry, realIndex }) => {
      const quantityLabel = entry.food.inputType === 'count'
        ? `${entry.serving} ${entry.food.countUnit}`
        : `${Math.round(entry.grams || entry.food.servingGrams)}g`;

      return `
        <div class="meal-food-item">
          <span class="meal-food-name">${entry.food.name}</span>
          <span class="meal-food-macros">
            ${Math.round(entry.food.calories * entry.serving)} kcal
            &middot; ${(entry.food.protein * entry.serving).toFixed(1)}g P
            <span style="color: var(--text-muted)">&middot; ${quantityLabel}</span>
          </span>
          <button
            class="btn-delete-food"
            onclick="window.HealthPulseApp.deleteLoggedFood(${realIndex})"
            title="Remove entry"
            aria-label="Delete ${entry.food.name}"
          >✕</button>
        </div>`;
    }).join('');
  });

}

function deleteLoggedFood(realIndex) {
  AppState.loggedFoods.splice(realIndex, 1); // remove 1 item at that index
  savedFoodLog();
  renderNutritionView();
}


// ─── REST TIMER ────────────────────────────────────────────────────────────────

function startRestTimer(duration) {
  if (AppState.timer.intervalId) {
    clearInterval(AppState.timer.intervalId);
  }

  AppState.timer.duration  = duration;
  AppState.timer.remaining = duration;
  AppState.timer.isPaused  = false;

  document.getElementById('restTimerModal').classList.add('active');
  document.getElementById('timerSecondsDisplay').textContent = duration;
  document.getElementById('timerPlayIcon').textContent = '⏸️';
  document.getElementById('timerPlayText').textContent = 'Pause';

  AppState.timer.intervalId = setInterval(() => {
    if (AppState.timer.isPaused) return;

    AppState.timer.remaining -= 1;
    document.getElementById('timerSecondsDisplay').textContent = AppState.timer.remaining;

    if (AppState.timer.remaining <= 3 && AppState.timer.remaining > 0) {
      soundFx.playTick();
    }

    if (AppState.timer.remaining <= 0) {
      clearInterval(AppState.timer.intervalId);
      AppState.timer.intervalId = null;
      soundFx.playCompletionChime();
      document.getElementById('restTimerModal').classList.remove('active');
    }
  }, 1000);
}

function setRestTimerDuration(duration) {
  startRestTimer(duration);
}

// ─── FOOD SEARCH MODAL ─────────────────────────────────────────────────────────

let _activeMeal = 'Breakfast';

function openFoodSearchModal(mealName) {
  _activeMeal = mealName;
  document.getElementById('foodSearchModal').classList.add('active');
  document.getElementById('foodSearchInput').value = '';
  renderFoodSearchResults(AppState.foods);
}

function renderFoodSearchResults(foodList) {
  const container = document.getElementById('foodSearchResultsContainer');
  if (!container) return;

  if (foodList.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); padding: 1rem; text-align:center;">No foods found.</p>`;
    return;
  }

  container.innerHTML = foodList.map(food => {
    const isCount = food.inputType === 'count';

    const inputHtml = isCount
      ? `<div class="gram-input-group">
           <input type="number" class="gram-input" id="gramInput_${food.id}"
             value="1" min="1" step="1"
             oninput="window.HealthPulseApp.previewFoodMacros('${food.id}')">
           <span class="gram-label">${food.countUnit}</span>
         </div>`
      : `<div class="gram-input-group">
           <input type="number" class="gram-input" id="gramInput_${food.id}"
             value="${food.servingGrams}" min="1" step="1"
             oninput="window.HealthPulseApp.previewFoodMacros('${food.id}')">
           <span class="gram-label">g</span>
         </div>`;

    return `
      <div class="food-result-item">
        <div class="food-result-info">
          <div class="food-result-name">${food.name}</div>
          <div class="food-result-meta">Per ${food.servingUnit}: ${food.calories} kcal &middot; ${food.protein}g P &middot; ${food.carbs}g C &middot; ${food.fats}g F</div>
        </div>
        <div class="food-log-controls">
          ${inputHtml}
          <div class="food-preview-macros" id="preview_${food.id}">
            ${food.calories} kcal &middot; ${food.protein}g P
          </div>
          <button class="btn-quick-add" onclick="window.HealthPulseApp.logFoodWithGrams('${food.id}')">+ Log</button>
        </div>
      </div>`;
  }).join('');
}

function filterFoodModal(category) {
  if (category === 'All') {
    renderFoodSearchResults(AppState.foods);
  } else if (category === 'High-Protein') {
    renderFoodSearchResults(AppState.foods.filter(f => f.isHighProtein()));
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

  // For count foods: val = number of units (1 roti, 3 eggs)
  // For gram foods: val = grams entered, convert to multiplier
  const multiplier = food.inputType === 'count'
    ? val
    : val / food.servingGrams;

  const preview = document.getElementById(`preview_${foodId}`);
  if (preview) {
    preview.textContent = `${Math.round(food.calories * multiplier)} kcal · ${(food.protein * multiplier).toFixed(1)}g P`;
  }
}

function logFoodWithGrams(foodId) {
  const food = AppState.foods.find(f => f.id === foodId);
  if (!food) return;

  const input = document.getElementById(`gramInput_${foodId}`);
  const val = parseFloat(input?.value) || 1;

  let serving, grams;
  if (food.inputType === 'count') {
    serving = val;                          // 3 rotis = serving multiplier 3
    grams = null;                           // no gram value for count foods
  } else {
    grams = val;
    serving = val / food.servingGrams;      // 75g oats / 50g base = 1.5
  }

  AppState.loggedFoods.push({ food, meal: _activeMeal, serving, grams });
  savedFoodLog();
  document.getElementById('foodSearchModal').classList.remove('active');
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

  const newEx = type === 'CompoundLift'
    ? new CompoundLift(name, split, muscle, sets, reps, weightKg)
    : new IsolationLift(name, split, muscle, sets, reps, weightKg);

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
    document.getElementById('timerPlayIcon').textContent = AppState.timer.isPaused ? '▶️' : '⏸️';
    document.getElementById('timerPlayText').textContent = AppState.timer.isPaused ? 'Resume' : 'Pause';
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
      greeting.textContent = p.name ? `Hey, ${p.name}! 👋` : 'Your Fitness Profile';
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

  console.log('✅ Profile saved:', profile, '| Targets:', targets);
}

// ─── APP INIT (DOMContentLoaded) ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadInitialData();
  loadPersistedData();

  setupNavigation();
  setupWorkoutSplits();
  renderWorkoutView();

  setupModalCloseButtons();
  setupFoodSearch();
  setupProfileModal();

  // Sync header badge with current targets on load
  document.getElementById('headerCalBudget').textContent =
    AppState.targets.calories.toLocaleString('en-IN') + ' kcal';

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
  };

  console.log('✅ HealthPulse App initialized!');
});
