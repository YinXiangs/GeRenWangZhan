function articleMarkup(text){
 const inline=s=>escape(s).replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,label,url)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
 const lines=String(text).split(/\r?\n/),out=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(/^\|.+\|\s*$/.test(line)&&/^\|[\s:|\-]+\|\s*$/.test(lines[i+1]||'')){
   const cells=s=>s.trim().slice(1,-1).split('|').map(c=>c.trim());
   const head=cells(line);i++;const rows=[];
   while(/^\|.+\|\s*$/.test(lines[i+1]||'')){i++;rows.push(cells(lines[i]))}
   out.push('<div class="article-table-wrap" tabindex="0" role="region" aria-label="内容速查表，可横向滑动"><table><thead><tr>'+head.map(c=>'<th scope="col">'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');continue;
  }
  const heading=line.match(/^(#{1,3})\s+(.+)$/);
  if(heading){const level=Math.min(heading[1].length+1,4);out.push('<h'+level+'>'+inline(heading[2])+'</h'+level+'>')}
  else if(line.trim())out.push('<p>'+inline(line)+'</p>');
 }
 return out.join('');
}
