import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ProjectTextsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Тексты</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Сгенерированные рекламные тексты появятся здесь.
        </p>
      </div>
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Раздел в разработке</CardTitle>
          <CardDescription>
            Экспорт и редактура вариантов объявлений — на следующих этапах.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
