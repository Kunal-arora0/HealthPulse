function GymExercise(name, split, targetMuscle, sets, reps, weightKg, id, primaryMuscle, secondaryMuscles, muscleKey, blueprint) {
    this.name = name;
    this.split = split;
    this.targetMuscle = targetMuscle;
    this.sets = sets;
    this.reps = reps;
    this.weightKg = weightKg;
    this.id = id || name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    this.primaryMuscle = primaryMuscle || targetMuscle;
    this.secondaryMuscles = secondaryMuscles || [];
    this.muscleKey = muscleKey || 'general';
    this.blueprint = blueprint || null;
}

GymExercise.prototype.calculateTotalVolume = function () {
    return this.sets * this.reps * this.weightKg;
}

function CompoundLift(name, split, targetMuscle, sets, reps, weightKg, id, primaryMuscle, secondaryMuscles, muscleKey, blueprint) {
    GymExercise.call(this, name, split, targetMuscle, sets, reps, weightKg, id, primaryMuscle, secondaryMuscles, muscleKey, blueprint);
    this.type = "CompoundLift";
}

CompoundLift.prototype = Object.create(GymExercise.prototype);
CompoundLift.prototype.constructor = CompoundLift;

CompoundLift.prototype.calculate1RM = function (reps, weightKg) {
    const r = reps || this.reps;
    const w = weightKg || this.weightKg;
    return w * (1 + r / 30);
}

function IsolationLift(name, split, targetMuscle, sets, reps, weightKg, id, primaryMuscle, secondaryMuscles, muscleKey, blueprint) {
    GymExercise.call(this, name, split, targetMuscle, sets, reps, weightKg, id, primaryMuscle, secondaryMuscles, muscleKey, blueprint);
    this.type = "IsolationLift";
}

IsolationLift.prototype = Object.create(GymExercise.prototype);
IsolationLift.prototype.constructor = IsolationLift;

IsolationLift.prototype.getRecommendedRest = function () {
    return 45;
};

export { GymExercise, CompoundLift, IsolationLift };