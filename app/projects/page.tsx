import { CreateProjectDialog } from "@/components/create-project-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Проекты</h1>
          <p className="text-muted-foreground text-sm">
            Рекламные тексты для ВКонтакте по вашим брифам
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Список проектов</CardTitle>
          <CardDescription>
            Проекты хранят брифы и сгенерированные объявления
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-12 text-center text-sm">
            Пока нет проектов. Нажмите «Создать проект», чтобы начать.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
