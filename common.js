/*! 越南語拼讀投影 — © 2026 詹宗龍（臺中明道中學）保留一切權利。 */
// 投影頁與審聽頁共用：教師修正、臺羅標調、題庫判定
(function(){
'use strict';
var D = window.VI_DATA, KEY = 'vi-tone-overrides';
var MARK = {2:'́', 3:'̀', 5:'̂', 7:'̄', 8:'̍'};
var MARK_TONE = {'́':2, '̀':3, '̂':5, '̄':7, '̍':8};
var INITIALS = ['tsh','ts','ph','th','kh','ng','p','t','k','m','n','l','s','h','b','g','j'];
var TONES = {
  1:{icon:'🦁', name:'陰平', shape:'高平'}, 2:{icon:'🐯', name:'陰上', shape:'高降'},
  3:{icon:'🐆', name:'陰去', shape:'低降'}, 4:{icon:'🐢', name:'陰入', shape:'低短'},
  5:{icon:'🐵', name:'陽平', shape:'上升'}, 7:{icon:'🐘', name:'陽去', shape:'中平'},
  8:{icon:'🦌', name:'陽入', shape:'高短'}
};

/* 臺羅標調：a ＞ o(oo 標前一個) ＞ e ＞ ui/iu 標後一個 ＞ i/u ＞ 成音節 m/n */
function markTone(syl, tone){
  var m = MARK[tone]; if(!m) return syl;
  var i;
  if(syl.indexOf('a')>=0) i = syl.indexOf('a');
  else if(syl.indexOf('o')>=0) i = syl.indexOf('o');
  else if(syl.indexOf('e')>=0) i = syl.indexOf('e');
  else if(syl.indexOf('ui')>=0) i = syl.indexOf('ui')+1;
  else if(syl.indexOf('iu')>=0) i = syl.indexOf('iu')+1;
  else { i = syl.search(/[iu]/); if(i<0) i = syl.search(/[mn]/); }
  return (syl.slice(0,i+1) + m + syl.slice(i+1)).normalize('NFC');
}
function isEntering(fin){ return /[ptkh]$/.test(fin); }

/* 解析教師輸入的臺羅：可用調符（tah、ūm）或數字調（um7）；沒標調時舒聲當 1、入聲當 4 */
function parseTl(s){
  s = String(s||'').normalize('NFD').toLowerCase().trim();
  var tone = null, d = s.match(/[1-8]$/);
  if(d){ tone = +d[0]; s = s.slice(0,-1); }
  for(var k in MARK_TONE){ if(s.indexOf(k)>=0) tone = MARK_TONE[k]; }
  s = s.replace(/[̀-ͯ]/g,'').replace(/[^a-z]/g,'');
  if(!s) return null;
  var ini = '';
  for(var i=0;i<INITIALS.length;i++){
    var x = INITIALS[i];
    if(s.indexOf(x)===0 && s.length>x.length){ ini = x; break; }
  }
  var fin = s.slice(ini.length);
  if(!tone || tone===6) tone = isEntering(fin) ? 4 : 1;
  if(isEntering(fin) && tone!==4 && tone!==8) tone = 4;
  if(!isEntering(fin) && (tone===4 || tone===8)) tone = 1;
  return {ini:ini, fin:fin, tone:tone};
}

/* 修正來源：build 時寫入的 tone_overrides.json（D.overrides）＋本瀏覽器的審聽紀錄（localStorage） */
function readLocal(){
  var o = {};
  try{ o = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }catch(e){ o = {}; }
  Object.keys(o).forEach(function(k){ if(typeof o[k]==='number') o[k] = {tone:o[k]}; }); // 舊版只存調號
  return o;
}
function writeLocal(o){ try{ localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){} }
/* 本機紀錄「疊加」在內建修正上（不整筆取代），避免舊版留下的紀錄蓋掉內建的不列入設定 */
function effective(code){
  var base = (D.overrides||{})[code], loc = readLocal()[code];
  // 本機紀錄若早於這次 build（已匯出併入 data.js），以 data.js 為準
  if(loc && base && !(loc.t > (D.builtAt||0))) loc = null;
  if(loc && loc.auto) return null;
  var o = {}, k;
  for(k in base||{}) o[k] = base[k];
  for(k in loc||{}) if(k!=='t') o[k] = loc[k];
  if(loc && loc.tl && !('tone' in loc)) delete o.tone;   // 本機改了拼音就以本機拼音的調為準
  if(loc && loc.tone && !('tl' in loc)) delete o.tl;      // 本機只改調就沿用自動拼音
  delete o.k;
  return Object.keys(o).length ? o : null;
}
/* entry 為 null：回到自動判定 */
function setOverride(code, entry){
  var local = readLocal();
  if(entry){
    var cur = local[code] && !local[code].auto ? local[code] : {};
    if(entry.tl){ delete cur.tone; }
    if(entry.tone){ delete cur.tl; }
    for(var k in entry) cur[k] = entry[k];
    cur.t = Date.now();
    local[code] = cur;
  }
  else if((D.overrides||{})[code]) local[code] = {auto:1, t:Date.now()};
  else delete local[code];
  writeLocal(local);
}
function clearLocal(){ writeLocal({}); }
function exportOverrides(){
  var all = {}, base = D.overrides || {}, local = readLocal();
  Object.keys(base).forEach(function(k){ all[k] = base[k]; });
  Object.keys(local).forEach(function(k){
    if(base[k] && !(local[k].t > (D.builtAt||0))) return;   // 舊紀錄不覆蓋 data.js
    if(local[k].auto) delete all[k];
    else { all[k] = {}; for(var f in local[k]) if(f!=='t') all[k][f] = local[k][f]; }
  });
  Object.keys(all).forEach(function(k){ all[k].k = (D.spell||{})[k]; });
  return all;
}

/* 單一音節的最終結果 */
function resolve(code){
  var it = D.items[code]; if(!it) return null;
  var o = effective(code);
  var r = {code:code, ch:D.spell[code], ini:it.ini, fin:it.fin, tone:it.tone, autoTone:it.tone,
           sim:it.sim, note:(D.notes||[])[it.n] || '', c:it.c || [], fixed:!!o, excluded:!!(o && o.x)};
  if(o && o.tl){ var p = parseTl(o.tl); if(p){ r.ini = p.ini; r.fin = p.fin; r.tone = p.tone; } }
  if(o && o.tone && (isEntering(r.fin) === (+o.tone===4 || +o.tone===8))) r.tone = +o.tone;
  r.entering = isEntering(r.fin);
  r.plain = r.ini + r.fin;
  r.tl = markTone(r.plain, r.tone);
  r.inPool = !r.excluded && (r.sim >= D.poolMin || r.fixed);
  return r;
}

/* 音檔路徑：Windows 保留名稱（ão＝aux）的檔名後面加 _ */
var FIX = {}; (D.fileFix||[]).forEach(function(c){ FIX[c] = 1; });
function audioSrc(code){ return 'audio/' + code + (FIX[code] ? '_' : '') + '.mp3'; }

window.VI = {TONES:TONES, audioSrc:audioSrc, markTone:markTone, parseTl:parseTl, isEntering:isEntering,
  resolve:resolve, setOverride:setOverride, clearLocal:clearLocal, exportOverrides:exportOverrides,
  hasLocal:function(code){ return readLocal().hasOwnProperty(code); }};
})();
