# RULES INDEX — SINGLE SOURCE OF AUTHORITY

This file is the ONLY entry point for loading rules.

Any agent, prompt, validator, or UI logic MUST:
- Load this file first
- Then load ALL referenced rule files
- Treat all rules as IMMUTABLE

Failure to load all rules is a HARD ERROR.

--------------------------------------------------

## ?? RULE PRIORITY (ABSOLUTE)

1. SYSTEM RULES
2. TIME & ROUTINE RULES
3. MEAL STRUCTURE RULES
4. COOKING & INGREDIENT RULES
5. NON-VEG & SEQUENCING RULES
6. DRINK & ADD-ON RULES
7. SLEEP & TIMING RULES
8. ROTATION & REPETITION RULES
9. EXPLICITLY NOT ALLOWED RULES

If any conflict exists:
SYSTEM > PLAN > USER LOG

--------------------------------------------------

## ?? RULE FILES (MUST LOAD ALL)

### 00 — System Authority (HIGHEST)
- `00_SYSTEM_AUTHORITY.md`

### 01 — Time & Routine
- `01_TIME_ROUTINE_RULES.md`

### 02 — Budget
- `02_BUDGET_RULES.md`

### 03 — Cooking Feasibility (CRITICAL)
- `03_COOKING_FEASIBILITY_RULES.md`

### 04 — Vegetable Priority
- `04_VEGETABLE_PRIORITY_RULES.md`

### 05 — Lunch Rules
- `05_LUNCH_RULES.md`

### 06 — Dinner Rules
- `06_DINNER_RULES.md`

### 07 — Salad Rules
- `07_SALAD_RULES.md`

### 08 — Soup Rules
- `08_SOUP_RULES.md`

### 09 — Non-Veg Rules
- `09_NON_VEG_RULES.md`

### 10 — Juice Rules
- `10_JUICE_RULES.md`

### 11 — Black Coffee Rules
- `11_BLACK_COFFEE_RULES.md`

### 12 — Psyllium Rules
- `12_PSYLLIUM_RULES.md`

### 13 — Sleep Rules
- `13_SLEEP_RULES.md`

### 14 — Repetition & Rotation
- `14_REPETITION_ROTATION_RULES.md`

### 15 — Explicitly Not Allowed
- `15_EXPLICITLY_NOT_ALLOWED.md`

--------------------------------------------------

## ?? AGENT BEHAVIOR CONTRACT

Any agent consuming these rules MUST obey:

- Rules are FACTS, not suggestions
- Rules must NOT be optimized
- Rules must NOT be merged or summarized
- Rules must NOT be overridden by user preference
- Missing data MUST be marked as UNKNOWN, never inferred

Agents are ALLOWED to:
- Read rules
- Validate plans or logs against rules
- Report violations

Agents are NOT ALLOWED to:
- Modify rules
- Modify plans
- Suggest alternatives
- Give health or medical advice

--------------------------------------------------

## ?? VALIDATION REQUIREMENT

All validation must be:

- Deterministic
- Stateless
- Based only on:
  - Loaded rules
  - Locked plan
  - User log

No memory, history, or conversation context is allowed.

--------------------------------------------------

## ?? FAILURE HANDLING

If any of the following occur, the agent MUST STOP:

- A rule file is missing
- Two rules contradict without explicit priority
- Required timing or meal structure is undefined
- User attempts to override a rule

--------------------------------------------------

## ??? VERSIONING

Rules are versioned implicitly by repository commit.

If rules change:
- Create a new rules folder (e.g., rules_v1.1)
- Update this index accordingly
- NEVER edit historical rules

--------------------------------------------------

## ? FINAL DECLARATION

These rules define DISCIPLINE, not optimization.

The system exists to:
- Show WHAT MUST BE DONE
- Record WHAT WAS DONE
- Make deviations visible
- Avoid negotiation with self or agents
