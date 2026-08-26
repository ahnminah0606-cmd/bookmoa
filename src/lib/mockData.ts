import { Book, DiscussionRecord, AnalysisResult, Reflection, Space, User } from '../types';

export const mockUsers: User[] = [
  { uid: 'user1', email: 'user1@example.com', displayName: '민아', nickname: '민아', createdAt: '2025-01-01T00:00:00.000Z', lastLogin: '2026-08-14T00:00:00.000Z' },
  { uid: 'user2', email: 'user2@example.com', displayName: '파트너', nickname: '사용자 2', createdAt: '2025-01-01T00:00:00.000Z', lastLogin: '2026-08-14T00:00:00.000Z' },
];

export const mockSpace: Space = {
  id: 'space1',
  users: ['user1', 'user2'],
  inviteCode: 'SAYU-2026',
};

export const INITIAL_USER_BOOKS: Book[] = [
  {
    id: 'book_sapiens',
    spaceId: 'space1',
    title: '사피엔스',
    author: '유발 하라리',
    isbn: '9788934972464',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788934972464.jpg',
    publisher: '김영사',
    status: 'reading',
    startedAt: '2026-08-10T00:00:00.000Z',
    createdAt: '2026-08-10T00:00:00.000Z',
  },
  {
    id: 'book_korean_history',
    spaceId: 'space1',
    title: '최소한의 한국사',
    author: '최태성',
    isbn: '9791198243430',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791198243430.jpg',
    publisher: '프런트페이지',
    status: 'completed',
    startedAt: '2026-07-06T00:00:00.000Z',
    completedAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-07-06T00:00:00.000Z',
  },
  {
    id: 'book_honmono',
    spaceId: 'space1',
    title: '혼모노',
    author: '성해나',
    isbn: '9788936439743',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788936439743.jpg',
    publisher: '창비',
    status: 'completed',
    startedAt: '2026-06-14T00:00:00.000Z',
    completedAt: '2026-07-03T00:00:00.000Z',
    createdAt: '2026-06-14T00:00:00.000Z',
  },
  {
    id: 'book_justice',
    spaceId: 'space1',
    title: '정의란 무엇인가',
    author: '마이클 샌델',
    isbn: '9788934939603',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788934939603.jpg',
    publisher: '김영사',
    status: 'completed',
    startedAt: '2026-05-05T00:00:00.000Z',
    completedAt: '2026-06-13T00:00:00.000Z',
    createdAt: '2026-05-05T00:00:00.000Z',
  },
  {
    id: 'book_zarathustra',
    spaceId: 'space1',
    title: '차라투스트라는 이렇게 말했다',
    author: '프리드리히 니체',
    isbn: '9788937460944',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788937460944.jpg',
    publisher: '민음사',
    status: 'completed',
    startedAt: '2026-03-29T00:00:00.000Z',
    completedAt: '2026-05-03T00:00:00.000Z',
    createdAt: '2026-03-29T00:00:00.000Z',
  },
  {
    id: 'book_chipwar',
    spaceId: 'space1',
    title: '칩 워 (Chip War)',
    author: '크리스 밀러',
    isbn: '9788960519831',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788960519831.jpg',
    publisher: '세종서적',
    status: 'completed',
    startedAt: '2026-02-21T00:00:00.000Z',
    completedAt: '2026-03-27T00:00:00.000Z',
    createdAt: '2026-02-21T00:00:00.000Z',
  },
  {
    id: 'book_1984',
    spaceId: 'space1',
    title: '1984',
    author: '조지 오웰',
    isbn: '9788937460777',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788937460777.jpg',
    publisher: '민음사',
    status: 'completed',
    startedAt: '2026-01-28T00:00:00.000Z',
    completedAt: '2026-02-19T00:00:00.000Z',
    createdAt: '2026-01-28T00:00:00.000Z',
  },
  {
    id: 'book_bible',
    spaceId: 'space1',
    title: '에피소드와 명화로 읽는 성경',
    author: '야마구치 노리코',
    isbn: '9788925573670',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788925573670.jpg',
    publisher: '더블북',
    status: 'completed',
    startedAt: '2026-01-06T00:00:00.000Z',
    completedAt: '2026-01-24T00:00:00.000Z',
    createdAt: '2026-01-06T00:00:00.000Z',
  },
  {
    id: 'book_philosophy',
    spaceId: 'space1',
    title: '미치게 친절한 철학',
    author: '안상헌',
    isbn: '9791164710027',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791164710027.jpg',
    publisher: '행성B',
    status: 'completed',
    startedAt: '2025-12-19T00:00:00.000Z',
    completedAt: '2026-01-04T00:00:00.000Z',
    createdAt: '2025-12-19T00:00:00.000Z',
  },
  {
    id: 'book_demian',
    spaceId: 'space1',
    title: '초판본 데미안',
    author: '헤르만 헤세',
    isbn: '9791159031076',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791159031076.jpg',
    publisher: '더스토리',
    status: 'completed',
    startedAt: '2025-11-25T00:00:00.000Z',
    completedAt: '2025-12-17T00:00:00.000Z',
    createdAt: '2025-11-25T00:00:00.000Z',
  },
  {
    id: 'book_dark_psychology',
    spaceId: 'space1',
    title: '다크 심리학',
    author: '다크 사이드 프로젝트',
    isbn: '9791198754080',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791198754080.jpg',
    publisher: '어센딩',
    status: 'completed',
    startedAt: '2025-11-07T00:00:00.000Z',
    completedAt: '2025-11-23T00:00:00.000Z',
    createdAt: '2025-11-07T00:00:00.000Z',
  },
  {
    id: 'book_cosmos',
    spaceId: 'space1',
    title: '코스모스',
    author: '칼 세이건',
    isbn: '9788983711892',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788983711892.jpg',
    publisher: '사이언스북스',
    status: 'completed',
    startedAt: '2025-07-14T00:00:00.000Z',
    completedAt: '2025-11-05T00:00:00.000Z',
    createdAt: '2025-07-14T00:00:00.000Z',
  },
  {
    id: 'book_thinking_fast',
    spaceId: 'space1',
    title: '생각에 관한 생각',
    author: '대니얼 카너먼',
    isbn: '9788934981213',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788934981213.jpg',
    publisher: '김영사',
    status: 'completed',
    startedAt: '2025-03-18T00:00:00.000Z',
    completedAt: '2025-07-12T00:00:00.000Z',
    createdAt: '2025-03-18T00:00:00.000Z',
  },
  {
    id: 'book_fish_dont_exist',
    spaceId: 'space1',
    title: '물고기는 존재하지 않는다',
    author: '룰루 밀러',
    isbn: '9791189327156',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791189327156.jpg',
    publisher: '곰출판',
    status: 'completed',
    startedAt: '2025-02-18T00:00:00.000Z',
    completedAt: '2025-03-16T00:00:00.000Z',
    createdAt: '2025-02-18T00:00:00.000Z',
  }
];

