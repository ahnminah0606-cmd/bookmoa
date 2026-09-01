import OpenAI from 'openai';

export interface SummaryInput {
  content?: unknown;
  title?: unknown;
  author?: unknown;
}

interface FlowRecord {
  bookTitle?: unknown;
  authorName?: unknown;
  content?: unknown;
  updatedAt?: unknown;
}

interface ThoughtFlowInput {
  currentSummary?: unknown;
  records?: unknown;
  memberNames?: unknown;
}

interface OpenAIConfig {
  apiKey?: string;
  model?: string;
}

export function toPublicOpenAIError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('OPENAI_API_KEY')) return { status: 503, message };
  if (message.includes('5,000자')) return { status: 400, message };
  return { status: 502, message: 'AI 요약 서비스에 일시적인 문제가 있습니다.' };
}

export async function createDiscussionSummary(input: SummaryInput, config: OpenAIConfig = {}) {
  const content = typeof input.content === 'string' ? input.content.trim() : '';
  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 200) : '';
  const author = typeof input.author === 'string' ? input.author.trim().slice(0, 200) : '';

  if (!content || content.length > 5_000) {
    throw new Error('기록은 1자 이상 5,000자 이하여야 합니다.');
  }

  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: config.model || process.env.OPENAI_MODEL || 'gpt-5-mini',
    store: false,
    max_output_tokens: 220,
    instructions:
      '너는 독서 토론 기록을 정리하는 한국어 편집자다. 사용자가 쓴 내용에만 근거해 1~2문장으로 요약하고, 새로운 사실이나 평가를 지어내지 마라. 요약 본문만 출력해라.',
    input: `도서: ${title || '제목 없음'}${author ? ` (${author})` : ''}\n\n토론 기록:\n${content}`,
  });

  const summary = response.output_text.trim();
  if (!summary) throw new Error('요약 결과가 비어 있습니다.');
  return summary;
}

export async function updateThoughtFlow(input: ThoughtFlowInput, config: OpenAIConfig = {}) {
  const currentSummary = typeof input.currentSummary === 'string'
    ? input.currentSummary.trim().slice(0, 4_000)
    : '';
  const memberNames = Array.isArray(input.memberNames)
    ? input.memberNames.filter((name): name is string => typeof name === 'string').slice(0, 2)
    : [];
  const records = Array.isArray(input.records)
    ? (input.records as FlowRecord[]).slice(-25).map((record) => ({
        bookTitle: typeof record.bookTitle === 'string' ? record.bookTitle.slice(0, 200) : '제목 없음',
        authorName: typeof record.authorName === 'string' ? record.authorName.slice(0, 100) : '기록자',
        content: typeof record.content === 'string' ? record.content.trim().slice(0, 2_000) : '',
        updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
      })).filter((record) => record.content)
    : [];

  if (records.length === 0) throw new Error('분석할 독서 기록이 없습니다.');

  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: config.model || process.env.OPENAI_FLOW_MODEL || 'gpt-5.6-terra',
    store: false,
    reasoning: { effort: 'low' },
    max_output_tokens: 650,
    instructions: [
      '너는 두 사람이 함께 사용하는 독서 기록 서비스의 생각 정리 편집자다.',
      '기록에 명시된 내용만 근거로 삼고 사용자의 성격이나 정체성을 단정하지 마라.',
      '확신도, 점수, 분류명, 조언, 질문 목록을 출력하지 마라.',
      '현재 요약과 공존 가능한 새로운 관점은 즉시 자연스럽게 통합하고 decision을 update로 정한다.',
      '현재 요약으로는 더 이상 설명할 수 없을 만큼 중심 판단이나 기준이 달라졌을 때만 rewrite로 정한다.',
      '처음 생성할 때는 initialize, 의미 있는 새 내용이 없으면 unchanged로 정한다.',
      'summary는 한국어 2~3개 짧은 문단으로 쓰고, 두 사람의 공통점과 차이 또는 새롭게 드러난 관점을 자연스럽게 포함한다.',
      '사소한 문체 변화나 같은 내용의 반복을 큰 변화로 취급하지 마라.',
    ].join('\n'),
    input: JSON.stringify({
      members: memberNames,
      currentSummary: currentSummary || null,
      newRecords: records,
    }),
    text: {
      format: {
        type: 'json_schema',
        name: 'thought_flow_update',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            decision: { type: 'string', enum: ['initialize', 'update', 'rewrite', 'unchanged'] },
            summary: { type: 'string' },
          },
          required: ['decision', 'summary'],
        },
      },
    },
  });

  const parsed = JSON.parse(response.output_text) as {
    decision: 'initialize' | 'update' | 'rewrite' | 'unchanged';
    summary: string;
  };
  const summary = parsed.summary.trim();
  if (!summary && parsed.decision !== 'unchanged') throw new Error('생각의 흐름 결과가 비어 있습니다.');
  return { decision: parsed.decision, summary: summary || currentSummary };
}
