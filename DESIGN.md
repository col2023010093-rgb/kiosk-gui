# Health Monitoring Kiosk - Design Guide

## 1. Design intent

Create a calm, trustworthy, and easy-to-use health-screening experience for the Lyceum of Subic Bay community. The kiosk must feel approachable to first-time users while giving clinic staff and administrators an efficient web dashboard.

This product provides **preliminary screening and generic health recommendations**, not diagnosis or treatment. The interface must never imply otherwise.

### Design principles

1. **Reassure before informing.** Use calm language, simple steps, and clear explanations of what the kiosk is doing.
2. **One task at a time.** The public kiosk flow should show only the current action and the next action.
3. **Readable from a distance.** Use large type, strong contrast, visible status labels, and generous spacing.
4. **Privacy by default.** Shared screens reveal only what is needed for the active session and return to idle promptly.
5. **Status without alarm.** A concerning value warrants a clear next step, not a frightening diagnosis.
6. **Accessible is usable.** Touch targets, text alternatives, keyboard support, contrast, and color-independent cues are requirements.

## 2. Users and their needs

| User | Primary need | Design response |
| --- | --- | --- |
| Student, faculty, or staff member | Complete a quick, understandable self-screening | Guided touchscreen flow, barcode scan, large controls, immediate plain-language results |
| Clinic staff | Register or locate patients and monitor records | Fast patient search, readable tables, filters, clear record context |
| Administrator | Manage users, reports, and system configuration | Consistent dashboard navigation, protected actions, audit-oriented views |

## 3. Information architecture

```text
Public kiosk
  Idle / welcome
  Scan barcode
  Confirm identity
  Measure vitals
  Review results
  Complete / return to idle

Authenticated web application
  User
    Dashboard, profile, health records, history, recommendations, reports
  Staff
    Dashboard, patient registration/lookup, measurements, reports
  Admin
    Dashboard, users, staff accounts, reports, settings, system logs
```

The kiosk and dashboard are separate experiences. Keep the kiosk focused on a single screening session; do not place administration, dense tables, or unrelated navigation there.

## 4. Kiosk flow

```text
Idle -> Scan barcode -> Confirm user -> Measure vitals -> Results -> Complete -> Idle
                       |                    |               |
                       v                    v               v
                 Not registered        Retry / cancel   View report or finish
```

### 4.1 Idle / welcome

- Purpose: invite a new session without exposing prior user data.
- Content: project/clinic name, a single primary action such as "Start screening", short privacy reminder, and optional staff sign-in entry.
- Behavior: clear temporary session data on entry. Never show a previous measurement, name, barcode, or report.

### 4.2 Barcode scanning

- Explain the action: "Scan your school or clinic barcode to continue."
- Show scanner status: ready, scanning, unavailable, timeout, invalid scan, and retry.
- Do not render or retain the barcode after lookup. Keep a visible cancel/back control.
- If the person is not registered, route to `NotRegistered` and offer the approved staff-assistance path.

### 4.3 Identity confirmation

- Display only enough information for the person to recognize their own account, for example first name plus masked identifier.
- Ask: "Is this your account?" with clear **Continue** and **Not me** actions.
- "Not me" must discard the lookup and return to scan; never reveal alternative records.

### 4.4 Measurement sequence

Use one full-screen measurement card at a time. Each screen includes:

- Step label and progress: for example, "Step 2 of 6: Temperature"
- Sensor icon, measurement name, unit, and brief positioning instruction
- Live state: preparing, measuring, reading received, invalid read, or sensor unavailable
- Cancel and retry actions where appropriate
- A privacy-safe summary of successfully captured measurements

Suggested order: height -> weight -> temperature -> blood pressure -> heart rate / SpO2 -> review. The implementation may change this order to suit the actual hardware workflow, but the UI must make the order explicit.

### 4.5 Results and completion

- Group results as cards with a value, unit, descriptive status, and a short generic recommendation.
- Always show the screening disclaimer: "This screening result is for health awareness only and is not a medical diagnosis. Consult qualified healthcare personnel for medical advice."
- For values requiring attention, use respectful copy such as: "This reading may need a follow-up assessment. Please consult clinic staff or qualified healthcare personnel."
- Offer only authorized actions: finish, print/generate report if implemented, and securely view the record through the authenticated web application.
- Completion screen should state that the session is closed, then automatically return to idle after an appropriate inactivity timeout.

## 5. Visual system

### 5.1 Color roles

Use semantic names/tokens rather than scattering hex values through components. These are starting values; validate contrast before implementation.

| Token | Suggested value | Usage |
| --- | --- | --- |
| `brand-700` | `#0F5C73` | Primary actions, headings, navigation |
| `brand-600` | `#16718B` | Hover and selected states |
| `brand-100` | `#DDF3F7` | Soft backgrounds and information panels |
| `surface` | `#FFFFFF` | Cards and inputs |
| `canvas` | `#F5F8FA` | Page background |
| `text-primary` | `#17212B` | Main text |
| `text-secondary` | `#52616B` | Supporting text |
| `border` | `#D5DEE5` | Borders and dividers |
| `success` | `#197A55` | Normal/complete, always paired with text/icon |
| `warning` | `#A76100` | Monitor, always paired with text/icon |
| `attention` | `#B42318` | Attention/error, always paired with text/icon |

