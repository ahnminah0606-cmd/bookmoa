import OpenAI from 'openai';

export interface SummaryInput {
  content?: unknown;
  title?: unknown;
  author?: unknown;
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
