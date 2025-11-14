import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './toast/ToastProvider.jsx';
import { useReteAppEditor } from '../hooks/useReteAppEditor';
import { createNodeByKind, clientToWorld, exportGraph, importGraph } from '../rete/app-editor';
import { loadLogic as loadLogicFromStorage, loadTheme, saveTheme } from '../utils/logicStorage';
import { generatePythonCode, generateJupyterNotebook, generatePythonScript } from '../utils/pipelineToCode';
import { enhanceCodeWithAI } from '../utils/geminiPipeline';
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
        try {
            const editor = editorRef.current;
            const area = areaRef.current;

            const graph = editor && area ? exportGraph(editor, area) : { nodes: [], connections: [] };

            const code = generatePythonCode(graph);
            setGeneratedCode(code);
            
            // 모달 열 때 저장된 개선 코드가 있으면 AI 코드 보기, 없으면 노드 기반 코드 보기
            if (selectedLogicId) {
                const savedEnhanced = localStorage.getItem(`enhanced_code_${selectedLogicId}`);
                setShowEnhancedCode(!!savedEnhanced);
            } else {
                setShowEnhancedCode(false);
            }
            
            setShowCodePreview(true);
        } catch (error) {
            if (error.name === 'PipelineValidationError') {
                toast.error(error.message);
            } else {
                toast.error('코드 생성 중 오류가 발생했습니다.');
                console.error('Code generation error:', error);
            }
        }
    }, [editorRef, areaRef, selectedLogicId, toast]);

    // AI로 코드 개선하기
    const handleEnhanceCode = useCallback(async () => {
        if (!userIntent.trim()) {
            setShowIntentInput(true);
            toast.error('코드의 목적을 입력해주세요.');
            return;
        }

        setIsEnhancing(true);
        try {
            // 코드가 없으면 먼저 생성
            let codeToEnhance = generatedCode;
            if (!codeToEnhance) {
                const editor = editorRef.current;
                if (!editor) {
                    toast.error('에디터가 초기화되지 않았습니다.');
                    return;
                }

                const graph = exportGraph(editor, areaRef.current);
                const validationErrors = validatePipeline(graph);
                
                if (validationErrors.length > 0) {
                    toast.error(validationErrors.join('\n'));
                    return;
                }

                codeToEnhance = generatePythonCode(graph);
                setGeneratedCode(codeToEnhance);
            }

            // AI로 코드 개선
            const enhanced = await enhanceCodeWithAI(codeToEnhance, userIntent);
            setEnhancedCode(enhanced);
            setShowEnhancedCode(true); // AI 개선 코드 표시
            setShowCodePreview(true); // 코드 미리보기 모달 표시
            
            // localStorage에 즉시 저장
            if (selectedLogicId) {
                localStorage.setItem(`enhanced_code_${selectedLogicId}`, enhanced);
            }
            toast.success('AI가 코드를 생성하고 개선했습니다! ✨');
        } catch (error) {
            console.error('코드 개선 오류:', error);
            toast.error(error.message || 'AI 코드 생성에 실패했습니다.');
        } finally {
            setIsEnhancing(false);
        }
    }, [generatedCode, userIntent, selectedLogicId, toast, editorRef, areaRef, validatePipeline]);

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

            // AI 개선 코드가 있으면 그것을 사용, 없으면 기본 코드 사용
            let finalCode;
            if (enhancedCode) {
                // AI 개선 코드를 직접 Jupyter 형식으로 변환
                const sections = enhancedCode.split('\n\n');
                const cells = [
                    {
                        cell_type: 'markdown',
                        metadata: {},
                        source: [
                            `# ${logicName || 'ML Pipeline'}\n`,
                            '\n',
                            '✨ **AI가 개선한 코드**: 에러 처리, 로깅, 시각화가 추가되었습니다.\n',
                            '\n',
                            `Generated on: ${new Date().toLocaleString('ko-KR')}\n`
                        ]
                    },
                    ...sections.map(section => ({
                        cell_type: 'code',
                        execution_count: null,
                        metadata: {},
                        outputs: [],
                        source: section.split('\n').map(line => line + '\n')
                    }))
                ];
                
                const notebook = {
                    cells,
                    metadata: {
                        kernelspec: {
                            display_name: 'Python 3',
                            language: 'python',
                            name: 'python3'
                        },
                        language_info: {
                            name: 'python',
                            version: '3.8.0'
                        }
                    },
                    nbformat: 4,
                    nbformat_minor: 4
                };
                
                finalCode = JSON.stringify(notebook, null, 2);
            } else {
                finalCode = generateJupyterNotebook(graph, logicName || 'ML Pipeline');
            }
            
            const blob = new Blob([finalCode], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${logicName || 'pipeline'}${enhancedCode ? '_ai_enhanced' : ''}.ipynb`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success(`Jupyter Notebook${enhancedCode ? ' (AI 개선)' : ''}이 다운로드되었습니다!`);
        } catch (error) {
            if (error.name === 'PipelineValidationError') {
                toast.error(error.message);
            } else {
                toast.error('Jupyter Notebook 생성 중 오류가 발생했습니다.');
                console.error('Jupyter export error:', error);
            }
        }
    }, [editorRef, areaRef, logicName, enhancedCode, toast]);

    // Python Script 다운로드
    const handleExportPython = useCallback(() => {
        try {
            const editor = editorRef.current;
            const area = areaRef.current;

            const graph = editor && area ? exportGraph(editor, area) : { nodes: [], connections: [] };

            // AI 개선 코드가 있으면 그것을 사용, 없으면 기본 코드 사용
            let finalCode;
            if (enhancedCode) {
                const header = `"""
${logicName || 'ML Pipeline'}

✨ AI-Enhanced ML Pipeline Script
- 에러 처리, 로깅, 시각화 포함
- Generated on: ${new Date().toLocaleString('ko-KR')}
"""

`;
                finalCode = header + enhancedCode;
            } else {
                finalCode = generatePythonScript(graph, logicName || 'ML Pipeline');
            }
            
            const blob = new Blob([finalCode], { type: 'text/x-python' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${logicName || 'pipeline'}${enhancedCode ? '_ai_enhanced' : ''}.py`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success(`Python 스크립트${enhancedCode ? ' (AI 개선)' : ''}가 다운로드되었습니다!`);
        } catch (error) {
            if (error.name === 'PipelineValidationError') {
                toast.error(error.message);
            } else {
                toast.error('Python 스크립트 생성 중 오류가 발생했습니다.');
                console.error('Python export error:', error);
            }
        }
    }, [editorRef, areaRef, logicName, enhancedCode, toast]);

    // Gemini에서 생성된 파이프라인을 캔버스에 추가
    const applyPipelineToCanvas = useCallback(async (pipeline) => {
        try {
            const editor = editorRef.current;
            const area = areaRef.current;
            
            if (!editor || !area) {
                toast.error('에디터가 준비되지 않았습니다.');
                return;
            }

            // ✅ 파이프라인 검증
            const validationErrors = validatePipeline(pipeline);
            if (validationErrors.length > 0) {
                toast.error(`파이프라인 검증 실패: ${validationErrors[0]}`);
                console.error('모든 검증 오류:', validationErrors);
                return;
            }

            // 노드 ID와 Rete 노드 객체 매핑
            const nodeMap = new Map();

            // 1. 모든 노드 생성
            for (const nodeData of pipeline.nodes) {
                // nodeType 또는 type 속성 모두 지원
                const nodeType = nodeData.nodeType || nodeData.type || nodeData.kind;
                const node = createNodeByKind(nodeType);
                
                if (!node) {
                    console.error(`노드 타입을 찾을 수 없습니다: ${nodeType}`);
                    continue;
                }

                // 컨트롤 값 설정
                if (nodeData.controls || nodeData.settings) {
                    const settings = nodeData.controls || nodeData.settings;
                    for (const [key, value] of Object.entries(settings)) {
                        const control = node.controls[key];
                        if (control) {
                            control.setValue(value);
                        }
                    }
                }

                // 노드를 에디터에 추가
                await editor.addNode(node);
                
                // 위치 설정
                if (nodeData.position) {
                    await area.translate(node.id, nodeData.position);
                }
                
                // 매핑 저장 (원본 ID 사용)
                const originalId = nodeData.id || `node-${nodeData.step}`;
                nodeMap.set(originalId, node);
            }


            // 2. 연결 생성
            const connections = Array.isArray(pipeline.connections) ? pipeline.connections : [];
            console.log('Pipeline connections:', connections);
            console.log('Node map:', nodeMap);
            
            // ✅ 성능 최적화: 소켓 이름 캐시
            const socketCache = new Map();
            const getSocketKey = (node, socketName, isOutput) => {
                const cacheKey = `${node.id}_${isOutput ? 'out' : 'in'}_${socketName}`;
                
                if (socketCache.has(cacheKey)) {
                    return socketCache.get(cacheKey);
                }
                
                const sockets = isOutput ? node.outputs : node.inputs;
                const socketKey = Object.keys(sockets).find(k => 
                    k.toLowerCase() === socketName.toLowerCase()
                );
                
                if (socketKey) {
                    socketCache.set(cacheKey, socketKey);
                }
                
                return socketKey;
            };
            
            // 기존 연결 확인 함수 (더 강력한 체크)
            const connectionExists = (srcId, srcOut, tgtId, tgtIn) => {
                try {
                    const existingConns = editor.getConnections();
                    return existingConns.some(conn => 
                        conn.source === srcId && 
                        conn.sourceOutput === srcOut && 
                        conn.target === tgtId && 
                        conn.targetInput === tgtIn
                    );
                } catch (e) {
                    console.warn('연결 체크 중 오류:', e);
                    return false;
                }
            };
            
            // 연결 추가 시도 (중복 에러 무시)
            const tryAddConnection = async (source, sourceOutput, target, targetInput) => {
                // 이미 존재하는 연결인지 확인
                if (connectionExists(source, sourceOutput, target, targetInput)) {
                    console.warn(`⚠️ Connection already exists: ${source} (${sourceOutput}) -> ${target} (${targetInput})`);
                    return false;
                }
                
                try {
                    await editor.addConnection({
                        source,
                        sourceOutput,
                        target,
                        targetInput
                    });
                    console.log(`✅ Connected: ${source} (${sourceOutput}) -> ${target} (${targetInput})`);
                    return true;
                } catch (err) {
                    // "connection has already been added" 에러는 무시
                    if (err.message && err.message.includes('already been added')) {
                        console.warn(`⚠️ Connection already exists (caught): ${source} -> ${target}`);
                        return false;
                    }
                    console.error('Connection error:', err);
                    return false;
                }
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
                    
                    // ✅ 캐시된 소켓 조회 사용
                    const outputKey = getSocketKey(sourceNode, conn.sourceOutput, true);
                    const inputKey = getSocketKey(targetNode, conn.targetInput, false);
                    
                    if (!outputKey || !inputKey) {
                        console.error(`소켓을 찾을 수 없습니다: ${conn.sourceOutput} (${outputKey}) -> ${conn.targetInput} (${inputKey})`);
                        continue;
                    }
                    
                    // 연결 시도
                    await tryAddConnection(sourceNode.id, outputKey, targetNode.id, inputKey);
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
                        // 연결 시도
                        await tryAddConnection(src.id, srcOut, dst.id, dstIn);
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
                {/* 사용자 의도 입력 섹션 */}
                <div className="p-4 bg-neutral-900/60 rounded-2xl border border-neutral-800/70 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-200">💡 코드 목적 설명</h3>
                    </div>
                    <textarea
                        value={userIntent}
                        onChange={(e) => setUserIntent(e.target.value)}
                        placeholder="상세히 작성할수록 정확한 코드가 생성됩니다:&#10;&#10;• 데이터: class_score_en.csv (midterm 컬럼으로 final 예측)&#10;• 목표: 선형회귀로 성적 예측&#10;• 금지: sklearn.LinearRegression 사용 금지 (numpy.linalg.pinv 사용)&#10;• 출력: class_score_predict.png 파일로 시각화&#10;• 기타: matplotlib으로 scatter plot 생성"
                        rows={6}
                        className="w-full p-3 bg-neutral-900 rounded border border-neutral-800 text-sm text-gray-300 resize-vertical"
                        style={{ fontFamily: 'inherit' }}
                    />
                    <button
                        onClick={async () => {
                            if (!userIntent.trim()) {
                                toast.error('코드 목적을 먼저 입력해주세요.');
                                return;
                            }
                            // GeminiPipelineGenerator로 스크롤
                            const geminiSection = document.querySelector('[data-gemini-generator]');
                            if (geminiSection) {
                                geminiSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                // 프롬프트 자동 설정
                                const event = new CustomEvent('setGeminiPrompt', { detail: userIntent });
                                window.dispatchEvent(event);
                                toast.success('AI 노드 추천 섹션으로 이동합니다!');
                            }
                        }}
                        className="mt-3 w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500"
                    >
                        💡 AI에게 노드 추천 받기
                    </button>
                    <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                        <p className="text-xs text-blue-300 font-semibold mb-2">📝 작성 팁:</p>
                        <ul className="text-xs text-gray-400 space-y-1">
                            <li>• <span className="text-blue-400">데이터</span>: CSV 파일명, 컬럼명</li>
                            <li>• <span className="text-green-400">목표</span>: 분류/회귀/클러스터링</li>
                            <li>• <span className="text-red-400">금지</span>: 사용 금지 라이브러리</li>
                            <li>• <span className="text-yellow-400">출력</span>: 저장할 파일명</li>
                        </ul>
                    </div>
                </div>

                {/* Gemini AI Python 코드 생성기 */}
                <GeminiPipelineGenerator onApplyPipeline={applyPipelineToCanvas} />
                
                {/* CSV 데이터 관리 */}
                <CSVDataManager 
                    onSelectFile={(fileName) => {
                        console.log('Selected CSV:', fileName);
                        toast.success(`${fileName} 선택됨`);
                    }} 
                    theme={theme}
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
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                onClick={() => setShowCodePreview(false)}
            >
                <div 
                    className="bg-neutral-900 rounded-2xl border border-neutral-700 shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 모달 헤더 */}
                    <div className="flex items-center justify-between p-6 border-b border-neutral-700">
                        <h2 className="text-2xl font-bold text-gray-100">
                            {showEnhancedCode && enhancedCode ? '✨ AI 개선 코드' : '🐍 노드 기반 코드'}
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
                        <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-sm text-green-400 font-mono overflow-x-auto">
                            <code>{showEnhancedCode && enhancedCode ? enhancedCode : generatedCode}</code>
                        </pre>
                    </div>

                    {/* AI 개선 상태 표시 */}
                    {showEnhancedCode && enhancedCode && (
                        <div className="px-6 pb-3">
                            <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3">
                                <p className="text-sm text-purple-300">
                                    ✨ <strong>AI 개선 완료!</strong> 에러 처리, 로깅, 시각화, 모델 저장 기능이 추가되었습니다.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 모달 푸터 */}
                    <div className="flex flex-col gap-3 p-6 border-t border-neutral-700">
                        {/* 코드 전환 버튼 */}
                        {enhancedCode && (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowEnhancedCode(false)}
                                    className={`flex-1 px-4 py-3 text-base font-semibold rounded-lg transition-colors ${
                                        !showEnhancedCode
                                            ? 'bg-cyan-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    📄 노드 기반 코드
                                </button>
                                <button
                                    onClick={() => setShowEnhancedCode(true)}
                                    className={`flex-1 px-4 py-3 text-base font-semibold rounded-lg transition-colors ${
                                        showEnhancedCode
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    ✨ AI 개선 코드
                                </button>
                            </div>
                        )}

                        {/* AI 개선 버튼 (개선 코드가 없을 때만 표시) */}
                        {!enhancedCode && (
                            <button
                                onClick={handleEnhanceCode}
                                disabled={isEnhancing || !userIntent.trim()}
                                className={`w-full px-4 py-3 text-base font-semibold text-white rounded-lg transition-colors ${
                                    isEnhancing || !userIntent.trim()
                                        ? 'bg-gray-600 cursor-not-allowed'
                                        : 'bg-purple-600 hover:bg-purple-500'
                                }`}
                            >
                                {isEnhancing ? '🔄 AI 개선 중...' : '✨ AI로 코드 개선하기'}
                            </button>
                        )}

                        {/* CSV 다운로드 버튼 */}
                        <button
                            onClick={handleDownloadCSVFiles}
                            className="w-full px-4 py-3 text-base font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-500"
                        >
                            📊 CSV 파일 다운로드
                        </button>

                        {/* 다운로드 버튼들 */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(showEnhancedCode && enhancedCode ? enhancedCode : generatedCode);
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