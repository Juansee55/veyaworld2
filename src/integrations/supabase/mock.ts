import type { SupabaseClient } from "@supabase/supabase-js";
import { BASES, captureZone, roomMapId } from "@/game/bases/defs";
import type { Database } from "./types";

type Row = Record<string, unknown>;
type AuthEvent = "INITIAL_SESSION" | "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED" | "PASSWORD_RECOVERY";

export interface MockUser {
  id: string;
  email: string;
  email_confirmed_at: string;
  user_metadata: Record<string, unknown>;
}

export interface MockSession {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: MockUser;
}

const SESSION_KEY = "veya_mock_session_v1";
const DB_KEY = "veya_mock_db_v1";
const DEFAULT_USER_ID = "11111111-1111-4111-8111-111111111111";

function nowIso(): string {
  return new Date().toISOString();
}

function deterministicUuid(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  const a = hex(h1);
  const b = hex(h2);
  const c = hex(h1 ^ h2);
  return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-8${c.slice(1, 4)}-${c}${a.slice(0, 4)}`;
}

function createSeedTables(): Record<string, Row[]> {
  const now = nowIso();
  return {
    profiles: [],
    player_combat: [],
    player_firearms: [],
    player_wallets: [],
    player_positions: [],
    player_weapons: [],
    player_inventory: [],
    player_art: [],
    player_admin: [],
    autumn_inventory: [],
    autumn_rewards: [],
    autumn_trees: [
      { id: "tree_plaza_nw", map_id: "village", x: 56 * 16 + 8, y: 35 * 16 + 8 },
      { id: "tree_plaza_ne", map_id: "village", x: 87 * 16 + 8, y: 36 * 16 + 8 },
      { id: "tree_plaza_n", map_id: "village", x: 61 * 16 + 8, y: 26 * 16 + 8 },
      { id: "tree_plaza_s", map_id: "village", x: 81 * 16 + 8, y: 49 * 16 + 8 },
    ],
    bases: BASES.map((b) => {
      const zone = captureZone(b);
      const armory = b.rooms.find((r) => r.type === "armory") ?? b.rooms[0]!;
      const respawn = b.rooms.find((r) => r.type === "respawn") ?? b.rooms[0]!;
      return {
        id: b.id,
        name: b.name,
        theme: b.theme,
        status: "neutral",
        hp: 100,
        max_hp: 100,
        owner_gang_id: null,
        attacker_gang_id: null,
        captured_at: null,
        last_award_at: now,
        last_tick_at: now,
        rack_weapon: b.rackWeapon,
        armory_map: roomMapId(b.id, armory.key),
        respawn_map: roomMapId(b.id, respawn.key),
        respawn_x: Math.floor(respawn.w / 2) * 16 + 8,
        respawn_y: Math.floor(respawn.h / 2) * 16 + 8,
        zone_map: zone.mapId,
        zone_x: zone.x,
        zone_y: zone.y,
        zone_r: zone.radius,
      };
    }),
    weapons: [
      { id: "fists", name: "Fists", damage: 8, cooldown_ms: 350, range_px: 26, price: 0, melee_skin: "melee_none" },
      { id: "violet_knife", name: "Violet Knife", damage: 14, cooldown_ms: 300, range_px: 30, price: 50, melee_skin: "melee_violet_knife" },
      { id: "jade_kunai", name: "Jade Kunai", damage: 18, cooldown_ms: 280, range_px: 32, price: 120, melee_skin: "melee_jade_kunai" },
      { id: "moon_staff", name: "Moon Staff", damage: 22, cooldown_ms: 360, range_px: 38, price: 220, melee_skin: "melee_moon_staff" },
      { id: "void_blade", name: "Void Blade", damage: 28, cooldown_ms: 320, range_px: 36, price: 400, melee_skin: "melee_void_blade" },
    ],
    items: [
      { id: "potion_small", name: "Herb Potion", kind: "heal", heal: 35, price: 25, description: "Restores 35 HP." },
      { id: "apple_cider", name: "Autumn Cider", kind: "heal", heal: 60, price: 50, description: "Warm seasonal brew." },
    ],
    gangs: [],
    gang_members: [],
    gang_alliances: [],
    gang_invitations: [],
    gang_daily_hours: [],
    gang_total_hours: [],
    global_chat_messages: [
      { id: "welcome-1", user_id: DEFAULT_USER_ID, username: "Guide", body: "Welcome to Veya World! Move with WASD/arrows or the joystick, Space to attack.", tag: "SYS", deleted: false, created_at: now },
    ],
    gang_chat_messages: [],
    alliance_chat_messages: [],
    world_news: [
      { id: "news-1", author_id: DEFAULT_USER_ID, title: "Welcome to Veya World", body: "Explore the village plaza, customize your character in the Wardrobe, and capture gang bases across the map.", image_path: null, created_at: now },
    ],
    world_maps: [],
    world_tiles: [],
    world_warps: [],
    world_npcs: [],
    world_props: [],
    world_furniture: [],
    world_assets: [],
  };
}

const STORAGE_KEY = "veya_mock_storage_v1";
let memoryTables: Record<string, Row[]> | null = null;
let lastDbRaw: string | null | undefined = undefined;
let memorySession: MockSession | null = null;
const storageBlobs = new Map<string, Blob>();
const authListeners = new Set<(event: AuthEvent, session: MockSession | null) => void>();

function loadPersistedStorage(): Record<string, { type: string; data: string }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, { type: string; data: string }>) : {};
  } catch {
    return {};
  }
}

async function persistBlob(path: string, blob: Blob) {
  if (typeof window === "undefined" || blob.size > 512 * 1024) return;
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    const store = loadPersistedStorage();
    store[path] = { type: blob.type || "image/png", data: btoa(binary) };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage quota errors
  }
}

function readPersistedBlob(path: string): Blob | null {
  const entry = loadPersistedStorage()[path];
  if (!entry) return null;
  try {
    const binary = atob(entry.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: entry.type });
    storageBlobs.set(path, blob);
    return blob;
  } catch {
    return null;
  }
}

function deletePersistedBlobs(paths: string[]) {
  if (typeof window === "undefined") return;
  try {
    const store = loadPersistedStorage();
    for (const p of paths) delete store[p];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

function loadTables(): Record<string, Row[]> {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(DB_KEY);
      if (memoryTables && raw === lastDbRaw) return memoryTables;
      lastDbRaw = raw;
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, Row[]>;
        memoryTables = { ...createSeedTables(), ...parsed };
        return memoryTables;
      }
      memoryTables = createSeedTables();
      return memoryTables;
    } catch {
      // ignore storage errors
    }
  }
  if (!memoryTables) memoryTables = createSeedTables();
  return memoryTables;
}

function saveTables(tables: Record<string, Row[]>) {
  memoryTables = tables;
  if (typeof window !== "undefined") {
    try {
      const raw = JSON.stringify(tables);
      lastDbRaw = raw;
      window.localStorage.setItem(DB_KEY, raw);
    } catch {
      // ignore storage quota errors
    }
  }
}

function getTable(tables: Record<string, Row[]>, name: string): Row[] {
  if (!tables[name]) {
    tables[name] = [];
  }
  return tables[name]!;
}

function loadSession(): MockSession | null {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) {
        memorySession = JSON.parse(raw) as MockSession;
        return memorySession;
      }
    } catch {
      // ignore
    }
  }
  return memorySession;
}

function persistSession(session: MockSession | null) {
  memorySession = session;
  if (typeof window !== "undefined") {
    try {
      if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }
}

function emitAuth(event: AuthEvent, session: MockSession | null) {
  for (const listener of authListeners) {
    try {
      listener(event, session);
    } catch {
      // ignore listener errors
    }
  }
}

function ensurePlayerRows(userId: string, username: string) {
  const tables = loadTables();
  const now = nowIso();
  const profiles = getTable(tables, "profiles");
  if (!profiles.some((p) => p["id"] === userId)) {
    profiles.push({
      id: userId,
      username: username.slice(0, 16) || "Traveler",
      body_id: "body_tunic_blue",
      head_id: "head_light",
      hat_id: "hat_none",
      melee_id: "melee_none",
      map_id: "village",
      pos_x: 1184,
      pos_y: 624,
      facing_direction: "down",
      status_text: "",
      updated_at: now,
    });
  }
  const combat = getTable(tables, "player_combat");
  if (!combat.some((c) => c["user_id"] === userId)) {
    combat.push({
      user_id: userId,
      hp: 100,
      max_hp: 100,
      kills: 0,
      deaths: 0,
      protected_until: now,
      respawn_seq: 0,
      respawn_map: null,
      respawn_x: null,
      respawn_y: null,
    });
  }
  const firearms = getTable(tables, "player_firearms");
  if (!firearms.some((f) => f["user_id"] === userId)) {
    firearms.push({ user_id: userId, gun_id: "fists", rounds: 12, max_rounds: 12 });
  }
  const wallets = getTable(tables, "player_wallets");
  if (!wallets.some((w) => w["user_id"] === userId)) {
    wallets.push({ user_id: userId, gralats: 100 });
  }
  const autumnInv = getTable(tables, "autumn_inventory");
  if (!autumnInv.some((a) => a["user_id"] === userId)) {
    autumnInv.push({ user_id: userId, bags: 1, last_push_at: null });
  }
  const positions = getTable(tables, "player_positions");
  if (!positions.some((p) => p["user_id"] === userId)) {
    positions.push({ user_id: userId, map_id: "village", x: 1184, y: 624, updated_at: now });
  }
  const playerWeapons = getTable(tables, "player_weapons");
  if (!playerWeapons.some((w) => w["user_id"] === userId && w["weapon_id"] === "fists")) {
    playerWeapons.push({ user_id: userId, weapon_id: "fists", equipped: true });
  }
  const admins = getTable(tables, "player_admin");
  if (!admins.some((a) => a["user_id"] === userId)) {
    admins.push({ user_id: userId, title: "", title_color: "#f2c14e", invisible: false, fly: false, speed: 1 });
  }
  saveTables(tables);
}

interface Filter {
  op: "eq" | "neq" | "in" | "gte" | "lte" | "gt" | "lt";
  col: string;
  val: unknown;
}

class MockQueryBuilder {
  private table: string;
  private mode: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private filters: Filter[] = [];
  private orderBy: { col: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private singleMode: "none" | "single" | "maybeSingle" = "none";

  constructor(table: string) {
    this.table = table;
  }

  select(_cols?: string) {
    return this;
  }
  insert(values: Row | Row[]) {
    this.mode = "insert";
    this.payload = values;
    return this;
  }
  update(values: Row) {
    this.mode = "update";
    this.payload = values;
    return this;
  }
  upsert(values: Row | Row[]) {
    this.mode = "upsert";
    this.payload = values;
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push({ op: "eq", col, val });
    return this;
  }
  neq(col: string, val: unknown) {
    this.filters.push({ op: "neq", col, val });
    return this;
  }
  in(col: string, val: unknown[]) {
    this.filters.push({ op: "in", col, val });
    return this;
  }
  gte(col: string, val: unknown) {
    this.filters.push({ op: "gte", col, val });
    return this;
  }
  lte(col: string, val: unknown) {
    this.filters.push({ op: "lte", col, val });
    return this;
  }
  gt(col: string, val: unknown) {
    this.filters.push({ op: "gt", col, val });
    return this;
  }
  lt(col: string, val: unknown) {
    this.filters.push({ op: "lt", col, val });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, ascending: opts?.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.limitCount = n;
    return this;
  }
  single() {
    this.singleMode = "single";
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  private matches(row: Row): boolean {
    for (const f of this.filters) {
      const v = row[f.col];
      if (f.op === "eq" && v !== f.val) return false;
      if (f.op === "neq" && v === f.val) return false;
      if (f.op === "in" && (!Array.isArray(f.val) || !f.val.includes(v))) return false;
      if (f.op === "gte" && !(String(v ?? "") >= String(f.val ?? ""))) return false;
      if (f.op === "lte" && !(String(v ?? "") <= String(f.val ?? ""))) return false;
      if (f.op === "gt" && !(String(v ?? "") > String(f.val ?? ""))) return false;
      if (f.op === "lt" && !(String(v ?? "") < String(f.val ?? ""))) return false;
    }
    return true;
  }

  private exec(): { data: unknown; error: { message: string } | null } {
    const tables = loadTables();
    const rows = getTable(tables, this.table);
    let resultRows: Row[] = [];

    if (this.mode === "select") {
      resultRows = rows.filter((r) => this.matches(r)).map((r) => ({ ...r }));
    } else if (this.mode === "insert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      for (const item of items) {
        const record: Row = {
          id: item["id"] ?? crypto.randomUUID(),
          created_at: item["created_at"] ?? nowIso(),
          ...item,
        };
        rows.push(record);
        resultRows.push({ ...record });
      }
      saveTables(tables);
    } else if (this.mode === "upsert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      for (const item of items) {
        const id = item["id"];
        const idx = id !== undefined ? rows.findIndex((r) => r["id"] === id) : -1;
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], ...item };
          resultRows.push({ ...rows[idx]! });
        } else {
          const record: Row = { id: id ?? crypto.randomUUID(), created_at: nowIso(), ...item };
          rows.push(record);
          resultRows.push({ ...record });
        }
      }
      saveTables(tables);
    } else if (this.mode === "update") {
      const patch = (Array.isArray(this.payload) ? this.payload[0] : this.payload) ?? {};
      for (let i = 0; i < rows.length; i++) {
        if (this.matches(rows[i]!)) {
          rows[i] = { ...rows[i], ...patch };
          resultRows.push({ ...rows[i]! });
        }
      }
      saveTables(tables);
    } else if (this.mode === "delete") {
      const kept: Row[] = [];
      for (const r of rows) {
        if (this.matches(r)) resultRows.push({ ...r });
        else kept.push(r);
      }
      tables[this.table] = kept;
      saveTables(tables);
    }

    if (this.orderBy) {
      const { col, ascending } = this.orderBy;
      resultRows.sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av === bv) return 0;
        if (av === undefined || av === null) return 1;
        if (bv === undefined || bv === null) return -1;
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return ascending ? cmp : -cmp;
      });
    }

    if (this.limitCount !== null) {
      resultRows = resultRows.slice(0, this.limitCount);
    }

    if (this.singleMode === "single") {
      if (resultRows.length === 0) return { data: null, error: { message: `Row not found in ${this.table}` } };
      return { data: resultRows[0] ?? null, error: null };
    }
    if (this.singleMode === "maybeSingle") {
      return { data: resultRows[0] ?? null, error: null };
    }
    return { data: resultRows, error: null };
  }

  then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.exec()).then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

function createMockChannel(_name: string) {
  const channel = {
    on: (_type: string, _filter: unknown, _cb?: unknown) => channel,
    subscribe: (cb?: (status: string) => void) => {
      if (cb) setTimeout(() => cb("SUBSCRIBED"), 0);
      return channel;
    },
    unsubscribe: async () => "ok",
    send: async () => "ok",
    track: async () => "ok",
    untrack: async () => "ok",
    presenceState: () => ({}),
  };
  return channel;
}

export function createMockSupabaseClient(defaultUserId?: string): SupabaseClient<Database> {
  const resolveSession = (): MockSession | null => {
    const existing = loadSession();
    if (existing) return existing;
    if (defaultUserId) {
      ensurePlayerRows(defaultUserId, "Traveler");
      return {
        access_token: `local.${defaultUserId}`,
        refresh_token: "local-refresh",
        token_type: "bearer",
        expires_in: 86400,
        user: {
          id: defaultUserId,
          email: "traveler@veya.local",
          email_confirmed_at: nowIso(),
          user_metadata: { username: "Traveler" },
        },
      };
    }
    return null;
  };

  const client = {
    auth: {
      async getUser() {
        const s = resolveSession();
        return { data: { user: s?.user ?? null }, error: null };
      },
      async getSession() {
        const s = resolveSession();
        return { data: { session: s }, error: null };
      },
      async getClaims(token?: string) {
        const sub = token?.startsWith("local.") ? token.slice(6) : (resolveSession()?.user.id ?? DEFAULT_USER_ID);
        return { data: { claims: { sub } }, error: null };
      },
      onAuthStateChange(cb: (event: AuthEvent, session: MockSession | null) => void) {
        authListeners.add(cb);
        const current = resolveSession();
        setTimeout(() => cb("INITIAL_SESSION", current), 0);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authListeners.delete(cb);
              },
            },
          },
        };
      },
      async signInWithPassword({ email }: { email: string; password: string }) {
        const cleanEmail = email.trim().toLowerCase() || "traveler@veya.local";
        const id = deterministicUuid(cleanEmail);
        const username = cleanEmail.split("@")[0]?.slice(0, 16) || "Traveler";
        ensurePlayerRows(id, username);
        const session: MockSession = {
          access_token: `local.${id}`,
          refresh_token: "local-refresh",
          token_type: "bearer",
          expires_in: 86400,
          user: {
            id,
            email: cleanEmail,
            email_confirmed_at: nowIso(),
            user_metadata: { username },
          },
        };
        persistSession(session);
        emitAuth("SIGNED_IN", session);
        return { data: { user: session.user, session }, error: null };
      },
      async signUp({ email, options }: { email: string; password: string; options?: { data?: { username?: string } } }) {
        const cleanEmail = email.trim().toLowerCase() || "traveler@veya.local";
        const id = deterministicUuid(cleanEmail);
        const username = String(options?.data?.username || cleanEmail.split("@")[0] || "Traveler").slice(0, 16);
        ensurePlayerRows(id, username);
        const session: MockSession = {
          access_token: `local.${id}`,
          refresh_token: "local-refresh",
          token_type: "bearer",
          expires_in: 86400,
          user: {
            id,
            email: cleanEmail,
            email_confirmed_at: nowIso(),
            user_metadata: { username },
          },
        };
        persistSession(session);
        emitAuth("SIGNED_IN", session);
        return { data: { user: session.user, session }, error: null };
      },
      async signOut() {
        persistSession(null);
        emitAuth("SIGNED_OUT", null);
        return { error: null };
      },
      async resetPasswordForEmail() {
        return { data: {}, error: null };
      },
      async updateUser() {
        const s = resolveSession();
        return { data: { user: s?.user ?? null }, error: null };
      },
      async setSession(tokens: { access_token?: string; refresh_token?: string }) {
        const existing = resolveSession();
        if (existing) return { data: { session: existing, user: existing.user }, error: null };
        const id = DEFAULT_USER_ID;
        ensurePlayerRows(id, "Traveler");
        const session: MockSession = {
          access_token: tokens.access_token || `local.${id}`,
          refresh_token: tokens.refresh_token || "local-refresh",
          token_type: "bearer",
          expires_in: 86400,
          user: { id, email: "traveler@veya.local", email_confirmed_at: nowIso(), user_metadata: { username: "Traveler" } },
        };
        persistSession(session);
        emitAuth("SIGNED_IN", session);
        return { data: { session, user: session.user }, error: null };
      },
    },
    from(table: string) {
      return new MockQueryBuilder(table);
    },
    async rpc(fn: string, args: Record<string, unknown> = {}) {
      const s = resolveSession();
      const uid = s?.user.id ?? DEFAULT_USER_ID;
      const username = String(s?.user.user_metadata["username"] ?? "Traveler");
      const tables = loadTables();

      switch (fn) {
        case "ensure_player":
        case "ensure_firearms":
          ensurePlayerRows(uid, username);
          return { data: null, error: null };
        case "game_today":
          return { data: new Date().toISOString().slice(0, 10), error: null };
        case "am_admin":
        case "has_role":
          return { data: true, error: null };
        case "report_state": {
          const positions = getTable(tables, "player_positions");
          const existing = positions.find((p) => p["user_id"] === uid);
          const patch = {
            user_id: uid,
            map_id: args["_map"] ?? "village",
            x: args["_x"] ?? 1184,
            y: args["_y"] ?? 624,
            updated_at: nowIso(),
          };
          if (existing) Object.assign(existing, patch);
          else positions.push(patch);
          saveTables(tables);
          return { data: null, error: null };
        }
        case "base_tick":
          return { data: null, error: null };
        case "equip_firearm": {
          const firearms = getTable(tables, "player_firearms");
          const row = firearms.find((f) => f["user_id"] === uid);
          const gun = String(args["_gun"] ?? "fists");
          if (row) {
            row["gun_id"] = gun;
            row["rounds"] = gun === "fists" ? 0 : 12;
            row["max_rounds"] = gun === "fists" ? 0 : 12;
          }
          saveTables(tables);
          return { data: null, error: null };
        }
        case "reload_firearm": {
          const firearms = getTable(tables, "player_firearms");
          const row = firearms.find((f) => f["user_id"] === uid);
          if (row) row["rounds"] = row["max_rounds"] || 12;
          saveTables(tables);
          return { data: null, error: null };
        }
        case "award_gralats": {
          const target = String(args["_user"] ?? uid);
          const amount = Number(args["_amount"] ?? 0);
          const wallets = getTable(tables, "player_wallets");
          const w = wallets.find((x) => x["user_id"] === target);
          if (w) w["gralats"] = Number(w["gralats"] ?? 0) + amount;
          else wallets.push({ user_id: target, gralats: amount });
          saveTables(tables);
          return { data: null, error: null };
        }
        case "push_autumn_tree": {
          const inv = getTable(tables, "autumn_inventory").find((a) => a["user_id"] === uid);
          if (inv) inv["bags"] = Number(inv["bags"] ?? 0) + 1;
          saveTables(tables);
          return { data: { dropped: true, bags: inv?.["bags"] ?? 1 }, error: null };
        }
        case "open_autumn_bag": {
          const inv = getTable(tables, "autumn_inventory").find((a) => a["user_id"] === uid);
          const bags = Number(inv?.["bags"] ?? 0);
          if (bags <= 0) return { data: null, error: { message: "No autumn bags left" } };
          if (inv) inv["bags"] = bags - 1;
          const rewardId = "hat_autumn_leaf";
          const rewards = getTable(tables, "autumn_rewards");
          const r = rewards.find((x) => x["user_id"] === uid && x["reward_id"] === rewardId);
          if (r) r["qty"] = Number(r["qty"] ?? 0) + 1;
          else rewards.push({ user_id: uid, reward_id: rewardId, qty: 1 });
          saveTables(tables);
          return { data: { reward_id: rewardId }, error: null };
        }
        case "resolve_attack":
          return { data: { damage: 12, hp: 88, max_hp: 100, killed: false, weapon: "fists" }, error: null };
        case "resolve_firearm_shot":
          return { data: { rounds: 11, damage: 15, hp: 85, max_hp: 100, killed: false, targetId: null }, error: null };
        case "list_admins":
          return { data: [], error: null };
        case "set_admin_fx": {
          const admins = getTable(tables, "player_admin");
          const row = admins.find((a) => a["user_id"] === uid);
          if (row) {
            row["title"] = args["_title"] ?? "";
            row["title_color"] = args["_title_color"] ?? "#f2c14e";
            row["invisible"] = Boolean(args["_invisible"]);
            row["fly"] = Boolean(args["_fly"]);
            row["speed"] = Number(args["_speed"] ?? 1);
          }
          saveTables(tables);
          return { data: null, error: null };
        }
        case "admin_drag_player": {
          const target = String(args["_user"] ?? uid);
          const profiles = getTable(tables, "profiles");
          const p = profiles.find((x) => x["id"] === target);
          if (p) {
            p["map_id"] = args["_map"];
            p["pos_x"] = args["_x"];
            p["pos_y"] = args["_y"];
          }
          saveTables(tables);
          return { data: null, error: null };
        }
        case "send_chat": {
          const channel = String(args["_channel"] ?? "global");
          const body = String(args["_body"] ?? "").trim().slice(0, 200);
          if (!body) return { data: null, error: { message: "Empty message" } };
          const table = channel === "gang" ? "gang_chat_messages" : channel === "alliance" ? "alliance_chat_messages" : "global_chat_messages";
          getTable(tables, table).push({
            id: crypto.randomUUID(),
            user_id: uid,
            username,
            body,
            tag: null,
            deleted: false,
            created_at: nowIso(),
          });
          saveTables(tables);
          return { data: null, error: null };
        }
        case "delete_chat": {
          const channel = String(args["_channel"] ?? "global");
          const id = String(args["_id"] ?? "");
          const table = channel === "gang" ? "gang_chat_messages" : channel === "alliance" ? "alliance_chat_messages" : "global_chat_messages";
          const row = getTable(tables, table).find((m) => m["id"] === id);
          if (row) row["deleted"] = true;
          saveTables(tables);
          return { data: null, error: null };
        }
        default:
          return { data: null, error: null };
      }
    },
    channel(name: string) {
      return createMockChannel(name);
    },
    async removeChannel() {
      return "ok";
    },
    storage: {
      from(_bucket: string) {
        return {
          async upload(path: string, file: Blob) {
            storageBlobs.set(path, file);
            await persistBlob(path, file);
            return { data: { path }, error: null };
          },
          async download(path: string) {
            const blob = storageBlobs.get(path) ?? readPersistedBlob(path);
            return { data: blob, error: blob ? null : { message: "Not found" } };
          },
          async createSignedUrl(path: string) {
            const blob = storageBlobs.get(path) ?? readPersistedBlob(path);
            const url = blob && typeof URL !== "undefined" ? URL.createObjectURL(blob) : "";
            return { data: { signedUrl: url }, error: null };
          },
          async remove(paths: string[]) {
            for (const p of paths) storageBlobs.delete(p);
            deletePersistedBlobs(paths);
            return { data: [], error: null };
          },
        };
      },
    },
  };

  return client as unknown as SupabaseClient<Database>;
}
