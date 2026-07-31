export const POINT_SYSTEMS = ["WtA", "Pod", "EC"] as const;
export const ENTRY_INFO_FORMATS = ["text", "number"] as const;
export const NUMBER_SORT_ORDERS = ["asc", "desc"] as const;

export type PointSystem = (typeof POINT_SYSTEMS)[number];
export type EntryInfoFormat = (typeof ENTRY_INFO_FORMATS)[number];
export type NumberSortOrder = (typeof NUMBER_SORT_ORDERS)[number];

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  theme_preference: ThemePreference;
  accent_color: AccentColor;
  created_at: string;
  updated_at: string;
};

export type ThemePreference = "light" | "dark" | "system";
export type AccentColor = "emerald" | "blue" | "violet" | "orange" | "rose";

export type GroupRole = "owner" | "member";

export type Group = {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
};

export type Table = {
  id: string;
  name: string;
  creator_id: string;
  group_id: string;
  point_system: PointSystem;
  max_point: number;
  design_url: string | null;
  description: string | null;
  info_format: EntryInfoFormat;
  number_sort_order: NumberSortOrder | null;
  scheduled_close_date: string | null;
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
  numeric_value: number | null;
  evidence_paths: string[];
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

export type NotificationKind =
  | "group_member_joined"
  | "table_created"
  | "table_row_created"
  | "table_closed";

export type Notification = {
  id: string;
  user_id: string;
  kind: NotificationKind;
  group_id: string | null;
  table_id: string | null;
  actor_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type PushSubscriptionRecord = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
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
          theme_preference?: ThemePreference;
          accent_color?: AccentColor;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          avatar_url?: string | null;
          theme_preference?: ThemePreference;
          accent_color?: AccentColor;
          updated_at?: string;
        };
        Relationships: [];
      };
      grupos: {
        Row: Group;
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          invite_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          invite_code?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grupos_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "perfiles";
            referencedColumns: ["id"];
          }
        ];
      };
      grupo_miembros: {
        Row: GroupMember;
        Insert: {
          group_id: string;
          user_id: string;
          role?: GroupRole;
          joined_at?: string;
        };
        Update: {
          role?: GroupRole;
        };
        Relationships: [
          {
            foreignKeyName: "grupo_miembros_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grupo_miembros_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "perfiles";
            referencedColumns: ["id"];
          }
        ];
      };
      tablas: {
        Row: Table;
        Insert: {
          id?: string;
          name: string;
          creator_id: string;
          group_id: string;
          point_system: PointSystem;
          max_point: number;
          design_url?: string | null;
          description?: string | null;
          info_format?: EntryInfoFormat;
          number_sort_order?: NumberSortOrder | null;
          scheduled_close_date?: string | null;
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
          },
          {
            foreignKeyName: "tablas_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
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
          numeric_value?: number | null;
          evidence_paths?: string[];
          points_receivable?: number | null;
          position?: number | null;
          points_won?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Pick<
            TableRow,
            | "user_ids"
            | "notes"
            | "numeric_value"
            | "evidence_paths"
            | "points_receivable"
            | "position"
            | "updated_at"
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
      notificaciones: {
        Row: Notification;
        Insert: {
          id?: string;
          user_id: string;
          kind: NotificationKind;
          group_id?: string | null;
          table_id?: string | null;
          actor_id?: string | null;
          title: string;
          body: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notificaciones_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "perfiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificaciones_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificaciones_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tablas";
            referencedColumns: ["id"];
          }
        ];
      };
      push_subscriptions: {
        Row: PushSubscriptionRecord;
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Pick<PushSubscriptionRecord, "p256dh" | "auth" | "user_agent" | "updated_at">
        >;
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "perfiles";
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
      create_group: {
        Args: { p_name: string };
        Returns: string;
      };
      join_group_by_code: {
        Args: { p_code: string };
        Returns: string;
      };
      rotate_group_invite_code: {
        Args: { p_group_id: string };
        Returns: string;
      };
      update_table_settings: {
        Args: {
          p_table_id: string;
          p_design_url: string | null;
          p_scheduled_close_date: string | null;
          p_description: string | null;
          p_info_format: EntryInfoFormat;
          p_number_sort_order: NumberSortOrder | null;
        };
        Returns: undefined;
      };
      get_group_leaderboard: {
        Args: {
          p_group_id: string;
          p_period?: string;
          p_table_id?: string | null;
        };
        Returns: LeaderboardEntry[];
      };
      healthcheck: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      group_role: GroupRole;
      notification_kind: NotificationKind;
      point_system: PointSystem;
      entry_info_format: EntryInfoFormat;
      number_sort_order: NumberSortOrder;
    };
    CompositeTypes: Record<string, never>;
  };
};
