import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './toast/ToastProvider.jsx';
import { useReteAppEditor } from '../hooks/useReteAppEditor';
import { createNodeByKind, clientToWorld, exportGraph, importGraph } from '../rete/app-editor';
import { loadLogic as loadLogicFromStorage, loadTheme, saveTheme } from '../utils/logicStorage';
import { generatePythonCode, generateJupyterNotebook, generatePythonScript } from '../utils/pipelineToCode';
import CSVDataManager from './CSVDataManager.jsx';
import GeminiPipelineGenerator from './GeminiPipelineGenerator.jsx';

// ----------------------------------------------------------------
// LogicEditorPage: ML 파이프라인을 편집하는 컴포넌트
// ----------------------------------------------------------------
const LogicEditorPage = ({ selectedLogicId, onBack, onSave, defaultNewLogicName = '' }) => {
    const toast = useToast();
    const [logic, setLogic] = useState(null);
    const [logicName, setLogicName] = useState('');
    const canvasRef = useRef(null);
    const [theme, setTheme] = useState('dark');
    const { editorRef, areaRef, ready } = useReteAppEditor(canvasRef);
    const [showCodePreview, setShowCodePreview] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');

    // 초기 테마 동기화 (localStorage > document > 시스템 선호)
    useEffect(() => {
        const savedTheme = loadTheme();
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
            return;
        }
        
        const htmlTheme = document.documentElement.getAttribute('data-theme');
        if (htmlTheme === 'light' || htmlTheme === 'dark') {
            setTheme(htmlTheme);
            return;
        }
        
        const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const next = preferDark ? 'dark' : 'light';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
    }, []);



    const toggleTheme = useCallback(() => {
        setTheme((t) => {
            const next = t === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            saveTheme(next);
            return next;
        });
    }, []);

    // 1) 선택된 로직의 메타/본문 로드 (지연 로드)
    useEffect(() => {
        if (selectedLogicId) {
            try {
                const current = loadLogicFromStorage(selectedLogicId);
                if (current) {
                    setLogic(current);
                    setLogicName(current.name || '');
                    // exchange, stock 제거됨
                    return;
                }
            } catch (e) {
                console.error('로직 로드 실패:', e);
            }
        } else {
            setLogic(null);
            setLogicName(defaultNewLogicName || '');
        }
    }, [selectedLogicId, defaultNewLogicName]);

    // 2) 에디터가 준비된 이후 그래프를 로드
    useEffect(() => {
        if (!logic || !selectedLogicId) return;
        if (!ready) return;

        const data = logic.data || {};
        const graph = data.graph || data.buyGraph || data.buy || data.graphBuy;

        const editor = editorRef.current;
        const area = areaRef.current;

        (async () => {
            try {
                if (ready && editor && area && graph) {
                    await importGraph(editor, area, graph);
                    if (typeof editor.reteUiEnhance === 'function') {
                        try { editor.reteUiEnhance() } catch {}
                    }
                }
            } catch (e) {
                console.warn('그래프 로드 중 오류:', e);
            }
        })();
    }, [logic, selectedLogicId, ready, editorRef, areaRef]);

        // 노드 드래그 시작 핸들러
        const onDragStart = useCallback((e, kind) => {
            e.dataTransfer.effectAllowed = 'copy';
            try { e.dataTransfer.setData('application/x-rete-node', kind); } catch {}
            try { e.dataTransfer.setData('text/plain', kind); } catch {}
        }, []);

        const extractKind = (dt) => {
            if (!dt) return null;
            const raw = (dt.getData('application/x-rete-node') || dt.getData('text/plain') || '').trim();
            if (!raw) return null;
            const allowed = [
                // ML Pipeline nodes
                'dataLoader','dataSplit','scaler','featureSelection','classifier','regressor','neuralNet','evaluate','predict','hyperparamTune'
            ];
            // exact match 우선
            if (allowed.includes(raw)) return raw;
            // 다중 줄/문자 포함 시 포함 여부로 추출
            const lower = raw.toLowerCase();
            const found = allowed.find(k => lower.includes(k.toLowerCase()));
            return found || null;
        };

        const handleDropOn = useCallback(async (e) => {
            e.preventDefault();
            const kind = extractKind(e.dataTransfer);
            if (!kind) return;
            const allowed = [
                // ML Pipeline nodes
                'dataLoader','dataSplit','scaler','featureSelection','classifier','regressor','neuralNet','evaluate','predict','hyperparamTune'
            ];
            if (!allowed.includes(kind)) { console.warn('드롭된 kind 무시:', kind); return; }

            const editor = editorRef.current;
            const area = areaRef.current;
            const container = canvasRef.current;

            if (!editor || !area || !container) return;

            const { x, y } = clientToWorld(area, container, e.clientX, e.clientY, e);
            const node = createNodeByKind(kind);
            await editor.addNode(node);
            await area.nodeViews.get(node.id)?.translate(x, y);
        }, [editorRef, areaRef]);

    const handleSave = async () => {
        try {
            const editor = editorRef.current;
            const area = areaRef.current;

            const graph = editor && area ? exportGraph(editor, area) : undefined;

            const updatedLogicData = { graph };

            const payload = {
                id: selectedLogicId || `logic-${Date.now()}`,
                name: logicName,
                data: updatedLogicData,
            };

            await Promise.resolve(onSave(payload));
            try {
                toast.success('로직이 저장되었습니다.');
            } catch {}

        } catch (e) {
            console.error('저장 중 오류:', e);
            try { toast.error('저장 중 오류가 발생했습니다.'); } catch {}
        }
    };

    // Python 코드 생성 및 미리보기
    const handleGenerateCode = useCallback(() => {
        const editor = editorRef.current;
        const area = areaRef.current;

        const graph = editor && area ? exportGraph(editor, area) : { nodes: [], connections: [] };

        const code = generatePythonCode(graph);
        setGeneratedCode(code);
        setShowCodePreview(true);
    }, [editorRef, areaRef]);

    // Jupyter Notebook 다운로드
    const handleExportJupyter = useCallback(() => {
        const editor = editorRef.current;
        const area = areaRef.current;

        const graph = editor && area ? exportGraph(editor, area) : { nodes: [], connections: [] };

        const notebook = generateJupyterNotebook(graph, logicName || 'ML Pipeline');
        
        const blob = new Blob([notebook], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${logicName || 'pipeline'}.ipynb`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Jupyter Notebook이 다운로드되었습니다!');
    }, [editorRef, areaRef, logicName, toast]);

    // Python Script 다운로드
    const handleExportPython = useCallback(() => {
        const editor = editorRef.current;
        const area = areaRef.current;

        const graph = editor && area ? exportGraph(editor, area) : { nodes: [], connections: [] };

        const script = generatePythonScript(graph, logicName || 'ML Pipeline');
        
        const blob = new Blob([script], { type: 'text/x-python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${logicName || 'pipeline'}.py`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Python 스크립트가 다운로드되었습니다!');
    }, [editorRef, areaRef, logicName, toast]);

    // Gemini에서 생성된 파이프라인을 캔버스에 추가
    const handlePipelineGenerated = useCallback(async (pipeline) => {
        try {
            const editor = editorRef.current;
            const area = areaRef.current;
            
            if (!editor || !area) {
                toast.error('에디터가 준비되지 않았습니다.');
                return;
            }

            // 노드 ID와 Rete 노드 객체 매핑
            const nodeMap = new Map();

            // 1. 모든 노드 생성
            for (const nodeData of pipeline.nodes) {
                const node = await createNodeByKind(nodeData.type);
                
                if (!node) {
                    console.error(`노드 타입을 찾을 수 없습니다: ${nodeData.type}`);
                    continue;
                }

                // 컨트롤 값 설정
                if (nodeData.controls) {
                    for (const [key, value] of Object.entries(nodeData.controls)) {
                        const control = node.controls[key];
                        if (control) {
                            control.setValue(value);
                        }
                    }
                }

                // 노드를 에디터에 추가
                await editor.addNode(node);
                
                // 위치 설정
                await area.translate(node.id, nodeData.position);
                
                // 매핑 저장
                nodeMap.set(nodeData.id, node);
            }


            // 2. 연결 생성
            const connections = Array.isArray(pipeline.connections) ? pipeline.connections : [];
            console.log('Pipeline connections:', connections);
            console.log('Node map:', nodeMap);
            
            // 기존 연결 확인 함수
            const connectionExists = (srcId, srcOut, tgtId, tgtIn) => {
                const existingConns = editor.getConnections();
                return existingConns.some(conn => 
                    conn.source === srcId && 
                    conn.sourceOutput === srcOut && 
                    conn.target === tgtId && 
                    conn.targetInput === tgtIn
                );
            };
            
            if (connections.length > 0) {
                console.log('Creating connections from pipeline...');
                for (const conn of connections) {
                    const sourceNode = nodeMap.get(conn.source);
                    const targetNode = nodeMap.get(conn.target);
                    
                    if (!sourceNode || !targetNode) {
                        console.error(`노드를 찾을 수 없습니다: ${conn.source} -> ${conn.target}`);
                        continue;
                    }
                    
                    console.log(`Source node (${conn.source}) outputs:`, Object.keys(sourceNode.outputs));
                    console.log(`Target node (${conn.target}) inputs:`, Object.keys(targetNode.inputs));
                    console.log(`Trying to connect: ${conn.sourceOutput} -> ${conn.targetInput}`);
                    
                    // 정확한 소켓 이름 찾기
                    const outputKey = Object.keys(sourceNode.outputs).find(k => 
                        k.toLowerCase() === conn.sourceOutput.toLowerCase()
                    );
                    const inputKey = Object.keys(targetNode.inputs).find(k => 
                        k.toLowerCase() === conn.targetInput.toLowerCase()
                    );
                    
                    if (!outputKey || !inputKey) {
                        console.error(`소켓을 찾을 수 없습니다: ${conn.sourceOutput} (${outputKey}) -> ${conn.targetInput} (${inputKey})`);
                        continue;
                    }
                    
                    // 중복 연결 체크
                    if (connectionExists(sourceNode.id, outputKey, targetNode.id, inputKey)) {
                        console.warn(`⚠️ Connection already exists: ${sourceNode.label} -> ${targetNode.label}`);
                        continue;
                    }
                    
                    try {
                        await editor.addConnection({
                            source: sourceNode.id,
                            sourceOutput: outputKey,
                            target: targetNode.id,
                            targetInput: inputKey
                        });
                        console.log(`✅ Connected: ${sourceNode.label} (${outputKey}) -> ${targetNode.label} (${inputKey})`);
                    } catch (err) {
                        console.error('Connection error:', err);
                    }
                }
            } else {
                // connections가 없으면 노드 순서대로 자동 연결 (출력→입력 1:1)
                console.log('No connections provided, auto-connecting nodes...');
                const nodeArr = Array.from(nodeMap.values());
                for (let i = 0; i < nodeArr.length - 1; i++) {
                    const src = nodeArr[i];
                    const dst = nodeArr[i + 1];
                    
                    console.log(`Source node outputs:`, Object.keys(src.outputs));
                    console.log(`Target node inputs:`, Object.keys(dst.inputs));
                    
                    // 첫 번째 출력, 첫 번째 입력 자동 연결
                    const srcOut = Object.keys(src.outputs)[0];
                    const dstIn = Object.keys(dst.inputs)[0];
                    
                    if (srcOut && dstIn) {
                        // 중복 연결 체크
                        if (connectionExists(src.id, srcOut, dst.id, dstIn)) {
                            console.warn(`⚠️ Auto-connection already exists: ${src.label} -> ${dst.label}`);
                            continue;
                        }
                        
                        try {
                            await editor.addConnection({
                                source: src.id,
                                sourceOutput: srcOut,
                                target: dst.id,
                                targetInput: dstIn
                            });
                            console.log(`✅ Auto-connected: ${src.label} (${srcOut}) -> ${dst.label} (${dstIn})`);
                        } catch (err) {
                            console.error('Auto-connection error:', err);
                        }
                    }
                }
            }

            // 화면 업데이트
            await area.area.update();
            
            toast.success(`${pipeline.nodes.length}개의 노드가 추가되었습니다!`);
        } catch (error) {
            console.error('파이프라인 적용 오류:', error);
            toast.error('파이프라인을 캔버스에 적용하는 중 오류가 발생했습니다.');
        }
    }, [editorRef, areaRef, toast]);

  return (
    <div className="w-full max-w-[1900px] p-4 sm:p-6 lg:p-8 rounded-3xl shadow-2xl flex flex-col bg-neutral-950 text-gray-200 border border-neutral-800/70">
        {/* 상단 헤더: 로직 이름 수정 및 거래소/종목 선택 + 저장/뒤로가기 버튼 */}
    <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <input 
                type="text"
                value={logicName}
                onChange={(e) => setLogicName(e.target.value)}
                placeholder="ML 파이프라인 이름을 입력하세요"
                className="text-2xl font-semibold tracking-tight bg-transparent text-gray-100 border-b border-transparent focus:border-cyan-400/60 outline-none placeholder:text-gray-500"
            />
                        <div className="flex gap-3 items-center">
                                {/* Light/Dark 토글 */}
                                <button
                                    onClick={toggleTheme}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: 10,
                                        border: '1px solid var(--panel-border)',
                                        background: 'var(--panel-bg)',
                                        color: 'var(--text-primary)'
                                    }}
                                    title="테마 전환 (Dark/Light)"
                                >
                                    {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                                </button>
                {/* Python 코드 생성 버튼들 */}
                <button 
                    onClick={handleGenerateCode}
                    className="px-4 py-2 text-base font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-500 shadow-[0_10px_30px_-10px_rgba(168,85,247,0.5)]"
                    title="Python 코드 미리보기"
                >
                    🐍 코드 보기
                </button>
                <button 
                    onClick={handleExportJupyter}
                    className="px-4 py-2 text-base font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-500 shadow-[0_10px_30px_-10px_rgba(249,115,22,0.5)]"
                    title="Jupyter Notebook으로 내보내기"
                >
                    📓 Jupyter
                </button>
                <button 
                    onClick={handleExportPython}
                    className="px-4 py-2 text-base font-semibold text-white bg-green-600 rounded-lg hover:bg-green-500 shadow-[0_10px_30px_-10px_rgba(22,163,74,0.5)]"
                    title="Python 스크립트로 내보내기"
                >
                    📄 .py
                </button>
                <button onClick={onBack} className="px-4 py-2 text-base font-semibold text-gray-200 bg-neutral-800 border border-neutral-700 rounded-lg hover:bg-neutral-700">
                    &larr; 뒤로가기
                </button>
                <button onClick={handleSave} className="px-4 py-2 text-base font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-500 disabled:opacity-50 shadow-[0_10px_30px_-10px_rgba(34,211,238,0.5)]" disabled={!logicName}>
                    저장하기
                </button>
            </div>
        </div>

        {/* 메인 컨텐츠: 왼쪽 노드 목록 + 중앙 캔버스 2영역 + 오른쪽 정보 패널 */}
        <div className="flex mt-4 gap-6 pb-8">
            {/* 1. RETE 노드 (왼쪽 사이드바) */}
            <div className="w-1/5 p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800/70 flex flex-col text-center gap-7 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {[
                    { 
                        title: '📊 Data Source', 
                        items: 
                        [ 
                            { label: 'Data Loader', kind: 'dataLoader' }
                        ]
                    },
                    
                    {
                        title: '🔧 Preprocessing',
                        items: [
                            { label: 'Data Split', kind: 'dataSplit' },
                            { label: 'Scaler', kind: 'scaler' },
                            { label: 'Feature Selection', kind: 'featureSelection' }
                        ]
                    },
                    {
                        title: '🤖 Models',
                        items: [
                            { label: 'Classifier', kind: 'classifier' },
                            { label: 'Regressor', kind: 'regressor' },
                            { label: 'Neural Network', kind: 'neuralNet' }
                        ]
                    },
                    {
                        title: '📈 Evaluation',
                        items: [
                            { label: 'Evaluate Model', kind: 'evaluate' },
                            { label: 'Predict', kind: 'predict' }
                        ]
                    },
                    {
                        title: '⚙️ Optimization',
                        items: [
                            { label: 'Hyperparameter Tuning', kind: 'hyperparamTune' }
                        ]
                    }
                ].map((group, i, arr) => (
                    <div key={group.title} className="flex flex-col gap-2">
                        <div className="sidebar-section__bar">
                          <span className="sidebar-section__icon" aria-hidden="true" />
                          <span className="sidebar-section__title">{group.title}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            {group.items.map((item) => (
                                <div
                                    key={item.kind}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, item.kind)}
                                    className="p-3 text-center bg-neutral-800/80 border border-neutral-700 rounded-md shadow-sm cursor-grab select-none hover:bg-neutral-700"
                                    title="드래그하여 캔버스로 가져오세요"
                                >
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 2. 노드 설정 공간 (중앙 캔버스) */}
            <div className="w-3/5 rounded-2xl border border-neutral-800/70 bg-neutral-900/40" style={{ height: 'calc(100vh - 200px)' }}>
                <div
                    ref={canvasRef}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOn(e)}
                    className="w-full h-full relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03),_transparent_60%)]"
                    title="여기로 드래그하여 노드를 추가"
                >
                    <div className="absolute left-2 top-2 z-10 text-xs font-semibold text-gray-300 bg-neutral-800/70 border border-neutral-700 px-2 py-1 rounded shadow-sm select-none">
                        ML Pipeline Canvas
                    </div>
                </div>
            </div>

            {/* 3. 정보 및 실행 패널 (오른쪽 사이드바) */}
            <div className="w-1/5 flex flex-col gap-4" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {/* Gemini AI Python 코드 생성기 */}
                <GeminiPipelineGenerator />
                
                {/* CSV 데이터 관리 */}
                <CSVDataManager onSelectFile={(fileName) => {
                    console.log('Selected CSV:', fileName);
                    toast.success(`${fileName} 선택됨`);
                }} />
                
                {/* 정보 패널 */}
                <div className="p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800/70 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-200">정보</h3>
                    </div>
                    <div className="flex-grow p-2 bg-neutral-900 rounded border border-neutral-800 text-sm text-gray-300 overflow-auto" style={{ maxHeight: '30vh' }}>
                        <p className="text-gray-400">로직을 저장하여 관리할 수 있습니다.</p>
                        <p className="mt-2 text-gray-400">왼쪽에서 노드를 드래그하여 캔버스에 추가하세요.</p>
                        <p className="mt-2 text-cyan-400">💡 CSV 파일을 업로드하면 Data Loader 노드에서 사용할 수 있습니다.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Python 코드 미리보기 모달 */}
        {showCodePreview && (
            <div 
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                onClick={() => setShowCodePreview(false)}
            >
                <div 
                    className="bg-neutral-900 rounded-2xl border border-neutral-700 shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 모달 헤더 */}
                    <div className="flex items-center justify-between p-6 border-b border-neutral-700">
                        <h2 className="text-2xl font-bold text-gray-100">🐍 Generated Python Code</h2>
                        <button 
                            onClick={() => setShowCodePreview(false)}
                            className="text-gray-400 hover:text-gray-200 text-2xl"
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* 코드 영역 */}
                    <div className="flex-1 overflow-auto p-6">
                        <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-sm text-green-400 font-mono overflow-x-auto">
                            <code>{generatedCode}</code>
                        </pre>
                    </div>

                    {/* 모달 푸터 */}
                    <div className="flex gap-3 p-6 border-t border-neutral-700">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(generatedCode);
                                toast.success('코드가 클립보드에 복사되었습니다!');
                            }}
                            className="flex-1 px-4 py-2 text-base font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-500"
                        >
                            📋 복사하기
                        </button>
                        <button
                            onClick={handleExportJupyter}
                            className="flex-1 px-4 py-2 text-base font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-500"
                        >
                            📓 Jupyter로 저장
                        </button>
                        <button
                            onClick={handleExportPython}
                            className="flex-1 px-4 py-2 text-base font-semibold text-white bg-green-600 rounded-lg hover:bg-green-500"
                        >
                            📄 .py로 저장
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
    );
};
export default LogicEditorPage;