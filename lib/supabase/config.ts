export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || key.includes("your-") || key.startsWith("<")) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    const isLoopback =
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1" ||
      parsedUrl.hostname === "[::1]";
    const usesAllowedProtocol =
      parsedUrl.protocol === "https:" ||
      (parsedUrl.protocol === "http:" && isLoopback);

    return usesAllowedProtocol && !parsedUrl.username && !parsedUrl.password;
  } catch {
    return false;
  }
}

export function getSupabaseConfig() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  };
}
