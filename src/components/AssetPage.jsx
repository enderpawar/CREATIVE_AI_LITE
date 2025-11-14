import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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
    const speed = 80;
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
    <h1 className="text-5xl md:text-6xl font-bold mb-6 text-center">
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
// AssetPage: 개선된 로직 목록 페이지
// ---------------------------------------------------------------
const AssetPage = ({
  logics,
  onLogicClick,
  onDeleteLogic,
  onReorderLogics,
  onCreateLogic
}) => {
  // 초기 상태를 로직 개수에 따라 설정 (깜빡임 방지)
  const [showLanding, setShowLanding] = useState(logics.length === 0);
  const [openedMenuId, setOpenedMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('order'); // 'order', 'name', 'date'
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid'

  // 로직이 있으면 랜딩 화면 자동으로 건너뛰기 (제거 - 초기 상태에서 이미 처리됨)
  // useEffect(() => {
  //   if (logics.length > 0) {
  //     setShowLanding(false);
  //   }
  // }, [logics.length]);

  // 검색 및 정렬된 로직 목록
  const filteredAndSortedLogics = React.useMemo(() => {
    let filtered = logics.filter(logic => 
      logic.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'date') {
      filtered = [...filtered].sort((a, b) => {
        // ID에서 타임스탬프 추출 (logic-{timestamp}-{random})
        const getTimestamp = (id) => {
          const match = id.match(/logic-(\d+)-/);
          return match ? parseInt(match[1]) : 0;
        };
        return getTimestamp(b.id) - getTimestamp(a.id);
      });
    }
    
    return filtered;
  }, [logics, searchQuery, sortBy]);

  // 드래그 앤 드롭 순서 변경 핸들러
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(logics);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    if (onReorderLogics) {
      onReorderLogics(items);
    }
  };

  // 새 로직 인라인 생성 시작
  const startCreateNewLogic = () => {
    // 이미 편집 중이면 무시
    if (editingId) return;
    const tempId = `temp-${Date.now()}`;
    const items = [...logics, { id: tempId, name: '', data: {}, _temp: true }];
    onReorderLogics && onReorderLogics(items);
    setOpenedMenuId(null);
    setEditingId(tempId);
    setEditingValue('');
  };

  // 생성 확정 (Enter 또는 blur 시)
  const commitCreateNewLogic = () => {
    if (!editingId) return;
    const name = editingValue.trim();
    if (!name) {
      cancelCreateNewLogic();
      return;
    }
    
    // 임시 항목 제거
    const updated = logics.filter((l) => l.id !== editingId);
    onReorderLogics && onReorderLogics(updated);
    
    // 생성은 상위(App)로 위임하여 파일 생성/인덱스 갱신
    if (typeof onCreateLogic === 'function') {
      onCreateLogic(name);
    }
    
    setEditingId(null);
    setEditingValue('');
  };

  // 생성 취소 (Esc 또는 빈 값)
  const cancelCreateNewLogic = () => {
    if (!editingId) return;
    const updated = logics.filter((l) => l.id !== editingId);
    onReorderLogics && onReorderLogics(updated);
    setEditingId(null);
    setEditingValue('');
  };

  // 더블클릭으로 바로 편집
  const handleDoubleClick = (logicId) => {
    setOpenedMenuId(null);
    onLogicClick(logicId);
  };

  // 랜딩 화면
  if (showLanding) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-8 relative overflow-hidden">
        {/* 배경 그라디언트 효과 */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* 메인 콘텐츠 */}
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <TypingTitle />
          
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            노드 기반 시각적 ML 파이프라인 빌더로 복잡한 머신러닝 워크플로우를 쉽게 구축하세요
          </p>
          
          {/* Start 버튼 */}
          <button
            onClick={() => setShowLanding(false)}
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
              { icon: '🤖', title: 'AI 지원', desc: 'Gemini로 노드 추천' }
            ].map((feature, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-xl themed-card border border-neutral-800/50 hover:border-cyan-500/40 transition-all duration-300"
                style={{ animationDelay: `${idx * 200}ms` }}
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 메인 페이지
  return (
    <div className="w-full max-w-6xl p-8 rounded-3xl shadow-2xl themed-card border border-neutral-800/70">
      {/* 헤더 카드 - 그라디언트 배경과 글로우 효과 */}
      <div className="relative p-6 mb-6 rounded-2xl themed-card border border-neutral-800/70 overflow-hidden">
        {/* 배경 그라디언트 효과 */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30 relative overflow-hidden">
                {/* ML 로고 */}
                <svg viewBox="0 0 100 100" className="w-8 h-8">
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
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
                CREATIVE AI
              </h2>
            </div>
            
            {/* 뷰 모드 전환 - 개선된 디자인 */}
            <div className="flex gap-2 p-1.5 rounded-lg border border-neutral-700/50" style={{ backgroundColor: 'var(--control-bg)' }}>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-neutral-800'
                }`}
                title="리스트 뷰"
              >
                <span className="mr-1">☰</span> 리스트
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-neutral-800'
                }`}
                title="그리드 뷰"
              >
                <span className="mr-1">⊞</span> 그리드
              </button>
            </div>
          </div>

          {/* 검색 및 정렬 - 개선된 디자인 */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="로직 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-neutral-700/50 rounded-lg focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/50 outline-none transition-all"
                style={{ backgroundColor: 'var(--control-bg)', color: 'var(--text-primary)' }}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  ✕
                </button>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 text-sm border border-neutral-700/50 rounded-lg focus:ring-2 focus:ring-cyan-400/40 outline-none transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--control-bg)', color: 'var(--text-primary)' }}
            >
              <option value="order">📌 기본 순서</option>
              <option value="name">🔤 이름순</option>
              <option value="date">🕒 최신순</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="px-3 py-1.5 rounded-lg border border-neutral-700/50" style={{ backgroundColor: 'var(--panel-bg)' }}>
              총 로직: <span className="font-semibold text-cyan-400">{logics.length}</span>
            </div>
            {searchQuery && (
              <div className="px-3 py-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                검색 결과: <span className="font-semibold text-cyan-400">{filteredAndSortedLogics.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI 카드 4개 - 개선된 디자인 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[{
          title:'총 로직 수', value: String(logics.length||0), icon: '📊', color: 'cyan'
        },{
          title:'실행 중', value: '0', icon: '⚡', color: 'yellow'
        },{
          title:'AI 적중률', value: '0.00%', icon: '🎯', color: 'green'
        },{
          title:'생성된 로직 수', value: '0', icon: '✨', color: 'purple'
        }].map((s,idx)=> (
          <div 
            key={idx} 
            className="group relative p-5 rounded-2xl themed-card border border-neutral-800/70 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-1"
          >
            {/* 배경 글로우 효과 */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 rounded-2xl transition-all duration-300"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold">{s.title}</div>
                <span className="text-xl opacity-60 group-hover:opacity-100 transition-opacity">{s.icon}</span>
              </div>
              <div className="text-3xl font-bold text-gray-100 mb-3">{s.value}</div>
              {/* 미니 바 차트 - 애니메이션 추가 */}
              <div className="h-10 flex items-end gap-1">
                {[4,8,3,6,9,5,7,6,8,10].map((h,i)=> (
                  <div 
                    key={i} 
                    className="w-1.5 bg-gradient-to-t from-cyan-500/60 to-cyan-400/40 rounded-sm transition-all duration-300 group-hover:from-cyan-400 group-hover:to-cyan-300" 
                    style={{
                      height:`${h*6}%`,
                      animationDelay: `${i * 50}ms`
                    }} 
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="logic-list">
          {(provided) => (
            <div 
              className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
                : 'flex flex-col gap-3'
              } 
              ref={provided.innerRef} 
              {...provided.droppableProps}
            >
              {filteredAndSortedLogics.length > 0 ? (
                filteredAndSortedLogics.map((logic, index) => (
                  // wrapper: 외곽 윤곽선은 ring으로 강조하고, 내부 경계선 색은 유지
                  <div key={logic.id} className="flex flex-col group rounded-xl ring-1 ring-transparent hover:ring-cyan-500/40 transition-all duration-300">
                    <Draggable draggableId={logic.id} index={index} isDragDisabled={logic.id === editingId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`relative flex items-center justify-between p-4 transition-all duration-300 ease-in-out cursor-pointer 
                          themed-card border border-neutral-800/70 
                          hover:shadow-[0_8px_30px_rgba(34,211,238,0.15)] hover:-translate-y-1 hover:border-cyan-500/50
                          ${openedMenuId === logic.id ? 'rounded-t-xl rounded-b-none border-b-0' : 'rounded-xl'}
                          ${snapshot.isDragging ? 'ring-2 ring-cyan-400/50 shadow-2xl shadow-cyan-500/30 scale-105' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (logic.id === editingId) return;
                            setOpenedMenuId(logic.id === openedMenuId ? null : logic.id);
                          }}
                          onDoubleClick={() => handleDoubleClick(logic.id)}
                          role="button"
                          tabIndex={0}
                        >
                          {/* 배경 그라디언트 효과 */}
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-cyan-500/5 group-hover:via-blue-500/3 group-hover:to-purple-500/5 rounded-xl transition-all duration-300 pointer-events-none"></div>
                          
                          {/* 로직 이름 영역 */}
                          <div className="flex-grow relative z-10">
                            {logic.id === editingId ? (
                              <input
                                className="w-full px-3 py-2 text-sm rounded outline-none bg-neutral-800 text-gray-100 border border-neutral-700 focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/50"
                                placeholder="새 로직 이름을 입력하고 Enter를 누르세요"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitCreateNewLogic();
                                  if (e.key === 'Escape') cancelCreateNewLogic();
                                }}
                                onBlur={commitCreateNewLogic}
                                autoFocus
                              />
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-bold">
                                  {index + 1}
                                </span>
                                <span className="text-base font-medium text-gray-100 group-hover:text-cyan-300 transition-colors">
                                  {logic.name}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* 드래그 핸들 - 개선된 디자인 */}
                          {logic.id !== editingId && (
                            <span
                              {...provided.dragHandleProps}
                              className="relative z-10 ml-4 mr-2 cursor-grab active:cursor-grabbing text-2xl select-none text-gray-500 hover:text-cyan-400 transition-colors"
                              aria-label="드래그 핸들"
                              onMouseDown={(e) => {
                                setOpenedMenuId(null);
                                if (provided.dragHandleProps && typeof provided.dragHandleProps.onMouseDown === 'function') {
                                  provided.dragHandleProps.onMouseDown(e);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              ⋮⋮
                            </span>
                          )}
                        </div>
                      )}
                    </Draggable>
                    {/* 슬라이드 메뉴 영역 - 개선된 디자인 */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ${openedMenuId === logic.id ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'} 
                      themed-card border-x border-b border-neutral-800/70 rounded-b-xl flex items-center backdrop-blur-sm`}
                      style={{ minWidth: '120px' }}
                    >
                      {openedMenuId === logic.id && (
                        <div className="flex flex-row justify-end w-full gap-2 px-4 py-3">
                          <button
                            className="group/btn px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-cyan-600/80 to-blue-600/80 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-500/30 transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
                            onClick={() => {
                              setOpenedMenuId(null);
                              onLogicClick(logic.id);
                            }}
                            title="로직 편집"
                          >
                            <span className="mr-1.5">✏️</span> 수정
                          </button>
                          <button
                            className="group/btn px-4 py-2 rounded-lg text-sm bg-neutral-800/80 hover:bg-red-600/80 text-red-400 hover:text-white border border-neutral-700/50 hover:border-red-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 hover:-translate-y-0.5"
                            onClick={() => {
                              setOpenedMenuId(null);
                              const confirmed = window.confirm(`정말로 "${logic.name}" 로직을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
                              if (confirmed) {
                                onDeleteLogic(logic.id);
                              }
                            }}
                            title="로직 삭제"
                          >
                            <span className="mr-1.5">🗑️</span> 삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-16">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>
                    <div className="relative text-7xl mb-6 animate-bounce">📂</div>
                  </div>
                  <p className="text-gray-300 text-xl font-medium mb-2">
                    {searchQuery ? '검색 결과가 없습니다' : '저장된 로직이 없습니다'}
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    {searchQuery ? '다른 검색어로 시도해보세요' : '새 로직을 추가하여 시작하세요'}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-0.5"
                    >
                      🔄 검색 초기화
                    </button>
                  )}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      {/* 새 로직 추가 버튼 - 개선된 디자인 */}
      <button
        className="group relative flex items-center justify-center w-full p-5 mt-6 text-lg font-bold text-white rounded-xl cursor-pointer transition-all duration-300 overflow-hidden
        bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 
        shadow-[0_10px_40px_-10px_rgba(34,211,238,0.6)] hover:shadow-[0_15px_50px_-10px_rgba(34,211,238,0.8)] 
        hover:-translate-y-1 active:scale-95"
        onClick={startCreateNewLogic}
      >
        {/* 배경 애니메이션 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/20 to-purple-600/0 group-hover:animate-shimmer"></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <span className="text-2xl transform group-hover:rotate-90 transition-transform duration-300">+</span>
          <span>새 로직 추가하기</span>
          <span className="text-sm opacity-70">( Double-click으로 빠른 편집 )</span>
        </div>
      </button>
    </div>
  );
};

export default AssetPage;

