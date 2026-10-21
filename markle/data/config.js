// Edit these to launch. Sheet No. n is issued on startDate + (n - 1) days, at local midnight.
// With startDate four days before launch, all five launch sheets are open on day one and
// sheet 005 is "today"; add sheet 006 to data/puzzles.js to keep it daily after that.
export const CONFIG = {
  name: 'Markle',
  startDate: '2026-10-17',
  // The link printed at the bottom of shared results. Leave '' to use the page's own address.
  shareUrl: '',
};
