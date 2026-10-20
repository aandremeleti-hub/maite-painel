export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          id: string
          owner_id: string
          name: string
          hourly_rate: number
          requires_invoice: boolean | null
          status: 'active' | 'inactive' | null
          notes: string | null
          first_lesson_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          hourly_rate: number
          requires_invoice?: boolean | null
          status?: 'active' | 'inactive' | null
          notes?: string | null
          first_lesson_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          hourly_rate?: number
          requires_invoice?: boolean | null
          status?: 'active' | 'inactive' | null
          notes?: string | null
          first_lesson_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      lessons: {
        Row: {
          id: string
          student_id: string
          owner_id: string
          lesson_date: string
          category: 'standard' | 'extended' | 'absence' | 'cancelled' | 'courtesy'
          multiplier: number
          charge_absence: boolean | null
          content_notes: string | null
          hourly_rate_snapshot: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          owner_id: string
          lesson_date: string
          category: 'standard' | 'extended' | 'absence' | 'cancelled' | 'courtesy'
          multiplier: number
          charge_absence?: boolean | null
          content_notes?: string | null
          hourly_rate_snapshot?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          owner_id?: string
          lesson_date?: string
          category?: 'standard' | 'extended' | 'absence' | 'cancelled' | 'courtesy'
          multiplier?: number
          charge_absence?: boolean | null
          content_notes?: string | null
          hourly_rate_snapshot?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          }
        ]
      }
      monthly_closings: {
        Row: {
          id: string
          owner_id: string
          year: number
          month: number
          total_lessons_count: number | null
          total_revenue: number | null
          status: 'open' | 'closed' | null
          closed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          year: number
          month: number
          total_lessons_count?: number | null
          total_revenue?: number | null
          status?: 'open' | 'closed' | null
          closed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          year?: number
          month?: number
          total_lessons_count?: number | null
          total_revenue?: number | null
          status?: 'open' | 'closed' | null
          closed_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_closings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_info: {
        Row: {
          id: string
          owner_id: string
          pix_key: string
          pix_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null
          bank_name: string | null
          account_holder: string | null
          is_default: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          pix_key: string
          pix_type?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null
          bank_name?: string | null
          account_holder?: string | null
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          pix_key?: string
          pix_type?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null
          bank_name?: string | null
          account_holder?: string | null
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_info_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_calculate_monthly_totals: {
        Args: {
          p_owner_id: string
          p_year: number
          p_month: number
        }
        Returns: {
          total_lessons: number
          total_revenue: number
        }[]
      }
      fn_get_student_monthly_detail: {
        Args: {
          p_student_id: string
          p_year: number
          p_month: number
        }
        Returns: {
          lesson_date: string
          category: string
          multiplier: number
          content_notes: string | null
          hourly_rate_snapshot: number
          lesson_value: number
        }[]
      }
      fn_close_month: {
        Args: {
          p_owner_id: string
          p_year: number
          p_month: number
        }
        Returns: undefined
      }
      fn_reopen_month: {
        Args: {
          p_year: number
          p_month: number
        }
        Returns: undefined
      }
      fn_calculate_student_monthly_revenue: {
        Args: {
          p_student_id: string
          p_year: number
          p_month: number
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
