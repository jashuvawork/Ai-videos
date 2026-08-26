import { prisma } from "@/lib/db";

export class CostTrackingService {
  async track(params: {
    projectId: string;
    category: string;
    provider?: string;
    operation: string;
    amount: number;
    units?: number;
    metadata?: Record<string, unknown>;
  }) {
    await prisma.costEntry.create({
      data: {
        projectId: params.projectId,
        category: params.category,
        provider: params.provider,
        operation: params.operation,
        amount: params.amount,
        units: params.units,
        metadata: (params.metadata ?? undefined) as object | undefined,
      },
    });

    const total = await prisma.costEntry.aggregate({
      where: { projectId: params.projectId },
      _sum: { amount: true },
    });

    await prisma.project.update({
      where: { id: params.projectId },
      data: { actualCost: total._sum.amount || 0 },
    });
  }

  async estimate(projectId: string): Promise<number> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return 0;

    const sceneCount = await prisma.scene.count({ where: { projectId } });
    const duration = project.duration;
    const mode = project.generationMode;

    let estimate = 0.05; // base LLM
    estimate += sceneCount * 0.02; // images
    estimate += sceneCount * 0.005; // voice
    estimate += 0.03; // music
    estimate += 0.01; // rendering

    if (mode === "CINEMATIC") {
      estimate += sceneCount * 0.15; // video clips
      estimate *= 1.5;
    }

    if (duration > 60) estimate *= 1.3;

    await prisma.project.update({
      where: { id: projectId },
      data: { estimatedCost: Math.round(estimate * 100) / 100 },
    });

    return estimate;
  }

  async getProjectCost(projectId: string) {
    const entries = await prisma.costEntry.findMany({ where: { projectId } });
    const total = entries.reduce((sum, e) => sum + e.amount, 0);
    return { entries, total };
  }
}
