export default async function ProjectAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: _id } = await params;
  return (
    <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
      <p>Вкладка «Анализ» — в разработке (этап R5)</p>
    </div>
  );
}

