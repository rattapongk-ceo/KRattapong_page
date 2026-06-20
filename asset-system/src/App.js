import { useState, useEffect } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbxSmbJ-EQa_wERp_sy8-JUFUumdd6DrWJnQR_x1DGTvPHQ52rKyKqcXgtd-2-3fDffw/exec";

async function apiCall(params) {
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) =>
    url.searchParams.set(k, String(v ?? ""))
  );
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`เซิร์ฟเวอร์ตอบกลับ ${res.status}`);
  const json = await res.json();
  if (json.success === false) throw new Error(json.error || "เกิดข้อผิดพลาดจาก Google Sheets");
  return json;
}

const STATUS = ["ปกติ", "ซ่อมบำรุง", "เสีย"];
const TYPES = ["คอมพิวเตอร์", "โน้ตบุ๊ก"];

const statusStyle = {
  ปกติ: { background: "#dcfce7", color: "#15803d", border: "1px solid #86efac" },
  ซ่อมบำรุง: { background: "#fef9c3", color: "#a16207", border: "1px solid #fde047" },
  เสีย: { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" },
};

const emptyForm = {
  id: "", name: "", type: "คอมพิวเตอร์",
  location: "", responsible: "", status: "ปกติ",
  lastMaintenance: "", notes: "",
};

function Spinner({ size = 32, color = "#1e40af" }) {
  return (
    <span style={{
      display: "inline-block",
      width: size,
      height: size,
      border: `3px solid #e5e7eb`,
      borderTop: `3px solid ${color}`,
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}

function Badge({ status }) {
  const s = statusStyle[status] || {};
  return (
    <span style={{
      ...s,
      padding: "2px 10px",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

function SummaryCard({ label, count, color, bg }) {
  return (
    <div style={{
      background: bg,
      border: `1.5px solid ${color}`,
      borderRadius: 12,
      padding: "18px 12px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{count}</div>
      <div style={{ fontSize: 14, color: "#555", marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function App() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formError, setFormError] = useState("");

  async function loadAssets() {
    setLoading(true);
    setError("");
    try {
      const res = await apiCall({ action: "getAll" });
      setAssets(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.message || "ไม่สามารถเชื่อมต่อ Google Sheets ได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAssets(); }, []);

  const filtered = assets.filter((a) => {
    const matchSearch =
      a.name?.includes(search) ||
      a.id?.includes(search) ||
      a.location?.includes(search) ||
      a.responsible?.includes(search);
    const matchStatus = filterStatus === "ทั้งหมด" || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    ทั้งหมด: assets.length,
    ปกติ: assets.filter((a) => a.status === "ปกติ").length,
    ซ่อมบำรุง: assets.filter((a) => a.status === "ซ่อมบำรุง").length,
    เสีย: assets.filter((a) => a.status === "เสีย").length,
  };

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(asset) {
    setForm({ ...asset });
    setEditId(asset.id);
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setFormError("");
  }

  function handleFormChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    if (!form.id.trim()) return setFormError("กรุณากรอกรหัสสินทรัพย์");
    if (!form.name.trim()) return setFormError("กรุณากรอกชื่อสินทรัพย์");
    if (!form.location.trim()) return setFormError("กรุณากรอกตำแหน่ง/ห้อง");
    if (!form.responsible.trim()) return setFormError("กรุณากรอกผู้รับผิดชอบ");
    if (!editId && assets.find((a) => a.id === form.id.trim())) {
      return setFormError("รหัสสินทรัพย์นี้มีอยู่แล้ว");
    }

    setSaving(true);
    setFormError("");
    try {
      const action = editId ? "update" : "add";
      await apiCall({ action, ...form, id: form.id.trim() });
      setShowForm(false);
      await loadAssets();
    } catch (e) {
      setFormError(e.message || "บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      await apiCall({ action: "delete", id });
      setDeleteConfirm(null);
      await loadAssets();
    } catch (e) {
      setError(e.message || "ลบไม่สำเร็จ กรุณาลองใหม่");
      setDeleteConfirm(null);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 4,
    display: "block",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "'Sarabun', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .header-inner { padding: 20px 32px; }
        .header-title { font-size: 22px; }
        .header-sub { font-size: 14px; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .toolbar-search { flex: 1; max-width: 320px; }
        .toolbar-select { width: auto; }
        .toolbar-add-wrap { margin-left: auto; }
        .toolbar-add-btn { white-space: nowrap; width: auto; }
        .table-wrap { overflow-x: auto; }
        .action-btn { padding: 5px 12px; font-size: 13px; }

        @media (max-width: 640px) {
          .header-inner { padding: 14px 16px; }
          .header-title { font-size: 16px; }
          .header-sub { font-size: 12px; }
          .summary-grid { grid-template-columns: repeat(2, 1fr); }
          .toolbar { flex-direction: column; align-items: stretch; }
          .toolbar-search { max-width: 100%; width: 100%; }
          .toolbar-select { width: 100%; }
          .toolbar-add-wrap { margin-left: 0; width: 100%; }
          .toolbar-add-btn { width: 100%; text-align: center; }
          .action-btn { padding: 8px 16px !important; font-size: 14px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: "#1e40af", color: "#fff" }}>
        <div className="header-inner" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 className="header-title" style={{ margin: 0, fontWeight: 700 }}>
            ระบบจัดการสินทรัพย์คอมพิวเตอร์
          </h1>
          <p className="header-sub" style={{ margin: "4px 0 0", opacity: 0.8 }}>
            สำนักงานบัญชี — บริหารจัดการอุปกรณ์คอมพิวเตอร์และโน้ตบุ๊ก
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px" }}>

        {/* Error Banner */}
        {error && (
          <div style={{
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            color: "#b91c1c",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 14,
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={loadAssets}
              style={{
                background: "#b91c1c",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                padding: "6px 16px",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >ลองใหม่</button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="summary-grid">
          <SummaryCard label="สินทรัพย์ทั้งหมด" count={counts.ทั้งหมด} color="#1e40af" bg="#eff6ff" />
          <SummaryCard label="ปกติ" count={counts.ปกติ} color="#15803d" bg="#f0fdf4" />
          <SummaryCard label="ซ่อมบำรุง" count={counts.ซ่อมบำรุง} color="#a16207" bg="#fefce8" />
          <SummaryCard label="เสีย" count={counts.เสีย} color="#b91c1c" bg="#fff1f2" />
        </div>

        {/* Toolbar */}
        <div style={{
          background: "#fff",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        }}>
          <div className="toolbar">
            <input
              type="text"
              placeholder="ค้นหา รหัส / ชื่อ / ห้อง / ผู้รับผิดชอบ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="toolbar-search"
              style={inputStyle}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="toolbar-select"
              style={inputStyle}
            >
              <option value="ทั้งหมด">ทุกสถานะ</option>
              {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="toolbar-add-wrap">
              <button
                onClick={openAdd}
                disabled={loading}
                className="toolbar-add-btn"
                style={{
                  background: "#1e40af",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  display: "block",
                }}
              >
                + เพิ่มสินทรัพย์
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap" style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <Spinner size={40} />
              <p style={{ marginTop: 16, color: "#6b7280", fontSize: 14 }}>
                กำลังโหลดข้อมูลจาก Google Sheets...
              </p>
            </div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                    {["รหัส", "ชื่อสินทรัพย์", "ประเภท", "ตำแหน่ง/ห้อง", "ผู้รับผิดชอบ", "สถานะ", "ซ่อมบำรุงล่าสุด", "หมายเหตุ", "จัดการ"].map((h) => (
                      <th key={h} style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: "#374151",
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
                        ไม่พบข้อมูลสินทรัพย์
                      </td>
                    </tr>
                  ) : (
                    filtered.map((a, i) => (
                      <tr
                        key={a.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: i % 2 === 0 ? "#fff" : "#fafafa",
                        }}
                      >
                        <td style={{ padding: "11px 16px", fontWeight: 600, color: "#1e40af", whiteSpace: "nowrap" }}>{a.id}</td>
                        <td style={{ padding: "11px 16px", minWidth: 180 }}>{a.name}</td>
                        <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>{a.type}</td>
                        <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>{a.location}</td>
                        <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>{a.responsible}</td>
                        <td style={{ padding: "11px 16px" }}><Badge status={a.status} /></td>
                        <td style={{ padding: "11px 16px", whiteSpace: "nowrap", color: "#6b7280" }}>
                          {a.lastMaintenance || "-"}
                        </td>
                        <td style={{ padding: "11px 16px", color: "#6b7280", maxWidth: 180 }}>{a.notes || "-"}</td>
                        <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>
                          <button
                            onClick={() => openEdit(a)}
                            className="action-btn"
                            style={{
                              background: "#e0e7ff",
                              color: "#3730a3",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              marginRight: 6,
                              fontWeight: 600,
                            }}
                          >แก้ไข</button>
                          <button
                            onClick={() => setDeleteConfirm(a.id)}
                            className="action-btn"
                            style={{
                              background: "#fee2e2",
                              color: "#b91c1c",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >ลบ</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div style={{ padding: "10px 16px", color: "#9ca3af", fontSize: 13, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
                <span>แสดง {filtered.length} จาก {assets.length} รายการ</span>
                <button
                  onClick={loadAssets}
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: "4px 12px",
                    fontSize: 12,
                    color: "#6b7280",
                    cursor: "pointer",
                  }}
                >รีเฟรช</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, padding: 16,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 14,
            padding: 28,
            width: "100%",
            maxWidth: 560,
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#1e40af" }}>
              {editId ? "แก้ไขสินทรัพย์" : "เพิ่มสินทรัพย์ใหม่"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>รหัสสินทรัพย์ *</label>
                <input
                  name="id"
                  value={form.id}
                  onChange={handleFormChange}
                  placeholder="เช่น PC-003"
                  disabled={!!editId || saving}
                  style={{ ...inputStyle, background: (editId || saving) ? "#f3f4f6" : "#fff" }}
                />
              </div>
              <div>
                <label style={labelStyle}>ประเภท *</label>
                <select name="type" value={form.type} onChange={handleFormChange} disabled={saving} style={inputStyle}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>ชื่อสินทรัพย์ *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="เช่น คอมพิวเตอร์ตั้งโต๊ะ Dell OptiPlex"
                  disabled={saving}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>ตำแหน่ง/ห้อง *</label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleFormChange}
                  placeholder="เช่น ห้องบัญชี"
                  disabled={saving}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>ผู้รับผิดชอบ *</label>
                <input
                  name="responsible"
                  value={form.responsible}
                  onChange={handleFormChange}
                  placeholder="ชื่อ-นามสกุล"
                  disabled={saving}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>สถานะ</label>
                <select name="status" value={form.status} onChange={handleFormChange} disabled={saving} style={inputStyle}>
                  {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>วันซ่อมบำรุงล่าสุด</label>
                <input
                  type="date"
                  name="lastMaintenance"
                  value={form.lastMaintenance}
                  onChange={handleFormChange}
                  disabled={saving}
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>หมายเหตุ</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="บันทึกเพิ่มเติม..."
                  disabled={saving}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>

            {formError && (
              <div style={{
                marginTop: 12,
                padding: "8px 12px",
                background: "#fee2e2",
                color: "#b91c1c",
                borderRadius: 8,
                fontSize: 13,
              }}>
                {formError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end", alignItems: "center" }}>
              {saving && <Spinner size={22} />}
              <button
                onClick={closeForm}
                disabled={saving}
                style={{
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 20px",
                  fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  opacity: saving ? 0.5 : 1,
                }}
              >ยกเลิก</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: "#1e40af",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 24px",
                  fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "กำลังบันทึก..." : editId ? "บันทึกการแก้ไข" : "เพิ่มสินทรัพย์"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, padding: 16,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 14,
            padding: 28,
            maxWidth: 380,
            width: "100%",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, color: "#111827" }}>ยืนยันการลบ</h3>
            <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14 }}>
              ต้องการลบสินทรัพย์ <strong style={{ color: "#b91c1c" }}>{deleteConfirm}</strong> ใช่หรือไม่?<br />
              การดำเนินการนี้ไม่สามารถยกเลิกได้
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
              {saving && <Spinner size={20} color="#b91c1c" />}
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={saving}
                style={{
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 24px",
                  fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  opacity: saving ? 0.5 : 1,
                }}
              >ยกเลิก</button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={saving}
                style={{
                  background: "#b91c1c",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 24px",
                  fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "กำลังลบ..." : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
