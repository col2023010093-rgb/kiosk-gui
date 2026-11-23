Staff / admin portal code moved out of the kiosk.

This folder is NOT part of the kiosk build (it is outside src/). It keeps the original
folder layout, so you can copy it into the new staff web app and fix the imports there.

  src/pages/staff, src/pages/admin     staff and admin screens
  src/pages/dashboard/StaffDashboard   old kiosk maintenance console (calibration/override)
  src/components/Sidebar.tsx           staff/admin sidebar
  src/components/KioskStaffGate.tsx    old staff gate
  src/hooks/useStaffGate.ts            old staff gate hook
  src/data/mockStaff.ts, mockLogs.ts   demo data used by the admin pages

Sensor calibration still works through the Flask endpoints on the Pi (see README/audit).
