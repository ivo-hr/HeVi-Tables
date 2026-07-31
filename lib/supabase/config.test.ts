import { afterEach, describe, expect, it, vi } from "vitest";

import { isSupabaseConfigured } from "@/lib/supabase/config";

function configure(url: string, key = "test-anonymous-key") {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", key);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isSupabaseConfigured", () => {
  it("accepts secure hosted URLs", () => {
    configure("https://project.supabase.co");
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("accepts HTTP only for local loopback URLs", () => {
    configure("http://127.0.0.1:54321");
    expect(isSupabaseConfigured()).toBe(true);

    configure("http://localhost:54321");
    expect(isSupabaseConfigured()).toBe(true);

    configure("http://supabase.internal:54321");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("rejects embedded credentials and placeholder keys", () => {
    configure("https://user:password@example.com");
    expect(isSupabaseConfigured()).toBe(false);

    configure("https://project.supabase.co", "your-anon-or-publishable-key");
    expect(isSupabaseConfigured()).toBe(false);
  });
});
