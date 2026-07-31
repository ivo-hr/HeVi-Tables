export const POINT_SYSTEMS = ["WtA", "Pod", "EC"] as const;

export type PointSystem = (typeof POINT_SYSTEMS)[number];

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Table = {
  id: string;
  name: string;
  creator_id: string;
  point_system: PointSystem;
  max_point: number;
  design_url: string | null;
  closed: boolean;
  closed_date: string | null;
  created_at: string;
  updated_at: string;
};

export type TableRow = {
  id: string;
  table_id: string;
  user_ids: string[];
  notes: string | null;
  points_receivable: number | null;
  position: number | null;
  points_won: number;
  created_at: string;
  updated_at: string;
};

export type LeaderboardEntry = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  points: number;
  tables_count: number;
};

export type ActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const INITIAL_ACTION_RESULT: ActionResult = { ok: false };

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      perfiles: {
        Row: Profile;
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      tablas: {
        Row: Table;
        Insert: {
          id?: string;
          name: string;
          creator_id: string;
          point_system: PointSystem;
          max_point: number;
          design_url?: string | null;
          closed?: boolean;
          closed_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Table, "id" | "creator_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "tablas_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "perfiles";
            referencedColumns: ["id"];
          }
        ];
      };
      tabla_filas: {
        Row: TableRow;
        Insert: {
          id?: string;
          table_id: string;
          user_ids: string[];
          notes?: string | null;
          points_receivable?: number | null;
          position?: number | null;
          points_won?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Pick<
            TableRow,
            "user_ids" | "notes" | "points_receivable" | "position" | "updated_at"
          >
        >;
        Relationships: [
          {
            foreignKeyName: "tabla_filas_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tablas";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      close_table: {
        Args: { p_table_id: string };
        Returns: undefined;
      };
      get_leaderboard: {
        Args: { p_period?: string; p_table_id?: string | null };
        Returns: LeaderboardEntry[];
      };
      healthcheck: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      point_system: PointSystem;
    };
    CompositeTypes: Record<string, never>;
  };
};
