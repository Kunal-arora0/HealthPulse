function FoodItem(id, name, calories, protein, carbs, fats, servingUnit, category, diet, isDesiBooster = false) {
    this.id = id;
    this.name = name;
    this.calories = calories;
    this.protein = protein;
    this.carbs = carbs;
    this.fats = fats;
    this.servingUnit = servingUnit;
    this.category = category;
    this.diet = diet;
    this.isDesiBooster = isDesiBooster;
}

FoodItem.prototype.isHighProtein = function () {
    return (this.protein * 4) / this.calories >= 0.20;
};

FoodItem.prototype.getCaloriesForServings = function (servings) {
    return this.calories * servings;
};

function DesiBoosterItem(id, name, calories, protein, carbs, fats, servingUnit, category, diet) {
    FoodItem.call(this, id, name, calories, protein, carbs, fats, servingUnit, category, diet, true);
    this.type = "DesiBoosterItem";
}

DesiBoosterItem.prototype = Object.create(FoodItem.prototype);
DesiBoosterItem.prototype.constructor = DesiBoosterItem;

DesiBoosterItem.prototype.servingsNeededForProtein = function (targetProteinGrams) {
    return Math.ceil(targetProteinGrams / this.protein);
};

export { FoodItem, DesiBoosterItem };
