import { Book } from '@/types';

// Curated database of Korean bestsellers and steady sellers with accurate ISBNs and Kyobo Bookstore official covers
export const POPULAR_BOOKS_DB = [
  {
    title: '사피엔스',
    author: '유발 하라리',
    isbn: '9788934972464',
    googleBooksId: 'sapiens_harari',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788934972464.jpg',
    publisher: '김영사',
    publishedDate: '2015-11-23',
    description: '유인원에서 사이보그까지, 인간 역사의 대담하고 위대한 질문',
  },
  {
    title: '최소한의 한국사',
    author: '최태성',
    isbn: '9791198243430',
    googleBooksId: 'minimal_korean_history',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791198243430.jpg',
    publisher: '프런트페이지',
    publishedDate: '2023-06-21',
    description: '5천 년 역사가 단숨에 이해되는 최고의 역사 입문서',
  },
  {
    title: '혼모노',
    author: '성해나',
    isbn: '9788936439743',
    googleBooksId: 'honmono_sung',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788936439743.jpg',
    publisher: '창비',
    publishedDate: '2024-05-15',
    description: '알 수 없는 불쾌함의 근원은 어디에 있는가. 성해나 소설집.',
  },
  {
    title: '정의란 무엇인가',
    author: '마이클 샌델',
    isbn: '9788934939603',
    googleBooksId: 'justice_sandel',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788934939603.jpg',
    publisher: '김영사',
    publishedDate: '2014-11-20',
    description: '정의의 의미와 도덕적 딜레마에 대한 명쾌한 해답',
  },
  {
    title: '차라투스트라는 이렇게 말했다',
    author: '프리드리히 니체',
    isbn: '9788937460944',
    googleBooksId: 'thus_spoke_zarathustra',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788937460944.jpg',
    publisher: '민음사',
    publishedDate: '2004-03-20',
    description: '신은 죽었다. 초인의 삶을 향한 니체의 철학적 시선.',
  },
  {
    title: '칩 워 (Chip War)',
    author: '크리스 밀러',
    isbn: '9788960519831',
    googleBooksId: 'chip_war_miller',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788960519831.jpg',
    publisher: '세종서적',
    publishedDate: '2023-05-10',
    description: '누가 반도체 전쟁의 최후 승자가 될 것인가',
  },
  {
    title: '1984',
    author: '조지 오웰',
    isbn: '9788937460777',
    googleBooksId: '1984_orwell',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788937460777.jpg',
    publisher: '민음사',
    publishedDate: '2003-03-20',
    description: '전체주의 사회의 디스토피아를 경고하는 불멸의 고전',
  },
  {
    title: '에피소드와 명화로 읽는 성경',
    author: '야마구치 노리코',
    isbn: '9788925573670',
    googleBooksId: 'bible_paintings',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788925573670.jpg',
    publisher: '더블북',
    publishedDate: '2022-04-10',
    description: '한 권으로 끝내는 인문 교양 시리즈',
  },
  {
    title: '미치게 친절한 철학',
    author: '안상헌',
    isbn: '9791164710027',
    googleBooksId: 'kind_philosophy',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791164710027.jpg',
    publisher: '행성B',
    publishedDate: '2023-01-20',
    description: '개념과 맥락으로 독파하는 철학 이야기',
  },
  {
    title: '초판본 데미안',
    author: '헤르만 헤세',
    isbn: '9791159031076',
    googleBooksId: 'demian_story',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791159031076.jpg',
    publisher: '더스토리',
    publishedDate: '2019-12-20',
    description: '1919년 오리지널 초판본 표지 디자인',
  },
  {
    title: '다크 심리학',
    author: '다크 사이드 프로젝트',
    isbn: '9791198754080',
    googleBooksId: 'dark_psychology',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791198754080.jpg',
    publisher: '어센딩',
    publishedDate: '2021-10-15',
    description: '악인의 마음을 조작하는 은밀한 기술',
  },
  {
    title: '코스모스',
    author: '칼 세이건',
    isbn: '9788983711892',
    googleBooksId: 'cosmos_sagan',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788983711892.jpg',
    publisher: '사이언스북스',
    publishedDate: '2006-12-20',
    description: '광대한 우주 속 인간의 위치와 존재에 대한 탐구',
  },
  {
    title: '생각에 관한 생각',
    author: '대니얼 카너먼',
    isbn: '9788934981213',
    googleBooksId: 'thinking_fast_and_slow',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788934981213.jpg',
    publisher: '김영사',
    publishedDate: '2018-03-20',
    description: '우리의 행동을 지배하는 생각의 반란 (2018 최신판)',
  },
  {
    title: '물고기는 존재하지 않는다',
    author: '룰루 밀러',
    isbn: '9791189327156',
    googleBooksId: 'why_fish_dont_exist',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791189327156.jpg',
    publisher: '곰출판',
    publishedDate: '2021-12-17',
    description: '상실, 사랑 그리고 숨어 있는 삶의 질서에 관한 이야기',
  },
  {
    title: '소년이 온다',
    author: '한강',
    isbn: '9788936434120',
    googleBooksId: 'human_acts_han_kang',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788936434120.jpg',
    publisher: '창비',
    publishedDate: '2014-05-19',
    description: '2024 노벨문학상 수상 작가 한강의 대표작.',
  },
  {
    title: '작별하지 않는다',
    author: '한강',
    isbn: '9788954682152',
    googleBooksId: 'we_do_not_part_han_kang',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788954682152.jpg',
    publisher: '문학동네',
    publishedDate: '2021-09-09',
    description: '메디치 외국문학상 수상작.',
  },
  {
    title: '채식주의자',
    author: '한강',
    isbn: '9788936433598',
    googleBooksId: 'the_vegetarian_han_kang',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9788936433598.jpg',
    publisher: '창비',
    publishedDate: '2007-10-30',
    description: '맨부커 인터내셔널상 수상작.',
  },
  {
    title: '불변의 법칙',
    author: '모건 하우절',
    isbn: '9791191043617',
    googleBooksId: 'same_as_ever_morgan',
    coverImage: 'https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791191043617.jpg',
    publisher: '서삼독',
    publishedDate: '2024-02-28',
    description: '절대 변하지 않는 인간 본성에 대한 통찰.',
  }
];

