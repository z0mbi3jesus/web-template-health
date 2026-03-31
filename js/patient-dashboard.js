// Compatibility shim. The calendar logic was moved to patient-calendar.js.
// Keep this file so old references do not break.
(function loadRenamedCalendarScript() {
    if (typeof document === 'undefined') return;

    const existing = document.querySelector('script[src="js/patient-calendar.js"]');
    if (existing) return;

    const script = document.createElement('script');
    script.src = 'js/patient-calendar.js';
    document.head.appendChild(script);
})();
