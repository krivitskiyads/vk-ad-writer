import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ProjectConfigurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Настройка генерации
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Здесь будут параметры генерации текстов. Этап в разработке.
        </p>
      </div>
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Скоро</CardTitle>
          <CardDescription>
            Выбор тона, количества вариантов и ограничений по символам.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
