import { BRIEF_SOURCE_MIN } from "./report-quality.mjs";

export const OPPORTUNITY_RATING_VERSION = "presales-v2";

const DIMENSIONS = [
  { key: "valuePotential", title: "客户价值潜力", weight: 18 },
  { key: "triggerStrength", title: "问题触发强度", weight: 18 },
  { key: "capabilityFit", title: "我方能力匹配", weight: 20 },
  { key: "decisionReach", title: "决策可触达性", weight: 14 },
  { key: "informationConfidence", title: "信息置信度", weight: 16 },
  { key: "riskControl", title: "风险可控性", weight: 14 }
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

function dimension(key, score, evidence = [], deductions = [], questions = []) {
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
  if (score >= 86) return "A";
  if (score >= 72) return "B";
  if (score >= 58) return "C";
  return "D";
}

function levelOf(grade, confidenceScore) {
  if (confidenceScore < 40 && grade !== "A") return "待确认跟进";
  if (grade === "A") return "优先推进";
  if (grade === "B") return "重点跟进";
  if (grade === "C") return "轻量跟进";
  return "暂缓投入";
}

function nextActionOf(level, confidenceScore) {
  if (level === "优先推进") return confidenceScore < 55 ? "优先跟进，先补决策链和场景证据" : "优先安排会前输入和场景验证";
  if (level === "重点跟进") return "先确认痛点、角色和预算窗口";
  if (level === "轻量跟进") return "标准交流为主，少量验证客户真实需求";
  if (level === "待确认跟进") return "先确认客户主体、需求和参会角色";
  return "暂缓深度方案投入";
}

function confidenceLabel(score) {
  if (score >= 75) return "高";
  if (score >= 55) return "中";
  if (score >= 40) return "偏低";
  return "低";
}

function summaryOf(level, confidence, riskFlags) {
  if (level === "优先推进") return `值得优先跟进，但售前投入要绑定明确场景、参会角色和下一步动作；当前信息置信度${confidence}。`;
  if (level === "重点跟进") return `具备跟进价值，建议先把客户痛点、决策链和预算窗口问实；当前信息置信度${confidence}。`;
  if (level === "轻量跟进") return `可以跟进，但先以标准材料和问题确认控制投入；当前信息置信度${confidence}。`;
  if (level === "待确认跟进") return `现阶段不是低价值，而是关键信息不足；需要先确认主体、需求和决策链。`;
  return riskFlags.length ? `风险或证据缺口较多，建议先确认${riskFlags.slice(0, 2).join("、")}。` : "暂不建议投入深度方案资源。";
}

function presalesAdviceOf(level, confidenceScore) {
  if (level === "优先推进") {
    return confidenceScore < 55
      ? "按高潜商机处理，但先让一线补齐参会角色、业务场景和预算/立项线索，再投入定制方案。"
      : "可以优先投入售前准备，重点准备场景假设、客户问题清单和轻量验证方案。";
  }
  if (level === "重点跟进") return "建议进入培育和场景确认，不急于重方案；拿到明确痛点和推进人后再升级投入。";
  if (level === "轻量跟进") return "建议保持轻量触达，以标准材料、行业案例和问题清单为主，避免过早进入定制交付。";
  if (level === "待确认跟进") return "先做资格确认：客户是谁、谁参会、要解决什么问题、是否有下一步动作。信息成立后再重新评级。";
  return "暂缓深度售前投入，只保留低成本线索维护或等待客户明确需求。";
}

function qualificationConditions(dimensions) {
  const byKey = Object.fromEntries(dimensions.map((item) => [item.key, item]));
  const items = [
    "本次沟通能明确一个具体业务场景，而不是泛泛讨论 AI。",
    "参会人覆盖业务负责人或 IT/质量/研发/设备/供应链等关键角色。",
    "客户愿意确认现有流程、数据边界和可接受的验证方式。",
    "下一步能形成明确动作：补资料、安排业务访谈、确认样例或讨论预算窗口。"
  ];
  if ((byKey.valuePotential?.score || 0) < 62) items.push("补充客户规模、预算能力或业务复杂度证据。");
  if ((byKey.decisionReach?.score || 0) < 62) items.push("确认本地主体与集团/总部之间的立项、采购和技术决策关系。");
  if ((byKey.triggerStrength?.score || 0) < 62) items.push("确认客户是否有质量、研发、设备、交付、知识沉淀等真实业务触发。");
  if ((byKey.riskControl?.score || 0) < 62) items.push("提前确认数据脱敏、本地化部署、安全审批和系统接入边界。");
  return Array.from(new Set(items)).slice(0, 7);
}

function disqualificationSignals(dimensions) {
  const byKey = Object.fromEntries(dimensions.map((item) => [item.key, item]));
  const items = [
    "客户只想泛泛了解 AI，没有具体业务场景或下一步安排。",
    "参会人无法触达业务、IT或预算相关角色。",
    "客户不愿提供流程、文档、样例数据或现有系统边界。",
    "要求免费重度定制、无明确范围的 POC 或过早报价。"
  ];
  if ((byKey.valuePotential?.score || 0) < 58) items.push("公开信息和现场反馈都无法证明客户规模、预算能力或业务复杂度。");
  if ((byKey.capabilityFit?.score || 0) < 58) items.push("客户问题主要不在知识、流程、数据、质量、研发或现场协同范围内。");
  return Array.from(new Set(items)).slice(0, 6);
}

export function buildOpportunityRating(report = {}) {
  const sourceCount = Number(report.verifiedSourceCount ?? report.sourceCount ?? 0);
  const hasAnnualEvidence = Boolean(report.annualReportEvidence);
  const hasAnyCustomerClue = Boolean(report.aiNeeds || report.userContext?.aiNeeds) || arr(report.pains).length || arr(report.solutions).length || sourceCount > 0;
  if ((report.qualityLevel === "diagnostic" || sourceCount < BRIEF_SOURCE_MIN) && !hasAnnualEvidence && !hasAnyCustomerClue) {
    return {
      status: "not_rated",
      version: OPPORTUNITY_RATING_VERSION,
      label: "暂不评级",
      notRatedReason: `公开信息不足以做初访优先级判断。当前可校验来源 ${sourceCount} 条，建议先补充客户主体、官网、地区、行业或已知需求线索。`,
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
  const valueDimension = dimension(
    "valuePotential",
    45 + Math.min(30, scaleHits * 4) + Math.min(15, budgetHits * 3) + Math.min(10, metrics.length * 2),
    [
      metrics.length ? `报告提取了 ${metrics.length} 个经营规模或关键指标。` : "",
      scaleHits >= 4 ? "公开信息显示客户具备一定规模、集团背景或复杂业务场景。" : "",
      budgetHits >= 2 ? "材料中出现投资、ROI、降本提效等预算相关信号。" : ""
    ],
    [scaleHits < 3 ? "经营规模、预算能力或业务复杂度证据仍偏少。" : ""],
    ["客户本次是否存在明确预算、试点预算或年度数字化预算？"]
  );

  const triggerHits = pains.length * 4 + countTerms(fullText, ["质量", "交付", "返工", "停线", "设备", "排产", "研发", "DFM", "工艺", "知识", "成本", "效率"]);
  const directNeedHits = aiNeeds ? 24 : 0;
  const triggerDimension = dimension(
    "triggerStrength",
    38 + Math.min(42, triggerHits * 3) + directNeedHits,
    [
      aiNeeds ? "用户已补充客户需求线索，可作为现场验证重点。" : "",
      pains.length ? `报告形成了 ${pains.length} 个可验证痛点方向。` : ""
    ],
    [!aiNeeds ? "客户尚未直接表达 AI 需求，当前仍以公开信息推导为主。" : ""],
    ["客户最想优先解决的一个业务问题是什么？", "本次交流目标是认知交流、场景确认、演示验证还是立项评估？"]
  );

  const fitHits = countTerms(fullText, ["智能体", "Agent", "知识库", "数据问答", "质量追溯", "排程", "设备", "工艺", "研发", "DFM", "可制造性", "供应链", "自动化", "工作流", "AI"]);
  const p0p1 = solutions.filter((item) => /P0|P1/i.test(String(item.priority || ""))).length;
  const fitDimension = dimension(
    "capabilityFit",
    42 + Math.min(42, fitHits * 4) + Math.min(12, p0p1 * 4),
    [
      fitHits >= 5 ? "痛点和方案中出现 AI Agent、知识库、数据问答、流程自动化或研发工艺相关切入点。" : "",
      p0p1 ? "报告存在 P0/P1 级方案建议。" : ""
    ],
    [fitHits < 3 ? "当前材料与我方 Agent 能力的直接匹配证据还不充分。" : ""],
    ["客户是否允许使用脱敏样例、业务文档或流程数据评估方案边界？"]
  );

  const decisionPositive = countTerms(fullText, ["负责人", "高管", "IT", "质量", "设备", "工艺", "研发", "供应链", "业务线", "参会角色"]);
  const decisionUnknown = countTerms(fullText, ["待确认", "总部", "集团", "母公司", "采购权", "立项权", "谁说了算", "决策链"]);
  const decisionDimension = dimension(
    "decisionReach",
    58 + Math.min(22, decisionPositive * 3) - Math.min(10, decisionUnknown),
    [decisionPositive >= 3 ? "报告已识别可能相关的业务、IT或职能角色。" : ""],
    [decisionUnknown >= 5 ? "本地主体、集团或关联公司之间的决策链仍可能不清。" : ""],
    ["本次参会人是否具备采购、立项或影响预算的权力？", "本地主体能否独立推动试点或采购？"]
  );

  const effectiveSourceCount = hasAnnualEvidence ? Math.max(sourceCount, 15) : sourceCount;
  const effectiveReadableCount = hasAnnualEvidence ? Math.max(Number(report.readableSourceCount || 0), 10) : Number(report.readableSourceCount || 0);
  const effectiveTopicCoverage = hasAnnualEvidence ? Math.max(Number(report.topicCoverageCount || 0), 3) : Number(report.topicCoverageCount || 0);
  const coverageScore = Math.min(32, effectiveSourceCount * 2) + Math.min(20, effectiveReadableCount * 2) + Math.min(24, effectiveTopicCoverage * 6);
  const unknownPenalty = Math.min(22, countTerms(fullText, ["待确认", "未取得", "不清", "未知", "需要确认"]));
  const confidenceScore = clamp(34 + coverageScore - unknownPenalty - Math.min(10, missingTopics.length * 2));
  const infoDimension = dimension(
    "informationConfidence",
    confidenceScore,
    [
      hasAnnualEvidence ? `已接入用户上传年报，并保留 ${sourceCount} 条外部可校验来源。` : `可校验来源 ${sourceCount} 条。`,
      `可读来源 ${effectiveReadableCount} 条，主题覆盖 ${effectiveTopicCoverage} 类。`
    ],
    [
      missingTopics.length ? `仍缺少 ${missingTopics.length} 类主题覆盖。` : "",
      warnings.length ? `来源质量提醒 ${warnings.length} 条。` : ""
    ],
    ["是否能补充客户官网、会议主题、参会角色、已知业务线或客户直接需求？"]
  );

  const riskHits = countTerms(fullText, ["数据安全", "合规", "外资", "总部", "权限", "审计", "脱敏", "系统接入", "客户数据", "待确认"]);
  const riskDimension = dimension(
    "riskControl",
    82 - Math.min(26, riskHits * 2) - Math.min(10, warnings.length * 2),
    [
      sourceCount >= BRIEF_SOURCE_MIN ? `可校验来源 ${sourceCount} 条，达到初访判断门槛。` : "",
      report.topicCoverageCount >= 3 ? `来源覆盖 ${report.topicCoverageCount} 类主题。` : ""
    ],
    [riskHits >= 6 ? "数据安全、总部决策、系统接入或待确认项较多。" : ""],
    ["客户数据能否脱敏、离线或本地化验证？", "集团IT、安全、法务是否需要提前参与？"]
  );

  const dimensions = [valueDimension, triggerDimension, fitDimension, decisionDimension, infoDimension, riskDimension];
  const weighted = dimensions.reduce((sum, item) => sum + item.score * (item.weight / 100), 0);
  const score = clamp(weighted);
  const grade = gradeOf(score);
  const level = levelOf(grade, confidenceScore);
  const confidence = confidenceLabel(confidenceScore);
  const riskFlags = [
    decisionDimension.score < 62 ? "决策链待确认" : "",
    triggerDimension.score < 62 ? "需求触发不够清晰" : "",
    infoDimension.score < 55 ? "信息置信度不足" : "",
    riskDimension.score < 62 ? "数据/合规风险偏高" : "",
    valueDimension.score < 62 ? "客户价值证据不足" : ""
  ].filter(Boolean);

  return {
    status: "rated",
    version: OPPORTUNITY_RATING_VERSION,
    label: level,
    grade,
    score,
    priorityLevel: level,
    salesPriority: level,
    confidenceScore,
    confidenceLabel: confidence,
    summary: summaryOf(level, confidence, riskFlags),
    nextAction: nextActionOf(level, confidenceScore),
    presalesAdvice: presalesAdviceOf(level, confidenceScore),
    qualificationConditions: qualificationConditions(dimensions),
    disqualificationSignals: disqualificationSignals(dimensions),
    resourceBoundary: "初访前投入以客户画像、问题清单、标准案例和轻量场景验证为上限；定制方案、报价和POC范围必须等成立条件确认后再进入。",
    dimensions,
    riskFlags
  };
}

export function ratingIndex(rating = {}) {
  if (rating.status !== "rated") {
    return {
      status: "not_rated",
      version: rating.version || OPPORTUNITY_RATING_VERSION,
      label: rating.label || "暂不评级",
      notRatedReason: rating.notRatedReason || "旧报告或证据不足。"
    };
  }
  return {
    status: "rated",
    version: rating.version || OPPORTUNITY_RATING_VERSION,
    label: rating.label,
    grade: rating.grade,
    score: rating.score,
    priorityLevel: rating.priorityLevel,
    salesPriority: rating.salesPriority || rating.priorityLevel,
    confidenceScore: rating.confidenceScore,
    confidenceLabel: rating.confidenceLabel,
    summary: rating.summary,
    nextAction: rating.nextAction,
    presalesAdvice: rating.presalesAdvice,
    qualificationConditions: rating.qualificationConditions || [],
    disqualificationSignals: rating.disqualificationSignals || [],
    resourceBoundary: rating.resourceBoundary,
    riskFlags: rating.riskFlags || []
  };
}
