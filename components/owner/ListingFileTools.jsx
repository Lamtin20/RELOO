"use client";
import { useRef, useState } from 'react';
import { Download, Upload, FileDown, Check, X, LoaderCircle } from 'lucide-react';
import { createListingCsv, parseListingCsv, LISTING_FILE_LIMIT } from '@/lib/listing-file';

export function ListingFileTools({ form, specs, addressDetail, onImport, disabled = false }) {
  const input = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function download(template) {
    setError('');
    try {
      const url = URL.createObjectURL(new Blob([createListingCsv({ form, specs, addressDetail }, template)], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url;
      link.download = template ? `reloo-mau-${form.category}.csv` : `reloo-ban-nhap-${form.category}.csv`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause.message); }
  }
  async function readFile(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setBusy(true); setError(''); setPreview(null);
    try {
      if (!/\.csv$/i.test(file.name) || file.size > LISTING_FILE_LIMIT) throw new Error('Chọn file CSV tối đa 256 KB.');
      setPreview({ ...parseListingCsv(await file.text()), filename: file.name });
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  return <section className="owner-file-tools" aria-label="Nhập và xuất thông tin tin đăng">
    <div className="owner-file-tools__actions">
      <button type="button" className="btn btn-secondary" onClick={() => download(true)} disabled={!form.category || busy || disabled} title="Tải file mẫu CSV theo danh mục đã chọn"><FileDown size={16} />Tải file mẫu</button>
      <button type="button" className="btn btn-secondary" onClick={() => input.current?.click()} disabled={busy || disabled} title="Nhập thông tin món đồ từ file CSV">{busy ? <LoaderCircle size={16} className="spin" /> : <Upload size={16} />}Nhập CSV</button>
      <button type="button" className="icon-tool" onClick={() => download(false)} disabled={!form.category || busy || disabled} title="Xuất thông tin bản nháp ra CSV" aria-label="Xuất bản nháp CSV"><Download size={18} /></button>
      <input type="file" accept=".csv,text/csv" hidden ref={input} onChange={readFile} />
    </div>
    {error && <p className="owner-field-error" role="alert">{error}</p>}
    {preview && <div className="owner-file-preview">
      <h3>{preview.form.title || 'Chưa nhập tên món đồ'}</h3>
      <p>{preview.filename} · {preview.categoryName} · {preview.filled} trường đã nhập</p>
      {preview.missing.length > 0 && <p className="owner-field-error">Còn thiếu: {preview.missing.join(', ')}.</p>}
      <div className="owner-file-tools__actions">
        <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => { onImport(preview); setPreview(null); }}><Check size={16} />Áp dụng vào bản nháp</button>
        <button type="button" className="icon-tool" title="Hủy nhập file" aria-label="Hủy nhập file" onClick={() => setPreview(null)}><X size={18}/></button>
      </div>
    </div>}
  </section>;
}
