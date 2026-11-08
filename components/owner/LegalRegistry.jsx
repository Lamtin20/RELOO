"use client";
import { useEffect, useState } from "react";
import { ExternalLink, FileCheck2, Pencil } from "lucide-react";
export function LegalRegistry() {
  const [documents, setDocuments] = useState([]),
    [selected, setSelected] = useState(null),
    [reason, setReason] = useState(""),
    [reviewed, setReviewed] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false), [editing,setEditing]=useState(false), [message,setMessage]=useState(""), [checked,setChecked]=useState([]);
  async function load() {
    const response = await fetch("/api/crm/legal"),
      data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setDocuments(data.documents);
  }
  useEffect(() => {
    const timer = setTimeout(
      () => load().catch((cause) => setError(cause.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, []);
  async function publish(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/crm/legal", {
          method: editing?"PUT":"POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: selected.slug,
            ...(editing?{title:selected.title,sections:selected.sections,version:selected.contentVersion||0}:{}),
            hash: selected.hash,
            reason,
            reviewed,
          }),
        }),
        data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSelected(null);setMessage(editing?"Đã lưu dự thảo. Ban hành để áp dụng phiên bản mới.":"Đã ban hành tài liệu.");
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  async function publishSelected(){setBusy(true);setError('');try{const r=await fetch('/api/crm/legal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({documents:documents.filter(d=>checked.includes(d.slug)).map(d=>({slug:d.slug,hash:d.hash}))})}),d=await r.json();if(!r.ok)throw Error(d.error);setChecked([]);setMessage('Đã ban hành '+d.count+' tài liệu.');await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return (
    <section>
      {message&&<p role="status">{message}</p>}
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      <div className="ops-actions"><button className="btn btn-secondary" disabled={busy} onClick={()=>setChecked(documents.filter(d=>d.draft).map(d=>d.slug))}>Chọn các dự thảo</button><button className="btn btn-primary" disabled={busy||!checked.length} onClick={publishSelected}>Ban hành mục đã chọn ({checked.length})</button></div>
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Chọn</th><th>Tài liệu</th>
              <th>Phiên bản</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((item) => (
              <tr key={item.slug}>
                <td><input type="checkbox" aria-label={"Chọn "+item.title} disabled={busy||!item.draft} checked={checked.includes(item.slug)} onChange={e=>setChecked(old=>e.target.checked?[...old,item.slug]:old.filter(id=>id!==item.slug))}/></td><td>{item.title}</td>
                <td>
                  {item.templateVersion} · pháp nhân v{item.entityVersion}
                </td>
                <td>
                  {item.draft ? "Dự thảo / cần rà soát" : "Đã ban hành nội bộ"}
                </td>
                <td>
                  <div className="ops-actions">
                    <a
                      href={`https://reloo.vn/cms/${item.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Xem tài liệu"
                    >
                      <ExternalLink size={18} />
                    </a>
                    <button className="icon-tool" aria-label={"Sửa "+item.title} onClick={()=>{setSelected(structuredClone(item));setEditing(true);}}><Pencil size={18}/></button>
                    {item.draft && (
                      <button
                        className="icon-tool"
                        title="Ghi nhận rà soát và ban hành"
                        onClick={() => {
                          setSelected(item);setEditing(false);
                          setReason("");
                          setReviewed(false);
                        }}
                      >
                        <FileCheck2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="profile-note">
        Ban hành nội bộ không thay thế xác nhận đăng ký từ cơ quan quản lý. Khi
        nội dung hoặc khai báo pháp nhân thay đổi, phiên bản mới cần rà soát;
        lịch sử đã chấp nhận giữ nguyên.
      </p>
      {selected && (
        <form className="integration-editor" onSubmit={publish}>
          <h3>{selected.title}</h3>
          {editing&&<><label>Tên tài liệu<input className="input" required value={selected.title} onChange={e=>setSelected({...selected,title:e.target.value})}/></label>{selected.sections.map((section,i)=><fieldset key={i}><label>Tiêu đề mục<input className="input" required value={section.title} onChange={e=>setSelected({...selected,sections:selected.sections.map((s,j)=>i===j?{...s,title:e.target.value}:s)})}/></label><label>Nội dung<textarea className="input" required rows={6} value={section.paragraphs.join('\n\n')} onChange={e=>setSelected({...selected,sections:selected.sections.map((s,j)=>i===j?{...s,paragraphs:e.target.value.split(/\n\n/)}:s)})}/></label></fieldset>)}</>}
          {!editing&&<p>Ban hành phiên bản đang hiển thị. Phiên CRM đã xác thực bảo vệ thao tác theo quyền được cấp.</p>}
          <button className="btn btn-primary" disabled={busy}>
            <FileCheck2 size={17} />
            {editing?"Lưu dự thảo":"Ban hành tài liệu"}
          </button>
        </form>
      )}
    </section>
  );
}
