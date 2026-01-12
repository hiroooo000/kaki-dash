import { vi } from 'vitest';

// Mock requestAnimationFrame to prevent infinite loops in Kakidash.startAnimationLoop
vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
  return 1; // Return dummy ID, do NOT call callback
});

vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((_id) => {
  // No-op
});
