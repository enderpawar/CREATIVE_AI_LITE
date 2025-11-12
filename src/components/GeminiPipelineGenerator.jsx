import React, { useState, useEffect } from 'react';
import { 
    generatePythonCode, 
    saveGeminiApiKey, 
    getStoredGeminiApiKey,
    removeGeminiApiKey 
} from '../utils/geminiPipeline';
import { useToast } from './toast/ToastProvider.jsx';

/**
 * Gemini API를 사용한 Python 코드 생성 컴포넌트
 */
const GeminiPipelineGenerator = () => {
    const toast = useToast();
    const [apiKey, setApiKey] = useState('');
    const [hasApiKey, setHasApiKey] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [nodeGuide, setNodeGuide] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);

    // 저장된 API 키 확인
    useEffect(() => {
        const stored = getStoredGeminiApiKey();
        if (stored) {
            setHasApiKey(true);
            setApiKey(stored);
        }
    }, []);

    const handleSaveApiKey = () => {
        if (!apiKey.trim()) {
            toast.error('API 키를 입력해주세요.');
            return;
        }
        
        saveGeminiApiKey(apiKey.trim());
        setHasApiKey(true);
        setShowApiKeyInput(false);
        toast.success('API 키가 저장되었습니다.');
    };

    const handleRemoveApiKey = () => {
        removeGeminiApiKey();
        setApiKey('');
        setHasApiKey(false);
        setShowApiKeyInput(true);
        toast.success('API 키가 삭제되었습니다.');
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error('프롬프트를 입력해주세요.');
            return;
        }

        if (!hasApiKey) {
            toast.error('먼저 API 키를 설정해주세요.');
            setShowApiKeyInput(true);
            return;
        }

        setIsGenerating(true);
        setGeneratedCode('');
        setNodeGuide([]);
        
        try {
            const result = await generatePythonCode(prompt);
            setGeneratedCode(result.code);
            setNodeGuide(result.nodeGuide || []);
            toast.success('코드가 생성되었습니다!');
        } catch (error) {
            console.error('코드 생성 오류:', error);
            toast.error(error.message || '코드 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(generatedCode);
        toast.success('코드가 클립보드에 복사되었습니다!');
    };

    const examplePrompts = [
        '아이리스 데이터셋으로 꽃 분류하기',
        '주택 가격 예측 회귀 모델 만들기',
        '신경망으로 손글씨 숫자 분류하기'
    ];

    return (
        <div style={{
            padding: '20px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            marginTop: '20px'
        }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '15px'
            }}>
                <h3 style={{ 
                    margin: 0, 
                    fontSize: '18px',
                    color: 'var(--text-primary)'
                }}>
                    🤖 AI Python 코드 생성
                </h3>
                {hasApiKey && !showApiKeyInput && (
                    <button
                        onClick={() => setShowApiKeyInput(true)}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        API 키 관리
                    </button>
                )}
            </div>

            {/* API 키 설정 섹션 */}
            {(!hasApiKey || showApiKeyInput) && (
                <div style={{
                    padding: '15px',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '6px',
                    marginBottom: '15px'
                }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        color: 'var(--text-primary)'
                    }}>
                        Gemini API 키
                    </label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '14px',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            marginBottom: '10px'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleSaveApiKey}
                            style={{
                                flex: 1,
                                padding: '8px',
                                fontSize: '14px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            저장
                        </button>
                        {hasApiKey && (
                            <>
                                <button
                                    onClick={() => setShowApiKeyInput(false)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        fontSize: '14px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleRemoveApiKey}
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    삭제
                                </button>
                            </>
                        )}
                    </div>
                    <p style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        color: 'var(--text-secondary)'
                    }}>
                        💡 <a 
                            href="https://aistudio.google.com/app/apikey" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#3b82f6' }}
                        >
                            Google AI Studio
                        </a>에서 무료 API 키를 발급받을 수 있습니다.
                    </p>
                </div>
            )}

            {/* 프롬프트 입력 섹션 */}
            {hasApiKey && !showApiKeyInput && (
                <>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            color: 'var(--text-primary)'
                        }}>
                            원하는 ML 코드를 설명해주세요
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="예: 아이리스 데이터셋으로 꽃의 종류를 분류하는 랜덤 포레스트 모델을 만들어주세요"
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '10px',
                                fontSize: '14px',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                resize: 'vertical',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    {/* 예시 프롬프트 */}
                    <div style={{ marginBottom: '15px' }}>
                        <p style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px'
                        }}>
                            💡 예시:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {examplePrompts.map((example, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setPrompt(example)}
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                        e.currentTarget.style.borderColor = '#3b82f6';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                        e.currentTarget.style.borderColor = 'var(--border-color)';
                                    }}
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 생성 버튼 */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim()}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            backgroundColor: isGenerating || !prompt.trim() ? '#6b7280' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s',
                            marginBottom: '15px'
                        }}
                    >
                        {isGenerating ? '🔄 생성 중...' : '✨ AI로 코드 생성하기'}
                    </button>

                    {/* 노드 배치 가이드 */}
                    {nodeGuide.length > 0 && (
                        <div style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: '6px',
                            marginBottom: '15px',
                            border: '1px solid var(--border-color)',
                            maxHeight: '500px',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{
                                padding: '15px 15px 12px 15px',
                                borderBottom: '1px solid var(--border-color)',
                                position: 'sticky',
                                top: 0,
                                backgroundColor: 'var(--bg-primary)',
                                zIndex: 1
                            }}>
                                <h4 style={{
                                    margin: 0,
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>📋</span>
                                    <span>노드 배치 가이드</span>
                                    <span style={{
                                        fontSize: '11px',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 'normal',
                                        marginLeft: 'auto'
                                    }}>
                                        ({nodeGuide.length}단계)
                                    </span>
                                </h4>
                            </div>
                            <div style={{
                                padding: '12px 15px 15px 15px',
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                flex: 1
                            }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                {nodeGuide.map((guide, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            padding: '12px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '6px',
                                            borderLeft: '3px solid #3b82f6'
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '6px'
                                        }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                fontSize: '12px',
                                                fontWeight: 'bold'
                                            }}>
                                                {guide.step}
                                            </span>
                                            <span style={{
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: 'var(--text-primary)'
                                            }}>
                                                {guide.nodeName}
                                            </span>
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                                color: '#3b82f6',
                                                borderRadius: '4px',
                                                fontFamily: 'monospace'
                                            }}>
                                                {guide.nodeType}
                                            </span>
                                        </div>
                                        <p style={{
                                            margin: '6px 0 0 32px',
                                            fontSize: '13px',
                                            color: 'var(--text-secondary)',
                                            lineHeight: '1.5'
                                        }}>
                                            {guide.description}
                                        </p>
                                        {guide.settings && Object.keys(guide.settings).length > 0 && (
                                            <div style={{
                                                marginTop: '8px',
                                                marginLeft: '32px',
                                                fontSize: '12px',
                                                fontFamily: 'monospace',
                                                color: 'var(--text-secondary)',
                                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                padding: '6px 10px',
                                                borderRadius: '4px'
                                            }}>
                                                <div style={{ 
                                                    fontSize: '10px', 
                                                    color: 'var(--text-secondary)', 
                                                    marginBottom: '4px',
                                                    fontWeight: '600'
                                                }}>
                                                    ⚙️ 설정 값:
                                                </div>
                                                {Object.entries(guide.settings).map(([key, value]) => (
                                                    <div key={key} style={{ marginBottom: '2px' }}>
                                                        <span style={{ color: '#f59e0b' }}>{key}</span>
                                                        <span style={{ color: 'var(--text-secondary)' }}>: </span>
                                                        <span style={{ color: '#10b981' }}>
                                                            {typeof value === 'string' ? `"${value}"` : value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* 연결 정보 - 간단하고 명확하게 */}
                                        {guide.connections && (guide.connections.from?.length > 0 || guide.connections.to?.length > 0) && (
                                            <div style={{
                                                marginTop: '10px',
                                                marginLeft: '32px'
                                            }}>
                                                {/* 이 노드로 들어오는 연결 */}
                                                {guide.connections.from && guide.connections.from.length > 0 && (
                                                    <div style={{
                                                        marginBottom: '8px',
                                                        padding: '8px 10px',
                                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                        borderLeft: '3px solid #10b981',
                                                        borderRadius: '4px'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            color: '#10b981',
                                                            marginBottom: '6px'
                                                        }}>
                                                            📥 입력 소켓에 연결하기:
                                                        </div>
                                                        {guide.connections.from.map((conn, connIdx) => {
                                                            const sourceNode = nodeGuide.find(n => n.step === conn.step);
                                                            // 현재 노드의 입력 소켓 이름 찾기
                                                            const inputSocket = conn.input || 'data'; // 기본값
                                                            
                                                            return (
                                                                <div key={connIdx} style={{
                                                                    fontSize: '12px',
                                                                    color: 'var(--text-primary)',
                                                                    marginBottom: '6px',
                                                                    lineHeight: '1.6',
                                                                    padding: '6px',
                                                                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                                                                    borderRadius: '4px'
                                                                }}>
                                                                    <div style={{ marginBottom: '3px' }}>
                                                                        <code style={{ 
                                                                            fontFamily: 'monospace',
                                                                            fontSize: '11px',
                                                                            color: '#10b981',
                                                                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '3px',
                                                                            fontWeight: '600'
                                                                        }}>
                                                                            {inputSocket}
                                                                        </code>
                                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}> 입력 소켓에</span>
                                                                    </div>
                                                                    <div style={{ paddingLeft: '8px', borderLeft: '2px solid rgba(16, 185, 129, 0.3)' }}>
                                                                        <span style={{ color: '#10b981', fontWeight: '600' }}>
                                                                            {conn.step}단계
                                                                        </span>
                                                                        <span style={{ color: 'var(--text-secondary)' }}> ({sourceNode?.nodeName})의 </span>
                                                                        <code style={{ 
                                                                            fontFamily: 'monospace',
                                                                            fontSize: '11px',
                                                                            color: '#f59e0b',
                                                                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '3px',
                                                                            fontWeight: '600'
                                                                        }}>
                                                                            {conn.output}
                                                                        </code>
                                                                        <span style={{ color: 'var(--text-secondary)' }}> 출력 연결</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                
                                                {/* 이 노드에서 나가는 연결 */}
                                                {guide.connections.to && guide.connections.to.length > 0 && (
                                                    <div style={{
                                                        padding: '8px 10px',
                                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                        borderLeft: '3px solid #3b82f6',
                                                        borderRadius: '4px'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            color: '#3b82f6',
                                                            marginBottom: '6px'
                                                        }}>
                                                            📤 출력 소켓에서 내보내기:
                                                        </div>
                                                        {guide.connections.to.map((conn, connIdx) => {
                                                            const targetNode = nodeGuide.find(n => n.step === conn.step);
                                                            // 현재 노드의 출력 소켓 이름 찾기
                                                            const outputSocket = conn.output || 'scaled'; // Gemini가 제공한 정보 활용
                                                            
                                                            return (
                                                                <div key={connIdx} style={{
                                                                    fontSize: '12px',
                                                                    color: 'var(--text-primary)',
                                                                    marginBottom: '6px',
                                                                    lineHeight: '1.6',
                                                                    padding: '6px',
                                                                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                                                    borderRadius: '4px'
                                                                }}>
                                                                    <div style={{ marginBottom: '3px' }}>
                                                                        <code style={{ 
                                                                            fontFamily: 'monospace',
                                                                            fontSize: '11px',
                                                                            color: '#3b82f6',
                                                                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '3px',
                                                                            fontWeight: '600'
                                                                        }}>
                                                                            {outputSocket}
                                                                        </code>
                                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}> 출력 소켓을</span>
                                                                    </div>
                                                                    <div style={{ paddingLeft: '8px', borderLeft: '2px solid rgba(59, 130, 246, 0.3)' }}>
                                                                        <span style={{ color: '#3b82f6', fontWeight: '600' }}>
                                                                            {conn.step}단계
                                                                        </span>
                                                                        <span style={{ color: 'var(--text-secondary)' }}> ({targetNode?.nodeName})의 </span>
                                                                        <code style={{ 
                                                                            fontFamily: 'monospace',
                                                                            fontSize: '11px',
                                                                            color: '#3b82f6',
                                                                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '3px',
                                                                            fontWeight: '600'
                                                                        }}>
                                                                            {conn.input}
                                                                        </code>
                                                                        <span style={{ color: 'var(--text-secondary)' }}> 입력에 연결</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 생성된 코드 표시 */}
                    {generatedCode && (
                        <div style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 15px',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderBottom: '1px solid var(--border-color)'
                            }}>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)'
                                }}>
                                    생성된 Python 코드
                                </span>
                                <button
                                    onClick={handleCopyCode}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📋 복사
                                </button>
                            </div>
                            <pre style={{
                                margin: 0,
                                padding: '15px',
                                fontSize: '13px',
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                color: 'var(--text-primary)',
                                backgroundColor: '#1e1e1e',
                                overflow: 'auto',
                                maxHeight: '500px',
                                lineHeight: '1.5'
                            }}>
                                <code>{generatedCode}</code>
                            </pre>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default GeminiPipelineGenerator;
