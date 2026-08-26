import { useAuth } from '@/contexts/AuthContext';

export default function Flow() {
  const flowItems = [
    {
      period: '기록 시작',
      keywords: [],
      observation: ''
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-8 space-y-16 pb-32">
      {/* Header */}
      <div className="space-y-4 pb-12 border-b border-gray-100/60">
        <h1 className="text-2xl md:text-3xl font-medium text-gray-900 tracking-tight">생각의 흐름</h1>
        <p className="text-[15px] text-gray-400 font-light leading-relaxed">
          독서 기록과 회상이 쌓이면 두 사람의 시선과 생각이 어떻게 확장되어 왔는지 분석하여 보여줍니다.
        </p>
      </div>

      <div className="space-y-12">
        <h3 className="text-sm font-medium text-gray-400 tracking-wide mb-8">시간의 흐름에 따른 관점 변화</h3>
        {flowItems.map((item, index) => (
          <div key={index} className="relative pl-6 sm:pl-8 border-l border-gray-100/60 group pb-12 last:pb-0">
            {/* Timeline dot */}
            <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-gray-200 group-hover:bg-gray-400 transition-colors" />
            
            <div className="space-y-4">
              <span className="text-sm text-gray-400 tabular-nums">{item.period}</span>
              
              {item.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {item.keywords.map(kw => (
                    <span key={kw} className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-md border border-gray-100">
                      {kw}
                    </span>
                  ))}
                </div>
              ) : null}
              
              <p className="text-[15px] text-gray-400 leading-relaxed break-keep">
                {item.observation || '토론과 회상 기록이 누적되면 생각의 변화 흐름이 이곳에 기록됩니다.'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
