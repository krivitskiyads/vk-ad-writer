import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Файл не передан" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Динамический импорт чтобы не тянуть в клиентский бандл
    const pdfParse = (await import("pdf-parse-new")).default;
    const result = await pdfParse(buffer);

    return NextResponse.json({ text: result.text.trim() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не удалось прочитать PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
