export default async function ProjectUploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: _id } = await params;
  return (
    <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
      <p>Вкладка «Загрузка» — в разработке (этап R4)</p>
    </div>
  );
}

