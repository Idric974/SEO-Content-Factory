import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

// GET /api/clients - Liste tous les clients
export async function GET() {
  const clients = await prisma.client.findMany({
    include: { _count: { select: { projects: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(clients);
}

// POST /api/clients - Crée un nouveau client
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, slug, persona, brandGuidelines } = body;

  if (!name || !slug) {
    return NextResponse.json(
      { error: "Le nom et le slug sont requis" },
      { status: 400 }
    );
  }

  const existing = await prisma.client.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "Ce slug est déjà utilisé" },
      { status: 409 }
    );
  }

  const client = await prisma.client.create({
    data: {
      name,
      slug,
      persona: persona ?? null,
      brandGuidelines: brandGuidelines ?? null,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
