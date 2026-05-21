import "./styles.css";
import {
  BrainCircuit,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Download,
  FileText,
  Layers3,
  Link,
  Radar,
  RefreshCcw,
  Search,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
  createIcons
} from "lucide";

type AnyRecord = Record<string, any>;

const app = document.querySelector<HTMLDivElement>("#app")!;
const ACTIVE_JOB_KEY = "nbBoActiveJobId";
const HISTORY_PAGE_SIZE = 8;

let selectedCompany: AnyRecord | null = null;
let currentReport: AnyRecord | null = null;
let currentHtml = "";
let pendingAiNeeds = "";
let historyReports: AnyRecord[] = [];
let historyPage = 1;
let pollTimer: number | undefined;
let pollErrorCount = 0;

const uiIcons = {
  BrainCircuit,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Download,
  FileText,
  Layers3,
  Link,
  Radar,
  RefreshCcw,
  Search,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  Trophy
};

function icon(name: string) {
  return `<i data-lucide="${e(name)}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  createIcons({ icons: uiIcons });
}

function e(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function arr<T = AnyRecord>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isHttpUrl(value: unknown) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `请求失败：${response.status}`);
  }
  return payload;
}

function shell() {
  app.innerHTML = `
    <main class="app-shell">
      <section class="hero">
        <div class="kicker">${icon("Radar")} 售前 / Deep Research 商机挖掘</div>
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
            <textarea id="aiNeedInput" rows="3" placeholder="可选。例如：知识库、智能客服、销售助理、生产排程、质量追溯、数据问答、智能体平台等。这里会作为用户提供线索进入报告。"></textarea>
          </label>
          <button class="primary" type="submit">${icon("SearchCheck")}核对企业</button>
        </form>
      </section>

      <section class="toolbar">
        <div>
          <h2>历史报告</h2>
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
            <option value="S">S级</option>
            <option value="A">A级</option>
            <option value="B">B级</option>
            <option value="C">C级</option>
            <option value="D">D级</option>
            <option value="not_rated">暂不评级</option>
          </select>
          <button id="historyButton" type="button">${icon("Search")}搜索</button>
        </div>
      </section>

      <section id="statusArea" class="status-area"></section>
      <section id="candidateArea" class="candidate-area"></section>
      <section id="historyArea" class="history-area"></section>
      <section id="reportArea" class="report-area"></section>
    </main>
  `;

  document.querySelector<HTMLFormElement>("#companyForm")!.addEventListener("submit", onResolve);
  document.querySelector<HTMLButtonElement>("#historyButton")!.addEventListener("click", onSearchHistory);
  document.querySelector<HTMLSelectElement>("#historyPeriod")!.addEventListener("change", onSearchHistory);
  document.querySelector<HTMLSelectElement>("#historyRating")!.addEventListener("change", onSearchHistory);
  document.querySelector<HTMLInputElement>("#historyInput")!.addEventListener("keydown", (event) => {
    if (event.key === "Enter") onSearchHistory();
  });

  refreshIcons();
  onSearchHistory();
  resumeActiveJob();
}

function setStatus(message = "", progress = 0, detail = "", steps: AnyRecord[] = []) {
  const area = document.querySelector<HTMLElement>("#statusArea")!;
  if (!message) {
    area.innerHTML = "";
    return;
  }
  const recentSteps = arr<AnyRecord>(steps).slice(-8).reverse();
  area.innerHTML = `
    <div class="progress-card">
      <div class="progress-top">
        <b>${e(message)}</b>
        <span>${progress}%</span>
      </div>
      <div class="progress-track"><div style="width:${Math.max(0, Math.min(progress, 100))}%"></div></div>
      <p>${e(detail)}</p>
      ${recentSteps.length ? `
        <div class="progress-log">
          ${recentSteps.map((step) => `
            <div class="progress-step">
              <strong>${e(step.stage)}</strong>
              <span>${e(step.detail || "")}</span>
              <small>${Number(step.progress || 0)}%${step.foundCount ? ` · 候选来源 ${e(step.foundCount)}` : ""}${step.sourceCount ? ` · 可校验来源 ${e(step.sourceCount)}` : ""}${step.qualityLevel ? ` · ${e(qualityText(step))}` : ""}</small>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
  refreshIcons();
}

async function onResolve(event: Event) {
  event.preventDefault();
  clearPoll();
  currentReport = null;
  currentHtml = "";
  document.querySelector("#reportArea")!.innerHTML = "";
  document.querySelector("#candidateArea")!.innerHTML = "";

  const query = (document.querySelector<HTMLInputElement>("#companyInput")!.value || "").trim();
  const region = (document.querySelector<HTMLInputElement>("#regionInput")!.value || "").trim();
  const industry = (document.querySelector<HTMLInputElement>("#industryInput")!.value || "").trim();
  const aiNeeds = (document.querySelector<HTMLTextAreaElement>("#aiNeedInput")!.value || "").trim();
  pendingAiNeeds = aiNeeds;
  if (!query) return;

  setStatus("企业核对", 10, "正在查询候选主体和历史报告。");
  try {
    const data = await api<AnyRecord>("/.netlify/functions/resolve-company", {
      method: "POST",
      body: JSON.stringify({ query, region, industry, aiNeeds })
    });
    setStatus("", 0);
    renderCandidates(data.candidates || [], data.cached || []);
  } catch (error) {
    setStatus("企业核对失败", 100, (error as Error).message);
  }
}

function renderCandidates(candidates: AnyRecord[], cached: AnyRecord[]) {
  const area = document.querySelector<HTMLElement>("#candidateArea")!;
  const candidateCards = candidates
    .map((candidate, index) => `
      <article class="choice-card">
        <div class="choice-head">
          <h3>${e(candidate.standardName || candidate.name)}</h3>
          <span>${e(candidate.confidence ?? "-")} 分</span>
        </div>
        <p>${e(candidate.reason || "候选企业主体")}</p>
        <dl>
          <dt>地区</dt><dd>${e(candidate.region || "-")}</dd>
          <dt>行业</dt><dd>${e(candidate.industry || "-")}</dd>
          <dt>官网</dt><dd>${candidate.website ? `<a href="${e(candidate.website)}" target="_blank">${e(candidate.website)}</a>` : "-"}</dd>
        </dl>
        <button data-candidate="${index}" type="button">${icon("CircleCheck")}选这个生成</button>
      </article>
    `)
    .join("");

  const cachedList = cached.length
    ? `<div class="cached-block"><h3>可能已有报告</h3>${cached.map((item) => historyItem(item)).join("")}</div>`
    : "";

  area.innerHTML = `
    <div class="section-title">
      <h2>企业主体核对</h2>
      <p>选择最接近本次拜访对象的主体。名称模糊时先不要直接生成。</p>
    </div>
    <div class="choice-grid">${candidateCards}</div>
    ${cachedList}
  `;
  refreshIcons();

  area.querySelectorAll<HTMLButtonElement>("[data-candidate]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.candidate);
      selectedCompany = { ...candidates[index], aiNeeds: pendingAiNeeds };
      area.querySelectorAll<HTMLButtonElement>("button").forEach((item) => {
        item.disabled = true;
      });
      startReport(false);
    });
  });
  bindHistoryButtons(area);
}

