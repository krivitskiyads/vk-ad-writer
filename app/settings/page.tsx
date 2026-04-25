import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="notion-page-title">Настройки</h1>
        <p className="notion-page-subtitle">
          Параметры приложения и интеграций
        </p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-[1.38rem] font-bold tracking-[-0.02em]">
            Раздел в разработке
          </CardTitle>
          <CardDescription>
            Здесь появятся настройки аккаунта и API.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
