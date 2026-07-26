
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically provided
// by the Supabase Edge Functions runtime — no manual secret needed for these.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- Validation helpers ----------

function isNameValid(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  return /^[A-Za-z\s]+$/.test(name.trim());
}

function isPhoneValid(phone: string): boolean {
  if (!phone || phone.trim().length === 0) return false;
  return /^0\d+$/.test(phone.trim());
}

function isEmailValid(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ---------- Rate limiting helpers ----------

async function getActiveLockout(email: string) {
  const { data, error } = await supabase
    .from("account_lockouts")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) return null;

  const lockedUntil = new Date(data.locked_until).getTime();
  if (lockedUntil > Date.now()) {
    return data; // still active
  }
  return null; // expired or none
}

async function getExistingLockoutRow(email: string) {
  const { data } = await supabase
    .from("account_lockouts")
    .select("*")
    .eq("email", email)
    .single();
  return data ?? null;
}

async function countRecentFailedAttempts(email: string) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("login_attempts")
    .select("id")
    .eq("email", email)
    .eq("success", false)
    .gte("attempted_at", tenMinutesAgo);

  if (error) return 0;
  return data?.length ?? 0;
}

async function insertLoginAttempt(email: string, success: boolean, ip: string | null) {
  await supabase.from("login_attempts").insert({
    email,
    success,
    ip_address: ip,
  });
}

async function upsertLockout(email: string, type: "short" | "long") {
  const durationMs = type === "short" ? 10 * 60 * 1000 : 60 * 60 * 1000;
  const lockedUntil = new Date(Date.now() + durationMs).toISOString();

  await supabase.from("account_lockouts").upsert(
    {
      email,
      locked_until: lockedUntil,
      lockout_type: type,
    },
    { onConflict: "email" },
  );
}

async function deleteExpiredLockout(email: string) {
  await supabase.from("account_lockouts").delete().eq("email", email);
}

function minutesRemaining(lockedUntil: string): number {
  const ms = new Date(lockedUntil).getTime() - Date.now();
  return Math.max(1, Math.ceil(ms / 60000));
}

// ---------- Action handlers ----------

async function handleSignup(body: any) {
  const { first_name, last_name, phone, email, password } = body;

  if (!isNameValid(first_name)) {
    return jsonResponse({ error: "First name is required and must contain only letters and spaces." }, 400);
  }
  if (!isNameValid(last_name)) {
    return jsonResponse({ error: "Last name is required and must contain only letters and spaces." }, 400);
  }
  if (!isPhoneValid(phone)) {
    return jsonResponse({ error: "Phone number is required, must start with 0, and contain only digits." }, 400);
  }
  if (!isEmailValid(email)) {
    return jsonResponse({ error: "A valid email address is required." }, 400);
  }
  if (!password || password.length === 0) {
    return jsonResponse({ error: "Password is required." }, 400);
  }

  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  });

  if (createError || !userData?.user) {
    return jsonResponse(
      { error: createError?.message ?? "Could not create account. The email may already be in use." },
      400,
    );
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userData.user.id,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    phone: phone.trim(),
  });

  if (profileError) {
    return jsonResponse({ error: "Account created, but profile setup failed. Please contact support." }, 500);
  }

  return jsonResponse({ message: "Account created successfully. Please log in." });
}

async function handleLogin(body: any, ip: string | null) {
  const { email, password } = body;

  if (!isEmailValid(email) || !password) {
    return jsonResponse({ error: "Email and password are required." }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Check for an active lockout first, before anything else.
  const activeLockout = await getActiveLockout(normalizedEmail);
  if (activeLockout) {
    const mins = minutesRemaining(activeLockout.locked_until);
    return jsonResponse(
      { error: `Your account is temporarily locked. Please try again in ${mins} minutes.` },
      423,
    );
  }

  // 2. Attempt authentication.
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (signInError || !signInData?.session) {
    // Record the failed attempt.
    await insertLoginAttempt(normalizedEmail, false, ip);

    // Was there a previous lockout row (even if expired) for this email?
    const previousLockout = await getExistingLockoutRow(normalizedEmail);

    if (previousLockout && previousLockout.lockout_type === "short") {
      // A short lockout previously existed and has now expired, and the user failed again.
      await upsertLockout(normalizedEmail, "long");
      return jsonResponse(
        { error: "Your account has been locked for 1 hour due to repeated failed attempts." },
        423,
      );
    }

    // Otherwise, count failed attempts in the last 10 minutes.
    const failedCount = await countRecentFailedAttempts(normalizedEmail);
    if (failedCount >= 3) {
      await upsertLockout(normalizedEmail, "short");
      return jsonResponse(
        { error: "Too many failed attempts. Your account has been locked for 10 minutes." },
        423,
      );
    }

    return jsonResponse({ error: "Incorrect email or password." }, 401);
  }

  // 3. Success: record it, clear any expired lockout, return session.
  await insertLoginAttempt(normalizedEmail, true, ip);
  await deleteExpiredLockout(normalizedEmail);

  return jsonResponse({
    message: "Login successful.",
    session: signInData.session,
  });
}

// ---------- Entry point ----------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  // Reject bodies larger than 8 KB.
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 8 * 1024) {
    return jsonResponse({ error: "Request body too large." }, 413);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const ip = req.headers.get("x-forwarded-for");

  switch (body?.action) {
    case "signup":
      return await handleSignup(body);
    case "login":
      return await handleLogin(body, ip);
    default:
      return jsonResponse({ error: "Unknown action. Must be 'signup' or 'login'." }, 400);
  }
});