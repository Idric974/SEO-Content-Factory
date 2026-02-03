import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/clients/:id
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: { projects: { orderBy: { updatedAt: "desc" } } },
  });

  if (!client) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  return NextResponse.json(client);
}

// PUT /api/clients/:id
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const { name, slug, persona, brandGuidelines } = body;

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  if (slug && slug !== existing.slug) {
    const slugTaken = await prisma.client.findUnique({ where: { slug } });
    if (slugTaken) {
      return NextResponse.json(
        { error: "Ce slug est déjà utilisé" },
        { status: 409 }
      );
    }
  }

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(persona !== undefined && { persona }),
      ...(brandGuidelines !== undefined && { brandGuidelines }),
    },
  });

  return NextResponse.json(client);
}

// DELETE /api/clients/:id
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
