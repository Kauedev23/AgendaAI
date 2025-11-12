export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          barbearia_id: string
          barbeiro_id: string
          cliente_id: string
          created_at: string | null
          data: string
          hora: string
          id: string
          observacoes: string | null
          servico_id: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string | null
        }
        Insert: {
          barbearia_id: string
          barbeiro_id: string
          cliente_id: string
          created_at?: string | null
          data: string
          hora: string
          id?: string
          observacoes?: string | null
          servico_id: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
        }
        Update: {
          barbearia_id?: string
          barbeiro_id?: string
          cliente_id?: string
          created_at?: string | null
          data?: string
          hora?: string
          id?: string
          observacoes?: string | null
          servico_id?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_barbeiro_id_fkey"
            columns: ["barbeiro_id"]
            isOneToOne: false
            referencedRelation: "barbeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      barbearias: {
        Row: {
          admin_id: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string | null
          descricao: string | null
          dias_funcionamento: string[] | null
          endereco: string | null
          facebook: string | null
          horario_abertura: string | null
          horario_fechamento: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          nome: string
          slug: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          admin_id?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          descricao?: string | null
          dias_funcionamento?: string[] | null
          endereco?: string | null
          facebook?: string | null
          horario_abertura?: string | null
          horario_fechamento?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          nome: string
          slug: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_id?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          descricao?: string | null
          dias_funcionamento?: string[] | null
          endereco?: string | null
          facebook?: string | null
          horario_abertura?: string | null
          horario_fechamento?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          nome?: string
          slug?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      barbeiros: {
        Row: {
          ativo: boolean | null
          barbearia_id: string
          bio: string | null
          created_at: string | null
          especialidades: string[] | null
          foto_url: string | null
          id: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          barbearia_id: string
          bio?: string | null
          created_at?: string | null
          especialidades?: string[] | null
          foto_url?: string | null
          id?: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          barbearia_id?: string
          bio?: string | null
          created_at?: string | null
          especialidades?: string[] | null
          foto_url?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbeiros_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbeiros_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          barbearia_id: string | null
          created_at: string | null
          email: string
          id: string
          nome: string
          telefone: string | null
          tipo: Database["public"]["Enums"]["user_type"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          barbearia_id?: string | null
          created_at?: string | null
          email: string
          id: string
          nome: string
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["user_type"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          barbearia_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["user_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearias"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean | null
          barbearia_id: string
          created_at: string | null
          descricao: string | null
          duracao: number
          id: string
          nome: string
          preco: number
        }
        Insert: {
          ativo?: boolean | null
          barbearia_id: string
          created_at?: string | null
          descricao?: string | null
          duracao: number
          id?: string
          nome: string
          preco: number
        }
        Update: {
          ativo?: boolean | null
          barbearia_id?: string
          created_at?: string | null
          descricao?: string | null
          duracao?: number
          id?: string
          nome?: string
          preco?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicos_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearias"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes: {
        Row: {
          agendamento_id: string | null
          barbearia_id: string
          created_at: string | null
          data: string | null
          descricao: string | null
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          agendamento_id?: string | null
          barbearia_id: string
          created_at?: string | null
          data?: string | null
          descricao?: string | null
          id?: string
          tipo: string
          valor: number
        }
        Update: {
          agendamento_id?: string | null
          barbearia_id?: string
          created_at?: string | null
          data?: string | null
          descricao?: string | null
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "barbeiro" | "cliente"
      appointment_status: "pendente" | "confirmado" | "cancelado" | "concluido"
      user_type: "admin" | "barbeiro" | "cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "barbeiro", "cliente"],
      appointment_status: ["pendente", "confirmado", "cancelado", "concluido"],
      user_type: ["admin", "barbeiro", "cliente"],
    },
  },
} as const