export async function searchBooks(query: string) {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const results: any[] = [];
  const seenKeys = new Set<string>();

  // 1. Search in our curated database first (exact/partial match)
  const localMatches = POPULAR_BOOKS_DB.filter(book => {
    return (
      book.title.toLowerCase().includes(cleanQuery) ||
      book.author.toLowerCase().includes(cleanQuery) ||
      (book.isbn && book.isbn.includes(cleanQuery)) ||
      (book.publisher && book.publisher.toLowerCase().includes(cleanQuery))
    );
  });

  localMatches.forEach(item => {
    const key = `${item.title}_${item.author}`.toLowerCase();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      results.push(item);
    }
  });

  // 2. Open Library API fallback for search
  if (results.length < 5) {
    try {
      const openLibRes = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`
      );
      if (openLibRes.ok) {
        const data = await openLibRes.json();
        if (data.docs && Array.isArray(data.docs)) {
          for (const doc of data.docs) {
            const title = doc.title || '';
            const author = doc.author_name ? doc.author_name.join(', ') : '저자 미상';
            const key = `${title}_${author}`.toLowerCase();
            
            if (title && !seenKeys.has(key)) {
              seenKeys.add(key);
              const isbn = doc.isbn ? doc.isbn[0] : undefined;
              const coverImage = isbn
                ? `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${isbn}.jpg`
                : undefined;

              results.push({
                googleBooksId: doc.key,
                title,
                author,
                isbn,
                coverImage,
                publisher: doc.publisher ? doc.publisher[0] : undefined,
                publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
                pageCount: doc.number_of_pages_median,
                language: doc.language ? doc.language[0] : undefined,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Search error:', err);
    }
  }

  return results;
}
