import { FORMAL_SOURCE_MIN } from "./report-quality.mjs";

const DIMENSIONS = [
  { key: "valuePotential", title: "客户价值潜力", weight: 20 },
  { key: "decisionReach", title: "决策可达性", weight: 20 },
  { key: "needClarity", title: "需求明确度", weight: 20 },
  { key: "capabilityFit", title: "能力匹配度", weight: 20 },
  { key: "progressMaturity", title: "推进成熟度", weight: 10 },
  { key: "riskControl", title: "风险可控性", weight: 10 }
];

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (typeof value === "object") return Object.values(value).map(textOf).join(" ");
  return "";
}

function countTerms(text, terms) {
  return terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function dimension(key, score, evidence, deductions, questions) {
  const base = DIMENSIONS.find((item) => item.key === key);
  return {
    key,
    title: base.title,
    weight: base.weight,
    score: clamp(score),
    evidence: evidence.filter(Boolean).slice(0, 4),
    deductions: deductions.filter(Boolean).slice(0, 4),
    questions: questions.filter(Boolean).slice(0, 4)
  };
}

function gradeOf(score) {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

function nextActionOf(grade) {
  if (grade === "S" || grade === "A") return "建议优先推进";
  if (grade === "B") return "补齐关键输入后推进";
  if (grade === "C") return "谨慎投入售前资源";
  return "暂缓深度方案投入";
}

function summaryOf(grade, dimensions, riskFlags) {
  const weak = dimensions
    .filter((item) => item.score < 65)
    .map((item) => item.title)
    .slice(0, 2);
  if (grade === "S" || grade === "A") {
    return "客户价值、需求线索与能力匹配度较好，可作为优先跟进商机。";
  }
  if (grade === "B") {
    return weak.length ? `具备推进价值，但${weak.join("、")}仍需会前确认。` : "具备推进价值，但仍需补齐关键输入。";
  }
  if (grade === "C") {
    return riskFlags.length ? `当前风险较多，建议先确认${riskFlags.slice(0, 2).join("、")}。` : "当前信息不足以支撑深度投入。";
  }
  return "当前不建议直接投入深度方案，先补齐客户目标、决策链和需求边界。";
}

export function buildOpportunityRating(report = {}) {
  const sourceCount = Number(report.verifiedSourceCount ?? report.sourceCount ?? 0);
  if (report.qualityLevel !== "formal" || sourceCount < FORMAL_SOURCE_MIN) {
    return {
      status: "not_rated",
      label: "暂不评级",
      notRatedReason: `公开信息不足或未达到正式报告门槛。当前可校验来源 ${sourceCount} 条，评级最低要求 ${FORMAL_SOURCE_MIN} 条。`,
      nextAction: "先补充资料与客户线索"
    };
  }

  const fullText = textOf(report);
  const aiNeeds = String(report.aiNeeds || report.userContext?.aiNeeds || "").trim();
  const pains = arr(report.pains);
  const solutions = arr(report.solutions);
  const metrics = arr(report.customerInsights?.metrics);
  const requirements = arr(report.requirements?.preMeeting).concat(arr(report.requirements?.onSite));
  const warnings = arr(report.qualityWarnings);
  const missingTopics = arr(report.missingTopics);

  const scaleHits = countTerms(fullText, ["上市", "集团", "全球", "头部", "营收", "收入", "净销售额", "亿元", "亿美元", "注册资本", "员工", "工厂", "园区", "主机厂", "客户"]);
  const budgetHits = countTerms(fullText, ["预算", "投资", "采购", "立项", "ROI", "付费", "资金", "降本", "提效", "成本"]);
  const valueScore = 44 + Math.min(32, scaleHits * 4) + Math.min(14, budgetHits * 3) + Math.min(10, metrics.length * 2);
  const valueDimension = dimension(
    "valuePotential",
    valueScore,
    [
      metrics.length ? `报告提取了 ${metrics.length} 个经营规模或关键指标。` : "",
      scaleHits >= 4 ? "公开信息显示客户具备一定规模或集团背景。" : "",
      budgetHits >= 2 ? "材料中出现投资、ROI、降本提效等预算相关信号。" : ""
    ],
    [scaleHits < 3 ? "经营规模、预算能力或业务复杂度证据仍偏少。" : ""],
    ["客户本次是否存在明确预算、试点预算或年度数字化预算？"]
  );

  const decisionUnclear = countTerms(fullText, ["决策权", "总部", "集团", "母公司", "上级", "关联公司", "待确认", "采购权", "立项权"]);
  const decisionPositive = countTerms(fullText, ["负责人", "高管", "IT", "质量", "设备", "工艺", "供应链", "业务线", "参会角色"]);
  const decisionScore = 58 + Math.min(18, decisionPositive * 3) - Math.min(30, decisionUnclear * 3);
  const decisionDimension = dimension(
    "decisionReach",
    decisionScore,
    [decisionPositive >= 3 ? "报告已识别可能相关的业务、IT或职能角色。" : ""],
    [
      decisionUnclear >= 4 ? "本地主体、集团或关联公司之间的决策链仍可能不清。" : "",
      hasAny(fullText, ["待确认", "谁说了算", "采购权", "立项权"]) ? "采购、立项或预算话语权需要一线确认。" : ""
    ],
    ["本次参会人是否具备采购、立项或影响预算的权力？", "宁波/本地主体能否独立推动试点或采购？"]
  );

  const needSignals = pains.length * 8 + solutions.length * 4 + (aiNeeds ? 24 : 0);
  const needScore = 32 + Math.min(48, needSignals) + (hasAny(fullText, ["明确", "已提到", "正在", "需求", "痛点"]) ? 8 : 0);
  const needDimension = dimension(
    "needClarity",
    needScore,
    [
      aiNeeds ? "用户已补充客户 AI 需求线索，可作为现场验证重点。" : "",
      pains.length ? `报告形成了 ${pains.length} 个可验证痛点方向。` : "",
      solutions.length ? `报告给出了 ${solutions.length} 个初步方案方向。` : ""
    ],
    [!aiNeeds ? "客户尚未直接表达AI需求，现阶段仍以公开信息推导为主。" : ""],
    ["客户最想优先解决的一个业务问题是什么？", "本次交流目标是认知交流、场景确认、演示验证还是立项评估？"]
  );

  const fitHits = countTerms(fullText, ["智能体", "Agent", "知识库", "智能客服", "数据问答", "质量追溯", "排程", "设备", "工艺", "供应链", "知识", "RAG", "自动化", "工作流", "AI"]);
  const fitScore = 42 + Math.min(42, fitHits * 4) + Math.min(12, solutions.filter((item) => /P0|P1/i.test(String(item.priority || ""))).length * 4);
  const fitDimension = dimension(
    "capabilityFit",
    fitScore,
    [
      fitHits >= 5 ? "痛点和方案中多次出现与 AI Agent、知识库、数据问答或流程自动化相关的切入点。" : "",
      solutions.some((item) => /P0|P1/i.test(String(item.priority || ""))) ? "报告存在 P0/P1 级别方案建议。" : ""
    ],
    [fitHits < 3 ? "当前材料与我方 Agent 能力的直接匹配证据还不充分。" : ""],
    ["客户是否允许使用脱敏样例、业务文档或流程数据评估方案边界？"]
  );

  const maturityPositive = countTerms(fullText, ["参会", "会议", "现场", "会前", "下一步", "数据边界", "系统", "演示", "POC", "试点"]);
  const maturityGaps = requirements.length + countTerms(fullText, ["待确认", "补充", "不清", "未知", "需要确认"]);
  const maturityScore = 42 + Math.min(26, maturityPositive * 3) - Math.min(22, maturityGaps);
  const maturityDimension = dimension(
    "progressMaturity",
    maturityScore,
    [maturityPositive >= 4 ? "报告已给出会议、现场确认和数据边界相关推进项。" : ""],
    [maturityGaps >= 6 ? "待确认问题较多，进入方案或报价前需要补齐输入。" : ""],
    ["会前能否确认参会角色、会议目标、客户优先痛点和可演示范围？"]
  );

  const riskHits = countTerms(fullText, ["数据安全", "合规", "外资", "总部", "权限", "审计", "脱敏", "系统接入", "客户数据", "待确认"]);
  const riskScore = 84 - Math.min(36, riskHits * 3) - Math.min(14, warnings.length * 4) - Math.min(10, missingTopics.length * 3);
  const riskDimension = dimension(
    "riskControl",
    riskScore,
    [
      sourceCount >= FORMAL_SOURCE_MIN ? `可校验来源 ${sourceCount} 条，达到评级门槛。` : "",
      report.topicCoverageCount >= 3 ? `来源覆盖 ${report.topicCoverageCount} 类主题。` : ""
    ],
    [
      riskHits >= 5 ? "数据安全、总部决策、系统接入或待确认项较多。" : "",
      warnings.length ? `来源质量提醒 ${warnings.length} 条。` : ""
    ],
    ["客户数据能否脱敏、离线或本地化验证？", "集团IT、安全、法务是否需要提前参与？"]
  );

  const dimensions = [valueDimension, decisionDimension, needDimension, fitDimension, maturityDimension, riskDimension];
  const weighted = dimensions.reduce((sum, item) => sum + item.score * (item.weight / 100), 0);
  const score = clamp(weighted);
  const grade = gradeOf(score);
  const riskFlags = [
    decisionDimension.score < 65 ? "决策链不清" : "",
    needDimension.score < 65 ? "需求明确度不足" : "",
    maturityDimension.score < 60 ? "推进条件不足" : "",
    riskDimension.score < 65 ? "数据/合规风险偏高" : "",
    valueDimension.score < 65 ? "客户价值证据不足" : ""
  ].filter(Boolean);

  return {
    status: "rated",
    label: `${grade}级`,
    grade,
    score,
    summary: summaryOf(grade, dimensions, riskFlags),
    nextAction: nextActionOf(grade),
    dimensions,
    riskFlags
  };
}

export function ratingIndex(rating = {}) {
  if (rating.status !== "rated") {
    return {
      status: "not_rated",
      label: rating.label || "暂不评级",
      notRatedReason: rating.notRatedReason || "旧报告或证据不足。"
    };
  }
  return {
    status: "rated",
    label: rating.label,
    grade: rating.grade,
    score: rating.score,
    summary: rating.summary,
    nextAction: rating.nextAction,
    riskFlags: rating.riskFlags || []
  };
}