async function startReport(force: boolean) {
  if (!selectedCompany) return;
  clearPoll();
  setStatus(force ? "准备重新生成" : "缓存检查", 15, "正在检查云端是否已有可复用报告。");
  try {
    const data = await api<AnyRecord>("/.netlify/functions/create-report-job", {
      method: "POST",
      body: JSON.stringify({ company: selectedCompany, force })
    });
    if (data.cached && data.reportId) {
      setStatus("命中已有报告", 100, "已读取近 7 天内同企业报告。");
      await loadReport(data.reportId);
      return;
    }
    localStorage.setItem(ACTIVE_JOB_KEY, data.jobId);
    await triggerBackgroundJob(data.jobId);
    pollJob(data.jobId);
  } catch (error) {
    setStatus("任务创建失败", 100, (error as Error).message);
    document.querySelectorAll<HTMLButtonElement>("[data-candidate]").forEach((item) => {
      item.disabled = false;
    });
  }
}

async function triggerBackgroundJob(jobId: string) {
  setStatus("资料检索准备", 18, "已创建任务，正在启动后台深度检索。");
  const response = await fetch("/.netlify/functions/run-report-job-background", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId })
  });
  if (!response.ok && response.status !== 202) {
    let message = `后台任务启动失败：${response.status}`;
    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      // Ignore non-JSON errors.
    }
    throw new Error(message);
  }
  setStatus("资料检索", 20, "后台任务已启动。你可以关闭网页，任务会继续运行；之后重新打开本页会自动接回进度。");
}

