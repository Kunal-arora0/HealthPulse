function calculateDailyMacros(loggedFoodItems) {
    return loggedFoodItems.reduce((totals, entry) => {
        const serving = entry.serving || 1;
        const food = entry.food || entry;

        totals.calories += food.calories * serving;
        totals.protein += food.protein * serving;
        totals.carbs += food.carbs * serving;
        totals.fats += food.fats * serving;

        return totals;

    }, { calories: 0, protein: 0, carbs: 0, fats: 0 })
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


export { calculateDailyMacros, calculateTotalTonnage, filterHighProteinFoods, calculate1RM, findProteinBoosters };
