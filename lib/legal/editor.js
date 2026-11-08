export function validateLegalContent(input){
 if(typeof input?.title!=='string'||!input.title.trim()||input.title.length>200||!Array.isArray(input.sections)||input.sections.length<1||input.sections.length>40)throw Error('Kiểm tra tiêu đề và các mục tài liệu.');
 const sections=input.sections.map(s=>{if(typeof s.title!=='string'||!s.title.trim()||s.title.length>200||!Array.isArray(s.paragraphs)||!s.paragraphs.length||s.paragraphs.length>30||s.paragraphs.some(p=>typeof p!=='string'||!p.trim()||p.length>10000))throw Error('Mỗi mục cần tiêu đề và nội dung hợp lệ.');return {title:s.title.trim(),paragraphs:s.paragraphs.map(p=>p.trim())};});
 return {title:input.title.trim(),sections};
}