function pollJob(jobId: string) {
  pollErrorCount = 0;
  const tick = async () => {
    try {
      const data = await api<AnyRecord>(`/.netlify/functions/get-report-job?jobId=${encodeURIComponent(jobId)}`);
      const job = data.job;
      pollErrorCount = 0;
      setStatus(
        job.stage || "生成中",
        Number(job.progress || 0),
        job.status === "error" ? job.error : job.detail || "深度检索会比较慢，页面可以关闭，后台任务仍会继续。",
        job.steps || []
      );
      if (job.status === "done" && job.reportId) {
        clearPoll();
        localStorage.removeItem(ACTIVE_JOB_KEY);
        await loadReport(job.reportId);
      } else if (job.status === "error") {
        clearPoll();
        localStorage.removeItem(ACTIVE_JOB_KEY);
      }
    } catch (error) {
      pollErrorCount += 1;
      if (pollErrorCount < 8) {
        setStatus("任务状态同步中", Math.min(25 + pollErrorCount, 40), `状态读取临时失败，正在重试 ${pollErrorCount}/8。`);
        return;
      }
      setStatus("查询任务失败", 100, (error as Error).message);
      clearPoll();
      document.querySelectorAll<HTMLButtonElement>("[data-candidate]").forEach((item) => {
        item.disabled = false;
      });
    }
  };
  tick();
  pollTimer = window.setInterval(tick, 3500);
}

async function resumeActiveJob() {
  const jobId = localStorage.getItem(ACTIVE_JOB_KEY);
  if (!jobId) return;
  try {
    const data = await api<AnyRecord>(`/.netlify/functions/get-report-job?jobId=${encodeURIComponent(jobId)}`);
    const job = data.job;
    if (job.status === "done" && job.reportId) {
      localStorage.removeItem(ACTIVE_JOB_KEY);
      await loadReport(job.reportId);
      return;
    }
    if (job.status === "error") {
      localStorage.removeItem(ACTIVE_JOB_KEY);
      setStatus("上次任务失败", 100, job.error || "任务已失败。");
      return;
    }
    setStatus(job.stage || "继续后台任务", Number(job.progress || 0), "已接回上次未完成任务，后台仍在继续。", job.steps || []);
    pollJob(jobId);
  } catch {
    localStorage.removeItem(ACTIVE_JOB_KEY);
  }
}

