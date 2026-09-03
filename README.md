# HealthPulse (स्वास्थ्य Pulse) 🏋️‍♂️🍛

> High-Performance Indian Gym Fitness & Nutrition Operating System built with Vanilla JavaScript, HTML5, and Modern CSS.

HealthPulse combines **gym workout tracking (Push / Pull / Legs)** with verified **Indian nutrition science (ICMR-NIN IFCT tables)** and serves as a comprehensive demonstration of core JavaScript design patterns and web APIs.

---

## 🌟 Key Features

### 1. 🏋️ Workout Tracker (Push / Pull / Legs)
- **Split Selectors**: Quick switches for Push, Pull, and Leg workouts.
- **Tonnage Engine**: Dynamically calculates total workout volume moved: $\sum (\text{sets} \times \text{reps} \times \text{weight})$.
- **1-Rep Max (1RM)**: Uses the **Epley formula** to predict 1RM for heavy compound lifts.
- **Set Completion**: Interactive set check-off with synth feedback.

### 2. ⏱️ Rest-Between-Sets Gym Timer
- **Synthesizer Beeps**: Zero external audio dependencies—pure **Web Audio API** oscillator synth tones for countdown ticks and set completion chimes.
- **Interval Presets**: Quick launcher intervals (30s, 60s, 90s, 120s).

### 3. 🍛 Indian Gym Nutrition & Calorie Tracker
- **Verified ICMR-NIN Nutrition**: Indian food database derived from National Institute of Nutrition guidelines (Roti, Dal, Paneer, Soya Chunks, Sattu, Boiled Eggs, Chicken Tikka, Whey).
- **Macro Ring**: Dark-glassmorphic animated SVG circular gauge for daily calories and macro breakdown bars.
- **"Desi Protein Gap Closer"**: Detects protein deficits and automatically surfaces top Indian protein boosters with calculated servings needed to close the gap.

### 4. 💾 Persistent Web Storage
- All workout logs, completed sets, custom exercises, and daily food meals are persisted using the browser's `localStorage` API.

---

## 🧩 JavaScript Architectural Patterns

| Concept | Implementation in HealthPulse |
|---|---|
| **Constructor Functions & `this`** | `GymExercise` and `FoodItem` models instantiating objects with `new`. |
| **Prototypical Inheritance** | `CompoundLift`, `IsolationLift`, and `DesiBoosterItem` inheriting methods via `Object.create`. |
| **Higher-Order Functions** | `Array.prototype.reduce` (daily macros and tonnage), `filter` (high-protein foods), `map` (booster recommendations). |
| **Arrow Functions** | Lexical `this` scoping in timers and clean reducer predicates. |
| **Web Storage** | Modular `StorageService` managing JSON serialization and parsing. |
| **Web Audio API** | Real-time browser synthesizer oscillators for gym audio chimes. |

---

## 🚀 Getting Started

1. Clone this repository:
   ```bash
   git clone https://github.com/<your-username>/HealthPulse.git
   cd HealthPulse
   ```

2. Run locally using any static web server:
   ```bash
   # Using Python:
   python3 -m http.server 3000
   
   # Or using Node:
   npx serve .
   ```

3. Open your browser at `http://localhost:3000`.

---

## 📄 License
MIT License. Created for fitness enthusiasts and developers.
