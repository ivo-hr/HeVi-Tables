"use client";

import { useRef, useState, useTransition } from "react";
import {
  Check,
  Crown,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Save,
  Trash2,
  Trophy
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  addRowAction,
  closeTableAction,
  deleteRowAction,
  updateRowAction
} from "@/app/actions/tables";
import { Avatar } from "@/components/avatar";
import { formatPoints } from "@/lib/format";
import type {
  ActionResult,
  Profile,
  Table,
  TableRow
} from "@/lib/types";

type RowEditorProps = {
  table: Table;
  rows: TableRow[];
  profiles: Profile[];
  editable: boolean;
};

type RowFormProps = {
  table: Table;
  profiles: Profile[];
  row?: TableRow;
  onDone?: () => void;
};

function Participants({
  profiles,
  selected,
  disabled
}: {
  profiles: Profile[];
  selected: string[];
  disabled?: boolean;
}) {
  return (
    <fieldset className="participants" disabled={disabled}>
      <legend>Participantes</legend>
      <div className="participant-grid">
        {profiles.map((profile) => (
          <label className="participant-option" key={profile.id}>
            <input
              type="checkbox"
              name="user_ids"
              value={profile.id}
              defaultChecked={selected.includes(profile.id)}
            />
            <span className="fake-checkbox">
              <Check size={13} />
            </span>
            <Avatar name={profile.username} src={profile.avatar_url} size="sm" />
            <span>{profile.username}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RuleInput({ table, row }: { table: Table; row?: TableRow }) {
  if (table.point_system === "EC") {
    return (
      <label className="field compact-field">
        <span>Puntos que recibe</span>
        <div className="number-input">
          <input
            name="points_receivable"
            type="number"
            min={0}
            max={table.max_point}
            step={1}
            defaultValue={row?.points_receivable ?? 0}
            required
          />
          <span>/ {table.max_point}</span>
        </div>
      </label>
    );
  }

  if (table.point_system === "WtA") {
    return (
      <label className="winner-toggle">
        <input
          name="position"
          type="checkbox"
          value="1"
          defaultChecked={row?.position === 1}
        />
        <span>
          <Crown size={18} />
          Marcar como ganadora
        </span>
      </label>
    );
  }

  return (
    <label className="field compact-field">
      <span>Posición final</span>
      <div className="number-input">
        <input
          name="position"
          type="number"
          min={1}
          max={999}
          step={1}
          defaultValue={row?.position ?? ""}
          placeholder="1"
          required
        />
        <span>º</span>
      </div>
    </label>
  );
}

function EditableRowForm({ table, profiles, row, onDone }: RowFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<ActionResult>({ ok: false });
  const [pending, startTransition] = useTransition();
  const isNew = !row;

  const runAction = (formData: FormData) => {
    startTransition(async () => {
      const result = isNew
        ? await addRowAction(formData)
        : await updateRowAction(formData);
      setState(result);
      if (result.ok) {
        if (isNew) formRef.current?.reset();
        router.refresh();
        onDone?.();
      }
    });
  };

  return (
    <form
      ref={formRef}
      className={isNew ? "row-form row-form-new" : "row-form"}
      action={runAction}
    >
      <input type="hidden" name="table_id" value={table.id} />
      {row ? <input type="hidden" name="row_id" value={row.id} /> : null}
      <Participants
        profiles={profiles}
        selected={row?.user_ids ?? []}
      />
      <div className="row-fields">
        <label className="field">
          <span>Notas</span>
          <textarea
            name="notes"
            maxLength={500}
            rows={2}
            defaultValue={row?.notes ?? ""}
            placeholder="Qué apostáis, detalles, desempates…"
          />
        </label>
        <RuleInput table={table} row={row} />
      </div>
      {state.message ? (
        <p className={state.ok ? "form-message success" : "form-message error"}>
          {state.message}
        </p>
      ) : null}
      <div className="row-form-actions">
        {row ? (
          <button
            type="button"
            className="danger-button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("¿Eliminar esta fila?")) return;
              const formData = new FormData();
              formData.set("row_id", row.id);
              formData.set("table_id", table.id);
              startTransition(async () => {
                const result = await deleteRowAction(formData);
                setState(result);
                if (result.ok) router.refresh();
              });
            }}
          >
            <Trash2 size={17} />
            Eliminar
          </button>
        ) : null}
        <button className="secondary-button" disabled={pending}>
          {pending ? (
            <LoaderCircle className="spin" size={17} />
          ) : isNew ? (
            <Plus size={17} />
          ) : (
            <Save size={17} />
          )}
          {pending ? "Guardando…" : isNew ? "Añadir fila" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function ReadonlyRow({
  table,
  row,
  profiles,
  index
}: {
  table: Table;
  row: TableRow;
  profiles: Profile[];
  index: number;
}) {
  const rowProfiles = row.user_ids
    .map((id) => profiles.find((profile) => profile.id === id))
    .filter((profile): profile is Profile => Boolean(profile));

  return (
    <article className="readonly-row">
      <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
      <div className="readonly-main">
        <div className="avatar-stack">
          {rowProfiles.map((profile) => (
            <Avatar
              key={profile.id}
              name={profile.username}
              src={profile.avatar_url}
              size="sm"
            />
          ))}
        </div>
        <div>
          <strong>{rowProfiles.map((profile) => profile.username).join(" + ")}</strong>
          <p>{row.notes || "Sin notas"}</p>
        </div>
      </div>
      <div className="row-result">
        {table.closed ? (
          <>
            <strong>{formatPoints(row.points_won)}</strong>
            <span>puntos</span>
          </>
        ) : table.point_system === "EC" ? (
          <>
            <strong>{row.points_receivable ?? 0}</strong>
            <span>previstos</span>
          </>
        ) : row.position ? (
          <>
            <strong>{row.position}º</strong>
            <span>posición</span>
          </>
        ) : (
          <>
            <strong>—</strong>
            <span>sin resultado</span>
          </>
        )}
      </div>
    </article>
  );
}

function CloseTableButton({ table }: { table: Table }) {
  const router = useRouter();
  const [state, setState] = useState<ActionResult>({ ok: false });
  const [pending, startTransition] = useTransition();

  return (
    <div className="close-block">
      <div>
        <Trophy size={25} />
        <span>
          <strong>¿Resultados listos?</strong>
          <small>El cierre calcula los puntos y no se puede deshacer.</small>
        </span>
      </div>
      {state.message ? (
        <p className={state.ok ? "form-message success" : "form-message error"}>
          {state.message}
        </p>
      ) : null}
      <button
        className="close-button"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              "Vas a cerrar la tabla definitivamente. ¿Continuar?"
            )
          ) {
            return;
          }
          const data = new FormData();
          data.set("table_id", table.id);
          startTransition(async () => {
            const result = await closeTableAction(data);
            setState(result);
            if (result.ok) router.refresh();
          });
        }}
      >
        {pending ? <LoaderCircle className="spin" size={18} /> : <LockKeyhole size={18} />}
        {pending ? "Cerrando…" : "Cerrar tabla"}
      </button>
    </div>
  );
}

export function RowEditor({ table, rows, profiles, editable }: RowEditorProps) {
  const [showNew, setShowNew] = useState(rows.length === 0);

  if (!editable) {
    return (
      <section className="rows-list">
        {rows.length ? (
          rows.map((row, index) => (
            <ReadonlyRow
              key={row.id}
              table={table}
              row={row}
              profiles={profiles}
              index={index}
            />
          ))
        ) : (
          <div className="empty-inline">Todavía no hay filas en esta tabla.</div>
        )}
      </section>
    );
  }

  return (
    <div className="editor-stack">
      {rows.map((row, index) => (
        <details className="editable-row" key={row.id}>
          <summary>
            <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
            <span>
              <strong>
                {row.user_ids
                  .map((id) => profiles.find((profile) => profile.id === id)?.username)
                  .filter(Boolean)
                  .join(" + ")}
              </strong>
              <small>{row.notes || "Sin notas"}</small>
            </span>
            <span className="edit-affordance">Editar</span>
          </summary>
          <EditableRowForm table={table} profiles={profiles} row={row} />
        </details>
      ))}
      {showNew ? (
        <EditableRowForm
          table={table}
          profiles={profiles}
          onDone={() => setShowNew(false)}
        />
      ) : (
        <button className="add-row-button" onClick={() => setShowNew(true)}>
          <Plus size={20} />
          Añadir otra fila
        </button>
      )}
      <CloseTableButton table={table} />
    </div>
  );
}
