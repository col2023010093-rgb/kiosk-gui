# Health Monitoring Kiosk — Agent Guide

## Project purpose

This repository contains the user interface for the **Health Monitoring Kiosk with Generic Health Recommendations Web Application**, a Lyceum of Subic Bay capstone project for AY 2026–2027.

The system supports preliminary health screening. It collects and presents:

- Blood pressure (systolic and diastolic)
- Heart rate
- Blood oxygen saturation (SpO₂)
- Body temperature
- Height and weight
- Calculated body-mass index (BMI)

The kiosk identifies users with a VP8310 barcode scanner and is designed to communicate with a Raspberry Pi 4-based sensor station. The proposed hardware includes MLX90614 (temperature), MAX30102 (heart rate and SpO₂), load cells (weight, up to 200 kg), and VL53L1X (height). The web application serves three roles: `user`, `staff`, and `admin`.

## Non-negotiable health and privacy rules

1. **This is a screening and awareness system, never a diagnostic tool.** Never write UI copy, code comments, reports, or recommendation logic that claims to diagnose diseases, prescribe treatment, or replace a healthcare professional.
2. All health recommendations must be clearly labelled as **generic**. When a value is concerning, say that the user should seek assessment from qualified healthcare personnel; do not tell the user they have a condition.
3. Prominently retain a disclaimer wherever results or recommendations appear: “This screening result is for health awareness only and is not a medical diagnosis. Consult qualified healthcare personnel for medical advice.”
4. Treat all measurements and identity data as sensitive. Do not log names, barcode values, emails, IDs, raw measurements, access tokens, or API responses to the browser console. Do not put real health data in fixtures, screenshots, commits, or error messages.
5. A user can access only their own records. Staff access must be limited to the clinic workflow, and administrator privileges must be explicitly checked. UI route guards improve usability but are not security; the future API/database must enforce authorization independently.
6. Preserve consent, data minimization, and least-privilege principles. Do not add advertising, public leaderboards, social sharing, disease prediction, or any feature outside the approved capstone scope.

## Technology and commands

- React 19 + TypeScript + Vite
- React Router for navigation
- Tailwind CSS v4, with scoped CSS only when needed
- `react-hook-form` for forms
- `lucide-react` for icons and `framer-motion` for restrained motion

Run commands from this directory:

```bash
npm run dev
npm run lint
npm run build
```

Before handing off a change, run `npm run lint` and `npm run build`. Report any command that cannot run and why.

## Repository map

```text
src/
  components/    Reusable presentational and interaction components
  context/       Cross-cutting client state, including authentication
  data/          Clearly labelled mock/demo data only
  hooks/          Reusable UI and device-integration hooks
  layouts/        Kiosk, authentication, and dashboard shells
  pages/
    auth/        Login, registration, password recovery
    kiosk/       Touchscreen screening flow
    dashboard/   Role landing pages
    user/        Personal records and recommendations
    staff/       Patient and measurement workflows
    admin/       Accounts, reports, settings, audit logs
  routes/        Route declarations and access controls
  services/      API boundary; keep transport logic out of page components
  types/         Shared TypeScript domain types
  utils/         Pure helpers, validation, and constants
```

Keep `pages` focused on orchestration and layout, `components` reusable, `services` responsible for I/O, and `utils` pure. Extend shared types rather than duplicating data shapes in components.

## Domain rules

- Measurements use metric units: `heightCm`, `weightKg`, `temperatureCelsius`, and `oxygenSaturation` (percentage).
- BMI must be calculated from metric inputs: `weightKg / (heightCm / 100)²`. Guard against zero, missing, and implausible height values before calculating.
- Store timestamps as ISO-8601 UTC strings; convert only for display.
- Keep raw readings separate from derived display labels and recommendation text.
- Preserve the existing `VitalStatus` values: `normal`, `monitor`, and `attention`. Do not call a status “diagnosis”, “disease”, or “medical result”.
- Use central constants/helpers for any reference ranges. A future clinic/medical review must be able to update them in one place. Do not scatter magic thresholds through JSX.
- Hardware and scanner integrations must expose loading, retry, timeout, unavailable-device, invalid-reading, and cancellation states. Never present an unsuccessful sensor read as a real measurement.
- Barcode scan input is identity lookup only. Validate it, avoid displaying it after use, and prevent accidental keyboard input from being mistaken for a successful scan.

## UX requirements

The kiosk is a public touchscreen, potentially used by people with varied technical ability.

- Design for touch: large controls, generous spacing, clear focus indicators, and no hover-only interactions.
- Guide users one task at a time: identify user → confirm identity → measure vitals → review results → finish.
- Make the active measurement, its unit, progress, retry option, and next step unambiguous.
- Use plain, respectful language. Avoid alarming colours or wording; pair status colours with text and icons so meaning does not depend on colour alone.
- Provide accessible labels, semantic HTML, keyboard support for staff/web views, sufficient contrast, and clear validation/error text.
- Do not expose a previous user's name or results on an idle/shared screen. The kiosk must return to its privacy-safe idle state after completion, cancellation, or inactivity.
- Keep animations brief and purposeful; respect `prefers-reduced-motion`.

## Role and route expectations

- `user`: personal dashboard, profile, health history/records, generic recommendations, and individual reports.
- `staff`: patient lookup/registration, measurements, and clinic reports relevant to authorized care workflows.
- `admin`: account administration, system settings, audit/system logs, and administrative reports.
- Add both route-level protection and an in-page permission check for any sensitive action. Update `src/routes/AppRoutes.tsx`, `ProtectedRoute`, and navigation together when adding a protected feature.
- Redirect unauthorized users to a safe page without leaking the existence or contents of protected records.

## Coding conventions

- Use strict TypeScript. Avoid `any`, unsafe type assertions, and duplicated interfaces.
- Prefer named, focused functions and explicit loading/error/empty states over clever abstractions.
- Use existing shared components (`Button`, `Input`, `Card`, `Modal`, `Loading`) before creating near-duplicates.
- Keep network calls in `src/services/`; pages and components should not call `fetch` directly.
- Validate user input on the client for usability, but assume server-side validation remains mandatory.
- Keep mock data confined to `src/data/` and make its demo nature obvious. Do not silently substitute mock data in a production path.
- Do not add dependencies, environmental secrets, backend endpoints, or database schemas unless the task specifically requires them.
- Make small, coherent changes. Do not reformat unrelated files or rewrite working flows without a stated reason.

## Definition of done

For every completed task:

1. Confirm the change stays within the capstone scope and the screening-only boundary.
2. Check desktop and kiosk/touchscreen layouts, including empty, loading, error, and unauthorized states.
3. Check that sensitive data is not rendered, logged, or retained unnecessarily.
4. Run lint and production build.
5. Summarize changed files, user-visible behavior, validation performed, and any limitations or follow-up integration work.

## Out of scope unless explicitly requested

- Medical diagnosis, disease prediction, prescriptions, medication advice, or emergency triage
- ECG, laboratory, glucose, imaging, or other unapproved measurements
- Real cloud/database credentials, real patient data, or bypassing authorization
- Replacing the Raspberry Pi firmware or hardware calibration workflow
