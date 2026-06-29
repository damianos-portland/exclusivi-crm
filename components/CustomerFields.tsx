type Defaults = {
  name?: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  vatNumber?: string | null;
  address?: string | null;
  pms?: string | null;
  status?: string;
  notes?: string | null;
};

export function CustomerFields({ d = {} }: { d?: Defaults }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Επωνυμία / Όνομα *</label>
          <input name="name" required defaultValue={d.name ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Υπεύθυνος επικοινωνίας</label>
          <input name="contactPerson" defaultValue={d.contactPerson ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Κατάσταση</label>
          <select name="status" defaultValue={d.status ?? "ACTIVE"} className="input">
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Ενεργός</option>
            <option value="CHURNED">Ανενεργός</option>
          </select>
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" defaultValue={d.email ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Τηλέφωνο</label>
          <input name="phone" defaultValue={d.phone ?? ""} className="input" />
        </div>
        <div>
          <label className="label">ΑΦΜ</label>
          <input name="vatNumber" defaultValue={d.vatNumber ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Διεύθυνση</label>
          <input name="address" defaultValue={d.address ?? ""} className="input" />
        </div>
        <div>
          <label className="label">PMS</label>
          <input
            name="pms"
            defaultValue={d.pms ?? ""}
            placeholder="π.χ. Opera, Protel, Cloudbeds, Mews…"
            className="input"
          />
        </div>
        <div className="col-span-2">
          <label className="label">Σημειώσεις</label>
          <textarea name="notes" rows={2} defaultValue={d.notes ?? ""} className="input" />
        </div>
      </div>
    </>
  );
}
