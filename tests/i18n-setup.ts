import { vi } from "vitest";

// Service tests run outside a Next request; browser tests exercise real locale resolution.
vi.mock("next-intl/server", () => ({ getLocale: vi.fn(async () => "en") }));
