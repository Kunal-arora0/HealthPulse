function FoodItem(
  id, name, calories, protein, carbs, fats,
  servingUnit, servingGrams, category, diet,
  isDesiBooster = false, inputType = 'grams', countUnit = null,
  leucineGrams = 0.5, proteinQuality = 'incomplete', aminoLimiting = 'none',
  recommendedPairing = '', pToCRatio = 0, costPer25gP = 45, canHaveTadka = false
) {
  this.id = id;
  this.name = name;
  this.calories = calories;
  this.protein = protein;
  this.carbs = carbs;
  this.fats = fats;
  this.servingUnit = servingUnit;
  this.servingGrams = servingGrams || 100;
  this.category = category;
  this.diet = diet;
  this.isDesiBooster = isDesiBooster;
  this.inputType = inputType;   // 'count' | 'grams'
  this.countUnit = countUnit;   // e.g. 'roti', 'egg white', 'scoop'
  this.leucineGrams = leucineGrams || 0.5;
  this.proteinQuality = proteinQuality || 'incomplete'; // 'complete' | 'incomplete'
  this.aminoLimiting = aminoLimiting || 'none';
  this.recommendedPairing = recommendedPairing || '';
  this.pToCRatio = pToCRatio || (carbs > 0 ? +(protein / carbs).toFixed(2) : protein);
  this.costPer25gP = costPer25gP || 45;
  this.canHaveTadka = canHaveTadka || false;
}

FoodItem.prototype.isHighProtein = function () {
  return (this.protein * 4) / this.calories >= 0.20;
};

FoodItem.prototype.isComplete = function () {
  return this.proteinQuality === 'complete';
};

FoodItem.prototype.getCaloriesForServings = function (servings) {
  return this.calories * servings;
};

// Calculate macros taking into account cooking Tadka & Ghee level
FoodItem.prototype.getEffectiveMacros = function (serving = 1, tadkaLevel = 'none') {
  let addedFatGrams = 0;
  if (this.canHaveTadka) {
    if (tadkaLevel === 'light') addedFatGrams = 4;        // 1 tsp ghee (+36 kcal)
    else if (tadkaLevel === 'medium') addedFatGrams = 10; // 1 tbsp mummy ka tadka (+90 kcal)
    else if (tadkaLevel === 'heavy') addedFatGrams = 20;  // Dhaba / restaurant (+180 kcal)
  }

  const baseCals = this.calories * serving;
  const baseProt = this.protein * serving;
  const baseCarb = this.carbs * serving;
  const baseFat  = this.fats * serving;

  const totalFat = +(baseFat + addedFatGrams).toFixed(1);
  const totalCals = Math.round(baseCals + (addedFatGrams * 9));
  const totalLeucine = +(this.leucineGrams * serving).toFixed(2);

  return {
    calories: totalCals,
    protein: +baseProt.toFixed(1),
    carbs: +baseCarb.toFixed(1),
    fats: totalFat,
    tadkaFat: addedFatGrams,
    leucine: totalLeucine,
    isComplete: this.isComplete()
  };
};

function DesiBoosterItem(
  id, name, calories, protein, carbs, fats,
  servingUnit, servingGrams, category, diet,
  inputType = 'grams', countUnit = null,
  leucineGrams = 1.8, proteinQuality = 'complete', aminoLimiting = 'none',
  recommendedPairing = '', pToCRatio = 1.5, costPer25gP = 35, canHaveTadka = false
) {
  FoodItem.call(
    this, id, name, calories, protein, carbs, fats,
    servingUnit, servingGrams, category, diet, true,
    inputType, countUnit, leucineGrams, proteinQuality,
    aminoLimiting, recommendedPairing, pToCRatio, costPer25gP, canHaveTadka
  );
  this.type = "DesiBoosterItem";
}

DesiBoosterItem.prototype = Object.create(FoodItem.prototype);
DesiBoosterItem.prototype.constructor = DesiBoosterItem;

DesiBoosterItem.prototype.servingsNeededForProtein = function (targetProteinGrams) {
  return Math.ceil(targetProteinGrams / this.protein);
};

export { FoodItem, DesiBoosterItem };
