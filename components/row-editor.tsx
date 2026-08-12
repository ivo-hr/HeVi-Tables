"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Crown,
  Eye,
  FileText,
  Hash,
  Images,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  Plus,
  Save,
  Trash2,
  Trophy,
  Users,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  addRowAction,
  closeTableAction,
  deleteRowAction,
  updateRowAction
} from "@/app/actions/tables";
import { Avatar } from "@/components/avatar";
import { useLanguage } from "@/components/language-provider";
import {
  EvidencePicker,
  type EvidencePreview
} from "@/components/evidence-picker";
import { formatPoints } from "@/lib/format";
import { stableToneClass } from "@/lib/presentation";
import { calculateProvisionalPoints, sortByNumericValue } from "@/lib/rules";
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
  isCreator: boolean;
  evidenceUrls: Record<string, string>;
};

type RowFormProps = {
  table: Table;
  profiles: Profile[];
  row?: TableRow;
  onDone?: () => void;
  onCancel?: () => void;
  evidenceUrls: Record<string, string>;
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
  const { t } = useLanguage();
  return (
    <fieldset className="participants" disabled={disabled}>
      <legend>{t("Participantes", "Participants")}</legend>
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
  const { t } = useLanguage();
  if (table.point_system === "EC") {
    return (
      <label className="field compact-field">
        <span>{t("Puntos que recibe", "Points awarded")}</span>
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

  if (table.info_format === "number") {
    return (
      <div className="automatic-rule-note">
        <Crown size={18} />
        <span>
          <strong>{t("Orden automático", "Automatic order")}</strong>
          {table.number_sort_order === "asc" ? t("Gana la cantidad menor.", "The lowest quantity wins.") : t("Gana la cantidad mayor.", "The highest quantity wins.")}
        </span>
      </div>
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
          {t("Marcar como ganadora", "Mark as winner")}
        </span>
      </label>
    );
  }

  return (
    <label className="field compact-field">
      <span>{t("Posición final", "Final position")}</span>
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

function EditableRowForm({
  table,
  profiles,
  row,
  onDone,
  onCancel,
  evidenceUrls
}: RowFormProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<ActionResult>({ ok: false });
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidenceResetKey, setEvidenceResetKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const isNew = !row;

  const runAction = (formData: FormData) => {
    evidenceFiles.forEach((file) => formData.append("evidence_files", file));
    startTransition(async () => {
      const result = isNew
        ? await addRowAction(formData)
        : await updateRowAction(formData);
      setState(result);
      if (result.ok) {
        if (isNew) {
          formRef.current?.reset();
          setEvidenceResetKey((current) => current + 1);
        }
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
        {table.info_format === "number" ? (
          <label className="field">
            <span>{t("Cantidad", "Quantity")}</span>
            <input
              name="numeric_value"
              type="number"
              step="any"
              defaultValue={row?.numeric_value ?? ""}
              placeholder="0"
              required
            />
          </label>
        ) : (
          <label className="field">
            <span>{t("Texto", "Text")}</span>
            <textarea
              name="notes"
              maxLength={500}
              rows={2}
              defaultValue={row?.notes ?? ""}
              placeholder={t("Qué apostáis, detalles, desempates…", "What you predict, details, tie-breakers…")}
            />
          </label>
        )}
        <RuleInput table={table} row={row} />
      </div>
      <EvidencePicker
        existing={(row?.evidence_paths ?? []).flatMap((path) =>
          evidenceUrls[path] ? [{ path, url: evidenceUrls[path] }] : []
        )}
        onFilesChange={setEvidenceFiles}
        resetKey={evidenceResetKey}
      />
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
              if (!window.confirm(t("¿Eliminar esta fila?", "Delete this entry?"))) return;
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
            {t("Eliminar", "Delete")}
          </button>
        ) : null}
        {row && onCancel ? (
          <button type="button" className="ghost-button" disabled={pending} onClick={onCancel}>
            {t("Cancelar", "Cancel")}
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
          {pending ? t("Guardando…", "Saving…") : isNew ? t("Añadir fila", "Add entry") : t("Guardar cambios", "Save changes")}
        </button>
      </div>
    </form>
  );
}

function rowProfilesFor(row: TableRow, profiles: Profile[]) {
  return row.user_ids
    .map((id) => profiles.find((profile) => profile.id === id))
    .filter((profile): profile is Profile => Boolean(profile));
}

function pointsForRow(table: Table, row: TableRow, index: number) {
  return table.closed
    ? row.points_won
    : calculateProvisionalPoints(
        table.point_system,
        table.max_point,
        {
          position: row.position,
          pointsReceivable: row.points_receivable
        },
        table.info_format === "number" && table.point_system !== "EC"
          ? index + 1
          : undefined
      );
}

function EvidenceLightbox({
  evidence,
  initialIndex,
  onClose
}: {
  evidence: EvidencePreview[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(initialIndex);
  const active = evidence[index];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + evidence.length) % evidence.length);
      }
      if (event.key === "ArrowRight") {
        setIndex((current) => (current + 1) % evidence.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [evidence.length, onClose]);

  return (
    <div className="evidence-lightbox-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="evidence-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={`${t("Evidencia", "Evidence")} ${index + 1} ${t("de", "of")} ${evidence.length}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span>
            <Images size={17} />
            {t("Evidencia", "Evidence")} {index + 1} {t("de", "of")} {evidence.length}
          </span>
          <button type="button" onClick={onClose} aria-label={t("Cerrar imagen", "Close image")}>
            <X size={20} />
          </button>
        </header>
        <div className="evidence-lightbox-image">
          <img src={active.url} alt={`${t("Evidencia ampliada", "Enlarged evidence")} ${index + 1}`} />
        </div>
        {evidence.length > 1 ? (
          <div className="evidence-lightbox-navigation">
            <button
              type="button"
              onClick={() => setIndex((current) => (current - 1 + evidence.length) % evidence.length)}
            >
              <ChevronLeft size={18} /> {t("Anterior", "Previous")}
            </button>
            <div className="evidence-lightbox-dots" aria-hidden="true">
              {evidence.map((item, dotIndex) => (
                <span className={dotIndex === index ? "active" : undefined} key={item.path} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIndex((current) => (current + 1) % evidence.length)}
            >
              {t("Siguiente", "Next")} <ChevronRight size={18} />
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function RowDetailView({
  table,
  row,
  profiles,
  index,
  evidence,
  onEdit
}: {
  table: Table;
  row: TableRow;
  profiles: Profile[];
  index: number;
  evidence: EvidencePreview[];
  onEdit?: () => void;
}) {
  const { locale, t } = useLanguage();
  const rowProfiles = rowProfilesFor(row, profiles);
  const points = pointsForRow(table, row, index);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <div className="row-detail-view">
      <div className="row-detail-grid">
        <section className="row-detail-section row-detail-participants">
          <span className="row-detail-label"><Users size={15} /> {t("Participantes", "Participants")}</span>
          <div className="row-detail-member-grid">
            {rowProfiles.map((profile) => (
              <div className="row-detail-member" key={profile.id}>
                <Avatar name={profile.username} src={profile.avatar_url} size="md" />
                <strong>{profile.username}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="row-detail-section row-detail-information">
          <span className="row-detail-label">
            {table.info_format === "number" ? <Hash size={15} /> : <FileText size={15} />}
            {table.info_format === "number" ? t("Cantidad", "Quantity") : t("Texto", "Text")}
          </span>
          <strong className={table.info_format === "number" ? "numeric" : undefined}>
            {table.info_format === "number"
              ? formatNumericValue(row.numeric_value, locale, t("Sin cantidad", "No quantity"))
              : row.notes || t("Sin texto", "No text")}
          </strong>
          <small>{formatPoints(points, locale)} {table.closed ? t("puntos", "points") : t("puntos provisionales", "provisional points")}</small>
        </section>
      </div>
      <section className="row-detail-section row-detail-evidence">
        <span className="row-detail-label"><Images size={15} /> {t("Evidencias", "Evidence")}</span>
        {evidence.length ? (
          <div className="row-detail-gallery">
            {evidence.map((item, evidenceIndex) => (
              <button
                type="button"
                key={item.path}
                onClick={() => setLightboxIndex(evidenceIndex)}
                aria-label={`${t("Ampliar evidencia", "Enlarge evidence")} ${evidenceIndex + 1}`}
              >
                <img src={item.url} alt={`${t("Evidencia", "Evidence")} ${evidenceIndex + 1}`} />
                <span><Eye size={16} /> {t("Ver grande", "View large")}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="row-detail-empty">{t("Este registro no tiene fotos.", "This entry has no photos.")}</p>
        )}
      </section>
      {onEdit ? (
        <div className="row-detail-actions">
          <button type="button" className="secondary-button" onClick={onEdit}>
            <Pencil size={17} />
            {t("Editar registro", "Edit entry")}
          </button>
        </div>
      ) : null}
      {lightboxIndex !== null ? (
        <EvidenceLightbox
          evidence={evidence}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </div>
  );
}

function formatNumericValue(value: number | null, locale: "es" | "en", empty: string) {
  return value === null
    ? empty
    : new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", { maximumFractionDigits: 6 }).format(value);
}

function RowSummary({
  table,
  row,
  profiles,
  index,
  evidence
}: {
  table: Table;
  row: TableRow;
  profiles: Profile[];
  index: number;
  evidence: EvidencePreview[];
}) {
  const { locale, t } = useLanguage();
  const rowProfiles = rowProfilesFor(row, profiles);
  const points = pointsForRow(table, row, index);
  return (
    <>
      <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
      <span className="readonly-main">
        <span className="avatar-stack">
          {rowProfiles.map((profile) => (
            <Avatar key={profile.id} name={profile.username} src={profile.avatar_url} size="sm" />
          ))}
        </span>
        <span>
          <strong>{rowProfiles.map((profile) => profile.username).join(" + ")}</strong>
          <small>
            {table.info_format === "number"
              ? formatNumericValue(row.numeric_value, locale, t("Sin cantidad", "No quantity"))
              : row.notes || t("Sin texto", "No text")}
          </small>
        </span>
      </span>
      <span className="row-evidence-strip" aria-label={`${evidence.length} ${t("evidencias", "evidence photos")}`}>
        {evidence.map((item, evidenceIndex) => (
          <span key={item.path}>
            <img src={item.url} alt={`${t("Evidencia", "Evidence")} ${evidenceIndex + 1}`} />
          </span>
        ))}
      </span>
      <span className="editable-row-result">
        <strong>{formatPoints(points, locale)}</strong>
        <small>pts.</small>
        <span className="edit-affordance"><Eye size={13} /> {t("Ver registro", "View entry")}</span>
      </span>
    </>
  );
}

function RowRecord({
  table,
  row,
  profiles,
  index,
  evidence,
  editable,
  evidenceUrls
}: {
  table: Table;
  row: TableRow;
  profiles: Profile[];
  index: number;
  evidence: EvidencePreview[];
  editable: boolean;
  evidenceUrls: Record<string, string>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <details
      className={`editable-row row-record ${stableToneClass(`row:${row.id}`)}`}
      onToggle={(event) => {
        if (!event.currentTarget.open) setEditing(false);
      }}
    >
      <summary>
        <RowSummary
          table={table}
          row={row}
          profiles={profiles}
          index={index}
          evidence={evidence}
        />
      </summary>
      {editing ? (
        <EditableRowForm
          table={table}
          profiles={profiles}
          row={row}
          evidenceUrls={evidenceUrls}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <RowDetailView
          table={table}
          row={row}
          profiles={profiles}
          index={index}
          evidence={evidence}
          onEdit={editable ? () => setEditing(true) : undefined}
        />
      )}
    </details>
  );
}

function CloseTableButton({ table }: { table: Table }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [state, setState] = useState<ActionResult>({ ok: false });
  const [pending, startTransition] = useTransition();

  return (
    <div className="close-block">
      <div>
        <Trophy size={25} />
        <span>
          <strong>{t("¿Resultados listos?", "Results ready?")}</strong>
          <small>{t("El cierre calcula los puntos y no se puede deshacer.", "Closing calculates the points and cannot be undone.")}</small>
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
              t("Vas a cerrar la tabla definitivamente. ¿Continuar?", "You are about to close the table permanently. Continue?")
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
        {pending ? t("Cerrando…", "Closing…") : t("Cerrar tabla", "Close table")}
      </button>
    </div>
  );
}

export function RowEditor({
  table,
  rows,
  profiles,
  editable,
  isCreator,
  evidenceUrls
}: RowEditorProps) {
  const { t } = useLanguage();
  const [showNew, setShowNew] = useState(rows.length === 0);
  const orderedRows =
    table.info_format === "number" && table.point_system !== "EC"
      ? sortByNumericValue(rows, table.number_sort_order ?? "desc")
      : rows;

  const evidenceFor = (row: TableRow) =>
    row.evidence_paths.flatMap((path) =>
      evidenceUrls[path] ? [{ path, url: evidenceUrls[path] }] : []
    );

  if (!editable) {
    return (
      <section className="rows-list">
        {orderedRows.length ? (
          orderedRows.map((row, index) => (
            <RowRecord
              key={row.id}
              table={table}
              row={row}
              profiles={profiles}
              index={index}
              evidence={evidenceFor(row)}
              editable={false}
              evidenceUrls={evidenceUrls}
            />
          ))
        ) : (
          <div className="empty-inline">{t("Todavía no hay filas en esta tabla.", "There are no entries in this table yet.")}</div>
        )}
      </section>
    );
  }

  return (
    <div className="editor-stack">
      {orderedRows.map((row, index) => (
        <RowRecord
          key={row.id}
          table={table}
          row={row}
          profiles={profiles}
          index={index}
          evidence={evidenceFor(row)}
          editable
          evidenceUrls={evidenceUrls}
        />
      ))}
      {showNew ? (
        <EditableRowForm
          table={table}
          profiles={profiles}
          evidenceUrls={evidenceUrls}
          onDone={() => setShowNew(false)}
        />
      ) : (
        <button className="add-row-button" onClick={() => setShowNew(true)}>
          <Plus size={20} />
          {t("Añadir otra fila", "Add another entry")}
        </button>
      )}
      {isCreator ? <CloseTableButton table={table} /> : null}
    </div>
  );
}
