"use client";

import { useMemo, useState } from "react";

import { MaterialCard } from "@/components/material-card";
import { UploadMaterialDialog } from "@/components/upload-material-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MATERIAL_TAG_LABELS,
  MATERIAL_TAGS,
  type MaterialTag,
  type WorkspaceMaterialWithAuthor,
} from "@/lib/types/workspace-materials";

const FILTER_ALL = "__all__";

type Props = {
  workspaceSlug: string;
  initialMaterials: WorkspaceMaterialWithAuthor[];
};

export function MaterialsList({ workspaceSlug, initialMaterials }: Props) {
  const [materials, setMaterials] =
    useState<WorkspaceMaterialWithAuthor[]>(initialMaterials);
  const [filterTag, setFilterTag] = useState<string>(FILTER_ALL);
  const [uploadOpen, setUploadOpen] = useState(false);

  const filtered = useMemo(() => {
    if (filterTag === FILTER_ALL) return materials;
    return materials.filter((m) => m.tag === filterTag);
  }, [materials, filterTag]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="notion-page-title">Материалы</h1>
          <p className="notion-page-subtitle">
            Загрузите материалы клиента один раз и используйте в любом проекте
          </p>
        </div>
        <Button type="button" onClick={() => setUploadOpen(true)}>
          Загрузить материал
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="material-filter-tag">Фильтр по тегу</Label>
        <Select
          value={filterTag}
          onValueChange={(v) => setFilterTag(v ?? FILTER_ALL)}
        >
          <SelectTrigger id="material-filter-tag" className="w-full">
            <SelectValue>
              {filterTag === FILTER_ALL
                ? "Все"
                : MATERIAL_TAG_LABELS[filterTag as MaterialTag]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Все</SelectItem>
            {MATERIAL_TAGS.map((t) => (
              <SelectItem key={t} value={t}>
                {MATERIAL_TAG_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div
          className={
            filterTag === FILTER_ALL
              ? "rounded-xl border border-violet-100 bg-white px-6 py-14 text-center shadow-sm"
              : "rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-6 py-12 text-center text-sm text-muted-foreground"
          }
        >
          {filterTag === FILTER_ALL ? (
            <div className="mx-auto max-w-md space-y-3">
              <p className="text-base font-medium text-foreground">
                Пока нет материалов
              </p>
              <p className="text-sm text-muted-foreground">
                Загрузите брифы, отзывы, тексты или CSV — они появятся здесь и
                будут доступны во всех проектах workspace.
              </p>
              <Button
                type="button"
                className="mt-2"
                onClick={() => setUploadOpen(true)}
              >
                Загрузить первый материал
              </Button>
            </div>
          ) : (
            <p>По этому фильтру материалов нет</p>
          )}
        </div>
      ) : (
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <li key={m.id} className="min-w-0">
              <MaterialCard
                material={m}
                workspaceSlug={workspaceSlug}
                onRemoved={(id) =>
                  setMaterials((prev) => prev.filter((x) => x.id !== id))
                }
              />
            </li>
          ))}
        </ul>
      )}

      <UploadMaterialDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        workspaceSlug={workspaceSlug}
        onUploaded={(m) => setMaterials((prev) => [m, ...prev])}
      />
    </div>
  );
}
