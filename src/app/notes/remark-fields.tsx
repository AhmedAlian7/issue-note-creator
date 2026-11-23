import { ar } from "@/lib/i18n";
import { canColorRemark } from "@/lib/remarks";

type Remark = { remarks: string; redRemark: boolean };

export function RemarkFields({
  remarks,
  redRemark,
  onChange,
}: Remark & { onChange: (patch: Partial<Remark>) => void }) {
  return (
    <>
      <label>
        {ar.notes.remarks}
        <input
          maxLength={300}
          value={remarks}
          onChange={(e) => {
            const remarks = e.target.value;
            onChange({
              remarks,
              redRemark: redRemark && canColorRemark(remarks),
            });
          }}
        />
      </label>
      {canColorRemark(remarks) && (
        <label>
          <input
            type="checkbox"
            checked={redRemark}
            onChange={(e) => onChange({ redRemark: e.target.checked })}
          />
          {ar.notes.redRemark}
        </label>
      )}
    </>
  );
}
