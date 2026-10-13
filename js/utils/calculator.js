function calculateMealNutrition(mealEntries) {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fats = 0;
    let tadkaFat = 0;
    let leucine = 0;

    let hasPulse = false;
    let hasCereal = false;
    let hasCompleteSource = false;

    mealEntries.forEach(entry => {
        const serving = entry.serving || 1;
        const food = entry.food || entry;
        const tadka = entry.tadkaLevel || 'none';

        if (typeof food.getEffectiveMacros === 'function') {
            const eff = food.getEffectiveMacros(serving, tadka);
            calories += eff.calories;
            protein += eff.protein;
            carbs += eff.carbs;
            fats += eff.fats;
            tadkaFat += eff.tadkaFat;
            leucine += eff.leucine;
            if (eff.isComplete) hasCompleteSource = true;
        } else {
            let addedFat = 0;
            if (tadka === 'light') addedFat = 4;
            else if (tadka === 'medium') addedFat = 10;
            else if (tadka === 'heavy') addedFat = 20;

            const baseCals = (food.calories || 0) * serving;
            const baseProt = (food.protein || 0) * serving;
            const baseCarb = (food.carbs || 0) * serving;
            const baseFat  = (food.fats || 0) * serving;

            calories += Math.round(baseCals + addedFat * 9);
            protein += baseProt;
            carbs += baseCarb;
            fats += +(baseFat + addedFat).toFixed(1);
            tadkaFat += addedFat;
            leucine += +((food.leucineGrams || 0.5) * serving).toFixed(2);
            if (food.proteinQuality === 'complete') hasCompleteSource = true;
        }

        const nameLower = (food.name || '').toLowerCase();
        if (nameLower.includes('dal') || nameLower.includes('rajma') || nameLower.includes('chana') || nameLower.includes('moong')) {
            hasPulse = true;
        }
        if (nameLower.includes('roti') || nameLower.includes('rice') || nameLower.includes('oats') || nameLower.includes('khichdi')) {
            hasCereal = true;
        }
    });

    const isAminoPaired = hasPulse && hasCereal;
    let mpsStatus = 'sub';
    if (leucine >= 2.7) {
        mpsStatus = 'anabolic';
    } else if (leucine >= 1.8) {
        mpsStatus = 'near';
    }

    return {
        calories: Math.round(calories),
        protein: +protein.toFixed(1),
        carbs: +carbs.toFixed(1),
        fats: +fats.toFixed(1),
        tadkaFat: +tadkaFat.toFixed(1),
        leucine: +leucine.toFixed(2),
        hasCompleteSource,
        isAminoPaired,
        mpsStatus
    };
}

function calculateDailyMacros(loggedFoodItems) {
    const mealBuckets = {};

    let totalCals = 0;
    let totalProt = 0;
    let completeProt = 0;
    let plantProt = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    let totalTadkaFat = 0;
    let totalLeucine = 0;

    // Group by meal to evaluate meal-level MPS and amino pairing
    loggedFoodItems.forEach(entry => {
        const m = entry.meal || 'General';
        if (!mealBuckets[m]) mealBuckets[m] = [];
        mealBuckets[m].push(entry);
    });

    let mpsTriggersHit = 0;

    Object.keys(mealBuckets).forEach(mealName => {
        const mealNut = calculateMealNutrition(mealBuckets[mealName]);
        totalCals += mealNut.calories;
        totalProt += mealNut.protein;
        totalCarbs += mealNut.carbs;
        totalFats += mealNut.fats;
        totalTadkaFat += mealNut.tadkaFat;
        totalLeucine += mealNut.leucine;

        if (mealNut.mpsStatus === 'anabolic') {
            mpsTriggersHit++;
        }

        if (mealNut.hasCompleteSource || mealNut.isAminoPaired) {
            completeProt += mealNut.protein;
        } else {
            plantProt += mealNut.protein;
        }
    });

    return {
        calories: Math.round(totalCals),
        protein: +totalProt.toFixed(1),
        completeProtein: +completeProt.toFixed(1),
        plantProtein: +plantProt.toFixed(1),
        carbs: +totalCarbs.toFixed(1),
        fats: +totalFats.toFixed(1),
        tadkaFat: +totalTadkaFat.toFixed(1),
        leucine: +totalLeucine.toFixed(2),
        mpsTriggersHit
    };
}

function calculateTotalTonnage(completedExercises) {
    return completedExercises.reduce((totalTonnage, exercise) => {
        const volume = typeof exercise.calculateTotalVolume === 'function'
            ? exercise.calculateTotalVolume()
            : (exercise.sets * exercise.reps * exercise.weightKg);

        return totalTonnage + volume;
    }, 0);
}

function filterHighProteinFoods(foodList) {
    return foodList.filter(food => food.isHighProtein());
}

function calculate1RM(weightKg, reps) {
    if (reps <= 1) return weightKg;
    return Math.round(weightKg * (1 + reps / 30));
}


function findProteinBoosters(targetProtein, loggedFoodItems, desiBoosters) {
    const total = calculateDailyMacros(loggedFoodItems);

    const deficit = targetProtein - total.protein;

    if (deficit <= 0) {
        return [];
    }
    return desiBoosters.map(booster => ({
        booster: booster,
        deficitRemanining: Math.round(deficit),
        servingNeeded: booster.servingsNeededForProtein(deficit),
        proteinProvided: booster.protein * booster.servingsNeededForProtein(deficit)
    }));

}


export { calculateDailyMacros, calculateMealNutrition, calculateTotalTonnage, filterHighProteinFoods, calculate1RM, findProteinBoosters };
