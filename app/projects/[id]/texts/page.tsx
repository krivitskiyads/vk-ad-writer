export default async function ProjectTextsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: _id } = await params;
  return (
    <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
      <p>Вкладка «Тексты» — в разработке (этап R6)</p>
    </div>
  );
}

