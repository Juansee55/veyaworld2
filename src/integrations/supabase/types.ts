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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alliance_chat_messages: {
        Row: {
          body: string
          created_at: string
          deleted: boolean
          gang_id: string
          id: string
          tag: string | null
          user_id: string
          username: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted?: boolean
          gang_id: string
          id?: string
          tag?: string | null
          user_id: string
          username: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted?: boolean
          gang_id?: string
          id?: string
          tag?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "alliance_chat_messages_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      autumn_inventory: {
        Row: {
          bags: number
          last_push_at: string | null
          user_id: string
        }
        Insert: {
          bags?: number
          last_push_at?: string | null
          user_id: string
        }
        Update: {
          bags?: number
          last_push_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autumn_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      autumn_rewards: {
        Row: {
          qty: number
          reward_id: string
          user_id: string
        }
        Insert: {
          qty?: number
          reward_id: string
          user_id: string
        }
        Update: {
          qty?: number
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autumn_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      autumn_trees: {
        Row: {
          id: string
          map_id: string
          x: number
          y: number
        }
        Insert: {
          id: string
          map_id: string
          x: number
          y: number
        }
        Update: {
          id?: string
          map_id?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      base_captures: {
        Row: {
          base_id: string
          captured_at: string
          from_gang_id: string | null
          id: string
          to_gang_id: string
        }
        Insert: {
          base_id: string
          captured_at?: string
          from_gang_id?: string | null
          id?: string
          to_gang_id: string
        }
        Update: {
          base_id?: string
          captured_at?: string
          from_gang_id?: string | null
          id?: string
          to_gang_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_captures_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
        ]
      }
      base_rooms: {
        Row: {
          base_id: string
          map_id: string
          name: string
          room_key: string
          room_type: string
        }
        Insert: {
          base_id: string
          map_id: string
          name: string
          room_key: string
          room_type: string
        }
        Update: {
          base_id?: string
          map_id?: string
          name?: string
          room_key?: string
          room_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "base_rooms_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
        ]
      }
      bases: {
        Row: {
          armory_map: string
          attacker_gang_id: string | null
          captured_at: string | null
          hp: number
          id: string
          last_award_at: string
          last_tick_at: string
          max_hp: number
          name: string
          owner_gang_id: string | null
          rack_weapon: string
          respawn_map: string
          respawn_x: number
          respawn_y: number
          status: string
          theme: string
          zone_map: string
          zone_r: number
          zone_x: number
          zone_y: number
        }
        Insert: {
          armory_map: string
          attacker_gang_id?: string | null
          captured_at?: string | null
          hp?: number
          id: string
          last_award_at?: string
          last_tick_at?: string
          max_hp?: number
          name: string
          owner_gang_id?: string | null
          rack_weapon: string
          respawn_map: string
          respawn_x: number
          respawn_y: number
          status?: string
          theme: string
          zone_map: string
          zone_r: number
          zone_x: number
          zone_y: number
        }
        Update: {
          armory_map?: string
          attacker_gang_id?: string | null
          captured_at?: string | null
          hp?: number
          id?: string
          last_award_at?: string
          last_tick_at?: string
          max_hp?: number
          name?: string
          owner_gang_id?: string | null
          rack_weapon?: string
          respawn_map?: string
          respawn_x?: number
          respawn_y?: number
          status?: string
          theme?: string
          zone_map?: string
          zone_r?: number
          zone_x?: number
          zone_y?: number
        }
        Relationships: [
          {
            foreignKeyName: "bases_owner_gang_id_fkey"
            columns: ["owner_gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_state: {
        Row: {
          last_at: string
          muted_until: string | null
          user_id: string
          window_count: number
          window_start: string
        }
        Insert: {
          last_at?: string
          muted_until?: string | null
          user_id: string
          window_count?: number
          window_start?: string
        }
        Update: {
          last_at?: string
          muted_until?: string | null
          user_id?: string
          window_count?: number
          window_start?: string
        }
        Relationships: []
      }
      game_config: {
        Row: {
          key: string
          num: number | null
          txt: string | null
        }
        Insert: {
          key: string
          num?: number | null
          txt?: string | null
        }
        Update: {
          key?: string
          num?: number | null
          txt?: string | null
        }
        Relationships: []
      }
      gang_alliances: {
        Row: {
          created_at: string
          gang_a: string
          gang_b: string
          id: string
          requested_by: string
          status: string
        }
        Insert: {
          created_at?: string
          gang_a: string
          gang_b: string
          id?: string
          requested_by: string
          status?: string
        }
        Update: {
          created_at?: string
          gang_a?: string
          gang_b?: string
          id?: string
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gang_alliances_gang_a_fkey"
            columns: ["gang_a"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gang_alliances_gang_b_fkey"
            columns: ["gang_b"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      gang_chat_messages: {
        Row: {
          body: string
          created_at: string
          deleted: boolean
          gang_id: string
          id: string
          tag: string | null
          user_id: string
          username: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted?: boolean
          gang_id: string
          id?: string
          tag?: string | null
          user_id: string
          username: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted?: boolean
          gang_id?: string
          id?: string
          tag?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "gang_chat_messages_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      gang_daily_hours: {
        Row: {
          day: string
          gang_id: string
          hours: number
        }
        Insert: {
          day: string
          gang_id: string
          hours?: number
        }
        Update: {
          day?: string
          gang_id?: string
          hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "gang_daily_hours_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      gang_invitations: {
        Row: {
          created_at: string
          gang_id: string
          id: string
          invited_by: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gang_id: string
          id?: string
          invited_by: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gang_id?: string
          id?: string
          invited_by?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gang_invitations_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      gang_members: {
        Row: {
          gang_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          gang_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          gang_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gang_members_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: false
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      gang_total_hours: {
        Row: {
          gang_id: string
          hours: number
        }
        Insert: {
          gang_id: string
          hours?: number
        }
        Update: {
          gang_id?: string
          hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "gang_total_hours_gang_id_fkey"
            columns: ["gang_id"]
            isOneToOne: true
            referencedRelation: "gangs"
            referencedColumns: ["id"]
          },
        ]
      }
      gangs: {
        Row: {
          color: string
          created_at: string
          emblem: string
          id: string
          leader_id: string
          name: string
          preferred_base_id: string | null
          tag: string
        }
        Insert: {
          color?: string
          created_at?: string
          emblem?: string
          id?: string
          leader_id: string
          name: string
          preferred_base_id?: string | null
          tag: string
        }
        Update: {
          color?: string
          created_at?: string
          emblem?: string
          id?: string
          leader_id?: string
          name?: string
          preferred_base_id?: string | null
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "gangs_pref_base_fk"
            columns: ["preferred_base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
        ]
      }
      global_chat_messages: {
        Row: {
          body: string
          created_at: string
          deleted: boolean
          id: string
          tag: string | null
          user_id: string
          username: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted?: boolean
          id?: string
          tag?: string | null
          user_id: string
          username: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted?: boolean
          id?: string
          tag?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          amount: number
          category: string
          description: string
          effect: string
          id: string
          name: string
        }
        Insert: {
          amount: number
          category: string
          description: string
          effect: string
          id: string
          name: string
        }
        Update: {
          amount?: number
          category?: string
          description?: string
          effect?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      player_admin: {
        Row: {
          fly: boolean
          invisible: boolean
          noclip: boolean
          size: number
          speed: number
          title: string | null
          title_color: string
          updated_at: string
          user_id: string
        }
        Insert: {
          fly?: boolean
          invisible?: boolean
          noclip?: boolean
          size?: number
          speed?: number
          title?: string | null
          title_color?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          fly?: boolean
          invisible?: boolean
          noclip?: boolean
          size?: number
          speed?: number
          title?: string | null
          title_color?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_art: {
        Row: {
          created_at: string
          frame_ms: number
          frames: number
          id: string
          kind: string
          name: string
          original_path: string
          sheet_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          frame_ms?: number
          frames?: number
          id?: string
          kind: string
          name: string
          original_path: string
          sheet_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          frame_ms?: number
          frames?: number
          id?: string
          kind?: string
          name?: string
          original_path?: string
          sheet_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_art_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_combat: {
        Row: {
          deaths: number
          hp: number
          kills: number
          last_attack_at: string
          last_supply_at: string
          max_hp: number
          protected_until: string
          respawn_map: string | null
          respawn_seq: number
          respawn_x: number | null
          respawn_y: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          deaths?: number
          hp?: number
          kills?: number
          last_attack_at?: string
          last_supply_at?: string
          max_hp?: number
          protected_until?: string
          respawn_map?: string | null
          respawn_seq?: number
          respawn_x?: number | null
          respawn_y?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          deaths?: number
          hp?: number
          kills?: number
          last_attack_at?: string
          last_supply_at?: string
          max_hp?: number
          protected_until?: string
          respawn_map?: string | null
          respawn_seq?: number
          respawn_x?: number | null
          respawn_y?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_firearms: {
        Row: {
          gun_id: string
          last_shot_at: string
          reload_until: string
          rounds: number
          user_id: string
        }
        Insert: {
          gun_id?: string
          last_shot_at?: string
          reload_until?: string
          rounds?: number
          user_id: string
        }
        Update: {
          gun_id?: string
          last_shot_at?: string
          reload_until?: string
          rounds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_firearms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_inventory: {
        Row: {
          equipped: boolean
          item_id: string
          qty: number
          user_id: string
        }
        Insert: {
          equipped?: boolean
          item_id: string
          qty?: number
          user_id: string
        }
        Update: {
          equipped?: boolean
          item_id?: string
          qty?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      player_positions: {
        Row: {
          map_id: string
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          map_id: string
          updated_at?: string
          user_id: string
          x: number
          y: number
        }
        Update: {
          map_id?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      player_respawns: {
        Row: {
          base_id: string | null
          created_at: string
          id: string
          killer_id: string | null
          map_id: string
          seq: number
          user_id: string
          x: number
          y: number
        }
        Insert: {
          base_id?: string | null
          created_at?: string
          id?: string
          killer_id?: string | null
          map_id: string
          seq: number
          user_id: string
          x: number
          y: number
        }
        Update: {
          base_id?: string | null
          created_at?: string
          id?: string
          killer_id?: string | null
          map_id?: string
          seq?: number
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_respawns_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
        ]
      }
      player_wallets: {
        Row: {
          gralats: number
          user_id: string
        }
        Insert: {
          gralats?: number
          user_id: string
        }
        Update: {
          gralats?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_weapons: {
        Row: {
          acquired_at: string
          equipped: boolean
          user_id: string
          weapon_id: string
        }
        Insert: {
          acquired_at?: string
          equipped?: boolean
          user_id: string
          weapon_id: string
        }
        Update: {
          acquired_at?: string
          equipped?: boolean
          user_id?: string
          weapon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_weapons_weapon_id_fkey"
            columns: ["weapon_id"]
            isOneToOne: false
            referencedRelation: "weapons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          animation_state: string
          body_id: string
          facing_direction: string
          hat_id: string
          head_id: string
          id: string
          map_id: string
          melee_id: string
          pos_x: number
          pos_y: number
          status_text: string
          updated_at: string
          username: string
        }
        Insert: {
          animation_state?: string
          body_id?: string
          facing_direction?: string
          hat_id?: string
          head_id?: string
          id: string
          map_id?: string
          melee_id?: string
          pos_x?: number
          pos_y?: number
          status_text?: string
          updated_at?: string
          username?: string
        }
        Update: {
          animation_state?: string
          body_id?: string
          facing_direction?: string
          hat_id?: string
          head_id?: string
          id?: string
          map_id?: string
          melee_id?: string
          pos_x?: number
          pos_y?: number
          status_text?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      tick_state: {
        Row: {
          id: number
          last_tick_at: string
        }
        Insert: {
          id: number
          last_tick_at?: string
        }
        Update: {
          id?: number
          last_tick_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weapons: {
        Row: {
          cooldown_ms: number
          damage: number
          id: string
          name: string
          range_px: number
          weapon_type: string
        }
        Insert: {
          cooldown_ms: number
          damage: number
          id: string
          name: string
          range_px: number
          weapon_type: string
        }
        Update: {
          cooldown_ms?: number
          damage?: number
          id?: string
          name?: string
          range_px?: number
          weapon_type?: string
        }
        Relationships: []
      }
      world_assets: {
        Row: {
          created_at: string
          height: number
          id: string
          kind: string
          name: string
          path: string
          width: number
        }
        Insert: {
          created_at?: string
          height: number
          id?: string
          kind: string
          name: string
          path: string
          width: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          kind?: string
          name?: string
          path?: string
          width?: number
        }
        Relationships: []
      }
      world_furniture: {
        Row: {
          asset_id: string | null
          created_at: string
          h: number
          id: string
          name: string
          solid: boolean[]
          tiles: number[]
          w: number
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          h: number
          id?: string
          name: string
          solid: boolean[]
          tiles: number[]
          w: number
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          h?: number
          id?: string
          name?: string
          solid?: boolean[]
          tiles?: number[]
          w?: number
        }
        Relationships: [
          {
            foreignKeyName: "world_furniture_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "world_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      world_maps: {
        Row: {
          created_at: string
          ground_tile: number
          height: number
          id: string
          name: string
          spawn_x: number
          spawn_y: number
          width: number
        }
        Insert: {
          created_at?: string
          ground_tile?: number
          height?: number
          id: string
          name: string
          spawn_x?: number
          spawn_y?: number
          width?: number
        }
        Update: {
          created_at?: string
          ground_tile?: number
          height?: number
          id?: string
          name?: string
          spawn_x?: number
          spawn_y?: number
          width?: number
        }
        Relationships: []
      }
      world_news: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          image_path: string | null
          title: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          image_path?: string | null
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          image_path?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_news_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      world_npcs: {
        Row: {
          body_id: string
          dialog: string
          dir: string
          hat_id: string
          head_id: string
          id: string
          map_id: string
          name: string
          x: number
          y: number
        }
        Insert: {
          body_id?: string
          dialog?: string
          dir?: string
          hat_id?: string
          head_id?: string
          id?: string
          map_id: string
          name?: string
          x: number
          y: number
        }
        Update: {
          body_id?: string
          dialog?: string
          dir?: string
          hat_id?: string
          head_id?: string
          id?: string
          map_id?: string
          name?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      world_props: {
        Row: {
          display_h: number | null
          display_w: number | null
          furniture_id: string
          id: string
          map_id: string
          x: number
          y: number
        }
        Insert: {
          display_h?: number | null
          display_w?: number | null
          furniture_id: string
          id?: string
          map_id: string
          x: number
          y: number
        }
        Update: {
          display_h?: number | null
          display_w?: number | null
          furniture_id?: string
          id?: string
          map_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "world_props_furniture_id_fkey"
            columns: ["furniture_id"]
            isOneToOne: false
            referencedRelation: "world_furniture"
            referencedColumns: ["id"]
          },
        ]
      }
      world_tiles: {
        Row: {
          asset_id: string | null
          layer: string
          map_id: string
          solid: boolean
          tile: number
          x: number
          y: number
        }
        Insert: {
          asset_id?: string | null
          layer: string
          map_id: string
          solid?: boolean
          tile?: number
          x: number
          y: number
        }
        Update: {
          asset_id?: string | null
          layer?: string
          map_id?: string
          solid?: boolean
          tile?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "world_tiles_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "world_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      world_warps: {
        Row: {
          h: number
          id: string
          map_id: string
          to_map: string
          to_x: number
          to_y: number
          w: number
          x: number
          y: number
        }
        Insert: {
          h?: number
          id?: string
          map_id: string
          to_map: string
          to_x: number
          to_y: number
          w?: number
          x: number
          y: number
        }
        Update: {
          h?: number
          id?: string
          map_id?: string
          to_map?: string
          to_x?: number
          to_y?: number
          w?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_ally_count: { Args: { _g: string }; Returns: number }
      admin_drag_player: {
        Args: { _map: string; _user: string; _x: number; _y: number }
        Returns: undefined
      }
      am_admin: { Args: never; Returns: boolean }
      are_allied: { Args: { _a: string; _b: string }; Returns: boolean }
      award_gralats: {
        Args: { _amount: number; _user: string }
        Returns: undefined
      }
      award_hours: {
        Args: { _amount: number; _gang: string }
        Returns: undefined
      }
      base_tick: { Args: never; Returns: undefined }
      cancel_invitation: { Args: { _id: string }; Returns: undefined }
      cfg: { Args: { _key: string }; Returns: number }
      cfg_text: { Args: { _key: string }; Returns: string }
      claim_armory: { Args: never; Returns: string }
      claim_supplies: { Args: never; Returns: undefined }
      create_gang: {
        Args: { _color: string; _emblem: string; _name: string; _tag: string }
        Returns: string
      }
      delete_chat: {
        Args: { _channel: string; _id: string }
        Returns: undefined
      }
      disband_gang: { Args: never; Returns: undefined }
      ensure_firearms: { Args: never; Returns: undefined }
      ensure_player: { Args: never; Returns: undefined }
      equip_firearm: { Args: { _gun: string }; Returns: undefined }
      equip_weapon: { Args: { _weapon: string }; Returns: undefined }
      game_today: { Args: never; Returns: string }
      gang_of: { Args: { _user_id: string }; Returns: string }
      gang_role_of: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_csv_records: {
        Args: { _files: Json; _new_user_ids?: string[]; _replace?: boolean }
        Returns: Json
      }
      invite_player: { Args: { _username: string }; Returns: undefined }
      kick_member: { Args: { _user: string }; Returns: undefined }
      leave_gang: { Args: never; Returns: undefined }
      list_admins: {
        Args: never
        Returns: {
          user_id: string
          username: string
        }[]
      }
      mute_user: {
        Args: { _minutes: number; _user: string }
        Returns: undefined
      }
      open_autumn_bag: { Args: never; Returns: Json }
      push_autumn_tree: { Args: { _aim: string; _tree: string }; Returns: Json }
      reload_firearm: { Args: never; Returns: undefined }
      remove_alliance: { Args: { _id: string }; Returns: undefined }
      report_state: {
        Args: { _map: string; _x: number; _y: number }
        Returns: boolean
      }
      request_alliance: { Args: { _tag: string }; Returns: undefined }
      require_staff: { Args: never; Returns: string }
      require_uid: { Args: never; Returns: string }
      resolve_attack: {
        Args: { _attacker: string; _target: string }
        Returns: Json
      }
      resolve_firearm_shot: {
        Args: { _aim: string; _attacker: string; _target: string }
        Returns: Json
      }
      respawn_point: {
        Args: { _user: string }
        Returns: Record<string, unknown>
      }
      respond_alliance: {
        Args: { _accept: boolean; _id: string }
        Returns: undefined
      }
      respond_invitation: {
        Args: { _accept: boolean; _id: string }
        Returns: undefined
      }
      send_chat: {
        Args: { _body: string; _channel: string }
        Returns: undefined
      }
      set_admin_fx: {
        Args: {
          _fly: boolean
          _invisible: boolean
          _noclip: boolean
          _size: number
          _speed: number
          _title: string
          _title_color: string
        }
        Returns: undefined
      }
      set_admin_role: {
        Args: { _on: boolean; _username: string }
        Returns: undefined
      }
      set_equipment: {
        Args: { _item: string; _on: boolean }
        Returns: undefined
      }
      set_member_role: {
        Args: { _role: string; _user: string }
        Returns: undefined
      }
      set_preferred_base: { Args: { _base: string }; Returns: undefined }
      transfer_leadership: { Args: { _user: string }; Returns: undefined }
      use_item: { Args: { _item: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
