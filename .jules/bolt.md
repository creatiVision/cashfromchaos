## 2026-11-09 - Defer offscreen listing image loading & decoding
**Learning:** In catalog and operations dashboard grids (`/dashboard` and `/market`), item photo fixtures are uncompressed multi-hundred-kilobyte images that were eagerly downloaded and decoded synchronously on initial page load, degrading network throughput and initial render performance.
**Action:** Use native `loading="lazy"` and `decoding="async"` on listing card image elements to defer fetching until near viewport and prevent image decode operations from blocking main-thread UI interactivity.