export const mockQuotes = [
  {
    bookId: 'book_korean_history',
    bookTitle: '최소한의 한국사',
    text: '역사는 사람을 만나는 인문학이다. 지나간 시간 속에서 오늘의 나를 발견한다.',
  },
  {
    bookId: 'book_honmono',
    bookTitle: '혼모노',
    text: '불완전한 마음들이 서로를 확인하려 애쓰는 순간, 그 자체가 진짜 삶의 얼굴이다.',
  },
  {
    bookId: 'book_justice',
    bookTitle: '정의란 무엇인가',
    text: '정의로운 사회는 단순히 좋은 것을 나누는 것을 넘어, 서로의 삶의 가치를 함께 묻는 사회다.',
  },
  {
    bookId: 'book_zarathustra',
    bookTitle: '차라투스트라는 이렇게 말했다',
    text: '자신의 삶을 진정으로 사랑하라. 그것이 네가 걸어가야 할 유일한 길이다.',
  },
  {
    bookId: 'book_chipwar',
    bookTitle: '칩 워 (Chip War)',
    text: '보이지 않는 모래 알갱이 크기의 실리콘 칩이 오늘날 전 세계 문명과 역사를 움직인다.',
  },
  {
    bookId: 'book_1984',
    bookTitle: '1984',
    text: '자유란 둘 더하기 둘이 넷이라고 말할 수 있는 자유다.',
  },
  {
    bookId: 'book_bible',
    bookTitle: '에피소드와 명화로 읽는 성경',
    text: '가장 어두운 순간에도 인간의 마음을 비추는 사랑과 믿음의 사유는 계속된다.',
  },
  {
    bookId: 'book_philosophy',
    bookTitle: '미치게 친절한 철학',
    text: '철학은 어려운 정답을 외우는 것이 아니라, 내 삶을 향해 좋은 질문을 던지는 태도다.',
  },
  {
    bookId: 'book_demian',
    bookTitle: '초판본 데미안',
    text: '새는 알에서 나오려고 투쟁한다. 알은 세계다. 태어나려는 자는 하나의 세계를 깨뜨려야 한다.',
  },
  {
    bookId: 'book_dark_psychology',
    bookTitle: '다크 심리학',
    text: '타인의 심리를 깊이 통찰하는 힘은 나 자신을 지키고 휘둘리지 않는 주체성이 된다.',
  },
  {
    bookId: 'book_cosmos',
    bookTitle: '코스모스',
    text: '우리는 모두 별에서 나온 먼지이며, 우주가 스스로를 탐구하는 방식이다.',
  },
  {
    bookId: 'book_thinking_fast',
    bookTitle: '생각에 관한 생각',
    text: '우리가 세상을 확신하는 방식은 생각보다 많은 직관의 착각과 편향 위에 서 있다.',
  },
  {
    bookId: 'book_fish_dont_exist',
    bookTitle: '물고기는 존재하지 않는다',
    text: '혼돈 속에서도 우리는 의미를 찾고, 범주를 넘어선 진짜 세계를 사랑할 수 있다.',
  },
];

