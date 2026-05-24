// @ts-nocheck
import "./styles.css";
(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const l of i.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&n(l)}).observe(document,{childList:!0,subtree:!0});function a(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(o){if(o.ep)return;o.ep=!0;const i=a(o);fetch(o.href,i)}})();(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function e(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(n){if(n.ep)return;n.ep=!0;const o=e(n);fetch(n.href,o)}})();/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Z={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const G=([t,e,a])=>{const n=document.createElementNS("http://www.w3.org/2000/svg",t);return Object.keys(e).forEach(o=>{n.setAttribute(o,String(e[o]))}),a!=null&&a.length&&a.forEach(o=>{const i=G(o);n.appendChild(i)}),n},wt=(t,e={})=>{const a={...Z,...e};return G(["svg",a,t])};/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const St=t=>{for(const e in t)if(e.startsWith("aria-")||e==="role"||e==="title")return!0;return!1};/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Mt=(...t)=>t.filter((e,a,n)=>!!e&&e.trim()!==""&&n.indexOf(e)===a).join(" ").trim();/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const kt=t=>t.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,a,n)=>n?n.toUpperCase():a.toLowerCase());/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const qt=t=>{const e=kt(t);return e.charAt(0).toUpperCase()+e.slice(1)};/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const It=t=>Array.from(t.attributes).reduce((e,a)=>(e[a.name]=a.value,e),{}),_=t=>typeof t=="string"?t:!t||!t.class?"":t.class&&typeof t.class=="string"?t.class.split(" "):t.class&&Array.isArray(t.class)?t.class:"",W=(t,{nameAttr:e,icons:a,attrs:n})=>{var o;const i=t.getAttribute(e);if(i==null)return;const l=qt(i),d=a[l];if(!d)return console.warn(`${t.outerHTML} icon name was not found in the provided icons object.`);const s=It(t),O=St(s)?{}:{"aria-hidden":"true"},j={...Z,"data-lucide":i,...O,...n,...s},p=_(s),bt=_(n),V=Mt("lucide",`lucide-${i}`,...p,...bt);V&&Object.assign(j,{class:V});const gt=wt(d,j);return(o=t.parentNode)==null?void 0:o.replaceChild(gt,t)};/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Lt=[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516"}],["path",{d:"M12 13h4"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1"}],["path",{d:"M12 8h8"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2"}],["circle",{cx:"16",cy:"13",r:".5"}],["circle",{cx:"18",cy:"3",r:".5"}],["circle",{cx:"20",cy:"21",r:".5"}],["circle",{cx:"20",cy:"8",r:".5"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Ct=[["path",{d:"M16 14v2.2l1.6 1"}],["path",{d:"M16 2v4"}],["path",{d:"M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"}],["path",{d:"M3 10h5"}],["path",{d:"M8 2v4"}],["circle",{cx:"16",cy:"16",r:"6"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const At=[["path",{d:"m6 9 6 6 6-6"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const xt=[["circle",{cx:"12",cy:"12",r:"10"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Nt=[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m9 12 2 2 4-4"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const jt=[["path",{d:"M12 15V3"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}],["path",{d:"m7 10 5 5 5-5"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Tt=[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5"}],["path",{d:"M10 9H8"}],["path",{d:"M16 13H8"}],["path",{d:"M16 17H8"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Et=[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Rt=[["path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}],["path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Ot=[["path",{d:"m15 9-6 6"}],["path",{d:"M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"}],["path",{d:"m9 9 6 6"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Ht=[["path",{d:"M19.07 4.93A10 10 0 0 0 6.99 3.34"}],["path",{d:"M4 6h.01"}],["path",{d:"M2.29 9.62A10 10 0 1 0 21.31 8.35"}],["path",{d:"M16.24 7.76A6 6 0 1 0 8.23 16.67"}],["path",{d:"M12 18h.01"}],["path",{d:"M17.99 11.66A6 6 0 0 1 15.77 16.67"}],["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"m13.41 10.59 5.66-5.66"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Pt=[["path",{d:"M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{d:"M3 3v5h5"}],["path",{d:"M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"}],["path",{d:"M16 16h5v5"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Ft=[["path",{d:"m8 11 2 2 4-4"}],["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Bt=[["path",{d:"m21 21-4.34-4.34"}],["circle",{cx:"11",cy:"11",r:"8"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Dt=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}],["path",{d:"m9 12 2 2 4-4"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Jt=[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"}],["path",{d:"M20 2v4"}],["path",{d:"M22 4h-4"}],["circle",{cx:"4",cy:"20",r:"2"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Ut=[["line",{x1:"10",x2:"14",y1:"2",y2:"2"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11"}],["circle",{cx:"12",cy:"14",r:"8"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const zt=[["path",{d:"M10 11v6"}],["path",{d:"M14 11v6"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"}],["path",{d:"M3 6h18"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Vt=[["path",{d:"M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"}],["path",{d:"M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"}],["path",{d:"M18 9h1.5a1 1 0 0 0 0-5H18"}],["path",{d:"M4 22h16"}],["path",{d:"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"}],["path",{d:"M6 9H4.5a1 1 0 0 1 0-5H6"}]];/**
* @license lucide v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/const Q=({icons:t={},nameAttr:e="data-lucide",attrs:a={},root:n=document,inTemplates:o}={})=>{if(!Object.values(t).length)throw new Error(`Please provide an icons object.
If you want to use all the icons you can import it like:
 \`import { createIcons, icons } from 'lucide';
lucide.createIcons({icons});\``);if(typeof n>"u")throw new Error("`createIcons()` only works in a browser environment.");if(Array.from(n.querySelectorAll(`[${e}]`)).forEach(i=>W(i,{nameAttr:e,icons:t,attrs:a})),o&&Array.from(n.querySelectorAll("template")).forEach(i=>Q({icons:t,nameAttr:e,attrs:a,root:i.content,inTemplates:o})),e==="data-lucide"){const i=n.querySelectorAll("[icon-name]");i.length>0&&(console.warn("[Lucide] Some icons were found with the now deprecated icon-name attribute. These will still be replaced for backwards compatibility, but will no longer be supported in v1.0 and you should switch to data-lucide"),Array.from(i).forEach(l=>W(l,{nameAttr:"icon-name",icons:t,attrs:a})))}},Y=document.querySelector("#app"),P="nbBoActiveJobId",tt="nbBoActiveJobIds",T=8,et="nbBoWorkbenchTab",nbDismissKey="nbBoDismissedJobIds",nbJobNamesKey="nbBoJobNames";let k=null,h=null,q="",nt="",v=null,b=[],S=1,x,$="",I={},A=localStorage.getItem(et)||"search";const _t={BrainCircuit:Lt,CalendarClock:Ct,ChevronDown:At,CircleAlert:xt,CircleCheck:Nt,Download:jt,FileText:Tt,Layers3:Et,Link:Rt,OctagonX:Ot,Radar:Ht,RefreshCcw:Pt,Search:Bt,SearchCheck:Ft,ShieldCheck:Dt,Sparkles:Jt,Timer:Ut,Trash2:zt,Trophy:Vt};function c(t){return`<i data-lucide="${r(t)}" aria-hidden="true"></i>`}function f(){Q({icons:_t})}function r(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function u(t){return Array.isArray(t)?t:[]}function at(t){return/^https?:\/\//i.test(String(t||"").trim())}async function w(t,e={}){const a=await fetch(t,{...e,headers:{"content-type":"application/json",...e.headers||{}}}),n=await a.json();if(!a.ok||n.ok===!1)throw new Error(n.error||`请求失败：${a.status}`);return n}function rt(){const t=window.location.pathname.split("/").filter(Boolean)[0]||"";return t==="cn"?"china":t==="intl"?"international":""}function ot(t){const e=rt();if(!e)return t;const a=t.includes("?")?"&":"?";return`${t}${a}mode=${e}`}function B(t){const e=Number(t||0);if(!Number.isFinite(e)||e<=0)return"-";const a=Math.round(e/1e3),n=Math.floor(a/60),o=a%60;if(n>=60){const i=Math.floor(n/60),l=n%60;return l?`${i}小时${l}分钟`:`${i}小时`}return n>0?`${n}分${o}秒`:`${o}秒`}function R(t){return t.qualityText?t.qualityText:t.qualityLevel==="diagnostic"?"诊断":t.qualityLevel==="limited"?"有限资料":t.qualityLevel==="brief"?"简版":"正式"}function nbJobNames(){try{return JSON.parse(localStorage.getItem(nbJobNamesKey)||"{}")}catch{return{}}}function nbSaveJobName(t,e){if(!t||!e)return;const a=nbJobNames();a[t]=e,localStorage.setItem(nbJobNamesKey,JSON.stringify(a))}function nbRemoveJobName(t){const e=nbJobNames();delete e[t],localStorage.setItem(nbJobNamesKey,JSON.stringify(e))}function nbDismissed(){try{return JSON.parse(localStorage.getItem(nbDismissKey)||"[]")}catch{return[]}}function nbSaveDismissed(t){localStorage.setItem(nbDismissKey,JSON.stringify(Array.from(new Set(t.filter(Boolean))).slice(0,80)))}function M(){const t=localStorage.getItem(P);let e=[];try{e=JSON.parse(localStorage.getItem(tt)||"[]")}catch{e=[]}const a=new Set(nbDismissed());return t&&e.push(t),Array.from(new Set(e.filter(Boolean))).filter(n=>!a.has(n))}function it(t){const e=Array.from(new Set(t.filter(Boolean)));localStorage.setItem(tt,JSON.stringify(e)),e[0]?localStorage.setItem(P,e[0]):localStorage.removeItem(P)}function st(t,e=""){e&&nbSaveJobName(t,e),nbSaveDismissed(nbDismissed().filter(a=>a!==t)),it([t,...M().filter(a=>a!==t)].slice(0,20)),$=t}function H(t){t&&nbSaveDismissed([t,...nbDismissed()]),it(M().filter(e=>e!==t)),nbRemoveJobName(t),delete I[t],$===t&&($=M()[0]||""),N()}function L(t){return t.opportunityRating||{status:"not_rated",label:"暂不评级",notRatedReason:"旧报告或公开信息不足。"}}function F(t){const e=L(t);return e.status!=="rated"?"rating-not-rated":`rating-${String(e.grade||"D").toLowerCase()}`}function Wt(t){const e=L(t);return e.status!=="rated"?"暂不评级":`${e.priorityLevel||e.label}｜${e.score}分`}function Xt(t){const e=L(t);return e.status!=="rated"?"公开信息不足":`置信度${e.confidenceLabel||"-"}｜${e.nextAction||"查看评估"}`}function Kt(){Y.innerHTML=`
    <main class="app-shell">
      <section class="hero">
        <div class="kicker">${c("Radar")} 售前 / Deep Research 商机挖掘 <span id="runtimeModeBadge" class="mode-badge">通道检测中</span></div>
        <h1>企业商机挖掘agent</h1>
        <p>输入企业名称，先核对主体，再深度检索公开信息，生成销售会前客户战报。</p>
        <form id="companyForm" class="query-panel">
          <label>
            <span>企业名称</span>
            <input id="companyInput" placeholder="例如：博格华纳汽车零部件（宁波）有限公司" required />
          </label>
          <label>
            <span>地区线索</span>
            <input id="regionInput" placeholder="可选，例如：宁波 / 上海 / 中国" />
          </label>
          <label>
            <span>行业线索</span>
            <input id="industryInput" placeholder="可选，例如：汽车零部件 / 制造业" />
          </label>
          <label class="full-row">
            <span>已掌握的 AI 需求</span>
            <textarea id="aiNeedInput" rows="3" placeholder="可选。例如：客户提出研发需要 DFM 能力；希望做知识库、质量追溯、数据问答或智能体平台。"></textarea>
          </label>
          <label class="full-row upload-row">
            <span>上传年报 PDF（可选）</span>
            <input id="annualReportInput" type="file" accept="application/pdf,.pdf" />
            <small id="annualReportHint">仅支持可复制文字的 PDF，建议 5MB 以内；系统只提取指标和证据片段，不上传扫描版 OCR。</small>
          </label>
          <button class="primary" type="submit">${c("SearchCheck")}核对企业</button>
        </form>
      </section>

      <nav class="workbench-tabs" aria-label="工作台切换">
        <button class="tab-button" data-tab="search" type="button">${c("SearchCheck")}搜索 / 任务管理</button>
        <button class="tab-button" data-tab="reports" type="button">${c("FileText")}报告清单</button>
      </nav>

      <section id="searchTab" class="tab-pane">
        <section id="taskCenter" class="status-area"></section>
        <section id="statusArea" class="status-area"></section>
        <section id="candidateArea" class="candidate-area"></section>
      </section>

      <section id="reportsTab" class="tab-pane">
        <section class="toolbar">
          <div>
            <h2>报告清单</h2>
            <p>同一企业近 7 天默认复用最新报告。重新生成会覆盖近 7 天内同企业入口。</p>
          </div>
          <div class="history-search">
            <input id="historyInput" placeholder="搜索企业、行业、地区或关键词" />
            <select id="historyPeriod" aria-label="历史报告时间范围">
              <option value="7d">近7天</option>
              <option value="30d" selected>近30天</option>
              <option value="90d">近90天</option>
              <option value="all">全部</option>
            </select>
            <select id="historyRating" aria-label="商机评级筛选">
              <option value="all" selected>全部评级</option>
              <option value="A">A 级</option>
              <option value="B">B 级</option>
              <option value="C">C 级</option>
              <option value="D">D 级</option>
              <option value="not_rated">暂不评级</option>
            </select>
            <button id="historyButton" type="button">${c("Search")}搜索</button>
          </div>
        </section>
        <section id="historyArea" class="history-area"></section>
      </section>
    </main>
  `,document.querySelector("#companyForm").addEventListener("submit",Yt),document.querySelector("#historyButton").addEventListener("click",g),document.querySelector("#historyPeriod").addEventListener("change",g),document.querySelector("#historyRating").addEventListener("change",g),document.querySelector("#historyInput").addEventListener("keydown",t=>{t.key==="Enter"&&g()}),f(),Zt(),Gt(),D(A,!1),g(),ie()}async function Zt(){var t;const e=document.querySelector("#runtimeModeBadge");if(e)try{const a=await w(ot("/.netlify/functions/health")),n=u(a.channels).filter(o=>o.configured).length;e.textContent=`${((t=a.runtimeMode)==null?void 0:t.label)||"自动降级"}｜可用通道 ${n}`}catch{e.textContent="通道未确认"}}function Gt(){document.querySelectorAll("[data-tab]").forEach(t=>{t.addEventListener("click",()=>D(t.dataset.tab||"search"))})}function D(t,e=!0){A=t==="reports"?"reports":"search",e&&localStorage.setItem(et,A),document.querySelectorAll(".tab-pane").forEach(a=>{a.hidden=a.id!==`${A}Tab`}),document.querySelectorAll("[data-tab]").forEach(a=>{a.classList.toggle("active",a.dataset.tab===A)}),f()}function Qt(){var t;Y.innerHTML=`
    <main class="app-shell report-view-shell">
      <section class="report-topbar">
        <div>
          <a class="back-link" href="/">${c("Radar")}返回工作台</a>
          <h1>商机报告查看</h1>
          <p>报告在独立页面打开，便于阅读、下载和后续完善。</p>
        </div>
        <button id="openWorkbench" type="button">${c("Layers3")}显示进度</button>
      </section>
      <section id="statusArea" class="status-area"></section>
      <section id="reportArea" class="report-area"></section>
    </main>
  `,(t=document.querySelector("#openWorkbench"))==null||t.addEventListener("click",()=>{window.open("/","_blank","noopener")}),f()}function m(t="",e=0,a="",n=[],o){var i;const l=document.querySelector("#statusArea");if(!l)return;if(!t){l.innerHTML="";return}const d=u(n).slice(-8).reverse(),s=u(o==null?void 0:o.phaseTree),O=(o==null?void 0:o.jobId)||$||M()[0]||"",j=["queued","running"].includes(String((o==null?void 0:o.status)||""));l.innerHTML=`
    <div class="progress-card">
      <div class="progress-top">
        <div>
          <b>${r(t)}</b>
          <p>${r(a)}</p>
        </div>
        <span>${Math.max(0,Math.min(Number(e||0),100))}%</span>
      </div>
      <div class="progress-track"><div style="width:${Math.max(0,Math.min(e,100))}%"></div></div>
      ${o?`
        <div class="progress-stats">
          <span>${c("BrainCircuit")}当前模型：${r(o.currentModel||o.modelName||o.modelDisplay||"等待调用模型")}</span>
          <span>${c("Layers3")}当前阶段：${r(o.currentPhaseLabel||t)}</span>
          ${j?`<button id="cancelJob" class="danger ghost" type="button" data-job-id="${r(O)}">${c("OctagonX")}停止本次生成</button>`:""}
        </div>
      `:""}
      <details class="progress-detail" open><summary>${c("ChevronDown")}详细进度</summary>
      ${s.length?`
        <div class="phase-tree">
          ${s.map(p=>`
            <div class="phase-node ${r(p.status||"pending")}">
              <strong>${r(p.label)}</strong>
              <span>${p.completed!=null&&p.total?`${r(p.completed)}/${r(p.total)}`:r(p.currentStep||p.status||"")}</span>
              ${p.phaseElapsedText?`<small>本阶段耗时 ${r(p.phaseElapsedText)}${p.phaseEstimatedRemainingText?`｜剩余 ${r(p.phaseEstimatedRemainingText)}`:""}</small>`:""}
            </div>
          `).join("")}
        </div>
      `:""}
      ${d.length?`
        <div class="progress-log">
          ${d.map(p=>`
            <div class="progress-step">
              <strong>${r(p.phaseLabel||p.stage)}</strong>
              <span>${r(p.detail||"")}</span>
              <small>${p.completed!=null&&p.total?`${r(p.completed)}/${r(p.total)} · `:""}${Number(p.progress||0)}%${p.currentModel?` · 模型 ${r(p.currentModel)}`:""}${p.foundCount?` · 候选来源 ${r(p.foundCount)}`:""}${p.sourceCount?` · 可引用证据 ${r(p.sourceCount)}`:""}${p.qualityLevel?` · ${r(R(p))}`:""}</small>
            </div>
          `).join("")}
        </div>
      `:""}
      </details>
    </div>
  `,(i=document.querySelector("#cancelJob"))==null||i.addEventListener("click",()=>ct()),f()}async function ct(t=""){var e;const a=(t||((e=document.querySelector("#cancelJob"))==null?void 0:e.dataset.jobId)||$||M()[0]||"").trim();if(!a||!window.confirm("确认停止本次生成吗？系统会停止后续检索/分析，不生成正式报告，也不会写入历史报告。已经发出的单次网页读取或模型请求可能会等当前超时点结束。"))return;const n=(await w("/.netlify/functions/cancel-report-job",{method:"POST",body:JSON.stringify({jobId:a})})).job||{};I[a]=n,N(),m(n.stage||"任务已停止",Number(n.progress||100),n.detail||"已停止本次生成。",n.steps||[],n)}async function Yt(t){var e,a;t.preventDefault(),D("search"),h=null,q="",document.querySelector("#candidateArea").innerHTML="";const n=(document.querySelector("#companyInput").value||"").trim(),o=(document.querySelector("#regionInput").value||"").trim(),i=(document.querySelector("#industryInput").value||"").trim(),l=(document.querySelector("#aiNeedInput").value||"").trim(),d=((a=(e=document.querySelector("#annualReportInput"))==null?void 0:e.files)==null?void 0:a[0])||null;if(nt=l,v=null,!!n){m(d?"年报解析":"企业核对",d?6:10,d?"正在解析上传的 PDF 年报，提取关键指标和页码证据。":"正在查询候选主体和历史报告。");try{d&&(v=await te(d,n),ee(v)),m("企业核对",10,"正在查询候选主体和历史报告。");const s=await w("/.netlify/functions/resolve-company",{method:"POST",body:JSON.stringify({query:n,region:o,industry:i,aiNeeds:l,annualReportSummary:v})});m("",0),ne(s.candidates||[],s.cached||[])}catch(s){m("企业核对失败",100,s.message)}}}async function te(t,e){const a=new FormData;a.append("file",t),a.append("companyName",e);const n=await fetch("/.netlify/functions/upload-annual-report",{method:"POST",body:a}),o=await n.json();if(!n.ok||o.ok===!1)throw new Error(o.error||"年报解析失败");return o.annualReport||null}function ee(t){const e=document.querySelector("#annualReportHint");!e||!t||(e.innerHTML=`已解析《${r(t.fileName)}》：${r(t.pageCount)} 页，提取 ${r(u(t.metrics).length)} 个指标、${r(u(t.sections).length)} 个证据片段。`)}function ne(t,e){const a=document.querySelector("#candidateArea"),n=t.map((i,l)=>`
      <article class="choice-card">
        <div class="choice-head">
          <h3>${r(i.standardName||i.name)}</h3>
          <span>${r(i.confidence??"-")} 分</span>
        </div>
        <p>${r(i.reason||"候选企业主体")}</p>
        <dl>
          <dt>地区</dt><dd>${r(i.region||"-")}</dd>
          <dt>行业</dt><dd>${r(i.industry||"-")}</dd>
          <dt>股票</dt><dd>${r(i.stockCode?`${i.stockCode}${i.listingMarket?` · ${i.listingMarket}`:""}`:"-")}</dd>
          <dt>官网/来源</dt><dd>${i.website?`<a href="${r(i.website)}" target="_blank">${r(i.website)}</a>`:"-"}</dd>
        </dl>
        ${i.scoreBreakdown?`<small class="score-breakdown">匹配拆解：名称 ${i.scoreBreakdown.nameMatch?"✓":"-"} / 股票 ${i.scoreBreakdown.stockCodeMatch?"✓":"-"} / 地区 ${i.scoreBreakdown.regionMatch?"✓":"-"} / 行业 ${i.scoreBreakdown.industryMatch?"✓":"-"} / 可信来源 ${r(i.scoreBreakdown.trustedSources||0)}</small>`:""}
        <button data-candidate="${l}" type="button">${c("CircleCheck")}选这个生成</button>
      </article>
    `).join(""),o=e.length?`<div class="cached-block"><h3>可能已有报告</h3>${e.map(i=>pt(i)).join("")}</div>`:"";a.innerHTML=`
    <div class="section-title">
      <h2>企业主体核对</h2>
      <p>选择最接近本次拜访对象的主体。名称模糊时先不要直接生成。</p>
    </div>
    ${v?`<div class="annual-upload-card">${c("FileText")}已接入年报《${r(v.fileName)}》，后续报告将优先使用其中的财务指标和页码证据。</div>`:""}
    <div class="choice-grid">${n||'<div class="empty">未找到候选主体，请补充地区、行业或官网。</div>'}</div>
    ${o}
  `,f(),a.querySelectorAll("[data-candidate]").forEach(i=>{i.addEventListener("click",()=>{const l=Number(i.dataset.candidate);k={...t[l],aiNeeds:nt,annualReportId:v==null?void 0:v.annualReportId,annualReportSummary:v?{annualReportId:v.annualReportId,fileName:v.fileName,pageCount:v.pageCount,metrics:v.metrics,sections:v.sections,warnings:v.warnings}:void 0},a.querySelectorAll("button").forEach(d=>{d.disabled=!0}),!(e.length&&!window.confirm("该企业已有历史报告。确认重新生成后，将按当前输入和年报重新检索分析，并覆盖历史列表中的最新入口；不会复用旧报告内容。是否继续？"))&&lt(!0)})}),ht(a)}async function lt(t){if(k){m("准备全新生成",15,"已确认重新检索分析，本次不会复用旧报告内容。");try{const e=await w(ot("/.netlify/functions/create-report-job"),{method:"POST",body:JSON.stringify({company:k,force:t,runtimeMode:rt()})});if(e.cached&&e.reportId){m("命中已有报告",100,"已读取近 7 天内同企业报告。"),J(e.reportId);return}st(e.jobId,k.standardName||k.name||k.companyName||k.query||""),re(e.jobId),oe(e.jobId)}catch(e){m("任务创建失败",100,e.message),document.querySelectorAll("[data-candidate]").forEach(a=>{a.disabled=!1})}}}function ae(t){return`${window.location.origin}/?reportId=${encodeURIComponent(t)}`}function J(t){t&&window.open(ae(t),"_blank","noopener")}function re(t){m("资料检索准备",18,"已创建任务，正在启动后台深度检索。"),fetch("/.netlify/functions/run-report-job-background",{method:"POST",keepalive:!0,headers:{"content-type":"application/json"},body:JSON.stringify({jobId:t})}).then(e=>{if(!e.ok&&e.status!==202)throw new Error(`后台任务启动失败：${e.status}`)}).catch(e=>{m("后台任务启动异常",100,e.message)}),m("资料检索",20,"后台任务已启动。你可以关闭网页，任务会继续运行；之后重新打开本页会自动接回进度。")}function oe(t){st(t),dt()}function dt(){X(),x||(x=window.setInterval(X,3500))}async function X(){const t=M();if(!t.length){N(),K();return}let e=!1;await Promise.all(t.map(async a=>{try{const n=(await w(`/.netlify/functions/get-report-job?jobId=${encodeURIComponent(a)}`)).job||{};if(I[a]={...n,jobId:a},["queued","running"].includes(String(n.status||""))&&(e=!0),n.status==="done"&&n.reportId&&document.querySelector("#taskCenter")){await g(),a===$&&m("报告已生成",100,"已收录到报告清单，请在任务中心点击打开报告或确认完成。",n.steps||[],n);return}if(n.status==="done"&&n.reportId&&!document.querySelector("#taskCenter")){await ut(n.reportId);return}a===$&&(n.status==="done"?m("",0):m(n.stage||"生成中",Number(n.progress||0),n.status==="error"?n.error:n.detail||"深度检索会比较慢，页面可以关闭，后台任务仍会继续。",n.steps||[],n))}catch(n){const o=I[a]||{};I[a]={...o,jobId:a,status:["done","error"].includes(String(o.status||""))?o.status:"running",stage:"\u72b6\u6001\u540c\u6b65\u6682\u65f6\u5931\u8d25",detail:`\u6682\u65f6\u8bfb\u4e0d\u5230\u4efb\u52a1\u72b6\u6001\uff1a${n.message||n}\u3002\u540e\u53f0\u4efb\u52a1\u53ef\u80fd\u4ecd\u5728\u8fd0\u884c\uff0c\u7cfb\u7edf\u4f1a\u7ee7\u7eed\u540c\u6b65\u3002`,error:n.message||String(n),progress:Number(o.progress||0),syncWarning:!0},e=!0}})),N(),e||K()}function ie(){const t=M();t.length&&($=t[0],dt())}function K(){x&&(window.clearInterval(x),x=void 0)}function N(){const t=document.querySelector("#taskCenter");if(!t)return;const e=M();if(!e.length){t.innerHTML="";return}const a=e.map(n=>I[n]||{jobId:n,status:"queued",stage:"等待同步",progress:0});t.innerHTML=`
    <div class="task-center">
      <div class="task-head">
        <div>
          <b>任务中心</b>
          <p>可以同时查询多个企业。关闭网页后重新打开，也会从这里接回进度。</p>
        </div>
        <span>${a.length} 个任务</span>
      </div>
      <div class="task-list">
        ${a.map(n=>se(n)).join("")}
      </div>
    </div>
  `,t.querySelectorAll("[data-focus-job]").forEach(n=>{n.addEventListener("click",()=>{$=n.dataset.focusJob||"";const o=I[$];o&&m(o.stage||"生成中",Number(o.progress||0),o.detail||o.error||"",o.steps||[],o),N()})}),t.querySelectorAll("[data-cancel-task]").forEach(n=>{n.addEventListener("click",()=>ct(n.dataset.cancelTask||""))}),t.querySelectorAll("[data-open-report]").forEach(n=>{n.addEventListener("click",()=>{const o=n.dataset.openReport||"",i=n.dataset.jobId||"";o&&J(o),i&&H(i)})}),t.querySelectorAll("[data-remove-task]").forEach(n=>{n.addEventListener("click",()=>H(n.dataset.removeTask||""))}),t.querySelectorAll("[data-complete-task]").forEach(n=>{n.addEventListener("click",()=>H(n.dataset.completeTask||""))}),f()}function se(t){var e,a;const n=["queued","running"].includes(String(t.status||"")),o=t.status==="done"&&t.reportId,i=t.jobId===$,l=t.companyName||t.standardName||((e=t.company)==null?void 0:e.standardName)||((a=t.company)==null?void 0:a.name)||nbJobNames()[t.jobId]||t.jobId;return`
    <article class="task-item ${i?"active":""} ${r(t.status||"queued")}">
      <div>
        <b>${r(l)}</b>
        <span>${r(t.stage||t.currentPhaseLabel||"等待同步")}｜${r(t.progress??0)}%</span>
        <small>总运行 ${r(t.elapsedText||B(t.elapsedMs))} | 预计剩余 ${r(t.estimatedRemainingText||"继续运行中")} | 当前模型 ${r(t.currentModel||t.modelName||t.modelDisplay||"等待调用模型")} | 最近更新 ${r(t.updatedAgoText||"刚刚")}</small>
      </div>
      <div class="task-actions">
        <button data-focus-job="${r(t.jobId)}" type="button">${c("Layers3")}查看进度</button>
        ${n?`<button data-cancel-task="${r(t.jobId)}" class="danger ghost" type="button">${c("OctagonX")}停止</button>`:""}
        ${o?`<button data-open-report="${r(t.reportId)}" data-job-id="${r(t.jobId)}" class="primary" type="button">${c("FileText")}打开报告</button>`:""}${o?`<button data-complete-task="${r(t.jobId)}" type="button">${c("CircleCheck")}确认完成</button>`:""}
        ${!n&&!o?`<button data-remove-task="${r(t.jobId)}" type="button">${c("Trash2")}移除</button>`:""}
      </div>
    </article>
  `}async function ut(t){var e,a;const n=await w(`/.netlify/functions/get-report?reportId=${encodeURIComponent(t)}`);h={...n.report||{},reportId:((e=n.report)==null?void 0:e.reportId)||t},q=n.html||"",k={name:h==null?void 0:h.companyName,standardName:h==null?void 0:h.standardName,region:h==null?void 0:h.region,industry:h==null?void 0:h.industry,aiNeeds:((a=h==null?void 0:h.userContext)==null?void 0:a.aiNeeds)||(h==null?void 0:h.aiNeeds)||""},mt(h),g()}async function g(){var t,e,a;const n=(((t=document.querySelector("#historyInput"))==null?void 0:t.value)||"").trim(),o=(((e=document.querySelector("#historyPeriod"))==null?void 0:e.value)||"30d").trim(),i=(((a=document.querySelector("#historyRating"))==null?void 0:a.value)||"all").trim();try{b=(await w(`/.netlify/functions/search-reports?q=${encodeURIComponent(n)}&period=${encodeURIComponent(o)}&rating=${encodeURIComponent(i)}`)).reports||[],S=1,U()}catch{}}function U(){const t=document.querySelector("#historyArea");if(!t)return;if(!b.length){t.innerHTML='<div class="empty">当前筛选条件下还没有报告。可以调整时间、评级或关键词后再查。</div>',f();return}const e=Math.max(1,Math.ceil(b.length/T));S=Math.min(Math.max(S,1),e);const a=(S-1)*T,n=b.slice(a,a+T);t.innerHTML=`
    <div class="history-panel">
      ${ce(b)}
      <div class="history-pager">
        <span>第 ${S} / ${e} 页，共 ${b.length} 份；当前显示 ${a+1}-${Math.min(a+T,b.length)} 份</span>
        <div>
          <button data-history-page="prev" type="button" ${S<=1?"disabled":""}>上一页</button>
          <button data-history-page="next" type="button" ${S>=e?"disabled":""}>下一页</button>
        </div>
      </div>
      <div class="history-grid">${n.map(o=>pt(o)).join("")}</div>
    </div>
  `,f(),ht(t)}function ce(t){var e;const a=t.length,n=t.filter(d=>d.qualityLevel==="formal").length,o=t.filter(d=>L(d).status==="rated").length,i=a?Math.round(t.reduce((d,s)=>d+Number(s.sourceCount||s.verifiedSourceCount||0),0)/a):0,l=(e=t[0])!=null&&e.generatedAt?new Date(t[0].generatedAt).toLocaleString("zh-CN"):"-";return`
    <div class="history-overview">
      <div><b>${a}</b><span>当前列表</span></div>
      <div><b>${n}</b><span>正式报告</span></div>
      <div><b>${o}</b><span>已评级</span></div>
      <div><b>${i}</b><span>平均来源</span></div>
      <div><b>${r(l)}</b><span>最近生成</span></div>
    </div>
  `}function le(t){return`q-${String(t.qualityLevel||"formal").replace(/[^\w-]/g,"")}`}function pt(t){const e=t.generatedAt?new Date(t.generatedAt).toLocaleString("zh-CN"):"-",a=Number(t.sourceCount||t.verifiedSourceCount||0),n=Math.max(8,Math.min(100,Math.round(a/15*100)));return`
    <article class="history-item ${r(le(t))} ${r(F(t))}">
      <div>
        <div class="history-title">
          <b>${r(t.standardName||t.companyName)}</b>
          <em>${r(R(t))}</em>
        </div>
        <div class="history-badges">
          <span class="rating-badge ${r(F(t))}">${c(L(t).status==="rated"?"Trophy":"CircleAlert")}${r(Wt(t))}</span>
          <span>${r(Xt(t))}</span>
        </div>
        <span>${r(t.region||"-")} · ${r(t.industry||"-")}</span>
        <div class="history-meter"><i style="width:${n}%"></i></div>
        <small>生成?${r(e)} ? 耗时?${r(B(t.durationMs))} ? 来源?${r(z(t))}</small>
      </div>
      <div class="history-actions">
        <button data-report="${r(t.reportId)}" type="button">${c("FileText")}打开</button>
        <button data-delete-report="${r(t.reportId)}" data-delete-name="${r(t.standardName||t.companyName||"这份报告")}" class="danger ghost" type="button">${c("Trash2")}删除</button>
      </div>
    </article>
  `}function ht(t){t.querySelectorAll("[data-history-page]").forEach(e=>{e.addEventListener("click",()=>{S+=e.dataset.historyPage==="next"?1:-1,U()})}),t.querySelectorAll("[data-report]").forEach(e=>{e.addEventListener("click",()=>J(e.dataset.report||""))}),t.querySelectorAll("[data-delete-report]").forEach(e=>{e.addEventListener("click",()=>yt(e.dataset.deleteReport||"",e.dataset.deleteName||"这份报告"))})}function de(t){if(t.modelDisplay)return String(t.modelDisplay);const e=new Set;for(const a of u(t.usedModels))a!=null&&a.model&&e.add(String(a.model));return t.modelName&&e.add(String(t.modelName)),Array.from(e).join(" / ")||"未调用模型"}function z(t){const e=Number(t.verifiedSourceCount??t.sourceCount??0);return t.annualReportEvidence?`${e} 条外部链接 + 年报`:`${e} 条`}function mt(t){const e=document.querySelector("#reportArea"),a=t.generatedAt?new Date(t.generatedAt).toLocaleString("zh-CN"):"-",n=B(t.durationMs),o=t.qualityLevel==="diagnostic";e.innerHTML=`
    <div class="report-actions">
      <div>
        <h2>${r(t.standardName)}：商机挖掘报告</h2>
        <div class="report-meta">
          <span>${c("CalendarClock")}生成：${r(a)}</span>
          <span>${c("Timer")}耗时：${r(n)}</span>
          <span>${c("BrainCircuit")}模型：${r(de(t))}</span>
          <span>${c("ShieldCheck")}质量：${r(t.qualityLabel||R(t))}</span>
          <span>${c("Link")}来源：${r(z(t))}</span>
          <span>${c("Layers3")}覆盖：${r(t.topicCoverageCount??0)} 类</span>
        </div>
      </div>
      <div>
        <button id="downloadHtml" type="button">${c("Download")}下载HTML</button>
        <button id="deleteReport" class="danger ghost" type="button">${c("Trash2")}删除报告</button>
        <button id="refreshReport" class="danger" type="button">${c("RefreshCcw")}重新生成</button>
      </div>
    </div>
    ${pe(t)}
    ${he(t)}
    ${ue(t)}
    ${me(t)}
    <section class="refine-panel">
      <div>
        <h3>补充信息后完善报告</h3>
        <p>补充客户需求、参会人、业务场景或你希望调整的重点。系统会标注为“用户提供线索”，并显示本次更新了哪些部分。</p>
      </div>
      <textarea id="refineInput" rows="4" placeholder="例如：客户提出研发需要 DFM 能力；客户更关注知识库和售后客服；希望强化场景切入和会前问题清单。"></textarea>
      <div class="refine-actions">
        <button id="improveReport" class="primary" type="button">${c("Sparkles")}基于补充信息完善</button>
        <span id="refineFeedback" class="refine-feedback" role="status"></span>
      </div>
    </section>
    <div class="quick mini">${u(t.quickCards).map(i=>`<div><b>${r(i.title)}</b>${r(i.body)}<span>${r(i.insight)}</span></div>`).join("")}</div>
    ${o?fe(t):$e(t)}
    <section class="report-section"><h2>附录：相关资料来源</h2>${Me(t.sources)}</section>
  `,f(),document.querySelector("#downloadHtml").addEventListener("click",qe),document.querySelector("#improveReport").addEventListener("click",ke),document.querySelector("#deleteReport").addEventListener("click",async()=>{h!=null&&h.reportId&&await yt(h.reportId,h.standardName||"这份报告")}),document.querySelector("#refreshReport").addEventListener("click",async()=>{k&&window.confirm("重新生成会覆盖近 7 天内同企业最新报告入口，并重新消耗检索时间和模型额度。确认继续吗？")&&await lt(!0)})}function ue(t){const e=t.annualReportEvidence;if(!e)return"";const a=u(e.metrics).slice(0,9),n=u(e.sections).slice(0,6);return`
    <details class="report-section annual-panel">
      <summary><h2>年报提取信息</h2><span>展开核对自动提取的财务、人员和章节证据</span></summary>
      <div class="annual-summary">
        <div>
          <b>${c("FileText")}${r(e.fileName||"用户上传年报")}</b>
          <span>${r(e.pageCount||"-")} 页｜可读文字 ${r(e.textLength||0)} 字｜证据优先级：用户上传资料</span>
        </div>
        <p>自动提取结果建议与原 PDF 表格核对；报告会优先使用这些财务与经营证据。</p>
      </div>
      ${a.length?`<div class="metric-grid">${a.map(o=>`<div class="metric"><b>${r(o.label)}</b><strong>${r($t(o.value,o.label))}</strong>${C({annualPage:o.page,evidenceExcerpt:o.context,annualFileName:e.fileName},[])}<span>用户上传年报${o.page?`第 ${r(o.page)} 页`:""}，建议按原 PDF 表格核对口径。</span></div>`).join("")}</div>`:""}
      ${n.length?`<div class="grid two">${n.map(o=>`<article class="card"><h3>${r(o.title)}</h3><p>${r(o.excerpt)}</p><small>页码：${r(o.page)}</small></article>`).join("")}</div>`:""}
    </details>
  `}function pe(t){const e=L(t),a=e.status==="rated"?`<div class="rating-detail">
          <div class="rating-dim-grid">
            ${u(e.dimensions).map(n=>`
                <article class="rating-dim">
                  <div class="rating-dim-head"><b>${r(n.title)}</b><strong>${r(n.score)}分</strong></div>
                  <div class="rating-bar"><i style="width:${Math.max(0,Math.min(Number(n.score)||0,100))}%"></i></div>
                  ${u(n.evidence).length?`<p><b>依据</b>${r(u(n.evidence).join("；"))}</p>`:""}
                  ${u(n.deductions).length?`<p><b>限制</b>${r(u(n.deductions).join("；"))}</p>`:""}
                  ${u(n.questions).length?`<p><b>待确认</b>${r(u(n.questions).join("；"))}</p>`:""}
                </article>
              `).join("")}
          </div>
          ${u(e.riskFlags).length?`<div class="risk-tags">${u(e.riskFlags).map(n=>`<span>${r(n)}</span>`).join("")}</div>`:""}
          <div class="rating-guidance">
            <article><b>售前投入建议</b><p>${r(e.presalesAdvice||e.nextAction||"先确认客户真实需求和下一步动作。")}</p></article>
            <article><b>下一步成立条件</b><ul>${u(e.qualificationConditions).map(n=>`<li>${r(n)}</li>`).join("")||"<li>确认客户主体、参会角色、业务场景和数据边界。</li>"}</ul></article>
            <article><b>暂缓/降级信号</b><ul>${u(e.disqualificationSignals).map(n=>`<li>${r(n)}</li>`).join("")||"<li>没有明确业务场景、推进人或下一步动作。</li>"}</ul></article>
            <article><b>资源边界</b><p>${r(e.resourceBoundary||"定制方案、报价和POC范围需在关键输入确认后再进入。")}</p></article>
          </div>
        </div>`:`<div class="rating-detail"><p>${r(e.notRatedReason||"公开信息不足，暂不评级。")}</p></div>`;return`
    <details class="rating-card ${r(F(t))}">
      <summary>
        <div class="rating-score">
          ${c(e.status==="rated"?"Trophy":"CircleAlert")}
          <b>${r(e.status==="rated"?`${e.priorityLevel||e.label}｜${e.score}分｜置信度${e.confidenceLabel||"-"}(${e.confidenceScore??"-"}分)`:"暂不评级｜公开信息不足")}</b>
          <span>${r(e.summary||e.notRatedReason||"来源不足，先补充资料与客户线索。")}</span>
        </div>
        <div class="rating-toggle">${c("ChevronDown")}查看评估理由</div>
      </summary>
      ${a}
    </details>
  `}function he(t){const e=u(t.qualityWarnings),a=t.qualityLevel==="diagnostic"?"证据不足，仅生成检索诊断":t.qualityLevel==="limited"?"资料有限，仅供会前参考":t.qualityLevel==="brief"?"来源偏少，建议谨慎使用":"来源达到正式报告门槛";return`
    <div class="quality-banner quality-${r(t.qualityLevel||"formal")}">
      <b>${r(a)}</b>
      <span>${c("ShieldCheck")}质量：${r(t.qualityLabel||R(t))}｜来源 ${r(z(t))}｜可读来源 ${r(t.readableSourceCount??0)} 条｜主题覆盖 ${r(t.topicCoverageCount??0)} 类</span>
      ${e.length?`<ul>${e.map(n=>`<li>${r(n)}</li>`).join("")}</ul>`:""}
    </div>
  `}function me(t){const e=u(t.changeSummary);return e.length?`<div class="change-summary"><b>${c("Sparkles")}本次完善更新</b>${y(e)}</div>`:""}function ve(t){const e=u(t.userSupplementInsights);return e.length?`<section class="report-section"><h2>用户补充线索</h2><div class="grid two">${E(e)}</div></section>`:""}function $e(t){var e,a,n,o,i,l;return`
    <section class="report-section"><h2>1. 研究结论</h2><div class="grid">${vt(t.conclusions,t.sources)}</div></section>
    ${ve(t)}
    <section class="report-section"><h2>2. 客户画像</h2>
      <h3>2.1 主体与股权/区域</h3><div class="grid two">${E((e=t.customerInsights)==null?void 0:e.localCards,t.sources)}</div>
      <h3>2.2 产品与客户/行业背景</h3><div class="grid two">${E((a=t.customerInsights)==null?void 0:a.groupCards,t.sources)}</div>
      <h3>2.3 经营规模与财务</h3><div class="metric-grid">${ye((n=t.customerInsights)==null?void 0:n.metrics,t.sources)}</div>
      <h3>2.4 数字化与AI/组织与采购约束</h3><div class="grid two">${E((o=t.customerInsights)==null?void 0:o.digitalCards,t.sources)}</div>
    </section>
    <section class="report-section"><h2>3. 经营痛点穿透</h2><div class="pain-grid">${be(t.pains,t.sources)}</div></section>
    <section class="report-section"><h2>4. 初步方案建议</h2><div class="solution-grid">${ge(t.solutions,t.sources)}</div></section>
    <section class="report-section"><h2>5. 前置要求</h2><div class="require-grid"><article class="card"><h3>会前尽量了解</h3>${y((i=t.requirements)==null?void 0:i.preMeeting)}</article><article class="card"><h3>现场顺势探问</h3>${y((l=t.requirements)==null?void 0:l.onSite)}</article></div></section>
  `}function fe(t){var e,a;const n=t.diagnosis||{};return`
    <section class="report-section"><h2>1. 检索诊断</h2><div class="grid">${vt(t.conclusions)}</div></section>
    <section class="report-section"><h2>2. 未达门槛原因</h2>
      <div class="grid two">
        <article class="card"><h3>已覆盖主题</h3>${y(n.coveredTopics)}</article>
        <article class="card"><h3>缺少主题</h3>${y(n.missingTopics)}</article>
      </div>
    </section>
    <section class="report-section"><h2>3. 建议补充信息</h2><div class="require-grid"><article class="card"><h3>会前尽量了解</h3>${y((e=t.requirements)==null?void 0:e.preMeeting)}</article><article class="card"><h3>现场顺势探问</h3>${y((a=t.requirements)==null?void 0:a.onSite)}</article></div></section>
  `}function vt(t,e=[]){return u(t).map(a=>`<article class="card"><h3>${r(a.title)}</h3>${C(a,e)}<p>${r(a.body||a.summary||a.insight||"")}</p></article>`).join("")}function E(t,e=[]){return u(t).map(a=>`<article class="profile-card"><h3>${r(a.title)}</h3>${C(a,e)}<div class="label">依据</div>${y(a.facts)}<div class="label">判断</div><p>${r(a.insight)}</p>${u(a.toConfirm).length?`<div class="label">待确认</div>${y(a.toConfirm)}`:""}</article>`).join("")}function $t(t,e=""){const a=String(e||""),n=String(t??"").trim();if(!n)return"-";const m=a+n,o=/(\u7387|\u6bd4\u4f8b|\u5360\u6bd4|\u6bdb\u5229|\u8d1f\u503a\u7387|\u589e\u957f\u7387|%)/.test(m),i=/(\u5458\u5de5|\u4eba\u6570|\u4eba\u5458|\u804c\u5de5|\u4eba$)/.test(m),l=/(\u6536\u5165|\u8425\u6536|\u51c0\u9500\u552e|\u9500\u552e\u989d|\u5229\u6da6|\u51c0\u5229|\u73b0\u91d1\u6d41|\u6295\u5165|\u8d39\u7528|\u8d44\u4ea7|\u8d1f\u503a|\u91d1\u989d|\u6210\u672c)/.test(m),d=/(\u6536\u5165|\u8425\u6536|\u51c0\u9500\u552e|\u9500\u552e\u989d)/.test(a),s=[...n.replace(/[,?\s]/g,"").matchAll(/-?\d+(?:\.\d+)?/g)].map(O=>Number(O[0])).filter(Number.isFinite);if(!s.length)return n.length>36?n.slice(0,34)+"...":n;const O=s[0],j=U=>U.toFixed(2).replace(/\.00$/,"").replace(/(\.\d)0$/,"$1");if(o&&!l)return j(O)+"%";if(i&&!l)return Math.round(O).toLocaleString("zh-CN")+"\u4eba";if(/\u4ebf\u5143/.test(n))return j(O)+"\u4ebf\u5143";if(/\u4e07\u5143/.test(n))return Math.abs(O)>=1e4?j(O/1e4)+"\u4ebf\u5143":j(O)+"\u4e07\u5143";if(/\u5143/.test(n)||Math.abs(O)>=1e5)return Math.abs(O)>=1e8?j(O/1e8)+"\u4ebf\u5143":j(O/1e4)+"\u4e07\u5143";if(l){if(Math.abs(O)>=1e4)return j(O/1e4)+"\u4ebf\u5143";if(d&&Math.abs(O)<1e3)return j(O)+"\u4ebf\u5143";if(Math.abs(O)>=1e3)return j(O)+"\u4e07\u5143";if(Math.abs(O)<100&&String(s[0]).includes("."))return j(O)+"\u4ebf\u5143";return j(O)+"\u4e07\u5143"}return Math.abs(O%1)>0?j(O):String(O)}function ye(t,e=[]){return u(t).map(a=>`<div class="metric"><b>${r(a.label)}</b><strong>${r($t(a.value,a.label))}</strong>${C(a,e)}<span>${r(a.note||a.context||"")}</span></div>`).join("")}function be(t,e=[]){return u(t).map(a=>`<article class="pain-card"><h3>${r(a.title)}</h3>${C(a,e)}<div class="label">依据</div><p>${r(a.sourceBasis)}</p><div class="label">判断</div><p>${r(a.reasoning)}</p><div class="label">待确认</div>${y(a.validationSignals)}<div class="entry">${r(a.aiEntry)}</div></article>`).join("")}function ge(t,e=[]){return u(t).map(a=>`<article class="solution-card"><span class="tag">${r(a.priority)}</span><h3>${r(a.title)}</h3>${C(a,e)}<div class="label">依据</div><p>${r(a.why)}</p><div class="label">做法</div><small>${r(a.how)}</small></article>`).join("")}function ft(t,e){return Number(t&&t.sourceId||t&&t.id||e+1)}function we(t){return u(t&&t.sourceIds||t&&t.sources||t&&t.evidenceSourceIds).map(Number).filter(e=>Number.isFinite(e)&&e>0).slice(0,4)}function Se(t){const e=Number(t&&t.annualPage||t&&t.page||t&&t.annualReportPage||0);return Number.isFinite(e)&&e>0?{page:e,title:t&&t.annualFileName||"用户上传年报",excerpt:t&&t.evidenceExcerpt||t&&t.context||t&&t.note||""}:null}function C(t,e=[]){const a=we(t),n=Se(t);if(!a.length&&!n)return"";const o=new Map(u(e).map((d,s)=>[ft(d,s),d])),i=a.map(d=>({id:d,source:o.get(d)})).filter(d=>d.source&&at(d.source.url));return!i.length&&!n?"":`<details class="evidence-links"><summary>${[...i.map(d=>`<span class="evidence-badge">[${r(d.id)}]</span>`),n?`<span class="evidence-badge annual">[年报P${r(n.page)}]</span>`:""].join("")}</summary><div>${n?`<div class="evidence-item"><b>年报P${r(n.page)}.</b> ${r(n.title)}<small>用户上传年报｜高</small>${n.excerpt?`<em>${r(String(n.excerpt).replace(/\s+/g," ").slice(0,180))}</em>`:""}</div>`:""}${i.map(({id:d,source:s})=>`<a href="${r(s.url)}" target="_blank" rel="noreferrer"><b>${r(d)}.</b> ${r(s.title||s.domain||"资料来源")}${s.sourceType||s.domain||s.confidence?`<small>${r([s.sourceType,s.domain,s.confidence].filter(Boolean).join("｜"))}</small>`:""}${s.relevanceReason||s.usedFor||s.query?`<small>支撑：${r(s.relevanceReason||s.usedFor||s.query)}</small>`:""}${s.text||s.snippet?`<em>${r(String(s.text||s.snippet).replace(/\s+/g," ").slice(0,180))}</em>`:""}</a>`).join("")}</div></details>`}function y(t){const e=u(t);return e.length?`<ul>${e.map(a=>`<li>${r(a)}</li>`).join("")}</ul>`:'<p class="muted">待确认</p>'}function Me(t){return`<details class="source-overview"><summary>来源总览与采集诊断</summary><table><thead><tr><th>资料</th><th>用于支撑的判断</th><th>置信度</th><th>真实链接</th></tr></thead><tbody>${u(t).filter(e=>at(e.url)).map((e,a)=>`<tr><td><b>${r(ft(e,a))}.</b> ${r(e.title)}${e.sourceType||e.domain||e.relevanceReason?`<br><small>${r([e.sourceType,e.domain,e.relevanceReason].filter(Boolean).join("?"))}</small>`:""}</td><td>${r(e.usedFor||e.query||e.topic||"")}</td><td>${r(e.confidence)}</td><td><a href="${r(e.url)}" target="_blank" rel="noreferrer">${r(e.domain||"来源链接")}</a></td></tr>`).join("")||'<tr><td colspan="4">本次未读取到可校验来源。</td></tr>'}</tbody></table></details>`}async function ke(){var t,e;const a=document.querySelector("#improveReport"),n=document.querySelector("#refineFeedback"),o=h==null?void 0:h.reportId;if(!o){n&&(n.textContent="当前报告缺少ID，请从历史列表重新打开后再完善。");return}const i=(((t=document.querySelector("#refineInput"))==null?void 0:t.value)||"").trim();if(!i){n&&(n.textContent="请先输入补充信息。");return}a&&(a.disabled=!0,a.innerHTML=`${c("Sparkles")}完善中...`,f()),n&&(n.textContent="正在基于补充信息完善报告，可能需要几十秒。"),m("完善报告",82,"正在基于补充信息调整当前报告。补充内容会标注为用户提供线索，不会替代公开来源。");try{const l=await w("/.netlify/functions/improve-report",{method:"POST",body:JSON.stringify({reportId:o,instruction:i})});h={...l.report||{},reportId:((e=l.report)==null?void 0:e.reportId)||o};const d=h;q=l.html||"",mt(d);const s=u(l.changeSummary||d.changeSummary).join("；")||"已基于补充信息生成更新版。";m("报告已完善",100,s),await g()}catch(l){a&&(a.disabled=!1,a.innerHTML=`${c("Sparkles")}基于补充信息完善`,f()),n&&(n.textContent=`完善失败：${l.message}`),m("完善失败",100,l.message)}}async function yt(t,e="这份报告"){if(!t||!window.confirm(`确认删除“${e}”吗？删除后历史列表不再显示，已下载的本地 HTML 不受影响。`))return;const a=(h==null?void 0:h.reportId)===t;try{await w("/.netlify/functions/delete-report",{method:"POST",body:JSON.stringify({reportId:t})}),b=b.filter(n=>n.reportId!==t),U(),a&&(h=null,q="",k=null,document.querySelector("#reportArea").innerHTML='<div class="empty">报告已删除。</div>',m("报告已删除",100,"已从索引和报告存储中移除。")),await g()}catch(n){m("删除失败",100,n.message)}}function qe(){if(!q||!h)return;const t=new Blob([q],{type:"text/html;charset=utf-8"}),e=URL.createObjectURL(t),a=document.createElement("a");a.href=e,a.download=`${h.standardName||"企业商机挖掘报告"}.html`,a.click(),URL.revokeObjectURL(e)}function Ie(){const t=new URLSearchParams(window.location.search).get("reportId");if(t){Qt(),ut(t).catch(e=>{m("报告打开失败",100,e.message)});return}Kt()}Ie();
