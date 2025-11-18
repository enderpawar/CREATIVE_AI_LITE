import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './toast/ToastProvider.jsx';
import { useReteAppEditor } from '../hooks/useReteAppEditor';
import { createNodeByKind, clientToWorld, exportGraph, importGraph, setCurrentLogicId } from '../rete/app-editor';
import { ClassicPreset } from 'rete';
import { loadLogic as loadLogicFromStorage } from '../utils/logicStorage';
import { generatePythonCode, generateJupyterNotebook, generatePythonScript } from '../utils/pipelineToCode';
import { enhanceCodeWithAI } from '../utils/geminiPipeline';
import CSVDataManager from './CSVDataManager.jsx';
import GeminiPipelineGenerator from './GeminiPipelineGenerator.jsx';

// ----------------------------------------------------------------
// LogicEditorPage: ML 파이프라인을 편집하는 컴포넌트
// ----------------------------------------------------------------
const LogicEditorPage = ({ selectedLogicId, onBack, onSave, defaultNewLogicName = '', theme = 'dark' }) => {
    const toast = useToast();
    const [logic, setLogic] = useState(null);
    const [logicName, setLogicName] = useState('');
    const canvasRef = useRef(null);
    const { editorRef, areaRef, ready } = useReteAppEditor(canvasRef);
    const [showCodePreview, setShowCodePreview] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [enhancedCode, setEnhancedCode] = useState('');
    const [userIntent, setUserIntent] = useState('');
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [showIntentInput, setShowIntentInput] = useState(false);
    const [showEnhancedCode, setShowEnhancedCode] = useState(false); // AI 개선 코드 표시 여부

    // localStorage에서 AI 개선 코드 불러오기
    useEffect(() => {
        if (selectedLogicId) {
            const savedEnhanced = localStorage.getItem(`enhanced_code_${selectedLogicId}`);
            const savedIntent = localStorage.getItem(`user_intent_${selectedLogicId}`);
            if (savedEnhanced) {
                setEnhancedCode(savedEnhanced);
                setShowEnhancedCode(true); // 저장된 AI 코드가 있으면 표시
            }
            if (savedIntent) setUserIntent(savedIntent);
        } else {
            // 새 로직일 때는 초기화
            setEnhancedCode('');
            setUserIntent('');
            setShowEnhancedCode(false);
        }
    }, [selectedLogicId]);

    // AI 개선 코드와 의도를 localStorage에 저장 (디바운싱)
    useEffect(() => {
        if (selectedLogicId && enhancedCode) {
            localStorage.setItem(`enhanced_code_${selectedLogicId}`, enhancedCode);
        }
    }, [enhancedCode, selectedLogicId]);

    useEffect(() => {
        if (selectedLogicId && userIntent) {
            localStorage.setItem(`user_intent_${selectedLogicId}`, userIntent);
        }
    }, [userIntent, selectedLogicId]);

    // ✅ 파이프라인 검증 함수
    const validatePipeline = useCallback((pipeline) => {
        const errors = [];

        // 1. 노드 존재 여부
        if (!pipeline.nodes || pipeline.nodes.length === 0) {
            errors.push('파이프라인에 노드가 없습니다.');
            return errors;
        }

        // 2. DataLoader 노드 필수
        const hasDataLoader = pipeline.nodes.some(n => 
            (n.nodeType || n.type || n.kind) === 'dataLoader'
        );
        if (!hasDataLoader) {
            errors.push('DataLoader 노드가 필요합니다.');
        }

        // 3. 순환 참조 체크
        const connections = pipeline.connections || [];
        const graph = new Map();
        pipeline.nodes.forEach(n => {
            const id = n.id || `node-${n.step}`;
            graph.set(id, []);
        });
        
        connections.forEach(conn => {
            const targets = graph.get(conn.source) || [];
            targets.push(conn.target);
            graph.set(conn.source, targets);
        });

        // DFS로 순환 검사
        const hasCycle = (nodeId, visited, recStack) => {
            visited.add(nodeId);
            recStack.add(nodeId);

            const neighbors = graph.get(nodeId) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    if (hasCycle(neighbor, visited, recStack)) {
                        return true;
                    }
                } else if (recStack.has(neighbor)) {
                    return true;
                }
            }

            recStack.delete(nodeId);
            return false;
        };

        const visited = new Set();
        const recStack = new Set();
        for (const nodeId of graph.keys()) {
            if (!visited.has(nodeId)) {
                if (hasCycle(nodeId, visited, recStack)) {
                    errors.push('파이프라인에 순환 참조가 있습니다.');
                    break;
                }
            }
        }

        // 4. 중복 노드 ID 체크
        const nodeIds = pipeline.nodes.map(n => n.id || `node-${n.step}`);
        const uniqueIds = new Set(nodeIds);
        if (nodeIds.length !== uniqueIds.size) {
            errors.push('중복된 노드 ID가 있습니다.');
        }

        return errors;
    }, []);

    // 1) 선택된 로직의 메타/본문 로드 (지연 로드)
    useEffect(() => {
        if (selectedLogicId) {
            try {
                const current = loadLogicFromStorage(selectedLogicId);
                if (current) {
                    setLogic(current);
                    setLogicName(current.name || '');
                    // Rete 에디터에 현재 로직 ID 설정
                    setCurrentLogicId(current.id);
                    return;
                }
            } catch (e) {
                console.error('로직 로드 실패:', e);
            }
        } else {
            setLogic(null);
            setLogicName(defaultNewLogicName || '');
            setCurrentLogicId(undefined);
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

    // 코드 생성 (AI 개선 기능 제거됨)
    const handleGenerateCode = useCallback(async () => {
        const editor = editorRef.current;
        if (!editor) {
            toast.error('에디터가 초기화되지 않았습니다.');
            return;
        }

        try {
            const graph = exportGraph(editor, areaRef.current);
            const validationErrors = validatePipeline(graph);
            
            if (validationErrors.length > 0) {
                toast.error(validationErrors.join('\n'));
                return;
            }

            const code = generatePythonCode(graph, logic?.id);
            setGeneratedCode(code);
            setShowCodePreview(true);
            toast.success('Python 코드가 생성되었습니다!');
        } catch (error) {
            console.error('코드 생성 오류:', error);
            toast.error(error.message || '코드 생성에 실패했습니다.');
        }
    }, [editorRef, areaRef, validatePipeline, toast]);

    // CSV 파일들 다운로드
    const handleDownloadCSVFiles = useCallback(() => {
        try {
            const editor = editorRef.current;
            if (!editor) return;

            const graph = exportGraph(editor, areaRef.current);
            const dataLoaders = graph.nodes.filter(n => n.kind === 'dataLoader');
            
            if (dataLoaders.length === 0) {
                toast.error('CSV 파일을 사용하는 노드가 없습니다.');
                return;
            }

            let downloadCount = 0;
            dataLoaders.forEach(node => {
                const fileName = node.controls?.fileName;
                if (fileName) {
                    const csvData = localStorage.getItem(`csv_data_${fileName}`);
                    if (csvData) {
                        const blob = new Blob([csvData], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        a.click();
                        URL.revokeObjectURL(url);
                        downloadCount++;
                    }
                }
            });

            if (downloadCount > 0) {
                toast.success(`${downloadCount}개의 CSV 파일이 다운로드되었습니다!`);
            } else {
                toast.error('다운로드할 CSV 파일이 없습니다.');
            }
        } catch (error) {
            console.error('CSV 다운로드 오류:', error);
            toast.error('CSV 파일 다운로드 중 오류가 발생했습니다.');
        }
    }, [editorRef, areaRef, toast]);

    // Jupyter Notebook 다운로드
    const handleExportJupyter = useCallback(() => {
        try {
            const editor = editorRef.current;
            const area = areaRef.current;

            const graph = editor && area ? exportGraph(editor, area) : { nodes: [], connections: [] };

            // 노드 기반 코드로 Jupyter Notebook 생성
            const notebookContent = generateJupyterNotebook(graph, logicName || 'ML Pipeline', logic?.id);
            
            const blob = new Blob([notebookContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${logicName || 'pipeline'}.ipynb`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success('Jupyter Notebook이 다운로드되었습니다!');
        } catch (error) {
            if (error.name === 'PipelineValidationError') {
                toast.error(error.message);
            } else {
                toast.error('Jupyter Notebook 생성 중 오류가 발생했습니다.');
                console.error('Jupyter export error:', error);
            }
        }
    }, [editorRef, areaRef, logicName, toast]);

    // Python Script 다운로드
    const handleExportPython = useCallback(() => {
        try {
            const editor = editorRef.current;
            const area = areaRef.current;

            const graph = editor && area ? exportGraph(editor, area) : { nodes: [], connections: [] };

            // 노드 기반 코드로 Python 스크립트 생성
            const scriptContent = generatePythonScript(graph, logicName || 'ML Pipeline', logic?.id);
            
            const blob = new Blob([scriptContent], { type: 'text/x-python' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${logicName || 'pipeline'}.py`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success('Python 스크립트가 다운로드되었습니다!');
        } catch (error) {
            if (error.name === 'PipelineValidationError') {
                toast.error(error.message);
            } else {
                toast.error('Python 스크립트 생성 중 오류가 발생했습니다.');
                console.error('Python export error:', error);
            }
        }
    }, [editorRef, areaRef, logicName, toast]);

    // Gemini에서 생성된 파이프라인을 캔버스에 추가
    const applyPipelineToCanvas = useCallback(async (pipeline) => {
        try {
            const editor = editorRef.current;
            const area = areaRef.current;
            
            if (!editor || !area) {
                toast.error('에디터가 준비되지 않았습니다.');
                return;
            }

            console.log('📥 Received pipeline:', pipeline);

            // ✅ 파이프라인 검증
            const validationErrors = validatePipeline(pipeline);
            if (validationErrors.length > 0) {
                toast.error(`파이프라인 검증 실패: ${validationErrors[0]}`);
                console.error('모든 검증 오류:', validationErrors);
                return;
            }

            // ⚠️ 캔버스 초기화 (기존 노드 제거)
            console.log('🧹 Clearing canvas...');
            await editor.clear();

            // 노드 ID와 Rete 노드 객체 매핑
            const nodeMap = new Map();
            
            // 소켓 이름 매핑 테이블 (Gemini 출력 → Rete 실제 소켓)
            const socketNameMapping = {
                // 한국어 입력/출력 소켓
                '데이터': 'data',
                '훈련용': 'train',
                '테스트용': 'test',
                '모델': 'model',
                '예측결과': 'prediction',
                '평가결과': 'metrics',
                
                // 영어 소켓 (있는 그대로)
                'data': 'data',
                'train': 'train',
                'test': 'test',
                'model': 'model',
                'prediction': 'prediction',
                'metrics': 'metrics',
                
                // 추가 가능한 변형들
                '데이타': 'data',
                '훈련': 'train',
                '테스트': 'test',
                '모델링': 'model',
                '예측': 'prediction',
                '평가': 'metrics'
            };
            
            // 소켓 이름 정규화 함수 (유연한 매칭)
            const normalizeSocketName = (name, availableSockets) => {
                if (!name) return null;
                
                // 1. 정확한 매칭 (대소문자 구분 없이)
                const exactMatch = availableSockets.find(s => 
                    s.toLowerCase() === name.toLowerCase()
                );
                if (exactMatch) return exactMatch;
                
                // 2. 매핑 테이블 사용
                const mappedName = socketNameMapping[name] || socketNameMapping[name.toLowerCase()];
                if (mappedName) {
                    const match = availableSockets.find(s => 
                        s.toLowerCase() === mappedName.toLowerCase()
                    );
                    if (match) return match;
                }
                
                // 3. 부분 문자열 매칭 (마지막 수단)
                const partialMatch = availableSockets.find(s => 
                    s.toLowerCase().includes(name.toLowerCase()) ||
                    name.toLowerCase().includes(s.toLowerCase())
                );
                if (partialMatch) return partialMatch;
                
                return null;
            };

            // 1. 모든 노드 생성
            console.log('🔨 Creating nodes...');
            for (let i = 0; i < pipeline.nodes.length; i++) {
                const nodeData = pipeline.nodes[i];
                // nodeType 또는 type 속성 모두 지원
                const nodeType = nodeData.nodeType || nodeData.type || nodeData.kind;
                console.log(`Creating node: ${nodeType}`, nodeData);
                
                const node = createNodeByKind(nodeType);
                
                if (!node) {
                    console.error(`❌ 노드 타입을 찾을 수 없습니다: ${nodeType}`);
                    continue;
                }

                // 컨트롤 값 설정
                if (nodeData.controls || nodeData.settings) {
                    const settings = nodeData.controls || nodeData.settings;
                    console.log(`⚙️ Setting controls for ${nodeType}:`, settings);
                    
                    for (const [key, value] of Object.entries(settings)) {
                        const control = node.controls[key];
                        if (control) {
                            if (typeof control.setValue === 'function') {
                                control.setValue(value);
                            } else if ('value' in control) {
                                control.value = value;
                            }
                            console.log(`  ✓ ${key} = ${value}`);
                        } else {
                            console.warn(`  ⚠️ Control not found: ${key}`);
                        }
                    }
                }

                // 노드를 에디터에 추가
                await editor.addNode(node);
                
                // 위치 설정 (가로 방향으로 배치)
                const position = nodeData.position || { 
                    x: 100 + i * 300,  // 가로로 300px 간격
                    y: 150 
                };
                await area.translate(node.id, position);
                
                // 매핑 저장 (원본 ID 사용)
                const originalId = nodeData.id || `node-${nodeData.step}`;
                nodeMap.set(originalId, node);
                
                console.log(`✅ Node created: ${node.label} (ID: ${node.id})`);
                console.log(`  Inputs:`, Object.keys(node.inputs || {}));
                console.log(`  Outputs:`, Object.keys(node.outputs || {}));
            }

            // 2. 연결 생성
            const connections = Array.isArray(pipeline.connections) ? pipeline.connections : [];
            console.log(`🔗 Creating ${connections.length} connections...`);
            
            // 중복 연결 체크용
            const existingConnections = new Set();
            
            for (const conn of connections) {
                const sourceNode = nodeMap.get(conn.source);
                const targetNode = nodeMap.get(conn.target);
                
                if (!sourceNode || !targetNode) {
                    console.error(`❌ 노드를 찾을 수 없습니다: ${conn.source} -> ${conn.target}`);
                    console.log('Available nodes:', Array.from(nodeMap.keys()));
                    continue;
                }
                
                console.log(`\n🔗 Connecting: ${sourceNode.label} -> ${targetNode.label}`);
                console.log(`  Source output: "${conn.sourceOutput}"`);
                console.log(`  Target input: "${conn.targetInput}"`);
                
                // 사용 가능한 소켓 목록
                const availableOutputs = Object.keys(sourceNode.outputs || {});
                const availableInputs = Object.keys(targetNode.inputs || {});
                
                console.log(`  Available outputs:`, availableOutputs);
                console.log(`  Available inputs:`, availableInputs);
                
                // 소켓 이름 정규화
                const outputKey = normalizeSocketName(conn.sourceOutput, availableOutputs);
                const inputKey = normalizeSocketName(conn.targetInput, availableInputs);
                
                if (!outputKey) {
                    console.error(`❌ 출력 소켓을 찾을 수 없습니다: "${conn.sourceOutput}"`);
                    console.log(`  Tried to match with:`, availableOutputs);
                    continue;
                }
                
                if (!inputKey) {
                    console.error(`❌ 입력 소켓을 찾을 수 없습니다: "${conn.targetInput}"`);
                    console.log(`  Tried to match with:`, availableInputs);
                    continue;
                }
                
                console.log(`  ✓ Matched: ${outputKey} -> ${inputKey}`);
                
                // 중복 연결 체크
                const connKey = `${sourceNode.id}:${outputKey}->${targetNode.id}:${inputKey}`;
                if (existingConnections.has(connKey)) {
                    console.warn(`⚠️ 중복 연결 무시: ${connKey}`);
                    continue;
                }
                
                try {
                    const connection = new ClassicPreset.Connection(
                        sourceNode,
                        outputKey,
                        targetNode,
                        inputKey
                    );
                    
                    await editor.addConnection(connection);
                    
                    existingConnections.add(connKey);
                    console.log(`✅ Connected successfully!`);
                } catch (err) {
                    const errorMsg = err.message || String(err);
                    if (errorMsg.includes('already been added')) {
                        console.warn(`⚠️ Connection already exists (Rete internal check)`);
                    } else {
                        console.error(`❌ Connection error:`, errorMsg);
                        console.error('Full error:', err);
                    }
                }
            }

            // 화면 업데이트
            await area.area.update();
            
            const nodeCount = pipeline.nodes.length;
            const connCount = existingConnections.size;
            toast.success(`✨ ${nodeCount}개 노드와 ${connCount}개 연결이 추가되었습니다!`);
            
            console.log('🎉 Pipeline applied successfully!');
        } catch (error) {
            console.error('❌ 파이프라인 적용 오류:', error);
            toast.error('파이프라인을 캔버스에 적용하는 중 오류가 발생했습니다.');
        }
    }, [editorRef, areaRef, toast, validatePipeline]);

  return (
    <div className="w-full max-w-[2400px] p-4 sm:p-6 lg:p-8 rounded-3xl shadow-2xl flex flex-col bg-neutral-950 text-gray-200 border border-neutral-800/70">
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
            <div className="w-[15%] p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800/70 flex flex-col text-center gap-7 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {[
                    { 
                        title: '📊 Data Source', 
                        items: 
                        [ 
                            { 
                                label: 'Data Loader', 
                                kind: 'dataLoader',
                                tip: 'CSV 파일에서 데이터 로드\n출력: data'
                            }
                        ]
                    },
                    
                    {
                        title: '🔧 Preprocessing',
                        items: [
                            { 
                                label: 'Data Split', 
                                kind: 'dataSplit',
                                tip: '훈련/테스트 데이터 분할\n입력: data\n출력: X_train, y_train, X_test, y_test'
                            },
                            { 
                                label: 'Scaler', 
                                kind: 'scaler',
                                tip: '데이터 정규화 (StandardScaler/MinMaxScaler)\n입력: X_train\n출력: X_train (정규화됨)'
                            },
                            { 
                                label: 'Feature Selection', 
                                kind: 'featureSelection',
                                tip: '중요한 피처만 선택\n입력: X_train, y_train\n출력: X_train (선택된 피처)'
                            }
                        ]
                    },
                    {
                        title: '🤖 Models',
                        items: [
                            { 
                                label: 'Classifier', 
                                kind: 'classifier',
                                tip: '분류 모델 학습 (RandomForest, SVM 등)\n입력: X_train, y_train\n출력: model'
                            },
                            { 
                                label: 'Regressor', 
                                kind: 'regressor',
                                tip: '회귀 모델 학습 (LinearRegression 등)\n입력: X_train, y_train\n출력: model'
                            },
                            { 
                                label: 'Neural Network', 
                                kind: 'neuralNet',
                                tip: '신경망 모델 학습 (MLP)\n입력: X_train, y_train\n출력: model'
                            }
                        ]
                    },
                    {
                        title: '📈 Evaluation',
                        items: [
                            { 
                                label: 'Evaluate Model', 
                                kind: 'evaluate',
                                tip: '모델 성능 평가\n옵션1: model + X_test + y_test\n옵션2: prediction + y_test\n출력: metrics'
                            },
                            { 
                                label: 'Predict', 
                                kind: 'predict',
                                tip: '새 데이터 예측\n입력: model, X_test\n출력: prediction'
                            }
                        ]
                    },
                    {
                        title: '⚙️ Optimization',
                        items: [
                            { 
                                label: 'Hyperparameter Tuning', 
                                kind: 'hyperparamTune',
                                tip: '최적 하이퍼파라미터 탐색 (GridSearch)\n입력: X_train, y_train\n출력: model (최적화됨)'
                            }
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
                                    title={item.tip || "드래그하여 캔버스로 가져오세요"}
                                >
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 2. 노드 설정 공간 (중앙 캔버스) */}
            <div className="w-[73%] rounded-2xl border border-neutral-800/70 bg-neutral-900/40" style={{ height: 'calc(100vh - 200px)' }}>
                <div
                    ref={canvasRef}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOn(e)}
                    className="w-full h-full relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03),_transparent_60%)] outline-none"
                    title="여기로 드래그하여 노드를 추가"
                    style={{ outline: 'none' }}
                >
                    <div className="absolute left-2 top-2 z-10 text-xs font-semibold text-gray-300 bg-neutral-800/70 border border-neutral-700 px-2 py-1 rounded shadow-sm select-none">
                        ML Pipeline Canvas
                    </div>
                </div>
            </div>

            {/* 3. 정보 및 실행 패널 (오른쪽 사이드바) */}
            <div className="w-[18%] flex flex-col gap-4" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {/* Gemini AI Python 코드 생성기 */}
                <GeminiPipelineGenerator onApplyPipeline={applyPipelineToCanvas} logicId={logic?.id} />
                
                {/* CSV 데이터 관리 */}
                <CSVDataManager 
                    onSelectFile={(fileName) => {
                        console.log('Selected CSV:', fileName);
                        toast.success(`${fileName} 선택됨`);
                    }} 
                    theme={theme}
                    logicId={logic?.id}
                />
                
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
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
                onClick={() => setShowCodePreview(false)}
            >
                <div 
                    className="bg-neutral-900 rounded-2xl border border-neutral-700 shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 모달 헤더 */}
                    <div className="flex items-center justify-between p-6 border-b border-neutral-700">
                        <h2 className="text-2xl font-bold text-gray-100">
                            🐍 생성된 Python 코드
                        </h2>
                        <button 
                            onClick={() => setShowCodePreview(false)}
                            className="text-gray-400 hover:text-gray-200 text-2xl"
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* 코드 영역 */}
                    <div className="flex-1 overflow-auto p-6">
                        <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-sm font-mono overflow-x-auto" style={{ color: 'var(--text-primary)' }}>
                            <code>{generatedCode}</code>
                        </pre>
                    </div>

                    {/* 모달 푸터 */}
                    <div className="flex flex-col gap-3 p-6 border-t border-neutral-700">
                        {/* CSV 다운로드 버튼 */}
                        {/* <button
                            onClick={handleDownloadCSVFiles}
                            className="w-full px-4 py-3 text-base font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-500"
                        >
                            📊 CSV 파일 다운로드
                        </button> */}

                        {/* 다운로드 버튼들 */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedCode);
                                    toast.success('코드가 클립보드에 복사되었습니다!');
                                }}
                                className="flex-1 px-4 py-2 text-base font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-500"
                            >
                                📋 복사
                            </button>
                            <button
                                onClick={handleExportJupyter}
                                className="flex-1 px-4 py-2 text-base font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-500"
                            >
                                📓 Jupyter
                            </button>
                            <button
                                onClick={handleExportPython}
                                className="flex-1 px-4 py-2 text-base font-semibold text-white bg-green-600 rounded-lg hover:bg-green-500"
                            >
                                📄 .py
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
    );
};
export default LogicEditorPage;