import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_ALLOW_HEADERS = "authorization, x-client-info, apikey, content-type";
const CORS_ALLOW_METHODS = "POST, OPTIONS";

/** Origens permitidas (lista separada por vírgulas), ex.: https://app.exemplo.com,http://localhost:5173 */
function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get("ADMIN_PROVISION_ALLOWED_ORIGINS") ?? "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function buildCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowed = parseAllowedOrigins();
  const base: Record<string, string> = {
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
  };
  if (origin && allowed.includes(origin)) {
    return { ...base, "Access-Control-Allow-Origin": origin };
  }
  return base;
}

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) {
    return true;
  }
  return parseAllowedOrigins().includes(origin);
}

type ScopeType = "franchise" | "regional" | "network";

interface ProvisionUserPayload {
  email: string;
  fullName: string;
  password?: string | null;
  roleCode: string;
  scopeType: ScopeType;
  franchiseId?: string | null;
  regionalId?: string | null;
  status?: "active" | "inactive" | "invited";
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error("Supabase environment variables are not configured for the function.");
}

function jsonResponse(request: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(request),
      "Content-Type": "application/json",
    },
  });
}

function normalizePayload(payload: ProvisionUserPayload) {
  return {
    email: payload.email.trim().toLowerCase(),
    fullName: payload.fullName.trim(),
    password: payload.password?.trim() || null,
    roleCode: payload.roleCode.trim(),
    scopeType: payload.scopeType,
    franchiseId: payload.franchiseId ?? null,
    regionalId: payload.regionalId ?? null,
    status: payload.status ?? "active",
  };
}

async function findAuthUserIdByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  let page = 1;

  while (page <= 5) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const foundUser = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    if (foundUser) {
      return foundUser.id;
    }

    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    if (!originAllowed(request)) {
      return new Response(JSON.stringify({ error: "Origin not allowed." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("ok", { headers: buildCorsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, 405, { error: "Method not allowed." });
  }

  if (!originAllowed(request)) {
    return jsonResponse(request, 403, { error: "Origin not allowed." });
  }

  const authorization = request.headers.get("Authorization");

  if (!authorization) {
    return jsonResponse(request, 401, { error: "Missing authorization header." });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const [{ data: authUserData, error: authUserError }, { data: isAdmin, error: adminCheckError }] =
    await Promise.all([
      userClient.auth.getUser(),
      userClient.rpc("is_admin"),
    ]);

  if (authUserError || !authUserData.user) {
    return jsonResponse(request, 401, { error: "Authenticated user not found." });
  }

  if (adminCheckError || !isAdmin) {
    return jsonResponse(request, 403, { error: "Only administrators can provision users." });
  }

  let payload: ProvisionUserPayload;

  try {
    payload = normalizePayload(await request.json());
  } catch {
    return jsonResponse(request, 400, { error: "Invalid request body." });
  }

  if (!payload.email || !payload.fullName || !payload.roleCode || !payload.scopeType) {
    return jsonResponse(request, 400, {
      error: "Email, nome completo, papel e escopo sao obrigatorios.",
    });
  }

  try {
    let profileId: string | null = null;
    let created = false;
    let invited = false;

    const { data: existingProfile, error: profileLookupError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", payload.email)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    profileId = existingProfile?.id ?? null;

    if (!profileId) {
      if (payload.password) {
        const { data, error } = await adminClient.auth.admin.createUser({
          email: payload.email,
          password: payload.password,
          email_confirm: true,
          user_metadata: {
            full_name: payload.fullName,
          },
        });

        if (error) {
          throw error;
        }

        profileId = data.user.id;
        created = true;
      } else {
        const { data, error } = await adminClient.auth.admin.inviteUserByEmail(payload.email, {
          data: {
            full_name: payload.fullName,
          },
        });

        if (error) {
          throw error;
        }

        profileId = data.user?.id ?? null;
        invited = true;
      }
    } else if (payload.password) {
      const { error } = await adminClient.auth.admin.updateUserById(profileId, {
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          full_name: payload.fullName,
        },
      });

      if (error) {
        throw error;
      }
    }

    if (!profileId) {
      profileId = await findAuthUserIdByEmail(adminClient, payload.email);
    }

    if (!profileId) {
      throw new Error("Nao foi possivel resolver o usuario no Auth.");
    }

    const { error: ensureProfileError } = await adminClient.from("profiles").upsert(
      {
        id: profileId,
        email: payload.email,
        full_name: payload.fullName,
        status: payload.status,
      },
      {
        onConflict: "id",
      },
    );

    if (ensureProfileError) {
      throw ensureProfileError;
    }

    const { data: accessResult, error: accessError } = await userClient.rpc(
      "fn_admin_upsert_user_access",
      {
        p_profile_id: profileId,
        p_full_name: payload.fullName,
        p_status: payload.status,
        p_role_code: payload.roleCode,
        p_scope_type: payload.scopeType,
        p_franchise_id: payload.franchiseId,
        p_regional_id: payload.regionalId,
      },
    );

    if (accessError) {
      throw accessError;
    }

    return jsonResponse(request, 200, {
      ok: true,
      created,
      invited,
      profileId,
      access: accessResult,
      message: created
        ? "Usuario criado e acesso liberado."
        : invited
          ? "Convite enviado e acesso configurado."
          : "Acesso atualizado com sucesso.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";

    return jsonResponse(request, 400, { error: message });
  }
});