Never communicate a vital status with color alone. Pair the color with an icon and explicit label: `Normal`, `Monitor`, or `Needs attention`.

### 5.2 Typography

- Use the existing system font stack unless the team formally selects a web font.
- Kiosk page title: 40-48 px; section title: 28-32 px; body text: 18-20 px; helper text: minimum 16 px.
- Dashboard page title: 28-32 px; body/table text: 14-16 px; never go below 14 px for important data.
- Use sentence case, short labels, and direct language. Avoid dense all-caps text.
- Display values in tabular numerals when available so measurement columns are easy to compare.

### 5.3 Spacing, shape, and elevation

- Use a 4 px spacing scale: 4, 8, 12, 16, 24, 32, 48, 64.
- Kiosk content width: roughly 720-960 px on a landscape touchscreen; keep the main task centered.
- Use 12-16 px radius for cards and 10-12 px radius for inputs/buttons.
- Prefer borders and subtle shadows over heavy elevation. Do not use decorative gradients that reduce clarity.

### 5.4 Icons and images

- Use `lucide-react` icons consistently; do not mix icon families or emoji as functional icons.
- Every icon-only control needs an accessible label and visible tooltip on dashboard screens.
- Use imagery only when it helps instructions or trust. Do not use images that appear to be clinical claims or imply a diagnosis.

## 6. Components

Build on the existing reusable components before creating variants.

### Buttons

- **Primary:** one per screen; used for the next committed action.
- **Secondary:** back, retry, or less prominent actions.
- **Danger/attention:** only for destructive account/admin actions, with confirmation.
- Kiosk touch target: at least 48 x 48 CSS px, preferably 56 px high for main actions.
- Buttons must have enabled, hover (dashboard), focus-visible, pressed, disabled, and loading states.

### Form controls

- Place a persistent label above each input; placeholders are examples, not labels.
- Show validation near the field in plain language and identify the correction needed.
- Do not use red alone for error state; include icon/text and accessible error association.

### Vital cards

Each `HealthMetricCard` should show:

```text
Measurement name and icon          Status icon + label
Primary reading + unit
Optional reference/context line
Recorded date and time
Generic next-step message (when needed)
```

Do not show medical reference ranges as a diagnosis. If ranges are used, source them from centralized constants reviewed by the project adviser/clinic.

### Tables and reports

- Keep the user name/record context visible while viewing a sensitive patient record.
- Provide search, filters, empty state, loading state, and retryable error state.
- Use responsive cards or a horizontal scroll container rather than clipping meaningful columns on small screens.
- Restrict report data by role and ensure export/print includes the screening disclaimer.

## 7. Responsive behavior

| Context | Layout guidance |
| --- | --- |
| Kiosk landscape (primary) | One focused task, large cards, two-column detail only when legible |
| Tablet / kiosk portrait | Stack supporting panels, retain large controls and progress |
| Desktop dashboard | Sidebar plus readable content area; tables allowed |
| Small web screen | Collapse sidebar to a menu, stack cards, preserve 44 px minimum control height |

Do not require hover, tiny links, or horizontal precision in the kiosk flow.

## 8. Accessibility checklist

- Semantic headings follow a logical order.
- Every form field has a programmatic label.
- Keyboard focus is visible and follows the visual order on web/dashboard views.
- Dialogs trap focus, announce their title, and return focus to the trigger when closed.
- Status changes, scan failures, and measurement progress are announced accessibly without interrupting essential instructions.
- Text contrast meets WCAG AA: 4.5:1 for normal text and 3:1 for large text/UI boundaries.
- Motion is subtle and respects `prefers-reduced-motion`.
- Important instructions do not depend solely on color, sound, or animation.

## 9. Content standards

### Use

- "Health screening"
- "Generic health recommendation"
- "This reading may need a follow-up assessment."
- "Please consult qualified healthcare personnel."
- "Try again" or "Get staff assistance"

### Do not use

- "You have [condition]."
- "Diagnosed", "cured", "prescription", or "treatment plan"
- "Normal means healthy" or any absolute health claim
- Technical sensor errors without a plain-language explanation and next action

## 10. Design QA before handoff

1. Review every kiosk screen from idle through completion with a mock user session.
2. Confirm no prior user's personal or health data remains after cancel, timeout, or finish.
3. Test normal, loading, empty, error, retry, scanner-unavailable, and unauthorized states.
4. Check touch target sizes and keyboard navigation where applicable.
5. Check color contrast and status labels in normal and high-contrast conditions.
6. Verify all results and reports preserve the generic-recommendation disclaimer.
7. Test at desktop, tablet, and kiosk target resolutions before approval.

## 11. Implementation ownership

- Put reusable visual primitives in `src/components/`.
- Keep page composition in `src/pages/` and route guards in `src/routes/`.
- Put status thresholds and display labels in `src/utils/constants.ts` or focused utility modules, not JSX.
- Keep network/device I/O behind `src/services/` and hooks such as `src/hooks/useBarcodeScanner.ts`.
- Use the type definitions in `src/types/` as the source of truth for health-record shapes.

Any new screen must follow this guide and the safety/privacy rules in `AGENTS.md`.
