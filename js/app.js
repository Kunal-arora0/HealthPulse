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
        return new DesiBoosterItem(f.id, f.name, f.calories, f.protein, f.carbs, f.fats, f.servingUnit, f.category, f.diet);
      }
      return new FoodItem(f.id, f.name, f.calories, f.protein, f.carbs, f.fats, f.servingUnit, f.category, f.diet);
    });

    AppState.desiBooster = AppState.foods.filter(food => food.isDesiBooster);

    console.log(`Loaded ${AppState.exercises.length} exercises and ${AppState.foods.length} Indian foods into OOP models!`);
  } catch (error) {
    console.error('Error loading datasets:', error);
  }
}

