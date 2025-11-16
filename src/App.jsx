import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import LogicListPage from './components/LogicListPage';
import LogicEditorPage from './components/LogicEditorPage';
import {
  listLogics,
  createLogic,
  deleteLogic,
  reorderLogics,
  saveTheme as saveThemeToStorage,
  loadTheme as loadThemeFromStorage,
} from './utils/logicStorage';

// ----------------------------------------------------------------
// App: 페이지 라우팅을 담당하는 메인 컴포넌트
// ----------------------------------------------------------------
const App = () => {
  const [currentPage, setCurrentPage] = useState('landing'); // 'landing', 'asset', 'editor'
  const [selectedLogicId, setSelectedLogicId] = useState(null);
  const [newLogicName, setNewLogicName] = useState('');
  // logics는 요약 메타만 보관: {id,name,stock?,order}
  const [logics, setLogics] = useState([]);

  // 테마 관련 상태
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'

  // 데이터 로딩 및 초기화
  useEffect(() => {
    // 초기 테마 설정: localStorage > 시스템 선호
    const savedTheme = loadThemeFromStorage();
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(preferDark ? 'dark' : 'light');
    }

    // --- 로직 데이터 로딩 ---
    try {
      const index = listLogics();
      setLogics(index || []);
    } catch (e) {
      console.error('로직 목록 로딩 실패:', e);
      setLogics([]);
    }
  }, []);

  // 테마를 documentElement에 반영 + localStorage에 저장
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveThemeToStorage(theme);
  }, [theme]);

  const handleLogicClick = (logicId) => {
    setSelectedLogicId(logicId);
    setCurrentPage('editor');
  };

  const handleAddNewLogic = (name) => {
    setSelectedLogicId(null);
    setNewLogicName(name || '');
    setCurrentPage('editor');
  };

  const handleBackToLogicList = () => {
    setCurrentPage('asset');
    setSelectedLogicId(null);
    setNewLogicName('');
  };
    
  const handleSaveLogic = async (updatedLogic) => {
    try {
      const { saveLogic } = await import('./utils/logicStorage');
      saveLogic(updatedLogic);
      // 전체 재조회 없이 국소 업데이트로 메타 반영 (이름/종목 등)
      setLogics((prev) =>
        prev.map((l) =>
          l.id === updatedLogic.id
            ? { ...l, name: updatedLogic.name || l.name, stock: updatedLogic.stock }
            : l
        )
      );
    } catch (e) {
      console.error('로직 저장 실패:', e);
    }
  };

  const handleDeleteLogic = async (logicIdToDelete) => {
    try {
      // 낙관적 업데이트로 즉시 UI 반영하고, 이후 비동기 저장
      setLogics((prev)=> prev.filter((l)=> l.id !== logicIdToDelete));
      deleteLogic(logicIdToDelete);
    } catch (e) {
      console.error('로직 삭제 실패:', e);
    }
    console.log('로직이 삭제되었습니다.');
  };

  return (
    <div className="flex items-center justify-center min-h-screen font-sans bg-transparent">

      {/* Theme Toggle - asset와 editor 페이지에서만 표시 */}
      {currentPage !== 'landing' && (
        <div style={{ position: 'fixed', top: 14, right: 14, zIndex: 1000 }}>
          <button
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--panel-border)',
              background: 'var(--panel-bg)',
              color: 'var(--text-primary)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)'
            }}
            title="테마 전환 (Dark/Light)"
          >
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      )}

      {currentPage === 'landing' ? (
        <LandingPage onStart={() => setCurrentPage('asset')} />
      ) : currentPage === 'asset' ? (
        <LogicListPage
          logics={logics}
          onLogicClick={handleLogicClick}
          onAddNewLogic={handleAddNewLogic}
          onDeleteLogic={handleDeleteLogic}
          theme={theme}
          onReorderLogics={async (items)=>{
            // items: [{id,name,stock?,order?, _temp?}]
            setLogics(items);
            // 임시 항목이 있으면 저장하지 않음
            if (items.some((i)=> i && i._temp)) return;
            try {
              const ids = items.map((i)=> i.id);
              reorderLogics(ids);
            } catch (e) {
              console.error('로직 순서 변경 실패:', e);
            }
          }}
          onCreateLogic={async (name)=>{
            try {
              const meta = createLogic(name);
              // 인덱스 전체 재조회 없이 새 항목만 말단에 추가
              if (meta && meta.id) {
                setLogics((prev)=> [...prev, meta]);
              }
            } catch (e) {
              console.error('로직 생성 실패:', e);
            }
          }}
        />
      ) : (
        <LogicEditorPage
          selectedLogicId={selectedLogicId}
          onBack={handleBackToLogicList}
          onSave={handleSaveLogic}
          defaultNewLogicName={newLogicName}
          theme={theme}
        />
      )}
    </div>
  );
};

export default App;