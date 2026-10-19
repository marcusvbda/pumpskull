// Tiny in-memory stand-in for the supabase-js query builder, just enough for the lobby server actions:
// select / insert / update / delete, eq / lt filters, order, single / maybeSingle.
// It mimics the parts of supabase/migrations/0001_init.sql that the rules depend on: primary keys, the
// case-insensitive nickname index, defaults, ON DELETE CASCADE / SET NULL. It does not check CHECK constraints.

export type Row = Record<string, unknown>;
interface DbError {
  message: string;
  code?: string;
}
interface Result {
  data: unknown;
  error: DbError | null;
}

type Filter = (row: Row) => boolean;

export function createFakeDb() {
  const tables: Record<string, Row[]> = { rooms: [], players: [], player_tokens: [], plays: [] };
  let clock = Date.parse("2026-10-20T10:00:00Z");
  const tick = () => new Date((clock += 1000)).toISOString(); // every insert is 1 s after the previous one
  let nextId = 1;
  const uuid = () => `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`;

  function fillDefaults(table: string, row: Row): Row {
    if (table === "rooms") {
      return {
        status: "lobby", host_id: null, current_play: 0, phase: "lobby", spirit_meter: 0,
        phase_started_at: tick(), play_started_at: null, created_at: tick(),
        settings: { time_minutes: 4, difficulty: "easy", rounds: 2 }, ...row,
      };
    }
    if (table === "players") return { id: uuid(), joined_at: tick(), last_seen: tick(), ...row };
    return { ...row };
  }

  function violation(table: string, row: Row, ignore?: Row): DbError | null {
    const others = tables[table].filter((r) => r !== ignore);
    if (table === "rooms" && others.some((r) => r.pin === row.pin)) return { message: "duplicate pin", code: "23505" };
    if (table === "players") {
      if (!tables.rooms.some((r) => r.pin === row.room_pin)) return { message: "no such room", code: "23503" };
      const nick = String(row.nickname).toLowerCase();
      if (others.some((r) => r.room_pin === row.room_pin && String(r.nickname).toLowerCase() === nick)) {
        return { message: "duplicate nickname", code: "23505" };
      }
    }
    if (table === "player_tokens") {
      if (!tables.players.some((r) => r.id === row.player_id)) return { message: "no such player", code: "23503" };
      if (others.some((r) => r.player_id === row.player_id)) return { message: "duplicate token", code: "23505" };
    }
    return null;
  }

  function removeRow(table: string, row: Row) {
    tables[table] = tables[table].filter((r) => r !== row);
    if (table === "rooms") {
      for (const p of tables.players.filter((p) => p.room_pin === row.pin)) removeRow("players", p);
      tables.plays = tables.plays.filter((p) => p.room_pin !== row.pin);
    }
    if (table === "players") {
      tables.player_tokens = tables.player_tokens.filter((t) => t.player_id !== row.id);
      for (const r of tables.rooms) if (r.host_id === row.id) r.host_id = null;
    }
  }

  class Query implements PromiseLike<Result> {
    private filters: Filter[] = [];
    private wantRows = false;
    private sorting?: { column: string; ascending: boolean };
    private mode: "rows" | "single" | "maybeSingle" = "rows";
    private payload?: Row | Row[];
    constructor(
      private table: string,
      private op: "select" | "insert" | "update" | "delete",
    ) {}

    withPayload(payload: Row | Row[]) {
      this.payload = payload;
      return this;
    }
    select() {
      this.wantRows = true;
      return this;
    }
    eq(column: string, value: unknown) {
      this.filters.push((r) => r[column] === value);
      return this;
    }
    lt(column: string, value: unknown) {
      this.filters.push((r) => (r[column] as string) < (value as string));
      return this;
    }
    order(column: string, opts?: { ascending?: boolean }) {
      this.sorting = { column, ascending: opts?.ascending ?? true };
      return this;
    }
    single() {
      this.mode = "single";
      return this;
    }
    maybeSingle() {
      this.mode = "maybeSingle";
      return this;
    }

    private run(): Result {
      const t = this.table;
      let rows: Row[] = [];
      if (this.op === "select") {
        rows = tables[t].filter((r) => this.filters.every((f) => f(r)));
      } else if (this.op === "insert") {
        for (const input of Array.isArray(this.payload) ? this.payload : [this.payload!]) {
          const row = fillDefaults(t, input);
          const error = violation(t, row);
          if (error) return { data: null, error };
          tables[t].push(row);
          rows.push(row);
        }
      } else if (this.op === "update") {
        rows = tables[t].filter((r) => this.filters.every((f) => f(r)));
        for (const r of rows) {
          const error = violation(t, { ...r, ...(this.payload as Row) }, r);
          if (error) return { data: null, error };
        }
        for (const r of rows) Object.assign(r, this.payload);
      } else {
        rows = tables[t].filter((r) => this.filters.every((f) => f(r)));
        for (const r of rows) removeRow(t, r);
      }

      if (this.sorting) {
        const { column, ascending } = this.sorting;
        rows = [...rows].sort((a, b) => (String(a[column]) < String(b[column]) ? -1 : 1) * (ascending ? 1 : -1));
      }
      const copies = rows.map((r) => structuredClone(r));
      if (this.op !== "select" && !this.wantRows) return { data: null, error: null };
      if (this.mode === "single") {
        return copies.length === 1
          ? { data: copies[0], error: null }
          : { data: null, error: { message: "expected exactly one row", code: "PGRST116" } };
      }
      if (this.mode === "maybeSingle") {
        return copies.length <= 1
          ? { data: copies[0] ?? null, error: null }
          : { data: null, error: { message: "more than one row", code: "PGRST116" } };
      }
      return { data: copies, error: null };
    }

    then<A = Result, B = never>(
      onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
      onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
    ): PromiseLike<A | B> {
      return Promise.resolve().then(() => this.run()).then(onfulfilled, onrejected);
    }
  }

  return {
    tables,
    from(table: string) {
      if (!(table in tables)) throw new Error(`fake db: unknown table ${table}`);
      return {
        select: () => new Query(table, "select"),
        insert: (payload: Row | Row[]) => new Query(table, "insert").withPayload(payload),
        update: (payload: Row) => new Query(table, "update").withPayload(payload),
        delete: () => new Query(table, "delete"),
      };
    },
  };
}

export type FakeDb = ReturnType<typeof createFakeDb>;
