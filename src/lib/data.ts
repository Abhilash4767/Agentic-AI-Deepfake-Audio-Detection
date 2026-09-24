import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Analysis } from "@/lib/analysis";

export interface TrainingSample {
  id: string;
  file_name: string;
  label: "real" | "fake";
  storage_path: string;
  size_kb: number;
  duration_sec: number | null;
  notes: string | null;
  created_at: string;
}

export interface TrainingRun {
  id: string;
  name: string;
  status: string;
  epochs: number;
  dataset_size: number;
  accuracy: number | null;
  val_accuracy: number | null;
  loss: number | null;
  external_job_id: string | null;
  message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ModelSettings {
  inference_url: string | null;
  training_url: string | null;
  model_name: string;
  threshold_fake: number;
  threshold_review: number;
  retention_days: number;
}

export function rowToAnalysis(row: Record<string, unknown>): Analysis {
  const payload = (row["payload"] ?? {}) as Partial<Analysis>;
  return {
    ...(payload as Analysis),
    recordId: row["id"] as string,
    id: (row["analysis_ref"] as string) ?? payload.id ?? "",
    fileName: (row["file_name"] as string) ?? payload.fileName ?? "",
    createdAt: (row["created_at"] as string) ?? payload.createdAt ?? new Date().toISOString(),
    verdict: (row["verdict"] as Analysis["verdict"]) ?? payload.verdict ?? "authentic",
    confidence: Number(row["confidence"] ?? payload.confidence ?? 0),
    audioPath: (row["audio_path"] as string | null) ?? null,
  };
}

/* ---------------- analyses ---------------- */

export function useAnalyses() {
  return useQuery({
    queryKey: ["analyses"],
    queryFn: async (): Promise<Analysis[]> => {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r) => rowToAnalysis(r as Record<string, unknown>));
    },
  });
}

export function useDeleteAllAnalyses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase.from("analyses").delete().eq("user_id", auth.user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analyses"] }),
  });
}

/* ---------------- settings ---------------- */

const DEFAULT_SETTINGS: ModelSettings = {
  inference_url: null,
  training_url: null,
  model_name: "AgenticXAI-Voice v2.4 (simulated ensemble)",
  threshold_fake: 0.62,
  threshold_review: 0.42,
  retention_days: 90,
};

export function useModelSettings() {
  return useQuery({
    queryKey: ["model_settings"],
    queryFn: async (): Promise<ModelSettings> => {
      const { data, error } = await supabase.from("model_settings").select("*").maybeSingle();
      if (error) throw error;
      return data ? ({ ...DEFAULT_SETTINGS, ...data } as ModelSettings) : DEFAULT_SETTINGS;
    },
  });
}

export function useSaveModelSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<ModelSettings>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("model_settings")
        .upsert({ user_id: auth.user.id, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["model_settings"] }),
  });
}

/* ---------------- training ---------------- */

export function useTrainingSamples() {
  return useQuery({
    queryKey: ["training_samples"],
    queryFn: async (): Promise<TrainingSample[]> => {
      const { data, error } = await supabase
        .from("training_samples")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(11500);
      if (error) throw error;
      return (data ?? []) as unknown as TrainingSample[];
    },
  });
}

export function useTrainingRuns() {
  return useQuery({
    queryKey: ["training_runs"],
    queryFn: async (): Promise<TrainingRun[]> => {
      const { data, error } = await supabase
        .from("training_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as TrainingRun[];
    },
  });
}

export async function uploadToBucket(bucket: string, file: File) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const safe = file.name.replace(/[^\w.-]+/g, "_");
  const path = `${auth.user.id}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export function useAddTrainingSample() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, label }: { file: File; label: "real" | "fake" }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const path = await uploadToBucket("training-audio", file);
      const { error } = await supabase.from("training_samples").insert({
        user_id: auth.user.id,
        file_name: file.name,
        label,
        storage_path: path,
        size_kb: Math.max(1, Math.round(file.size / 1024)),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training_samples"] }),
  });
}

export function useDeleteTrainingSample() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sample: TrainingSample) => {
      await supabase.storage.from("training-audio").remove([sample.storage_path]);
      const { error } = await supabase.from("training_samples").delete().eq("id", sample.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training_samples"] }),
  });
}
