function GymExercise(name, split, targetMuscle, sets, reps, weightKg) {
    this.name = name;
    this.split = split;
    this.targetMuscle = targetMuscle;
    this.sets = sets;
    this.reps = reps;
    this.weightKg = weightKg;
}

GymExercise.prototype.calculateTotalVolume = function () {
    return this.sets * this.reps * this.weightKg;
}

function CompoundLift(name, split, targetMuscle, sets, reps, weightKg) {
    GymExercise.call(this, name, split, targetMuscle, sets, reps, weightKg);
    this.type = "CompoundLift";
}


CompoundLift.prototype = Object.create(GymExercise.prototype);
CompoundLift.prototype.constructor = CompoundLift;


CompoundLift.prototype.calculate1RM = function () {
    return this.weightKg * (1 + this.reps / 30);
}


function IsolationLift(name, split, targetMuscle, sets, reps, weightKg) {
    GymExercise.call(this, name, split, targetMuscle, sets, reps, weightKg);
    this.type = "IsolationLift";
}

IsolationLift.prototype = Object.create(GymExercise.prototype);
IsolationLift.prototype.constructor = IsolationLift;

IsolationLift.prototype.getRecommendedRest = function () {
    return 45;
};


export { GymExercise, CompoundLift, IsolationLift };