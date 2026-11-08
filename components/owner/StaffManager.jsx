"use client";
import { useEffect,useState } from "react";
import { Users,ShieldCheck,Plus,Save,X } from "lucide-react";
import { CRM_ROLE_LABELS,CRM_PERMISSION_GROUPS,CRM_EXTRA_PERMISSION_LABELS,CRM_PERMISSIONS,isFullCrmRole } from "@/lib/operations/access";
import './StaffManager.css';
const PRESETS={support:["crm.read","customers.read","support.read","support.write","callcenter.read","callcenter.write"],kyc:["crm.read","kyc.read","kyc.write","risk.read"],content:["crm.read","content.read","content.write","promotions.read","promotions.write"],accounting:["crm.read","accounting.read","accounting.write","customers.read","tax.read","tax.write"]};
async function api(path,body){const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),d=await r.json();if(!r.ok)throw Error(d.error);return d;}
export function StaffManager({customers=[]}){
  const [data,setData]=useState(null),[form,setForm]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  async function load(){setData(await api('/api/crm/staff'));}
  useEffect(()=>{const t=setTimeout(()=>load().catch(e=>setError(e.message)),0);return ()=>clearTimeout(t);},[]);
  function edit(row){setError('');setNotice('');setForm(row?{id:row.profile_id,role:row.role,permissions:row.permissions,enabled:row.enabled,reason:''}:{id:'',role:'staff',permissions:['crm.read'],enabled:true,reason:''});}
  function toggle(permission,checked){setForm(old=>{const ps=new Set(old.permissions.filter(p=>p!=='*'));if(checked){ps.add(permission);ps.add(permission.split('.')[0]+'.read');}else{ps.delete(permission);if(permission.endsWith('.read'))for(const p of [...ps])if(p.startsWith(permission.split('.')[0]+'.'))ps.delete(p);}ps.add('crm.read');return {...old,permissions:[...ps]};});}
  return <section><header className="promo-heading"><div><h2>Nhân viên & phân quyền</h2><p>Đăng nhập và Google Authenticator bắt buộc cho mọi tài khoản CRM.</p></div>{data?.canManage&&<button className="btn btn-primary" onClick={()=>edit(null)}><Plus size={17}/> Cấp quyền tài khoản</button>}</header>
    {error&&<p role="alert" className="ops-error">{error}</p>}{notice&&<p role="status" className="cashflow-success">{notice}</p>}
    <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Quyền</th><th>Thao tác</th></tr></thead><tbody>{data?.staff.map(s=><tr key={s.profile_id}><td>{s.profiles?.name}<small>{s.profiles?.email}</small></td><td>{CRM_ROLE_LABELS[s.role]||s.role}</td><td>{s.enabled?'Được truy cập':'Đã ngừng truy cập'}</td><td>{isFullCrmRole(s.role)?'Toàn bộ hệ thống':s.permissions.filter(p=>p!=='*').join(', ')}</td><td>{data.canManage&&<button className="btn btn-secondary" disabled={s.profile_id===data.currentProfileId} onClick={()=>edit(s)}>Chỉnh quyền</button>}</td></tr>)}</tbody></table></div>
    {form&&<form className="staff-role-card" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await api('/api/crm/decisions',{kind:'staff',...form,permissions:isFullCrmRole(form.role)?['*']:form.permissions.filter(p=>p!=='*')});await load();setForm(null);setNotice('Đã cập nhật quyền và ghi nhật ký người thực hiện.');}catch(e){setError(e.message);}finally{setBusy(false);}}}>
      <header className="promo-heading"><h3>Khai báo quyền tài khoản</h3><button className="wallet-icon-button" type="button" aria-label="Đóng phân quyền" onClick={()=>setForm(null)}><X size={20}/></button></header>
      <div className="ops-form-grid"><label>Tài khoản<select className="input" required value={form.id} onChange={e=>setForm({...form,id:e.target.value})}><option value="">Chọn tài khoản đã đăng ký</option>{customers.filter(c=>c.id!==data.currentProfileId).map(c=><option key={c.id} value={c.id}>{c.name} · {c.email}</option>)}</select></label>
      <label>Vai trò<select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value,permissions:e.target.value==='staff'?['crm.read']:['*']})}>{Object.entries(CRM_ROLE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
      {isFullCrmRole(form.role)?<p className="staff-role-card"><ShieldCheck size={20}/> Vai trò này có toàn quyền quản lý và phân quyền nhân viên.</p>:<>
        <div className="profile-actions">{[['support','CSKH'],['kyc','Duyệt căn cước'],['content','Nội dung'],['accounting','Kế toán']].map(([k,v])=><button type="button" className="btn btn-secondary" key={k} onClick={()=>setForm({...form,permissions:PRESETS[k]})}><Users size={15}/> Mẫu {v}</button>)}</div>
        <div className="staff-permission-grid">{Object.entries(CRM_PERMISSION_GROUPS).filter(([group])=>group!=='crm').map(([group,label])=><div className="staff-permission-group" key={group}><strong>{label}</strong>{['read','write'].filter(action=>CRM_PERMISSIONS.includes(group+'.'+action)&&group+'.'+action!=='roles.write').map(action=><label key={action}><input type="checkbox" checked={form.permissions.includes(group+'.'+action)} onChange={e=>toggle(group+'.'+action,e.target.checked)}/>{action==='read'?'Xem':'Tạo / chỉnh sửa'}</label>)}{Object.entries(CRM_EXTRA_PERMISSION_LABELS).filter(([key])=>key.startsWith(group+'.')).map(([key,text])=><label key={key}><input type="checkbox" checked={form.permissions.includes(key)} onChange={e=>toggle(key,e.target.checked)}/>{text}</label>)}</div>)}</div>
      </>}
      <label className="profile-check"><input type="checkbox" checked={form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})}/> Cho phép vào CRM</label>
      <label>Lý do cập nhật quyền<textarea className="input" required minLength={20} maxLength={2000} rows={3} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label>
      <div className="promo-actions"><button className="btn btn-primary" disabled={busy||!form.id}><Save size={17}/> {busy?'Đang lưu…':'Lưu phân quyền'}</button></div>
    </form>}
    <p className="profile-note">Nhân viên không được cấp quyền toàn bộ hoặc tự nâng quyền. Mọi thao tác thay đổi cần tài khoản quản trị/admin và được ghi nhật ký.</p>
  </section>;
}
