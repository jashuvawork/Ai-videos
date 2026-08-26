/**
 * End-to-end pipeline test: Input → Project → Script → Scenes → Assets → Render → MP4
 * Run with: npx tsx tests/e2e-pipeline.test.ts
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { VideoGenerationProcessor } from "@/jobs/video-generation-job";
import { getOrCreateDevUser } from "@/lib/auth";
import { access } from "fs/promises";

async function main() {
  console.log("Starting E2E pipeline test...\n");

  const user = await getOrCreateDevUser();
  const idea = "A boy discovers a secret room beneath his house.";

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      idea,
      videoType: "STORY",
      platform: "INSTAGRAM_REEL",
      aspectRatio: "RATIO_9_16",
      duration: 30,
      visualStyle: "CINEMATIC",
      voice: "MALE",
      language: "en",
      generationMode: "FAST",
      status: "DRAFT",
    },
  });

  console.log(`Created project: ${project.id}`);

  const job = await prisma.generationJob.create({
    data: {
      projectId: project.id,
      type: "VIDEO_GENERATION",
      status: "PENDING",
      step: "CREATE_SCRIPT",
    },
  });

  const processor = new VideoGenerationProcessor();
  await processor.process(job.id, project.id);

  const result = await prisma.project.findUnique({
    where: { id: project.id },
    include: {
      scenes: true,
      renders: true,
      socialMetadata: true,
    },
  });

  if (!result) throw new Error("Project not found after generation");

  console.log("\n--- Results ---");
  console.log(`Status: ${result.status}`);
  console.log(`Title: ${result.title}`);
  console.log(`Scenes: ${result.scenes.length}`);
  console.log(`Renders: ${result.renders.length}`);
  console.log(`Has metadata: ${result.socialMetadata ? "yes" : "no"}`);

  const assertions = [
    { check: result.status === "COMPLETED", msg: "Project completed" },
    { check: result.title !== null, msg: "Title generated" },
    { check: result.scenes.length >= 3, msg: "Scenes created" },
    { check: result.renders.length > 0, msg: "Render created" },
    { check: result.finalVideoUrl !== null, msg: "Final video URL set" },
    { check: result.socialMetadata !== null, msg: "Social metadata generated" },
  ];

  let passed = 0;
  for (const a of assertions) {
    const status = a.check ? "PASS" : "FAIL";
    console.log(`[${status}] ${a.msg}`);
    if (a.check) passed++;
  }

  const render = result.renders[0];
  if (render?.localPath) {
    try {
      await access(render.localPath);
      console.log("[PASS] MP4 file exists on disk");
      passed++;
    } catch {
      console.log("[FAIL] MP4 file not found on disk");
    }
  }

  console.log(`\n${passed}/${assertions.length + 1} checks passed`);

  if (passed < assertions.length) {
    process.exit(1);
  }

  console.log("\nE2E pipeline test completed successfully!");
}

main().catch((err) => {
  console.error("E2E test failed:", err);
  process.exit(1);
});
