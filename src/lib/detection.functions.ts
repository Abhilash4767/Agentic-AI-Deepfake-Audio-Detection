import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeFile, type Analysis } from "@/lib/analysis";

export const runAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileName: string; sizeBytes: number; audioPath: string | null }) => {
    if (!input?.fileName) throw new Error("fileName is required");
    return {
      fileName: String(input.fileName).slice(0, 200),
      sizeBytes: Number(input.sizeBytes) || 0,
      audioPath: input.audioPath ?? null,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: settings } = await supabase
      .from("model_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const thresholdFake = Number(settings?.threshold_fake ?? 0.62);
    const thresholdReview = Number(settings?.threshold_review ?? 0.42);
    const inferenceUrl = settings?.inference_url ?? null;

    let analysis: Analysis;
    let warning: string | null = null;

    if (inferenceUrl && data.audioPath) {
      try {
        const { callInference } = await import("@/lib/detection.server");
        const { data: signed } = await supabase.storage
          .from("audio-samples")
          .createSignedUrl(data.audioPath, 3600);
        const result = await callInference(inferenceUrl, {
          audio_url: signed?.signedUrl,
          file_name: data.fileName,
        });
        analysis = analyzeFile(
          { name: data.fileName, size: data.sizeBytes },
          {
            probability: Math.min(1, Math.max(0, result.probability)),
            model: result.model ?? settings?.model_name ?? "external-model",
            source: "external",
            ...(result.durationSec !== undefined ? { durationSec: result.durationSec } : {}),
            ...(result.sampleRate !== undefined ? { sampleRate: result.sampleRate } : {}),
            thresholdFake,
            thresholdReview,
            audioPath: data.audioPath,
          },
        );
      } catch (err) {
        warning = err instanceof Error ? err.message : "External model call failed";
        analysis = analyzeFile(
          { name: data.fileName, size: data.sizeBytes },
          { thresholdFake, thresholdReview, audioPath: data.audioPath },
        );
      }
    } else {
      analysis = analyzeFile(
        { name: data.fileName, size: data.sizeBytes },
        { thresholdFake, thresholdReview, audioPath: data.audioPath },
      );
    }

    const { data: row, error } = await supabase
      .from("analyses")
      .insert({
        user_id: userId,
        analysis_ref: analysis.id,
        file_name: analysis.fileName,
        size_kb: analysis.sizeKb,
        duration_sec: analysis.durationSec,
        sample_rate: analysis.sampleRate,
        model: analysis.model,
        source: analysis.source,
        verdict: analysis.verdict,
        confidence: analysis.confidence,
        summary: analysis.summary,
        audio_path: analysis.audioPath ?? null,
        payload: analysis as unknown as never,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    return { analysis: { ...analysis, recordId: row.id }, warning };
  });

export const startTrainingRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; epochs: number }) => ({
    name: String(input?.name ?? "training-run").slice(0, 120),
    epochs: Math.min(500, Math.max(1, Number(input?.epochs) || 10)),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: settings } = await supabase
      .from("model_settings")
      .select("training_url")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: samples } = await supabase
      .from("training_samples")
      .select("storage_path, label, file_name")
      .eq("user_id", userId);

    const dataset = samples ?? [];
    if (dataset.length === 0) throw new Error("Add labelled training samples first.");

    let jobId: string | null = null;
    let status = "queued";
    let message: string | null =
      "No training service URL configured — the dataset is staged and waiting.";

    if (settings?.training_url) {
      const { callTraining } = await import("@/lib/detection.server");
      const signed = await Promise.all(
        dataset.map(async (s) => {
          const { data: url } = await supabase.storage
            .from("training-audio")
            .createSignedUrl(s.storage_path, 60 * 60 * 6);
          return { label: s.label, file_name: s.file_name, audio_url: url?.signedUrl };
        }),
      );
      const res = await callTraining(settings.training_url, {
        name: data.name,
        epochs: data.epochs,
        samples: signed,
      });
      jobId = res.jobId;
      status = res.status === "queued" ? "queued" : "running";
      message = res.message ?? "Job submitted to the external training service.";
    }

    const { error } = await supabase.from("training_runs").insert({
      user_id: userId,
      name: data.name,
      epochs: data.epochs,
      dataset_size: dataset.length,
      status,
      external_job_id: jobId,
      endpoint_url: settings?.training_url ?? null,
      message,
      started_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    return { status, jobId, message, datasetSize: dataset.length };
  });

export const syncTrainingRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: run } = await supabase
      .from("training_runs")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!run) throw new Error("Training run not found.");
    if (!run.endpoint_url || !run.external_job_id) {
      return { status: run.status, message: "This run has no external job to poll." };
    }

    const { pollTraining } = await import("@/lib/detection.server");
    const remote = await pollTraining(run.endpoint_url, run.external_job_id);
    const status = String(remote["status"] ?? run.status);

    await supabase
      .from("training_runs")
      .update({
        status: ["queued", "running", "completed", "failed", "cancelled"].includes(status)
          ? status
          : run.status,
        accuracy: (remote["accuracy"] as number) ?? run.accuracy,
        val_accuracy: (remote["val_accuracy"] as number) ?? run.val_accuracy,
        loss: (remote["loss"] as number) ?? run.loss,
        metrics: (remote["metrics"] as never) ?? run.metrics,
        message: (remote["message"] as string) ?? run.message,
        completed_at:
          status === "completed" || status === "failed" ? new Date().toISOString() : null,
      })
      .eq("id", run.id);

    return { status, message: (remote["message"] as string) ?? null };
  });
