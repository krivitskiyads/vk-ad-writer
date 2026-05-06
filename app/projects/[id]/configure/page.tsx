export default async function ProjectConfigurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: _id } = await params;
  return (
    <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
      <p>Вкладка «Настройка» — в разработке (этап R5)</p>
    </div>
  );
}

