import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

// GET /api/costs - Récupère les statistiques de coûts API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const period = searchParams.get("period") ?? "all"; // all, 7d, 30d

  // Filtre par période
  let dateFilter: Date | undefined;
  if (period === "7d") {
    dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "30d") {
    dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (dateFilter) where.createdAt = { gte: dateFilter };

  // Récupérer tous les logs
  const logs = await prisma.apiUsageLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { project: { select: { title: true, keyword: true } } },
  });

  // Agrégations
  const totalCost = logs.reduce(
    (sum, log) => sum + Number(log.costUsd),
    0
  );
  const totalInputTokens = logs.reduce(
    (sum, log) => sum + (log.inputTokens ?? 0),
    0
  );
  const totalOutputTokens = logs.reduce(
    (sum, log) => sum + (log.outputTokens ?? 0),
    0
  );

  // Par provider
  const byProvider: Record<string, { count: number; cost: number }> = {};
  for (const log of logs) {
    if (!byProvider[log.provider]) {
      byProvider[log.provider] = { count: 0, cost: 0 };
    }
    byProvider[log.provider].count++;
    byProvider[log.provider].cost += Number(log.costUsd);
  }

  // Par modèle
  const byModel: Record<string, { count: number; cost: number; inputTokens: number; outputTokens: number }> = {};
  for (const log of logs) {
    if (!byModel[log.model]) {
      byModel[log.model] = { count: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
    }
    byModel[log.model].count++;
    byModel[log.model].cost += Number(log.costUsd);
    byModel[log.model].inputTokens += log.inputTokens ?? 0;
    byModel[log.model].outputTokens += log.outputTokens ?? 0;
  }

  // Par projet
  const byProject: Record<string, { title: string; count: number; cost: number }> = {};
  for (const log of logs) {
    if (!log.projectId) continue;
    if (!byProject[log.projectId]) {
      byProject[log.projectId] = {
        title: log.project?.title ?? "Sans titre",
        count: 0,
        cost: 0,
      };
    }
    byProject[log.projectId].count++;
    byProject[log.projectId].cost += Number(log.costUsd);
  }

  // Par jour (7 derniers jours)
  const dailyCosts: { date: string; cost: number; count: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    const dateStr = day.toISOString().split("T")[0];
    const dayLogs = logs.filter(
      (log) => log.createdAt.toISOString().split("T")[0] === dateStr
    );
    dailyCosts.push({
      date: dateStr,
      cost: dayLogs.reduce((sum, log) => sum + Number(log.costUsd), 0),
      count: dayLogs.length,
    });
  }

  return NextResponse.json({
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    totalRequests: logs.length,
    byProvider,
    byModel,
    byProject,
    dailyCosts,
    recentLogs: logs.slice(0, 50),
  });
}
