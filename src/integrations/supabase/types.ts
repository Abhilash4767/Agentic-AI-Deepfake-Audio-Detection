export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      analyses: {
        Row: {
          analysis_ref: string;
          audio_path: string | null;
          confidence: number;
          created_at: string;
          duration_sec: number;
          file_name: string;
          id: string;
          model: string;
          payload: Json;
          sample_rate: number;
          size_kb: number;
          source: string;
          summary: string;
          updated_at: string;
          user_id: string;
          verdict: string;
        };
        Insert: {
          analysis_ref: string;
          audio_path?: string | null;
          confidence?: number;
          created_at?: string;
          duration_sec?: number;
          file_name: string;
          id?: string;
          model?: string;
          payload?: Json;
          sample_rate?: number;
          size_kb?: number;
          source?: string;
          summary?: string;
          updated_at?: string;
          user_id: string;
          verdict: string;
        };
        Update: {
          analysis_ref?: string;
          audio_path?: string | null;
          confidence?: number;
          created_at?: string;
          duration_sec?: number;
          file_name?: string;
          id?: string;
          model?: string;
          payload?: Json;
          sample_rate?: number;
          size_kb?: number;
          source?: string;
          summary?: string;
          updated_at?: string;
          user_id?: string;
          verdict?: string;
        };
        Relationships: [];
      };
      model_settings: {
        Row: {
          created_at: string;
          inference_url: string | null;
          model_name: string;
          retention_days: number;
          threshold_fake: number;
          threshold_review: number;
          training_url: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          inference_url?: string | null;
          model_name?: string;
          retention_days?: number;
          threshold_fake?: number;
          threshold_review?: number;
          training_url?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          inference_url?: string | null;
          model_name?: string;
          retention_days?: number;
          threshold_fake?: number;
          threshold_review?: number;
          training_url?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      training_runs: {
        Row: {
          accuracy: number | null;
          completed_at: string | null;
          created_at: string;
          dataset_size: number;
          endpoint_url: string | null;
          epochs: number;
          external_job_id: string | null;
          id: string;
          loss: number | null;
          message: string | null;
          metrics: Json;
          name: string;
          started_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
          val_accuracy: number | null;
        };
        Insert: {
          accuracy?: number | null;
          completed_at?: string | null;
          created_at?: string;
          dataset_size?: number;
          endpoint_url?: string | null;
          epochs?: number;
          external_job_id?: string | null;
          id?: string;
          loss?: number | null;
          message?: string | null;
          metrics?: Json;
          name: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
          val_accuracy?: number | null;
        };
        Update: {
          accuracy?: number | null;
          completed_at?: string | null;
          created_at?: string;
          dataset_size?: number;
          endpoint_url?: string | null;
          epochs?: number;
          external_job_id?: string | null;
          id?: string;
          loss?: number | null;
          message?: string | null;
          metrics?: Json;
          name?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          val_accuracy?: number | null;
        };
        Relationships: [];
      };
      training_samples: {
        Row: {
          created_at: string;
          duration_sec: number | null;
          file_name: string;
          id: string;
          label: string;
          notes: string | null;
          size_kb: number;
          storage_path: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          duration_sec?: number | null;
          file_name: string;
          id?: string;
          label: string;
          notes?: string | null;
          size_kb?: number;
          storage_path: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          duration_sec?: number | null;
          file_name?: string;
          id?: string;
          label?: string;
          notes?: string | null;
          size_kb?: number;
          storage_path?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
