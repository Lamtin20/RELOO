// Only called after the existing development + loopback + HMAC test guard.
const TABLES = new Set([
  "rc_preferences",
  "rc_connections",
  "rc_oauth_states",
  "rc_calendar_events",
  "rc_rentals",
  "rc_audit",
  "pp_preferences",
  "pp_events",
  "pp_exclusions",
  "pp_configuration",
]);
const RPCS = {
  reloo_rc_permission_lost: ["p_actor", "p_device"],
  reloo_rc_device: ["p_actor", "p_device", "p_calendar", "p_name", "p_confirm"],
  reloo_rc_retention: [],
  reloo_pp_clear: ["p_actor", "p_all"],
  reloo_rc_activate: [
    "p_actor",
    "p_connection",
    "p_confirm_other",
    "p_current_email",
    "p_email_verified",
    "p_dual",
    "p_locale",
  ],
  reloo_rc_backfill: ["p_actor", "p_connection"],
  reloo_rc_claim: ["p_actor", "p_device"],
  reloo_rc_ack: [
    "p_actor",
    "p_id",
    "p_lease",
    "p_revision",
    "p_remote",
    "p_result",
  ],
  reloo_pp_preferences: ["p_actor", "p_enabled", "p_categories", "p_reset"],
  reloo_pp_record: [
    "p_actor",
    "p_event",
    "p_version",
    "p_epoch",
    "p_kind",
    "p_asset",
    "p_category",
    "p_at",
    "p_topic",
  ],
  reloo_pp_context: ["p_actor"],
  reloo_pp_exclude: ["p_actor", "p_kind", "p_target", "p_enabled"],
  reloo_pp_candidates: [
    "p_actor",
    "p_ids",
    "p_category",
    "p_province",
    "p_start",
    "p_end",
  ],
  reloo_pp_retention: [],
};
const column = (c) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(c)) throw Error("TEST_COLUMN_DENIED");
  return '"' + c + '"';
};
export function careTestDb(db) {
  return {
    async rpc(name, args = {}) {
      try {
        if (!RPCS[name]) throw Error("TEST_RPC_DENIED");
        const keys = RPCS[name],
          result = await db.query(
            "select " +
              name +
              "(" +
              keys.map((_, i) => "$" + (i + 1)).join(",") +
              ") result",
            keys.map((k) => args[k] ?? null),
          );
        return {
          data: ["reloo_rc_claim", "reloo_pp_candidates"].includes(name)
            ? result.rows.map((r) => r.result)
            : result.rows[0]?.result,
          error: null,
        };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    },
    from(table) {
      if (!TABLES.has(table)) throw Error("TEST_TABLE_DENIED");
      let mode = "SELECT",
        data = null,
        fields = "*",
        filters = [],
        sorting = [],
        limit = 2000,
        single = false,
        conflict = null;
      const q = {
        select(value = "*") {
          if (!/^[a-z_, *]+$/.test(value)) throw Error("TEST_COLUMNS_DENIED");
          fields = value;
          return q;
        },
        eq(k, v) {
          filters.push([k, "=", v]);
          return q;
        },
        neq(k, v) {
          filters.push([k, "<>", v]);
          return q;
        },
        is(k, v) {
          filters.push([k, "IS", v]);
          return q;
        },
        gt(k, v) {
          filters.push([k, ">", v]);
          return q;
        },
        lt(k, v) {
          filters.push([k, "<", v]);
          return q;
        },
        lte(k, v) {
          filters.push([k, "<=", v]);
          return q;
        },
        in(k, v) {
          filters.push([k, "IN", v]);
          return q;
        },
        order(k, { ascending = true } = {}) {
          sorting.push(column(k) + (ascending ? " ASC" : " DESC"));
          return q;
        },
        limit(n) {
          limit = Math.min(n, 2000);
          return q;
        },
        insert(row) {
          mode = "INSERT";
          data = row;
          return q;
        },
        upsert(row, { onConflict = "profile_id" } = {}) {
          mode = "UPSERT";
          data = row;
          conflict = onConflict;
          return q;
        },
        update(row) {
          mode = "UPDATE";
          data = row;
          return q;
        },
        delete() {
          mode = "DELETE";
          return q;
        },
        single() {
          single = true;
          return execute();
        },
        maybeSingle() {
          single = true;
          return execute();
        },
        then(resolve, reject) {
          return execute().then(resolve, reject);
        },
      };
      async function execute() {
        try {
          const values = [],
            bind = (v) => {
              values.push(v);
              return "$" + values.length;
            };
          let sql;
          if (mode === "INSERT" || mode === "UPSERT") {
            const keys = Object.keys(data);
            sql =
              "insert into " +
              table +
              "(" +
              keys.map(column).join(",") +
              ") values(" +
              keys.map((k) => bind(data[k])).join(",") +
              ")";
            if (mode === "UPSERT") {
              const c = conflict.split(",");
              sql +=
                " on conflict(" +
                c.map(column).join(",") +
                ") do update set " +
                keys
                  .filter((k) => !c.includes(k))
                  .map((k) => column(k) + "=excluded." + column(k))
                  .join(",");
            }
          } else if (mode === "UPDATE")
            sql =
              "update " +
              table +
              " set " +
              Object.keys(data)
                .map((k) => column(k) + "=" + bind(data[k]))
                .join(",");
          else
            sql =
              mode === "DELETE"
                ? "delete from " + table
                : "select " + fields + " from " + table;
          if (filters.length)
            sql +=
              " where " +
              filters
                .map(([k, op, v]) =>
                  op === "IS"
                    ? column(k) +
                      (v === null
                        ? " IS NULL"
                        : " IS " + (v ? "TRUE" : "FALSE"))
                    : op === "IN"
                      ? v.length
                        ? column(k) + " in (" + v.map(bind).join(",") + ")"
                        : "false"
                      : column(k) + " " + op + " " + bind(v),
                )
                .join(" and ");
          if (mode === "SELECT") {
            if (sorting.length) sql += " order by " + sorting.join(",");
            sql += " limit " + limit;
          } else sql += " returning " + fields;
          const result = await db.query(sql, values);
          return {
            data: single ? result.rows[0] || null : result.rows,
            error: null,
          };
        } catch (e) {
          return { data: null, error: { message: e.message } };
        }
      }
      return q;
    },
  };
}