function clearPoll() {
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

async function loadReport(reportId: string) {
  const data = await api<AnyRecord>(`/.netlify/functions/get-report?reportId=${encodeURIComponent(reportId)}`);
  currentReport = data.report;
  currentHtml = data.html || "";
  selectedCompany = {
    name: currentReport?.companyName,
    standardName: currentReport?.standardName,
    region: currentReport?.region,
    industry: currentReport?.industry,
    aiNeeds: currentReport?.userContext?.aiNeeds || currentReport?.aiNeeds || ""
  };
  renderReport(currentReport!);
  onSearchHistory();
}

async function onSearchHistory() {
  const q = (document.querySelector<HTMLInputElement>("#historyInput")?.value || "").trim();
  const period = (document.querySelector<HTMLSelectElement>("#historyPeriod")?.value || "30d").trim();
  const rating = (document.querySelector<HTMLSelectElement>("#historyRating")?.value || "all").trim();
  try {
    const data = await api<AnyRecord>(`/.netlify/functions/search-reports?q=${encodeURIComponent(q)}&period=${encodeURIComponent(period)}&rating=${encodeURIComponent(rating)}`);
    historyReports = data.reports || [];
    historyPage = 1;
    renderHistoryArea();
  } catch {
    // Static preview can ignore history errors.
  }
}

function renderHistoryArea() {
  const area = document.querySelector<HTMLElement>("#historyArea")!;
  if (!historyReports.length) {
    area.innerHTML = `<div class="empty">当前筛选条件下还没有报告。可以调整时间、评级或关键词后再查。</div>`;
    refreshIcons();
    return;
  }

  const totalPages = Math.max(1, Math.ceil(historyReports.length / HISTORY_PAGE_SIZE));
  historyPage = Math.min(Math.max(historyPage, 1), totalPages);
  const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
  const pageItems = historyReports.slice(start, start + HISTORY_PAGE_SIZE);

  area.innerHTML = `
    <div class="history-panel">
      ${historyOverview(historyReports)}
      <div class="history-pager">
        <span>第 ${historyPage} / ${totalPages} 页，共 ${historyReports.length} 份；当前显示 ${start + 1}-${Math.min(start + HISTORY_PAGE_SIZE, historyReports.length)} 份</span>
        <div>
          <button data-history-page="prev" type="button" ${historyPage <= 1 ? "disabled" : ""}>上一页</button>
          <button data-history-page="next" type="button" ${historyPage >= totalPages ? "disabled" : ""}>下一页</button>
        </div>
      </div>
      <div class="history-grid">${pageItems.map((item: AnyRecord) => historyItem(item)).join("")}</div>
    </div>
  `;
  refreshIcons();
  bindHistoryButtons(area);
}

function qualityText(item: AnyRecord) {
  if (item.qualityText) return item.qualityText;
  if (item.qualityLevel === "diagnostic") return "诊断";
  if (item.qualityLevel === "limited") return "有限资料";
  if (item.qualityLevel === "brief") return "简版";
  return "正式";
}

function ratingOf(item: AnyRecord) {
  return item.opportunityRating || { status: "not_rated", label: "暂不评级", notRatedReason: "旧报告或公开信息不足。" };
}

function ratingClass(item: AnyRecord) {
  const rating = ratingOf(item);
  if (rating.status !== "rated") return "rating-not-rated";
  return `rating-${String(rating.grade || "D").toLowerCase()}`;
}

function ratingLabel(item: AnyRecord) {
  const rating = ratingOf(item);
  if (rating.status !== "rated") return "暂不评级";
  return `${rating.grade}级 ${rating.score}分`;
}

function ratingAction(item: AnyRecord) {
  const rating = ratingOf(item);
  if (rating.status !== "rated") return "公开信息不足";
  return rating.nextAction || "查看评估";
}

function opportunityRatingPanel(report: AnyRecord) {
  const rating = ratingOf(report);
  const detail =
    rating.status === "rated"
      ? `
        <div class="rating-detail">
          <div class="rating-dim-grid">
            ${arr(rating.dimensions)
              .map((item) => `
                <article class="rating-dim">
                  <div class="rating-dim-head"><b>${e(item.title)}</b><strong>${e(item.score)}分</strong></div>
                  <div class="rating-bar"><i style="width:${Math.max(0, Math.min(Number(item.score) || 0, 100))}%"></i></div>
                  ${arr(item.evidence).length ? `<p><b>依据</b>${e(arr(item.evidence).join("；"))}</p>` : ""}
                  ${arr(item.deductions).length ? `<p><b>扣分</b>${e(arr(item.deductions).join("；"))}</p>` : ""}
                  ${arr(item.questions).length ? `<p><b>待确认</b>${e(arr(item.questions).join("；"))}</p>` : ""}
                </article>
              `)
              .join("")}
          </div>
          ${arr(rating.riskFlags).length ? `<div class="risk-tags">${arr(rating.riskFlags).map((item) => `<span>${e(item)}</span>`).join("")}</div>` : ""}
        </div>
      `
      : `<div class="rating-detail"><p>${e(rating.notRatedReason || "公开信息不足，暂不评级。")}</p></div>`;
  return `
    <details class="rating-card ${e(ratingClass(report))}">
      <summary>
        <div class="rating-score">
          ${icon(rating.status === "rated" ? "Trophy" : "CircleAlert")}
          <b>${e(rating.status === "rated" ? `${rating.grade}级｜${rating.score}分｜${rating.nextAction}` : "暂不评级｜公开信息不足")}</b>
          <span>${e(rating.summary || rating.notRatedReason || "来源不足，先补充资料与客户线索。")}</span>
        </div>
        <div class="rating-toggle">${icon("ChevronDown")}查看评估理由</div>
      </summary>
      ${detail}
    </details>
  `;
}

function formatDuration(ms: unknown) {
  const value = Number(ms || 0);
  if (!Number.isFinite(value) || value <= 0) return "-";
  const totalSeconds = Math.round(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}小时${rest}分钟` : `${hours}小时`;
  }
  if (minutes > 0) return `${minutes}分${seconds}秒`;
  return `${seconds}秒`;
}

function qualityClass(item: AnyRecord) {
  const level = item.qualityLevel || "formal";
  return `q-${String(level).replace(/[^\w-]/g, "")}`;
}

function historyOverview(items: AnyRecord[]) {
  const total = items.length;
  const formal = items.filter((item) => item.qualityLevel === "formal").length;
  const rated = items.filter((item) => ratingOf(item).status === "rated").length;
  const avgSources = total
    ? Math.round(items.reduce((sum, item) => sum + Number(item.sourceCount || item.verifiedSourceCount || 0), 0) / total)
    : 0;
  const latest = items[0]?.generatedAt ? new Date(items[0].generatedAt).toLocaleString("zh-CN") : "-";
  return `
    <div class="history-overview">
      <div><b>${total}</b><span>当前列表</span></div>
      <div><b>${formal}</b><span>正式报告</span></div>
      <div><b>${rated}</b><span>已评级</span></div>
      <div><b>${avgSources}</b><span>平均来源</span></div>
      <div><b>${e(latest)}</b><span>最近生成</span></div>
    </div>
  `;
}

function historyItem(item: AnyRecord) {
  const date = item.generatedAt ? new Date(item.generatedAt).toLocaleString("zh-CN") : "-";
  const sources = Number(item.sourceCount || item.verifiedSourceCount || 0);
  const sourcePercent = Math.max(8, Math.min(100, Math.round((sources / 15) * 100)));
  return `
    <article class="history-item ${e(qualityClass(item))} ${e(ratingClass(item))}">
      <div>
        <div class="history-title">
          <b>${e(item.standardName || item.companyName)}</b>
          <em>${e(qualityText(item))}</em>
        </div>
        <div class="history-badges">
          <span class="rating-badge ${e(ratingClass(item))}">${icon(ratingOf(item).status === "rated" ? "Trophy" : "CircleAlert")}${e(ratingLabel(item))}</span>
          <span>${e(ratingAction(item))}</span>
        </div>
        <span>${e(item.region || "-")} · ${e(item.industry || "-")}</span>
        <div class="history-meter"><i style="width:${sourcePercent}%"></i></div>
        <small>生成：${e(date)} · 耗时：${e(formatDuration(item.durationMs))} · 来源：${e(sources)} 个</small>
      </div>
      <div class="history-actions">
        <button data-report="${e(item.reportId)}" type="button">${icon("FileText")}打开</button>
        <button data-delete-report="${e(item.reportId)}" data-delete-name="${e(item.standardName || item.companyName || "这份报告")}" class="danger ghost" type="button">${icon("Trash2")}删除</button>
      </div>
    </article>
  `;
}

function bindHistoryButtons(root: ParentNode) {
  root.querySelectorAll<HTMLButtonElement>("[data-history-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.historyPage;
      historyPage += action === "next" ? 1 : -1;
      renderHistoryArea();
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-report]").forEach((button) => {
    button.addEventListener("click", () => loadReport(button.dataset.report || ""));
  });
  root.querySelectorAll<HTMLButtonElement>("[data-delete-report]").forEach((button) => {
    button.addEventListener("click", () => deleteReport(button.dataset.deleteReport || "", button.dataset.deleteName || "这份报告"));
  });
}

function renderReport(report: AnyRecord) {
  const area = document.querySelector<HTMLElement>("#reportArea")!;
  const generated = report.generatedAt ? new Date(report.generatedAt).toLocaleString("zh-CN") : "-";
  const duration = formatDuration(report.durationMs);
  const isDiagnostic = report.qualityLevel === "diagnostic";
  area.innerHTML = `
    <div class="report-actions">
      <div>
        <h2>${e(report.standardName)}：商机挖掘报告</h2>
        <div class="report-meta">
          <span>${icon("CalendarClock")}生成：${e(generated)}</span>
          <span>${icon("Timer")}耗时：${e(duration)}</span>
          <span>${icon("BrainCircuit")}模型：${e(report.modelName)}</span>
          <span>${icon("ShieldCheck")}质量：${e(report.qualityLabel || qualityText(report))}</span>
          <span>${icon("Link")}来源：${e(report.verifiedSourceCount ?? report.sourceCount ?? 0)} 条</span>
          <span>${icon("Layers3")}覆盖：${e(report.topicCoverageCount ?? 0)} 类</span>
        </div>
      </div>
      <div>
        <button id="downloadHtml" type="button">${icon("Download")}下载HTML</button>
        <button id="deleteReport" class="danger ghost" type="button">${icon("Trash2")}删除报告</button>
        <button id="refreshReport" class="danger" type="button">${icon("RefreshCcw")}重新生成</button>
      </div>
    </div>
    ${opportunityRatingPanel(report)}
    ${qualityBanner(report)}
    <section class="refine-panel">
      <div>
        <h3>补充信息后完善报告</h3>
        <p>如果你已掌握客户需求、参会人、业务场景、反馈意见或希望调整侧重点，可以写在这里。系统会调用模型完善当前报告，并保留来源分级提醒。</p>
      </div>
      <textarea id="refineInput" rows="4" placeholder="例如：客户更关注AI智能体落地；已提到知识库和售后客服；销售希望弱化财务分析，强化场景切入和会前问题清单。"></textarea>
      <button id="improveReport" class="primary" type="button">${icon("Sparkles")}基于补充信息完善</button>
    </section>
    <div class="quick mini">${arr(report.quickCards).map((item) => `<div><b>${e(item.title)}</b>${e(item.body)}<span>${e(item.insight)}</span></div>`).join("")}</div>
    ${isDiagnostic ? diagnosticSections(report) : normalReportSections(report)}
    <section class="report-section"><h2>附录：相关资料来源</h2>${sourceTable(report.sources)}</section>
  `;
  refreshIcons();

  document.querySelector<HTMLButtonElement>("#downloadHtml")!.addEventListener("click", downloadHtml);
  document.querySelector<HTMLButtonElement>("#improveReport")!.addEventListener("click", improveCurrentReport);
  document.querySelector<HTMLButtonElement>("#deleteReport")!.addEventListener("click", async () => {
    if (!currentReport?.reportId) return;
    await deleteReport(currentReport.reportId, currentReport.standardName || "这份报告");
  });
  document.querySelector<HTMLButtonElement>("#refreshReport")!.addEventListener("click", async () => {
    if (!selectedCompany) return;
    const ok = window.confirm("重新生成会覆盖近 7 天内同企业最新报告入口，并重新消耗检索时间和模型额度。旧文件可能仍保留，但历史列表只显示新版本。确认继续吗？");
    if (!ok) return;
    await startReport(true);
  });
}

async function improveCurrentReport() {
  if (!currentReport?.reportId) return;
  const input = (document.querySelector<HTMLTextAreaElement>("#refineInput")?.value || "").trim();
  if (!input) {
    setStatus("请输入补充信息", 100, "可以补充客户已表达的AI需求、场景偏好、参会角色或你希望报告调整的方向。");
    return;
  }
  setStatus("完善报告", 82, "正在基于补充信息调整当前报告。补充内容会标注为用户提供线索，不会替代公开来源。");
  try {
    const data = await api<AnyRecord>("/.netlify/functions/improve-report", {
      method: "POST",
      body: JSON.stringify({ reportId: currentReport.reportId, instruction: input })
    });
    currentReport = data.report;
    currentHtml = data.html || "";
    renderReport(currentReport!);
    setStatus("报告已完善", 100, "已基于补充信息生成更新版。");
    await onSearchHistory();
  } catch (error) {
    setStatus("完善失败", 100, (error as Error).message);
  }
}

async function deleteReport(reportId: string, name = "这份报告") {
  if (!reportId) return;
  const ok = window.confirm(`确认删除“${name}”吗？删除后历史列表不再显示，已下载的本地 HTML 不受影响。`);
  if (!ok) return;
  try {
    await api<AnyRecord>("/.netlify/functions/delete-report", {
      method: "POST",
      body: JSON.stringify({ reportId })
    });
    if (currentReport?.reportId === reportId) {
      currentReport = null;
      currentHtml = "";
      document.querySelector("#reportArea")!.innerHTML = "";
      setStatus("报告已删除", 100, "已从索引和报告存储中移除。");
    }
    await onSearchHistory();
  } catch (error) {
    setStatus("删除失败", 100, (error as Error).message);
  }
}

function qualityBanner(report: AnyRecord) {
  const warnings = arr<string>(report.qualityWarnings);
  const title =
    report.qualityLevel === "diagnostic"
      ? "资料不足，已阻止正式报告生成"
      : report.qualityLevel === "limited"
        ? "资料有限，仅供会前参考"
      : report.qualityLevel === "brief"
        ? "来源偏少，建议谨慎使用"
        : "来源达到正式报告门槛";
  return `
    <div class="quality-banner quality-${e(report.qualityLevel || "formal")}">
      <b>${e(title)}</b>
      <span>${icon("ShieldCheck")}质量：${e(report.qualityLabel || qualityText(report))}｜可校验来源 ${e(report.verifiedSourceCount ?? report.sourceCount ?? 0)} 条｜可读来源 ${e(report.readableSourceCount ?? 0)} 条｜主题覆盖 ${e(report.topicCoverageCount ?? 0)} 类</span>
      ${warnings.length ? `<ul>${warnings.map((item) => `<li>${e(item)}</li>`).join("")}</ul>` : ""}
    </div>
  `;
}

function normalReportSections(report: AnyRecord) {
  return `
    <section class="report-section"><h2>1. 研究结论</h2><div class="grid">${simpleCards(report.conclusions)}</div></section>
    <section class="report-section"><h2>2. 客户认知</h2>
      <h3>2.1 本地主体画像</h3><div class="grid two">${evidenceCards(report.customerInsights?.localCards)}</div>
      <h3>2.2 集团与行业背景</h3><div class="grid two">${evidenceCards(report.customerInsights?.groupCards)}</div>
      <h3>2.3 经营规模与关键指标</h3><div class="metric-grid">${metricCards(report.customerInsights?.metrics)}</div>
      <h3>2.4 数字化与AI线索</h3><div class="grid two">${evidenceCards(report.customerInsights?.digitalCards)}</div>
    </section>
    <section class="report-section"><h2>3. 经营痛点穿透</h2><div class="pain-grid">${painCards(report.pains)}</div></section>
    <section class="report-section"><h2>4. 初步方案建议</h2><div class="solution-grid">${solutionCards(report.solutions)}</div></section>
    <section class="report-section"><h2>5. 前置要求</h2><div class="require-grid"><article class="card"><h3>会前尽量了解</h3>${list(report.requirements?.preMeeting)}</article><article class="card"><h3>现场顺势探问</h3>${list(report.requirements?.onSite)}</article></div></section>
  `;
}

function diagnosticSections(report: AnyRecord) {
  const diagnosis = report.diagnosis || {};
  return `
    <section class="report-section"><h2>1. 检索诊断</h2><div class="grid">${simpleCards(report.conclusions)}</div></section>
    <section class="report-section"><h2>2. 未达门槛原因</h2>
      <div class="grid two">
        <article class="card"><h3>已覆盖主题</h3>${list(diagnosis.coveredTopics)}</article>
        <article class="card"><h3>缺少主题</h3>${list(diagnosis.missingTopics)}</article>
      </div>
    </section>
    <section class="report-section"><h2>3. 建议补充信息</h2><div class="require-grid"><article class="card"><h3>会前尽量了解</h3>${list(report.requirements?.preMeeting)}</article><article class="card"><h3>现场顺势探问</h3>${list(report.requirements?.onSite)}</article></div></section>
  `;
}

function simpleCards(items: unknown) {
  return arr(items).map((item) => `<article class="card"><h3>${e(item.title)}</h3><p>${e(item.body)}</p></article>`).join("");
}

function evidenceCards(items: unknown) {
  return arr(items)
    .map((item) => `<article class="profile-card"><h3>${e(item.title)}</h3><div class="label">公开信息</div>${list(item.facts)}<div class="label">关键信息</div><p>${e(item.insight)}</p></article>`)
    .join("");
}

function metricCards(items: unknown) {
  return arr(items).map((item) => `<div class="metric"><b>${e(item.label)}</b><strong>${e(item.value)}</strong><span>${e(item.note)}</span></div>`).join("");
}

function painCards(items: unknown) {
  return arr(items)
    .map((item) => `<article class="pain-card"><h3>${e(item.title)}</h3><div class="label">依据来源</div><p>${e(item.sourceBasis)}</p><div class="label">痛点推导</div><p>${e(item.reasoning)}</p><div class="label">现场确认口径</div>${list(item.validationSignals)}<div class="entry">${e(item.aiEntry)}</div></article>`)
    .join("");
}

function solutionCards(items: unknown) {
  return arr(items)
    .map((item) => `<article class="solution-card"><span class="tag">${e(item.priority)}</span><h3>${e(item.title)}</h3><p>${e(item.why)}</p><small>${e(item.how)}</small></article>`)
    .join("");
}

function list(items: unknown) {
  const values = arr(items);
  return values.length ? `<ul>${values.map((item) => `<li>${e(item)}</li>`).join("")}</ul>` : `<p class="muted">待确认</p>`;
}

function sourceTable(items: unknown) {
  const rows = arr(items)
    .filter((item) => isHttpUrl(item.url))
    .map((item) => `<tr><td>${e(item.title)}</td><td>${e(item.usedFor)}</td><td>${e(item.confidence)}</td><td><a href="${e(item.url)}" target="_blank" rel="noreferrer">来源链接</a></td></tr>`)
    .join("");
  return `<table><thead><tr><th>资料</th><th>用于支撑的判断</th><th>置信度</th><th>链接</th></tr></thead><tbody>${rows || `<tr><td colspan="4">本次未读取到可校验来源。</td></tr>`}</tbody></table>`;
}

function downloadHtml() {
  if (!currentHtml || !currentReport) return;
  const blob = new Blob([currentHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentReport.standardName || "企业商机挖掘报告"}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

shell();
