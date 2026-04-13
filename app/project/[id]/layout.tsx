import { ProjectStepper } from "@/components/project-stepper";

export default async function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <ProjectStepper />
      {children}
    </div>
  );
}
