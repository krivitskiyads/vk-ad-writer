import { redirect } from "next/navigation";

import { listProjects } from "@/lib/supabase/queries";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const projects = await listProjects(user.id);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-6">Проекты</h1>

      {projects.length === 0 ? (
        <p className="text-muted-foreground">У вас пока нет проектов.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.project_id} className="border rounded-lg p-4">
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-muted-foreground">
                {p.campaign_count} кампаний · {p.request_count} запросов
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 text-sm text-muted-foreground">
        Создание новых проектов и кампаний — в разработке (этап 3).
      </div>
    </div>
  );
}
