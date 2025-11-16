import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// ---------------------------------------------------------------
// LogicListPage: 로직 목록 페이지
// ---------------------------------------------------------------
const LogicListPage = ({
  logics,
  onLogicClick,
  onDeleteLogic,
  onReorderLogics,
  onCreateLogic,
  theme
}) => {
  const [openedMenuId, setOpenedMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 검색된 로직 목록
  const filteredLogics = React.useMemo(() => {
    return logics.filter(logic => 
      logic.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [logics, searchQuery]);

  // 드래그 앤 드롭 순서 변경 핸들러
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    // 검색 중에는 순서 변경 불가
    if (searchQuery) return;
    
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

  // 메인 페이지
  return (
    <div className="w-full max-w-6xl p-8 rounded-3xl shadow-2xl themed-card border border-neutral-800/70 animate-fadeIn flex flex-col overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
      {/* 헤더 카드 - 그라디언트 배경과 글로우 효과 */}
      <div className="relative p-6 mb-6 rounded-2xl themed-card border border-neutral-800/70 overflow-hidden flex-shrink-0">
        {/* 배경 그라디언트 효과 */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
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

          {/* 검색 */}
          <div className="relative mb-4">
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

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="px-3 py-1.5 rounded-lg border border-neutral-700/50" style={{ backgroundColor: 'var(--panel-bg)' }}>
              총 로직: <span className="font-semibold text-cyan-400">{logics.length}</span>
            </div>
            {searchQuery && (
              <div className="px-3 py-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                검색 결과: <span className="font-semibold text-cyan-400">{filteredLogics.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 최근 활동 타임라인 */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6 flex-shrink-0">
        {/* 타임라인 (2/3) */}
        <div className="lg:col-span-2 p-6 rounded-2xl themed-card border border-neutral-800/70 relative overflow-hidden">
          {/* 배경 그라디언트 */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <span className="text-cyan-400">⏱️</span>
                최근 활동
              </h3>
              <span className="text-xs text-gray-500">실시간 업데이트</span>
            </div>
            
            {logics.length > 0 ? (
              <div className="space-y-3">
                {logics.slice(0, 3).map((logic, idx) => {
                  // ID에서 타임스탬프 추출 (logic-{timestamp}-{random} 형식)
                  const match = logic.id.match(/logic-(\d+)-/);
                  const timestamp = match ? parseInt(match[1]) : Date.now();
                  const date = new Date(timestamp);
                  const now = new Date();
                  const diffMs = now - date;
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMs / 3600000);
                  const diffDays = Math.floor(diffMs / 86400000);
                  
                  let timeAgo = '';
                  if (diffMins < 1) timeAgo = '방금 전';
                  else if (diffMins < 60) timeAgo = `${diffMins}분 전`;
                  else if (diffHours < 24) timeAgo = `${diffHours}시간 전`;
                  else timeAgo = `${diffDays}일 전`;
                  
                  return (
                    <div 
                      key={logic.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-cyan-500/5 transition-all duration-200 cursor-pointer group"
                      onClick={() => onLogicClick(logic.id)}
                    >
                      {/* 타임라인 도트 */}
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 group-hover:scale-150 transition-transform"></div>
                      
                      {/* 로직 정보 */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-200 truncate group-hover:text-cyan-300 transition-colors">
                            {logic.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            편집됨
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      {/* 시간 표시 */}
                      <div className="flex-shrink-0 text-xs text-gray-500 font-medium">
                        {timeAgo}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-sm">아직 활동 내역이 없습니다</p>
                <p className="text-xs mt-1">새 로직을 만들어보세요!</p>
              </div>
            )}
          </div>
        </div>

        {/* 활동 그래프 (1/3) */}
        <div className="p-6 rounded-2xl themed-card border border-neutral-800/70 relative overflow-hidden">
          {/* 배경 그라디언트 */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 pointer-events-none"></div>
          
          <div className="relative z-10">
            <h3 className="text-sm font-semibold text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-purple-400">📊</span>
              5일간 활동
            </h3>
            
            {(() => {
              // 지난 5일간의 날짜 계산
              const days = [];
              const today = new Date();
              for (let i = 4; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                days.push(d);
              }
              
              // 각 날짜별 로직 생성 개수 계산
              const activityMap = {};
              logics.forEach(logic => {
                const match = logic.id.match(/logic-(\d+)-/);
                if (match) {
                  const timestamp = parseInt(match[1]);
                  const date = new Date(timestamp);
                  const dateKey = date.toISOString().split('T')[0];
                  activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
                }
              });
              
              // 최대값 계산 (스케일링용)
              const maxActivity = Math.max(...days.map(d => activityMap[d.toISOString().split('T')[0]] || 0), 1);
              
              return (
                <div className="space-y-3">
                  {days.map((day, idx) => {
                    const dateKey = day.toISOString().split('T')[0];
                    const count = activityMap[dateKey] || 0;
                    const percentage = maxActivity > 0 ? (count / maxActivity) * 100 : 0;
                    const isToday = idx === 4;
                    
                    return (
                      <div key={idx} className="group">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span className={isToday ? 'text-cyan-400 font-semibold' : ''}>
                            {day.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            {isToday && ' (오늘)'}
                          </span>
                          <span className={`font-medium ${count > 0 ? 'text-cyan-400' : 'text-gray-600'}`}>
                            {count}
                          </span>
                        </div>
                        <div className="h-2 bg-neutral-800/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${percentage}%`,
                              background: count > 0 
                                ? 'linear-gradient(90deg, rgba(34, 211, 238, 0.8), rgba(168, 85, 247, 0.8))'
                                : 'transparent'
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* 통계 요약 */}
                  <div className="mt-6 pt-4 border-t border-neutral-800/50">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 rounded-lg bg-cyan-500/5">
                        <div className="text-xs text-gray-500 mb-1">총 로직</div>
                        <div className="text-xl font-bold text-cyan-400">{logics.length}</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-purple-500/5">
                        <div className="text-xs text-gray-500 mb-1">최근 5일</div>
                        <div className="text-xl font-bold text-purple-400">
                          {Object.values(activityMap).reduce((sum, val) => sum + val, 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 로직 목록 영역 - 스크롤 가능 */}
      <div className="overflow-y-auto pr-2" style={{ maxHeight: '50vh' }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="logic-list" renderClone={(provided, snapshot, rubric) => {
          const logic = filteredLogics[rubric.source.index];
          return (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className="relative flex items-center justify-between p-4 themed-card border border-cyan-400/50 rounded-xl shadow-2xl shadow-cyan-500/30 scale-105"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 text-sm font-bold">
                  {rubric.source.index + 1}
                </span>
                <span className="text-base font-medium text-gray-100">
                  {logic.name}
                </span>
              </div>
              <span className="ml-4 mr-2 text-2xl text-cyan-400">⋮⋮</span>
            </div>
          );
        }}>
          {(provided) => (
            <div 
              className="flex flex-col gap-3"
              ref={provided.innerRef} 
              {...provided.droppableProps}
            >
              {filteredLogics.length > 0 ? (
                filteredLogics.map((logic, index) => (
                  // wrapper: 외곽 윤곽선은 ring으로 강조하고, 내부 경계선 색은 유지
                  <div key={logic.id} className="flex flex-col group rounded-xl ring-1 ring-transparent hover:ring-cyan-500/40 transition-all duration-300">
                    <Draggable 
                      draggableId={logic.id} 
                      index={index} 
                      isDragDisabled={logic.id === editingId || searchQuery !== ''}
                    >
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
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 text-sm font-bold">
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
      </div>
      
      {/* 새 로직 추가 버튼 - 개선된 디자인 */}
      <button
        className="group relative flex items-center justify-center w-full p-5 mt-4 text-lg font-bold text-white rounded-xl cursor-pointer transition-all duration-300 overflow-hidden flex-shrink-0
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

export default LogicListPage;