// Rich thought evolutions for past books analyzed by AI
export interface BookAiAnalysis {
  user1Thought: string;
  user2Thought: string;
  sharedSummary: string;
  questions: string[];
  initialTimeline: Array<{
    id: string;
    date: string;
    title: string;
    author: string;
    content: string;
    user1Thought?: string;
    user2Thought?: string;
  }>;
}

export const BOOK_ANALYSES_MAP: Record<string, BookAiAnalysis> = {
  book_korean_history: {
    user1Thought: "단순한 사건 암기에서 벗어나, 위기 속에서 결정을 내렸던 과거 사람들의 마음에 깊이 이입하게 되었습니다. 현재의 선택을 역사의 긴 맥락에서 바라보는 여유가 생겼습니다.",
    user2Thought: "역사를 승자의 기록이 아닌 '선택의 축적'으로 바라보게 되었습니다. 불확실한 시대를 살아간 개인들의 태도에서 삶의 용기를 얻었습니다.",
    sharedSummary: "역사는 지나간 과거의 지식이 아니라, 오늘의 불안을 견디고 내일을 선택하는 인문학적 나침반임을 공감했습니다.",
    questions: [
      "지금 당신이 마주한 선택의 순간에 가장 떠오르는 역사 속 인물이나 장면은 무엇인가요?",
      "책을 읽은 후 일상에서 시간을 바라보는 호흡이나 관점에 변화가 있었나요?",
      "당시 나눴던 대화 중 여전히 마음속에 남아 있는 문장이 있다면 무엇인가요?"
    ],
    initialTimeline: [
      {
        id: 'korean_history_finish',
        date: '2026-08-01',
        title: '완독 직후 대화 기록',
        author: '민아 & 파트너',
        content: '인물들의 결단에 대해 집중적으로 이야기를 나눔. 조선 후기 실학자들의 치열한 고민이 지금 우리의 삶과 크게 다르지 않음을 느낌.',
        user1Thought: '역사 속 인물들의 고뇌가 지금의 내 고민과 맞닿아 있음을 깨달음.',
        user2Thought: '단순 암기가 아닌 시대정신을 읽는 눈을 기르게 됨.'
      }
    ]
  },
  book_honmono: {
    user1Thought: "겉으로 보이는 그럴듯함보다 서툴더라도 '진짜 자신의 감정'을 인정하는 것의 가치를 깨달았습니다. 타인의 시선에서 조금 더 자유로워졌습니다.",
    user2Thought: "가짜와 진짜를 나누는 이분법을 넘어, 사람들이 '진짜'를 갈망하는 심연의 외로움에 공감하게 되었습니다.",
    sharedSummary: "불완전한 자신을 긍정하고 타인의 취약함을 따뜻하게 바라보는 시선을 나누었습니다.",
    questions: [
      "최근 삶에서 '진짜 나다운 것'과 '보여주기 위한 것' 사이에서 고민했던 순간이 있나요?",
      "이 소설의 인물 중 지금 다시 생각해도 가슴에 남는 인물은 누구인가요?",
      "시간이 흘러 다시 보니 다르게 해석되는 장면이 있나요?"
    ],
    initialTimeline: [
      {
        id: 'honmono_finish',
        date: '2026-07-03',
        title: '완독 후 나눈 대화',
        author: '민아 & 파트너',
        content: '진짜와 가짜의 경계에 대해 밤늦게 통화하며 이야기함. 각자가 일상에서 느끼는 가면과 솔직함에 대해 털어놓음.',
        user1Thought: '완벽하려 애쓰기보다 진짜 내 감정을 마주하기로 함.',
        user2Thought: '상대의 방어기제 뒤에 숨은 취약함을 더 잘 이해하게 됨.'
      }
    ]
  },
  book_justice: {
    user1Thought: "공리주의적 효율성 중심 사고에서 벗어나, 도덕적 미덕과 공동체의 가치를 함께 묻는 다각적 시각을 가지게 되었습니다.",
    user2Thought: "옳고 그름의 판단 뒤에 숨겨진 철학적 전제들을 명확히 인식하게 되었으며, 사회적 갈등을 더 깊이 이해하게 되었습니다.",
    sharedSummary: "정의란 고정된 정답이 아니라, 끊임없이 서로 묻고 토론해야 하는 공동의 도덕적 탐색임을 확인했습니다.",
    questions: [
      "최근 사회 뉴스나 일상에서 샌델 교수의 정의론 관점으로 다시 보게 된 일이 있나요?",
      "공리주의, 자유주의, 공동체주의 중 지금 나의 가치관에 가장 가까운 것은 무엇인가요?",
      "당시 서로의 의견이 엇갈렸던 딜레마 문제에 대해 지금 다시 생각해보면 어떤가요?"
    ],
    initialTimeline: [
      {
        id: 'justice_finish',
        date: '2026-06-13',
        title: '정의란 무엇인가 완독 토론',
        author: '민아 & 파트너',
        content: '트롤리 딜레마와 분배 정의를 둘러싸고 치열하게 생각을 주고받음. 정답을 내리기보다 왜 그렇게 생각하는지 근거를 파고드는 시간이었음.',
        user1Thought: '도덕적 판단의 다층적인 측면을 배웠음.',
        user2Thought: '합의에 이르지 못하더라도 토론 자체가 주는 힘을 느낌.'
      }
    ]
  },
  book_zarathustra: {
    user1Thought: "외부의 기준과 관습에 얽매이지 않고, 내 삶의 의미를 스스로 창조해 나가는 초인(Übermensch)의 긍정에 큰 자극을 받았습니다.",
    user2Thought: "영원회귀라는 가혹한 질문 앞에서도 '그럼에도 불구하고 이 삶을 다시 한번 사랑하겠다'는 아모르파티(Amor fati)의 힘을 얻었습니다.",
    sharedSummary: "삶의 허무를 두려워하지 않고 온전히 자신의 의지로 삶을 창조하는 단단한 내면을 다짐했습니다.",
    questions: [
      "지금 이 순간, 당신의 삶을 영원히 무한히 반복한다고 해도 기꺼이 긍정할 수 있나요?",
      "니체의 '낙타-사자-아이' 3단계 변신 중 지금 나는 어느 단계에 머물러 있나요?",
      "일상의 권태나 불안이 찾아올 때 떠오르는 차라투스트라의 말이 있나요?"
    ],
    initialTimeline: [
      {
        id: 'zarathustra_finish',
        date: '2026-05-03',
        title: '차라투스트라 완독 사유',
        author: '민아 & 파트너',
        content: '니체의 비유와 상징을 함께 해석하며 자기 극복의 의미를 나눔.',
        user1Thought: '스스로 입법자가 되는 삶의 태도를 결심함.',
        user2Thought: '운명애(Amor Fati)의 진정한 무게를 실감함.'
      }
    ]
  },
  book_chipwar: {
    user1Thought: "단순 IT 기술인 줄 알았던 반도체가 세계 패권과 지정학, 전쟁의 본질을 결정짓는 핵심 열쇠임을 체감했습니다.",
    user2Thought: "복잡한 공급망과 글로벌 경제의 취약성을 통찰하며, 기술과 국가 권력의 결합을 입체적으로 보게 되었습니다.",
    sharedSummary: "미래를 움직이는 보이지 않는 인프라와 기술 지정학의 거대한 흐름을 이해하게 되었습니다.",
    questions: [
      "책을 읽고 난 후 일상의 전자기기나 글로벌 뉴스를 볼 때 시선의 변화가 있었나요?",
      "기술 패권 경쟁 속에서 개인이 갖추어야 할 인사이트는 무엇이라고 생각하나요?",
      "가장 인상 깊었던 역사적 분기점이나 인물은 누구였나요?"
    ],
    initialTimeline: [
      {
        id: 'chipwar_finish',
        date: '2026-03-27',
        title: '칩 워 완독 및 지정학 토론',
        author: '민아 & 파트너',
        content: 'TSMC, ASML, 실리콘밸리의 역사를 짚으며 기술과 세계사의 연결고리에 대해 깊은 대화를 나눔.',
        user1Thought: '기술을 둘러싼 거대한 국제정치의 역학을 이해함.',
        user2Thought: '현대 문명의 기반이 얼마나 정밀하고 취약한지 실감함.'
      }
    ]
  },
  book_1984: {
    user1Thought: "언어의 통제(신어)가 인간의 사고 자체를 어떻게 지배하고 축소하는지 보며, 자유로운 사유와 표현의 존엄함을 절감했습니다.",
    user2Thought: "감시와 전체주의의 공포를 넘어, 진실과 기억을 지켜내는 개인의 주체성이 왜 중요한지 깊이 성찰했습니다.",
    sharedSummary: "둘 더하기 둘이 넷이라고 말할 수 있는 당연한 자유와 비판적 사고의 소중함을 되새겼습니다.",
    questions: [
      "현대 디지털 사회의 알고리즘이나 감시 환경에서 1984의 디스토피아와 닮은 점이 있다면 무엇일까요?",
      "윈스턴과 줄리아의 저항과 굴복을 보며 어떤 감정이 가장 크게 들었나요?",
      "생각의 자유를 지키기 위해 일상에서 의식적으로 실천하고 싶은 태도가 있나요?"
    ],
    initialTimeline: [
      {
        id: '1984_finish',
        date: '2026-02-19',
        title: '1984 완독 후 독서 토론',
        author: '민아 & 파트너',
        content: '빅브라더와 언어 통제, 이중사고에 대해 토론하며 비판적 사유의 힘을 확인함.',
        user1Thought: '진실을 기록하고 기억하는 행위의 숭고함을 배움.',
        user2Thought: '보이지 않는 순응의 압력에 저항하는 태도를 다짐함.'
      }
    ]
  },
  book_cosmos: {
    user1Thought: "광활한 138억 년 우주의 시공간 속에서 나의 작은 고민들이 한층 가벼워지고, 동시에 살아있음 자체의 경이로움을 느꼈습니다.",
    user2Thought: "지구라는 작은 창백한 푸른 점(Pale Blue Dot)을 바라보며, 서로를 더 너그럽게 아끼고 보살펴야 한다는 겸손을 배웠습니다.",
    sharedSummary: "우리는 우주가 스스로를 인식하는 방식이며, 유한한 삶 속에서 앎과 사랑을 실천하는 경이로운 존재임을 공감했습니다.",
    questions: [
      "우주의 무한함을 생각할 때, 지금 마주한 일상의 문제들은 어떻게 느껴지나요?",
      "칼 세이건의 문장 중 밤하늘을 볼 때마다 떠오르는 말이 있다면 무엇인가요?",
      "책을 읽은 후 자연과 생명을 대하는 태도에 어떤 변화가 생겼나요?"
    ],
    initialTimeline: [
      {
        id: 'cosmos_finish',
        date: '2025-11-05',
        title: '코스모스 완독 및 별빛 사유',
        author: '민아 & 파트너',
        content: '우주 달력과 창백한 푸른 점에 대해 밤하늘을 올려다보며 깊은 사색을 나눔.',
        user1Thought: '경이로움과 겸손함을 동시에 품게 됨.',
        user2Thought: '우리 존재의 귀함과 서로를 아끼는 마음을 되새김.'
      }
    ]
  },
  book_fish_dont_exist: {
    user1Thought: "자연을 인간의 틀로 분류하고 통제하려는 오만함을 깨닫고, 혼돈 속에서도 경계를 허물고 진짜 세상을 사랑하는 자유를 얻었습니다.",
    user2Thought: "절망 속에서도 의미를 발견해 내는 인간의 집념과, 동시에 그 집념이 낳은 비극을 함께 성찰하며 열린 마음을 품게 되었습니다.",
    sharedSummary: "세상의 정해진 이름표와 범주를 넘어, 있는 그대로의 다채로운 생명과 진실을 껴안기로 했습니다.",
    questions: [
      "당신이 스스로에게 붙였던 한계나 규정 중 깨뜨려 버리고 싶은 이름표가 있나요?",
      "혼돈과 무질서 속에서 나를 지탱해 주는 나만의 의미는 무엇인가요?",
      "이 책의 마지막 장을 덮었을 때 밀려왔던 감정은 무엇이었나요?"
    ],
    initialTimeline: [
      {
        id: 'fish_finish',
        date: '2025-03-16',
        title: '물고기는 존재하지 않는다 완독 토론',
        author: '민아 & 파트너',
        content: '데이비드 스타 조던의 집착과 룰루 밀러의 통찰을 따라가며 범주의 해체에 대해 긴 이야기를 나눔.',
        user1Thought: '고정관념을 부수고 세상을 새롭게 보는 용기를 얻음.',
        user2Thought: '혼돈을 두려워하지 않고 사랑하는 법을 배움.'
      }
    ]
  }
};

