import React, { useState, useEffect } from 'react';
import geminiIcon from '../assets/gemini-color.png';

// ---------------------------------------------------------------
// 타이핑 애니메이션 컴포넌트
// ---------------------------------------------------------------
const TypingTitle = ({ pre = 'Turn your ideas into ', highlight = 'ML Pipeline' }) => {
  const full = pre + highlight;
  const preLen = pre.length;
  const fullLen = full.length;
  const [i, setI] = useState(0);

  useEffect(() => {
    let idx = 0;
    const speed = 40;
    const timer = setInterval(() => {
      idx += 1;
      setI(idx);
      if (idx >= fullLen) {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [fullLen]);

  const typedPre = pre.slice(0, Math.min(i, preLen));
  const typedHi = i > preLen ? highlight.slice(0, i - preLen) : '';
  const done = i >= fullLen;

  return (
    <h1 className="text-5xl md:text-6xl font-bold mb-6 text-center whitespace-nowrap">
      <span className="text-gray-100">{typedPre}</span>
      <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
        {typedHi}
      </span>
      {!done && (
        <span className="inline-block w-1 h-12 md:h-16 ml-1 bg-cyan-400 animate-pulse" />
      )}
    </h1>
  );
};

// ---------------------------------------------------------------
// LandingPage: 랜딩 화면
// ---------------------------------------------------------------
const LandingPage = ({ onStart }) => {
  return (
    <div className="w-full min-h-screen flex items-center justify-center p-8 relative overflow-hidden transition-opacity duration-700 ease-in-out">
      {/* 배경 그라디언트 효과 */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10"></div>
      <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      {/* 메인 콘텐츠 */}
      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* CREATIVE AI 로고 - 크기 증가 */}
        <div className="flex items-center justify-center gap-6 mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/50">
            {/* ML 로고 */}
            <svg viewBox="0 0 100 100" className="w-16 h-16">
              {/* 노드 연결 */}
              <ellipse cx="50" cy="50" rx="35" ry="20" fill="none" stroke="#67e8f9" strokeWidth="2" opacity="0.6"/>
              {/* 원형 노드 */}
              <circle cx="25" cy="50" r="8" fill="white"/>
              {/* 사각형 노드 */}
              <rect x="42" y="42" width="16" height="16" fill="white"/>
              {/* 삼각형 노드 */}
              <path d="M75 58 L83 42 L67 42 Z" fill="white"/>
              {/* 무한대 기호 */}
              <text x="50" y="82" fontSize="16" fill="white" textAnchor="middle" fontWeight="bold">∞</text>
            </svg>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
            CREATIVE AI
          </h1>
        </div>

        <TypingTitle />
        
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          노드 기반 시각적 ML 파이프라인 빌더로 복잡한 머신러닝 워크플로우를 <br>
        </br>쉽게 구축하세요
        </p>
        
        {/* Start 버튼 */}
        <button
          onClick={() => {
            // 페이드 아웃 효과를 위한 클래스 추가
            const container = document.querySelector('.w-full.min-h-screen');
            if (container) {
              container.style.opacity = '0';
              setTimeout(() => onStart && onStart(), 300);
            } else {
              onStart && onStart();
            }
          }}
          className="group relative px-12 py-5 text-xl font-bold text-white rounded-2xl cursor-pointer transition-all duration-500 overflow-hidden
          bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 
          shadow-[0_20px_60px_-15px_rgba(34,211,238,0.6)] hover:shadow-[0_25px_70px_-15px_rgba(34,211,238,0.8)] 
          hover:-translate-y-2 active:scale-95"
        >
          {/* 배경 애니메이션 */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/30 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10 flex items-center gap-3">
            <span>Start Building</span>
            <span className="text-2xl transform group-hover:translate-x-2 transition-transform duration-300">→</span>
          </div>
        </button>
        
        {/* 추가 정보 */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { icon: '🎯', title: '직관적 인터페이스', desc: '드래그 & 드롭으로 쉽게' },
            { icon: '⚡', title: '빠른 프로토타이핑', desc: 'Python 코드 자동 생성' },
            { icon: 'gemini', title: 'AI 지원', desc: 'Gemini로 노드 추천' }
          ].map((feature, idx) => (
            <div 
              key={idx}
              className="p-6 rounded-xl themed-card border border-neutral-800/50 hover:border-cyan-500/40 transition-all duration-300"
              style={{ animationDelay: `${idx * 200}ms` }}
            >
              {feature.icon === 'gemini' ? (
                <div className="mb-3 flex items-center justify-center mx-auto" style={{ width: '3rem', height: '3rem' }}>
                  <img src={geminiIcon} alt="Gemini" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="text-4xl mb-3 text-center">{feature.icon}</div>
              )}
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
