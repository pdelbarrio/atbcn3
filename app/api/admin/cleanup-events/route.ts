import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const adminToken = process.env.ADMIN_CLEANUP_TOKEN;

export async function POST(request: Request) {
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Supabase settings are missing on the server" },
      { status: 500 }
    );
  }

  if (!adminToken) {
    return NextResponse.json(
      { error: "Admin cleanup token is not configured" },
      { status: 500 }
    );
  }

  const requestToken = request.headers.get("x-admin-cleanup-token");
  if (!requestToken || requestToken !== adminToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);

  // Eliminamos eventos de ayer y anteriores.
  const cutoff = new Date(startToday);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

 const { error, count } = await supabase
  .from("events")
  .delete({ count: "exact" })
  .lt("date", cutoff.toISOString());

  if (error) {
    console.error("Error al eliminar eventos pasados:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
  message: "Eventos pasados eliminados",
  deleted: count ?? 0
});
}