// Fallback generator for generic books
export function getBookAnalysisOrDefault(bookId: string, title: string, author: string): BookAiAnalysis {
  if (BOOK_ANALYSES_MAP[bookId]) {
    return BOOK_ANALYSES_MAP[bookId];
  }

  return {
    user1Thought: `『${title}』을(를) 읽으며 이전에는 미처 보지 못했던 관점과 깊은 질문을 마주하게 되었습니다. 저자의 통찰을 바탕으로 일상의 생각과 태도에 긍정적인 확장이 일어났습니다.`,
    user2Thought: `단순한 지식 습득을 넘어 책이 던지는 핵심 화두에 대해 깊이 공감하고 스스로를 돌아보는 계기가 되었습니다.`,
    sharedSummary: `함께 읽고 토론하며 서로의 다른 시각을 확인하고, 사유의 지평을 넓혀가는 소중한 대화를 나눴습니다.`,
    questions: [
      `이 책 『${title}』을 읽고 난 후 가장 크게 생각이 바뀐 부분은 무엇인가요?`,
      `저자가 던진 핵심 메시지 중 지금 나의 일상에서 가장 적용해보고 싶은 것은 무엇인가요?`,
      `시간이 지난 지금, 당시에 나눴던 대화에서 새롭게 떠오르는 기억이 있나요?`
    ],
    initialTimeline: [
      {
        id: `${bookId}_finish`,
        date: '완독 당시',
        title: '완독 후 나눈 첫 대화',
        author: '민아 & 파트너',
        content: `『${title}』 완독 후 서로의 감상과 인상 깊었던 문장을 공유하며 나눈 첫 번째 사유 기록입니다.`,
        user1Thought: '책의 핵심 메시지에 대한 깊은 공감과 사유.',
        user2Thought: '새로운 시각으로 일상을 돌아보는 계기.'
      }
    ]
  };
}

export const mockReflectionQuestions = [
  "당시 가장 기억나는 내용은 무엇이었나요?",
  "시간이 지난 지금, 이 책의 결론에 대해 다르게 생각하는 부분이 있나요?",
  "당시에 대화했던 내용 중 최근 나의 삶에 영향을 준 문장이 있나요?"
];
