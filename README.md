# HealthPulse

> High-Performance Indian Gym Fitness & Nutrition Operating System built with Vanilla JavaScript, HTML5, and Modern CSS.

HealthPulse combines **gym workout tracking (Push / Pull / Legs)** with verified **Indian nutrition science (ICMR-NIN IFCT tables)** and serves as a comprehensive demonstration of core JavaScript design patterns and web APIs.

---

## Key Features

### 1. Workout Tracker (Push / Pull / Legs)
- **Split Selectors**: Quick switches for Push, Pull, and Leg workouts.
- **Tonnage Engine**: Dynamically calculates total workout volume moved: $\sum (\text{sets} \times \text{reps} \times \text{weight})$.
- **1-Rep Max (1RM)**: Uses the **Epley formula** to predict 1RM for heavy compound lifts.
- **Set Completion**: Interactive set check-off with synth feedback.

### 2. Rest-Between-Sets Gym Timer
- **Synthesizer Beeps**: Zero external audio dependencies—pure **Web Audio API** oscillator synth tones for countdown ticks and set completion chimes.
- **Interval Presets**: Quick launcher intervals (30s, 60s, 90s, 120s).

### 3. Indian Gym Nutrition & Calorie Tracker
- **Verified ICMR-NIN Nutrition**: Indian food database derived from National Institute of Nutrition guidelines (Roti, Dal, Paneer, Soya Chunks, Sattu, Boiled Eggs, Chicken Tikka, Whey).
- **Macro Ring**: Dark-glassmorphic animated SVG circular gauge for daily calories and macro breakdown bars.
- **"Desi Protein Gap Closer"**: Detects protein deficits and automatically surfaces top Indian protein boosters with calculated servings needed to close the gap.

### 4. Persistent Web Storage
- All workout logs, completed sets, custom exercises, and daily food meals are persisted using the browser's `localStorage` API.

---

## JavaScript Architectural Patterns

| Concept | Implementation in HealthPulse |
|---|---|
| **Constructor Functions & `this`** | `GymExercise` and `FoodItem` models instantiating objects with `new`. |
| **Prototypical Inheritance** | `CompoundLift`, `IsolationLift`, and `DesiBoosterItem` inheriting methods via `Object.create`. |
| **Higher-Order Functions** | `Array.prototype.reduce` (daily macros and tonnage), `filter` (high-protein foods), `map` (booster recommendations). |
| **Arrow Functions** | Lexical `this` scoping in timers and clean reducer predicates. |
| **Web Storage** | Modular `StorageService` managing JSON serialization and parsing. |
| **Web Audio API** | Real-time browser synthesizer oscillators for gym audio chimes. |

---

## Presentation & Demo Quick Start

To launch and present the project in front of your teacher or evaluators:

### Method 1: One-Click Demo Script (Recommended)
Open Terminal, navigate to the folder, and run:
```bash
cd ~/Desktop/HealthPulse
./start.sh
```
*This starts the local web server and automatically opens `http://localhost:3000` in your default browser.*

---

### Method 2: Standard Node / NPM Command
```bash
cd ~/Desktop/HealthPulse
npm start
```
Then open `http://localhost:3000` in your browser.

---

### Method 3: Built-in Python Server (Zero Installation Needed)
```bash
cd ~/Desktop/HealthPulse
python3 -m http.server 3000
```
Then open `http://localhost:3000` in your browser.

---

## Teacher Demo Flow (Key Features to Showcase)

1. **3D Interactive Muscle Mind Map**:
   - Rotate the 3D anatomical body model 360° with mouse drag or the **Flip 180°** button.
   - Click any muscle (Chest, Shoulders, Back, Glutes, Quads) to see it illuminate and filter target exercises with zero latency.
2. **Athlete Performance & Working Weight Matrix (Option B)**:
   - Point out that there is zero clunky spreadsheet logging.
   - Demonstrate the `+2.5kg / -2.5kg` working weight stepper.
   - Click **"Mark Target Hit (+2.5kg)"** to demonstrate automatic progressive overload progression and auto-saving to `localStorage`.
3. **Rest Interval Timer & Web Audio API**:
   - Show how the rest timer launches with Web Audio synthesizer ticks at 3-2-1 seconds and a completion chime.
4. **Everyday Indian Nutrition & Macros**:
   - Switch to the **Indian Nutrition & Macros** tab.
   - Search for Indian foods (Roti, Dal, Paneer, Soya Chunks) with verified ICMR-NIN nutrition values.
   - Demonstrate the animated circular calorie gauge and complete protein tracking.

---

## License
MIT License. Created for fitness enthusiasts and developers.
