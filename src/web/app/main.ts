// Placeholder boot module (#2). The real shell (ws client, router, screens)
// arrives with #13. It renders no machine state: there is no demo fallback.
const root = document.getElementById("app");
if (root) {
  root.textContent = "ENIAC Touch Kiosk: web shell not built yet (#13).";
}
export {};
