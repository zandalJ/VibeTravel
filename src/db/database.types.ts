export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      generation_logs: {
        Row: {
          completion_tokens: number | null;
          created_at: string;
          error_code: string | null;
          error_message: string | null;
          id: string;
          note_id: string | null;
          plan_id: string | null;
          prompt_tokens: number | null;
          status: string;
          user_id: string;
        };
        Insert: {
          completion_tokens?: number | null;
          created_at?: string;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          note_id?: string | null;
          plan_id?: string | null;
          prompt_tokens?: number | null;
          status: string;
          user_id: string;
        };
        Update: {
          completion_tokens?: number | null;
          created_at?: string;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          note_id?: string | null;
          plan_id?: string | null;
          prompt_tokens?: number | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generation_logs_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generation_logs_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          additional_notes: string | null;
          created_at: string;
          destination: string;
          end_date: string;
          id: string;
          start_date: string;
          total_budget: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          additional_notes?: string | null;
          created_at?: string;
          destination: string;
          end_date: string;
          id?: string;
          start_date: string;
          total_budget?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          additional_notes?: string | null;
          created_at?: string;
          destination?: string;
          end_date?: string;
          id?: string;
          start_date?: string;
          total_budget?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          content: string;
          created_at: string;
          feedback: number | null;
          id: string;
          note_id: string;
          prompt_text: string;
          prompt_version: string;
          updated_at: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          feedback?: number | null;
          id?: string;
          note_id: string;
          prompt_text: string;
          prompt_version?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          feedback?: number | null;
          id?: string;
          note_id?: string;
          prompt_text?: string;
          prompt_version?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plans_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          daily_budget: number | null;
          generation_count: number;
          generation_limit_reset_at: string;
          id: string;
          interests: string[];
          other_interests: string | null;
          travel_style: Database["public"]["Enums"]["travel_style_enum"];
          typical_trip_duration: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          daily_budget?: number | null;
          generation_count?: number;
          generation_limit_reset_at?: string;
          id: string;
          interests?: string[];
          other_interests?: string | null;
          travel_style: Database["public"]["Enums"]["travel_style_enum"];
          typical_trip_duration?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          daily_budget?: number | null;
          generation_count?: number;
          generation_limit_reset_at?: string;
          id?: string;
          interests?: string[];
          other_interests?: string | null;
          travel_style?: Database["public"]["Enums"]["travel_style_enum"];
          typical_trip_duration?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      generation_status_enum: "pending" | "processing" | "completed" | "failed";
      travel_style_enum:
        | "budget"
        | "backpacking"
        | "comfort"
        | "luxury"
        | "adventure"
        | "cultural"
        | "relaxation"
        | "family"
        | "solo";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      generation_status_enum: ["pending", "processing", "completed", "failed"],
      travel_style_enum: [
        "budget",
        "backpacking",
        "comfort",
        "luxury",
        "adventure",
        "cultural",
        "relaxation",
        "family",
        "solo",
      ],
    },
  },
} as const;
