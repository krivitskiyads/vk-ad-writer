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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="notion-page-title">Проекты</h1>
          <p className="notion-page-subtitle">
            Рекламные тексты для ВКонтакте по вашим брифам
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-[1.38rem] font-bold tracking-[-0.02em]">
            Список проектов
          </CardTitle>
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
