// supabase/functions/applications-handler/index.ts
// Handles: add, load (requires valid JWT in Authorization header)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically provided
// by the Supabase Edge Functions runtime — same as used in auth-handler.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const APPROVED_INSTITUTIONS = [
  "University of Cape Town (UCT)",
  "University of the Witwatersrand (Wits)",
  "University of Pretoria (UP)",
  "Stellenbosch University (SU)",
  "University of Johannesburg (UJ)",
  "University of KwaZulu-Natal (UKZN)",
  "University of the Free State (UFS)",
  "Nelson Mandela University (NMU)",
  "Rhodes University (RU)",
  "University of the Western Cape (UWC)",
  "University of Limpopo (UL)",
  "University of Zululand (UniZulu)",
  "Walter Sisulu University (WSU)",
  "University of Fort Hare (UFH)",
  "University of Venda (Univen)",
  "North-West University (NWU)",
  "University of South Africa (UNISA)",
  "University of Mpumalanga (UMP)",
  "Sol Plaatje University (SPU)",
  "Tshwane University of Technology (TUT)",
  "Cape Peninsula University of Technology (CPUT)",
  "Durban University of Technology (DUT)",
  "Vaal University of Technology (VUT)",
  "Central University of Technology (CUT)",
  "Mangosuthu University of Technology (MUT)",
  "Ekurhuleni East TVET College",
  "Tshwane North TVET College",
  "Sedibeng TVET College",
  "Motheo TVET College",
  "Boland TVET College",
  "False Bay TVET College",
  "Coastal KZN TVET College",
  "Umgungundlovu TVET College",
];

const NORMALISED_INSTITUTIONS = APPROVED_INSTITUTIONS.map((i) => i.toLowerCase());

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyToken(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: jsonResponse({ error: "Unauthorised. Please log in." }, 401) };
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: jsonResponse({ error: "Session expired. Please log in again." }, 401) };
  }

  return { user };
}

async function handleAdd(req: Request, body: any) {
  const { error: authError, user } = await verifyToken(req);
  if (authError) return authError;

  const { institution, course, academic_year, status, notes } = body;

  if (!institution || !NORMALISED_INSTITUTIONS.includes(String(institution).toLowerCase())) {
    return jsonResponse(
      { error: "Institution not recognised. Please select from the approved list." },
      400,
    );
  }

  if (!course || String(course).trim().length === 0) {
    return jsonResponse({ error: "Course is required." }, 400);
  }

  if (!academic_year || String(academic_year).trim().length === 0) {
    return jsonResponse({ error: "Academic year is required." }, 400);
  }

  if (status !== "draft" && status !== "submitted") {
    return jsonResponse({ error: "Status must be either 'draft' or 'submitted'." }, 400);
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user!.id,
      institution,
      course,
      academic_year,
      status,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: "Could not save application. Please try again." }, 500);
  }

  return jsonResponse({ application: data });
}

async function handleLoad(req: Request) {
  const { error: authError, user } = await verifyToken(req);
  if (authError) return authError;

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonResponse({ error: "Could not load applications." }, 500);
  }

  return jsonResponse({ applications: data ?? [] });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

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

  switch (body?.action) {
    case "add":
      return await handleAdd(req, body);
    case "load":
      return await handleLoad(req);
    default:
      return jsonResponse({ error: "Unknown action. Must be 'add' or 'load'." }, 400);
  }
});