// Rete 코어 및 프리셋 가져오기 (TypeScript 변환)
import { NodeEditor, ClassicPreset } from 'rete'
import { AreaPlugin } from 'rete-area-plugin'
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin'
import { ReactPlugin, Presets as ReactPresets } from 'rete-react-plugin'
import { createRoot } from 'react-dom/client'

// Custom themed components for nodes, sockets, connections
import { CustomNode } from '../customization/CustomNode.tsx'
import { CustomSocket } from '../customization/CustomSocket'
import { CustomConnection } from '../customization/CustomConnection'
import { addCustomBackground } from '../customization/custom-background'
import '../customization/background.css'

// -------------------- 타입 선언/유틸 --------------------
export type NodeKind =
    // ML Pipeline Nodes
    'dataLoader'
    | 'dataSplit'
    | 'scaler'
    | 'featureSelection'
    | 'classifier'
    | 'regressor'
    | 'neuralNet'
    | 'evaluate'
    | 'predict'
    | 'hyperparamTune'

export type SerializedGraph = {
    nodes: Array<{
        id: string
        label: string
        kind?: NodeKind
        position: { x: number; y: number }
        controls?: Record<string, any>
    }>
    connections: Array<{
        id: string
        source: string
        target: string
        sourceOutput: string
        targetInput: string
    }>
    // 실제 구현에서 viewport도 직렬화/역직렬화하므로 타입에 포함(옵션)
    viewport?: { k: number; x: number; y: number }
}

export class TradeNode extends ClassicPreset.Node {
    declare kind: NodeKind
    declare category: string
    declare _controlHints?: Record<string, { label: string; title?: string }>
}

// Typed sockets according to the design
// 소켓 타입 정의
const numberSocket = new ClassicPreset.Socket('number') // 숫자 값 전달

// -------------------- ML Pipeline Nodes --------------------

export class DataLoaderNode extends TradeNode {
    constructor() {
        super('데이터 로더')
        this.addOutput('data', new ClassicPreset.Output(numberSocket, '데이터'))
        this.addControl('fileName', new ClassicPreset.InputControl('text', { initial: 'data.csv' }))
        this.kind = 'dataLoader'
        this.category = 'ml-source'
    }
}

export class DataSplitNode extends TradeNode {
    constructor() {
        super('데이터 분할')
        this.addInput('data', new ClassicPreset.Input(numberSocket, '데이터'))
        this.addOutput('X_train', new ClassicPreset.Output(numberSocket, 'X_train'))
        this.addOutput('y_train', new ClassicPreset.Output(numberSocket, 'Y_train'))
        this.addOutput('X_test', new ClassicPreset.Output(numberSocket, 'X_test'))
        this.addOutput('y_test', new ClassicPreset.Output(numberSocket, 'Y_test'))
        this.addControl('targetColumn', new ClassicPreset.InputControl('text', { initial: 'target' }))
        this.addControl('ratio', new ClassicPreset.InputControl('number', { initial: 0.8 }))
        this.kind = 'dataSplit'
        this.category = 'ml-preprocessing'
        this._controlHints = {
            targetColumn: { label: '타겟 컬럼', title: '예측할 목표 변수의 컬럼명' },
            ratio: { label: '학습 비율', title: '학습 데이터 비율 (0~1)' }
        }
    }
}

export class ScalerNode extends TradeNode {
    constructor() {
        super('정규화')
        this.addInput('data', new ClassicPreset.Input(numberSocket, '데이터'))
        this.addOutput('scaled', new ClassicPreset.Output(numberSocket, '정규화됨'))
        this.addControl('method', new ClassicPreset.InputControl('text', { initial: 'StandardScaler' }))
        this.kind = 'scaler'
        this.category = 'ml-preprocessing'
    }
}

export class FeatureSelectionNode extends TradeNode {
    constructor() {
        super('피처 선택')
        this.addInput('data', new ClassicPreset.Input(numberSocket, '데이터'))
        this.addOutput('selected', new ClassicPreset.Output(numberSocket, '선택됨'))
        this.addControl('method', new ClassicPreset.InputControl('text', { initial: 'SelectKBest' }))
        this.addControl('k', new ClassicPreset.InputControl('number', { initial: 10 }))
        this.kind = 'featureSelection'
        this.category = 'ml-preprocessing'
    }
}

export class ClassifierNode extends TradeNode {
    constructor() {
        super('분류기')
        this.addInput('X_train', new ClassicPreset.Input(numberSocket, 'X_train'))
        this.addInput('Y_train', new ClassicPreset.Input(numberSocket, 'Y_train'))
        this.addOutput('model', new ClassicPreset.Output(numberSocket, '모델'))
        this.addControl('algorithm', new ClassicPreset.InputControl('text', { initial: 'RandomForest' }))
        this.addControl('n_estimators', new ClassicPreset.InputControl('number', { initial: 100 }))
        this.kind = 'classifier'
        this.category = 'ml-model'
    }
}

export class RegressorNode extends TradeNode {
    constructor() {
        super('회귀')
        this.addInput('X_train', new ClassicPreset.Input(numberSocket, 'X_train'))
        this.addInput('Y_train', new ClassicPreset.Input(numberSocket, 'Y_train'))
        this.addOutput('model', new ClassicPreset.Output(numberSocket, '모델'))
        this.addControl('algorithm', new ClassicPreset.InputControl('text', { initial: 'LinearRegression' }))
        this.kind = 'regressor'
        this.category = 'ml-model'
    }
}

export class NeuralNetNode extends TradeNode {
    constructor() {
        super('신경망')
        this.addInput('X_train', new ClassicPreset.Input(numberSocket, 'X_train'))
        this.addInput('Y_train', new ClassicPreset.Input(numberSocket, 'Y_train'))
        this.addOutput('model', new ClassicPreset.Output(numberSocket, '모델'))
        this.addControl('layers', new ClassicPreset.InputControl('text', { initial: '64,32' }))
        this.addControl('epochs', new ClassicPreset.InputControl('number', { initial: 50 }))
        this.kind = 'neuralNet'
        this.category = 'ml-model'
    }
}

export class EvaluateNode extends TradeNode {
    constructor() {
        super('평가')
        this.addInput('model', new ClassicPreset.Input(numberSocket, '모델'))
        this.addInput('X_test', new ClassicPreset.Input(numberSocket, 'X_test'))
        this.addInput('Y_test', new ClassicPreset.Input(numberSocket, 'Y_test'))
        this.kind = 'evaluate'
        this.category = 'ml-evaluation'
    }
}

export class PredictNode extends TradeNode {
    constructor() {
        super('예측')
        this.addInput('model', new ClassicPreset.Input(numberSocket, '모델'))
        this.addInput('data', new ClassicPreset.Input(numberSocket, '데이터'))
        this.addOutput('prediction', new ClassicPreset.Output(numberSocket, '예측값'))
        this.kind = 'predict'
        this.category = 'ml-prediction'
    }
}

export class HyperparamTuneNode extends TradeNode {
    constructor() {
        super('하이퍼파라미터 튜닝')
        this.addInput('X_train', new ClassicPreset.Input(numberSocket, 'X_훈련'))
        this.addInput('y_train', new ClassicPreset.Input(numberSocket, 'y_훈련'))
        this.addOutput('best_model', new ClassicPreset.Output(numberSocket, '최적모델'))
        this.addControl('method', new ClassicPreset.InputControl('text', { initial: 'GridSearch' }))
        this.kind = 'hyperparamTune'
        this.category = 'ml-optimization'
    }
}

// -------------------- 에디터 초기화 및 설정 --------------------
// 에디터/플러그인 초기화 및 UI 보조 로직 설정
export async function createAppEditor(container: HTMLElement): Promise<{
        editor: any
        area: any
        destroy: () => void
    }> {
    const editor = new NodeEditor()
    const area: any = new AreaPlugin(container as unknown as HTMLElement)
    const connection: any = new ConnectionPlugin()
    const reactRender: any = new ReactPlugin({ createRoot })

    editor.use(area)
    area.use(connection)
    area.use(reactRender)

    connection.addPreset(ConnectionPresets.classic.setup())
    // Apply custom theming for Node/Socket/Connection
    reactRender.addPreset(
        (ReactPresets as any).classic.setup({
            customize: {
                node() { return CustomNode },
                socket() { return CustomSocket },
                connection() { return CustomConnection }
            }
        })
    )

    // Optional: add subtle dark grid background to the area
    try {
        addCustomBackground(area as any)
    } catch { /* noop */ }

    // --- 더블클릭 확대 비활성화: 기본 d3/zoom 유사 동작 차단 ---
    // 캔버스 컨테이너에서 발생하는 dblclick을 막아 확대 트리거를 방지한다.
    const stopDblClick = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }
    container.addEventListener('dblclick', stopDblClick, { capture: true })

    // (과거 DOM 치환형 드롭다운 유틸은 제거되었습니다)

    // addNode 오버라이드: select 변환 적용
    const originalAddNode = editor.addNode.bind(editor)
        ; (editor as any).addNode = async (node: TradeNode) => {
            const res = await originalAddNode(node)
            applySelectEnhancements(node)
            return res
        }

    // -------------------- Node별 Select 적용 조합 --------------------
    // 직접 렌더 방식(CustomNode.tsx)로 대체되었으므로, 이 함수는 no-op 처리한다.
    function applySelectEnhancements(..._args: any[]): void { void _args; /* no-op */ }

    // -------------------- 연결 타입 검사 --------------------
    const originalAddConnection = (editor as any).addConnection.bind(editor)
        ; (editor as any).addConnection = async (con: any) => {
            try {
                // source/target 소켓 name 비교 (number/bool 등)
                const sNode: TradeNode | undefined = editor.getNode(con.source) as any
                const tNode: TradeNode | undefined = editor.getNode(con.target) as any
                if (sNode && tNode) {
                    const sOut = (sNode.outputs as any)[con.sourceOutput] as ClassicPreset.Output<ClassicPreset.Socket>
                    const tIn = (tNode.inputs as any)[con.targetInput] as ClassicPreset.Input<ClassicPreset.Socket>
                    const sType = sOut && (sOut.socket as any) && (sOut.socket as any).name
                    const tType = tIn && (tIn.socket as any) && (tIn.socket as any).name
                    if (sType && tType && sType !== tType) {
                        console.warn('[연결 차단] 소켓 타입 불일치', sType, '->', tType)
                        return con
                    }
                }
            } catch { /* noop */ }
            return originalAddConnection(con)
        }

    // -------------------- Context Menu (우클릭 메뉴) --------------------
    const menu = document.createElement('div')
    menu.style.position = 'absolute'
    menu.style.zIndex = '50'
    menu.style.display = 'none'
    // 다크 테마와 조화로운 컨텍스트 메뉴 스타일
    menu.style.background = '#0b1220'
    menu.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)'
    menu.style.borderRadius = '10px'
    menu.style.padding = '4px'
        ; (menu.style as any).border = '1px solid #1f2937'
    // 글자 폭에 맞게 자동 너비, 줄바꿈 방지로 좌우 폭을 최소화
    ;(menu.style as any).minWidth = 'auto'
    ;(menu.style as any).whiteSpace = 'nowrap'
    const delBtn = document.createElement('button')
    delBtn.textContent = '삭제'
    delBtn.style.display = 'block'
    delBtn.style.width = 'auto'
    delBtn.style.padding = '6px 10px'
    delBtn.style.margin = '2px 4px'
    delBtn.style.textAlign = 'center'
    delBtn.style.color = '#ffffff'
    delBtn.style.background = '#ef4444' // red-500
    delBtn.style.borderRadius = '8px'
        ; (delBtn.style as any).border = 'none'
    delBtn.style.cursor = 'pointer'
    menu.appendChild(delBtn)
    container.appendChild(menu)

    let currentNode: TradeNode | null = null
    function closeMenu() {
        menu.style.display = 'none'
        currentNode = null
    }
    function openMenu(clientX: number, clientY: number, node: TradeNode) {
        const rect = container.getBoundingClientRect()
        menu.style.left = `${clientX - rect.left}px`
        menu.style.top = `${clientY - rect.top}px`
        menu.style.display = 'block'
        currentNode = node
        // 메뉴 표시 후 버튼 폭을 "잘라내기" 버튼에 맞춰 정렬
        requestAnimationFrame(() => {
            try {
                // 측정 전 초기화
                delBtn.style.width = 'auto'
                copyBtn.style.width = 'auto'
                // cutBtn이 현재 메뉴에 존재할 때만 정렬 수행
                if (menu.contains(cutBtn)) {
                    const w = cutBtn.offsetWidth
                    if (w && w > 0) {
                        const px = `${w}px`
                        delBtn.style.width = px
                        copyBtn.style.width = px
                    }
                }
            } catch { /* noop */ }
        })
    }

    function findNodeAt(clientX: number, clientY: number): TradeNode | null {
        for (const node of (editor.getNodes() as any[])) {
            const view: any = (area as any).nodeViews.get((node as any).id)
            const el: any = view && (view.element || view.el || view.root || null)
            if (!el || !el.getBoundingClientRect) continue
            const r = el.getBoundingClientRect()
            if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
                return node
            }
        }
        return null
    }

    // 기존 우클릭 핸들러는 아래의 확장된 컨텍스트 메뉴 로직으로 대체됩니다.
    delBtn.addEventListener('click', async () => {
        if (currentNode) {
            // 선택된 노드 중 하나에서 삭제를 누르면 다중 삭제 수행
            const isMulti = selectedNodeIds.size > 0 && selectedNodeIds.has((currentNode as any).id)
            const targetIds: string[] = isMulti ? Array.from(selectedNodeIds) : [String((currentNode as any).id)]
            for (const id of targetIds) {
                try {
                    const cons = editor
                        .getConnections()
                        .filter((c: any) => c.source === id || c.target === id)
                    for (const c of cons) {
                        try { await (editor as any).removeConnection(c.id) } catch { /* noop */ }
                    }
                    await (editor as any).removeNode(id)
                } catch { /* noop */ }
            }
            // 삭제 후 선택 초기화 및 하이라이트 제거
            selectedNodeIds.clear()
            applySelectionOutline()
            // 삭제 완료
        }
        closeMenu()
    })
    window.addEventListener('click', (e) => {
        if ((e as MouseEvent).button === 0) closeMenu()
    })
    window.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Escape') closeMenu()
    })

    // -------------------- 마퀴(드래그 사각형) 선택 & 복사/붙여넣기 --------------------
    // 상태: 선택된 노드 집합 및 로컬(에디터 인스턴스) 클립보드
    const selectedNodeIds = new Set<string>()
    let clipboard: SerializedGraph | null = null
    let lastContextPosClient: { x: number; y: number } | null = null

    // --- Undo/Redo 히스토리 제거됨 ---
    // 포커스/호버 기반 활성화 플래그 (이 인스턴스 전용)
    let isActive = false
    try { (container as any).tabIndex = (container as any).tabIndex ?? 0 } catch { /* noop */ }
    const onEnter = () => { isActive = true }
    const onLeave = () => { isActive = false }
    const onFocusIn = () => { isActive = true }
    const onFocusOut = (ev: FocusEvent) => { try { if (!container.contains((ev.relatedTarget as any) || null)) isActive = false } catch { isActive = false } }
    container.addEventListener('pointerenter', onEnter)
    container.addEventListener('pointerleave', onLeave)
    container.addEventListener('focusin', onFocusIn)
    container.addEventListener('focusout', onFocusOut)

    // Ctrl/Cmd+Z / Redo 단축키는 히스토리 제거로 비활성화되었습니다.

    // 선택 하이라이트 적용/해제 (DOM outline로 표시)
    function applySelectionOutline() {
        const nodes: any[] = editor.getNodes() as any
        for (const n of nodes) {
            const view: any = (area as any).nodeViews.get((n as any).id)
            const el: HTMLElement | null = view && (view.element || view.el || view.root || null)
            if (!el) continue
            if (selectedNodeIds.has((n as any).id)) {
                el.style.outline = '2px solid rgba(34,211,238,0.9)' // cyan-400
                ;(el.style as any).outlineOffset = '0px'
            } else {
                el.style.outline = ''
                ;(el.style as any).outlineOffset = ''
            }
        }
    }

    // 마퀴 사각형 엘리먼트
    const marquee = document.createElement('div')
    marquee.style.position = 'absolute'
    marquee.style.pointerEvents = 'none'
    marquee.style.zIndex = '40'
    marquee.style.display = 'none'
    marquee.style.border = '1px dashed #22d3ee' // cyan-400
    marquee.style.background = 'rgba(34,211,238,0.18)'
    marquee.style.borderRadius = '2px'
    container.appendChild(marquee)

    let isMarquee = false
    let startX = 0, startY = 0

    function updateMarqueeRect(x1: number, y1: number, x2: number, y2: number) {
        const left = Math.min(x1, x2)
        const top = Math.min(y1, y2)
        const width = Math.abs(x2 - x1)
        const height = Math.abs(y2 - y1)
        marquee.style.left = left + 'px'
        marquee.style.top = top + 'px'
        marquee.style.width = width + 'px'
        marquee.style.height = height + 'px'
    }

    // (helper 제거) rectContainsPoint: 현재 사용처 없음

    // 마퀴 선택 시작: Shift + 좌클릭 드래그 (Pointer 이벤트로 캔버스 팬 완전 차단)
    const onPointerDownCapture = (e: PointerEvent) => {
        if (e.button !== 0) return

        // 1) Shift 드래그: 마퀴 선택
        if (e.shiftKey) {
            // 캔버스 팬/줌 및 하위 핸들러 차단
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation()

            isMarquee = true
            const rect = container.getBoundingClientRect()
            startX = e.clientX - rect.left
            startY = e.clientY - rect.top
            marquee.style.display = 'block'
            updateMarqueeRect(startX, startY, startX, startY)
            // 시작 시 기존 선택 초기화
            selectedNodeIds.clear()
            applySelectionOutline()

            const onMove = (ev: PointerEvent) => {
                if (!isMarquee) return
                ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation()
                const r = container.getBoundingClientRect()
                const x = ev.clientX - r.left
                const y = ev.clientY - r.top
                updateMarqueeRect(startX, startY, x, y)

                // 현재 사각형 내의 노드 중심점을 기준으로 선택
                const selLeft = Math.min(startX, x) + r.left
                const selTop = Math.min(startY, y) + r.top
                const selRight = Math.max(startX, x) + r.left
                const selBottom = Math.max(startY, y) + r.top
                selectedNodeIds.clear()
                for (const n of (editor.getNodes() as any[])) {
                    const view: any = (area as any).nodeViews.get((n as any).id)
                    const el: any = view && (view.element || view.el || view.root || null)
                    if (!el || !el.getBoundingClientRect) continue
                    const br: DOMRect = el.getBoundingClientRect()
                    const cx = (br.left + br.right) / 2
                    const cy = (br.top + br.bottom) / 2
                    if (cx >= selLeft && cx <= selRight && cy >= selTop && cy <= selBottom) {
                        selectedNodeIds.add((n as any).id)
                    }
                }
                applySelectionOutline()
            }
            const onUp = (ev: PointerEvent) => {
                if (!isMarquee) return
                ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation()
                isMarquee = false
                marquee.style.display = 'none'
                marquee.style.width = '0px'
                marquee.style.height = '0px'
                window.removeEventListener('pointermove', onMove, true)
                window.removeEventListener('pointerup', onUp, true)
            }
            window.addEventListener('pointermove', onMove, true)
            window.addEventListener('pointerup', onUp, true)
            return
        }

        // 2) 선택된 노드 그룹 드래그
        const node = findNodeAt(e.clientX, e.clientY)
        const canGroupDrag = node && selectedNodeIds.has((node as any).id) && selectedNodeIds.size > 0
        if (canGroupDrag) {
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation()

            const startClient = { x: e.clientX, y: e.clientY }
            const initialPos = new Map<string, { x: number; y: number }>()
            const ids = Array.from(selectedNodeIds)
            for (const id of ids) {
                const view: any = (area as any).nodeViews.get(id)
                const pos = (view && view.position) ? view.position : { x: 0, y: 0 }
                initialPos.set(id, { x: pos.x, y: pos.y })
            }

            const onMove = (ev: PointerEvent) => {
                ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation()
                const k = (area && area.area && area.area.transform && area.area.transform.k) ? area.area.transform.k : 1
                const dx = (ev.clientX - startClient.x) / k
                const dy = (ev.clientY - startClient.y) / k
                for (const id of ids) {
                    const view: any = (area as any).nodeViews.get(id)
                    const init = initialPos.get(id)
                    if (!view || !init) continue
                    const nx = init.x + dx
                    const ny = init.y + dy
                    try { view.translate(nx, ny) } catch { /* noop */ }
                }
            }
            const onUp = (ev: PointerEvent) => {
                ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation()
                window.removeEventListener('pointermove', onMove, true)
                window.removeEventListener('pointerup', onUp, true)
                // 이동 완료
            }
            window.addEventListener('pointermove', onMove, true)
            window.addEventListener('pointerup', onUp, true)
            return
        }
        // 그 외 기본 동작(단일 노드 드래그/캔버스 동작)은 통과
    }
    container.addEventListener('pointerdown', onPointerDownCapture, { capture: true })
    // 마퀴 중일 때 캔버스에 전달되는 포인터 이동도 차단
    const onContainerPointerMove = (e: PointerEvent) => {
        if (!isMarquee) return
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
    }
    container.addEventListener('pointermove', onContainerPointerMove, { capture: true })

    // 컨텍스트 메뉴 확장: 선택 존재 시 복사, 빈 공간에서 붙여넣기
    const copyBtn = document.createElement('button')
    copyBtn.textContent = '복사'
    copyBtn.style.display = 'block'
    copyBtn.style.width = 'auto'
    copyBtn.style.padding = '6px 10px'
    copyBtn.style.margin = '2px 4px'
    copyBtn.style.textAlign = 'center'
    copyBtn.style.color = '#182031ff'
    copyBtn.style.background = '#ffffff'
    copyBtn.style.borderRadius = '8px'
    ;(copyBtn.style as any).border = 'none'
    copyBtn.style.cursor = 'pointer'

    const pasteBtn = document.createElement('button')
    pasteBtn.textContent = '붙여넣기'
    pasteBtn.style.display = 'block'
    pasteBtn.style.width = 'auto'
    pasteBtn.style.padding = '6px 10px'
    pasteBtn.style.margin = '2px 4px'
    pasteBtn.style.textAlign = 'center'
    pasteBtn.style.color = '#182031ff'
    pasteBtn.style.background = '#ffffff'
    pasteBtn.style.borderRadius = '8px'
    ;(pasteBtn.style as any).border = 'none'
    pasteBtn.style.cursor = 'pointer'

    const cutBtn = document.createElement('button')
    cutBtn.textContent = '잘라내기'
    cutBtn.style.display = 'block'
    cutBtn.style.width = 'auto'
    cutBtn.style.padding = '6px 10px'
    cutBtn.style.margin = '2px 4px'
    cutBtn.style.textAlign = 'center'
    cutBtn.style.color = '#182031ff'
    cutBtn.style.background = '#efd4adff'
    cutBtn.style.borderRadius = '8px'
    ;(cutBtn.style as any).border = 'none'
    cutBtn.style.cursor = 'pointer'

    // 기존 메뉴에 동적으로 버튼 구성
    function rebuildMenuButtons({ allowDelete, allowCopy, allowPaste, allowCut }: { allowDelete: boolean; allowCopy: boolean; allowPaste: boolean; allowCut: boolean }) {
        // 초기화
        while (menu.firstChild) menu.removeChild(menu.firstChild)
        if (allowDelete) menu.appendChild(delBtn)
        if (allowCopy) menu.appendChild(copyBtn)
        if (allowCut) menu.appendChild(cutBtn)
        if (allowPaste) menu.appendChild(pasteBtn)
    }

    // 복사 동작: 선택된 노드와 그 사이의 연결만 직렬화하여 내부 클립보드에 저장
    async function handleCopy() {
        if (!selectedNodeIds.size) return
        const full = exportGraph(editor, area)
        const idSet = new Set(Array.from(selectedNodeIds))
        const nodes = (full.nodes || []).filter(n => idSet.has(n.id))
        const connections = (full.connections || []).filter(c => idSet.has(c.source) && idSet.has(c.target))
        // 로컬 클립보드에 저장 (에디터 인스턴스 한정)
        clipboard = { nodes, connections, viewport: undefined }
        closeMenu()
    }

    // 붙여넣기: 빈 공간을 기준으로 상대 위치를 유지하여 노드 생성 후 연결 복원
    async function handlePaste(clientX: number, clientY: number) {
        if (!clipboard || !clipboard.nodes?.length) return
        const world = clientToWorld(area, container, clientX, clientY)
        const minX = Math.min(...clipboard.nodes.map((n: any) => n.position?.x ?? 0))
        const minY = Math.min(...clipboard.nodes.map((n: any) => n.position?.y ?? 0))
        const map = new Map<string, TradeNode>()
        // 1) 노드 생성
        for (const n of clipboard.nodes) {
            try {
                const kind = n.kind || labelToKind(n.label) || 'const'
                const node = createNodeByKind(kind as NodeKind)
                // 컨트롤 값 복원
                if (n.controls) {
                    for (const key of Object.keys(n.controls)) {
                        const ctrl = (node.controls as any)[key]
                        const val = (n.controls as any)[key]
                        if (ctrl && typeof ctrl.setValue === 'function') ctrl.setValue(val)
                        else if (ctrl && 'value' in ctrl) ctrl.value = val
                    }
                }
                await editor.addNode(node)
                map.set(n.id, node)
                const targetX = world.x + ((n.position?.x ?? 0) - minX)
                const targetY = world.y + ((n.position?.y ?? 0) - minY)
                await (area as any).nodeViews.get((node as any).id)?.translate(targetX, targetY)
            } catch { /* noop */ }
        }
        // 2) 연결 생성
        for (const c of (clipboard.connections || [])) {
            const source = map.get(c.source)
            const target = map.get(c.target)
            if (source && target) {
                try {
                    await editor.addConnection(new ClassicPreset.Connection(source, c.sourceOutput, target, c.targetInput))
                } catch { /* noop */ }
            }
        }
        closeMenu()
        // 붙여넣기 후 선택 초기화
        selectedNodeIds.clear()
        applySelectionOutline()
    // 붙여넣기 완료
    }

    copyBtn.addEventListener('click', () => { handleCopy() })
    pasteBtn.addEventListener('click', () => {
        const pos = lastContextPosClient
        if (pos) handlePaste(pos.x, pos.y)
    })

    // 잘라내기: 선택된 노드를 복사한 뒤 제거
    cutBtn.addEventListener('click', async () => {
        if (selectedNodeIds.size === 0) { closeMenu(); return }
        // 1) 복사
        await handleCopy()
        // 2) 삭제 (선택된 전체)
        const targetIds: string[] = Array.from(selectedNodeIds)
        for (const id of targetIds) {
            try {
                const cons = editor
                    .getConnections()
                    .filter((c: any) => c.source === id || c.target === id)
                for (const c of cons) {
                    try { await (editor as any).removeConnection(c.id) } catch { /* noop */ }
                }
                await (editor as any).removeNode(id)
            } catch { /* noop */ }
        }
        selectedNodeIds.clear()
        applySelectionOutline()
    // 잘라내기 완료
        closeMenu()
    })

    // 컨텍스트 메뉴 동작 수정: 선택/클립보드 상태에 따라 버튼 구성
    container.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        lastContextPosClient = { x: e.clientX, y: e.clientY }
        const node = findNodeAt(e.clientX, e.clientY)
        const hasSelection = selectedNodeIds.size > 0
    const hasClipboard = !!(clipboard && clipboard.nodes && clipboard.nodes.length)
        if (node) {
            // 노드 위: 삭제 + (선택 존재 시) 복사/잘라내기
            rebuildMenuButtons({ allowDelete: true, allowCopy: hasSelection, allowPaste: false, allowCut: hasSelection })
            openMenu(e.clientX, e.clientY, node)
        } else {
            // 빈 공간: 선택이 있다면 복사/잘라내기, 클립보드가 있으면 붙여넣기
            if (hasSelection || hasClipboard) {
                rebuildMenuButtons({ allowDelete: false, allowCopy: hasSelection, allowPaste: hasClipboard, allowCut: hasSelection })
                openMenu(e.clientX, e.clientY, null as any)
            } else {
                closeMenu()
            }
        }
    })

    // 키보드 복사/붙여넣기/잘라내기 지원 (인스턴스 로컬 클립보드 기반)
    const onKeyCopyPaste = (e: KeyboardEvent) => {
        if (!isActive) return
        const ae = document.activeElement as HTMLElement | null
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || (ae as any).isContentEditable)) return
        const key = String(e.key || '').toLowerCase()
        const ctrl = e.ctrlKey || e.metaKey
        if (!ctrl) return
        if (key === 'c') {
            if (selectedNodeIds.size) {
                e.preventDefault(); e.stopPropagation(); void handleCopy()
            }
        } else if (key === 'x') {
            if (selectedNodeIds.size) {
                e.preventDefault(); e.stopPropagation()
                // copy then delete selection
                void (async () => {
                    await handleCopy()
                    const ids = Array.from(selectedNodeIds)
                    for (const id of ids) {
                        try {
                            const cons = editor
                                .getConnections()
                                .filter((c: any) => c.source === id || c.target === id)
                            for (const c of cons) {
                                try { await (editor as any).removeConnection(c.id) } catch { /* noop */ }
                            }
                            await (editor as any).removeNode(id)
                        } catch { /* noop */ }
                    }
                    selectedNodeIds.clear(); applySelectionOutline()
                })()
            }
        } else if (key === 'v') {
            const hasClipboard = !!(clipboard && clipboard.nodes && clipboard.nodes.length)
            if (hasClipboard) {
                e.preventDefault(); e.stopPropagation()
                const rect = container.getBoundingClientRect()
                const cx = rect.left + rect.width / 2
                const cy = rect.top + rect.height / 2
                const pos = lastContextPosClient || { x: cx, y: cy }
                void handlePaste(pos.x, pos.y)
            }
        }
    }
    window.addEventListener('keydown', onKeyCopyPaste, true)

    return {
        editor,
        area,
        destroy: () => {
            // cleanup
            container.removeEventListener('pointerdown', onPointerDownCapture, { capture: true } as any)
            container.removeEventListener('pointermove', onContainerPointerMove, { capture: true } as any)
            container.removeEventListener('pointerenter', onEnter)
            container.removeEventListener('pointerleave', onLeave)
            container.removeEventListener('focusin', onFocusIn)
            container.removeEventListener('focusout', onFocusOut)
            closeMenu()
            menu.remove()
            marquee.remove()
                ; (area as any).destroy()
            // 히스토리 단축키 리스너 제거 불필요(등록 안 함)
            window.removeEventListener('keydown', onKeyCopyPaste, true)
        }
    }
}

// -------------------- 노드 생성 유틸리티 --------------------
// kind 식별자를 실제 노드 인스턴스로 생성
export function createNodeByKind(kind: NodeKind): TradeNode {
    switch (kind) {
        // ML Pipeline Nodes
        case 'dataLoader':
            return new DataLoaderNode()
        case 'dataSplit':
            return new DataSplitNode()
        case 'scaler':
            return new ScalerNode()
        case 'featureSelection':
            return new FeatureSelectionNode()
        case 'classifier':
            return new ClassifierNode()
        case 'regressor':
            return new RegressorNode()
        case 'neuralNet':
            return new NeuralNetNode()
        case 'evaluate':
            return new EvaluateNode()
        case 'predict':
            return new PredictNode()
        case 'hyperparamTune':
            return new HyperparamTuneNode()
        default:
            throw new Error('Unknown node kind: ' + (kind as string))
    }
}

// 화면 좌표(client) → 에디터 공간(world) 좌표 변환 (줌/팬 반영)
export function clientToWorld(
    area: any,
    container: HTMLElement,
    clientX: number,
    clientY: number,
    evt?: MouseEvent
): { x: number; y: number } {
    // Prefer pointer computed by area when event is available (accounts for zoom/pan handlers)
    if (evt && area && area.area && typeof area.area.setPointerFrom === 'function') {
        try {
            area.area.setPointerFrom(evt)
            const wx = area.area.pointer.x
            const wy = area.area.pointer.y
            return { x: wx, y: wy }
        } catch { /* fallback below */ }
    }
    const rect = container.getBoundingClientRect()
    const sx = clientX - rect.left
    const sy = clientY - rect.top
    const { k, x, y } = area.area.transform
    return { x: (sx - x) / k, y: (sy - y) / k }
}

// 라벨 문자열을 kind 로 역매핑 (과거 데이터 호환)
const labelToKind = (label: string): NodeKind | undefined => {
    switch (label) {
        // ML Pipeline Nodes
        case '데이터 로더':
        case 'DataLoader':
            return 'dataLoader'
        case '데이터 분할':
        case 'DataSplit':
            return 'dataSplit'
        case '정규화':
        case 'Scaler':
            return 'scaler'
        case '피처 선택':
        case 'FeatureSelection':
            return 'featureSelection'
        case '분류기':
        case 'Classifier':
            return 'classifier'
        case '회귀':
        case 'Regressor':
            return 'regressor'
        case '신경망':
        case 'NeuralNet':
            return 'neuralNet'
        case '평가':
        case 'Evaluate':
            return 'evaluate'
        case '예측':
        case 'Predict':
            return 'predict'
        case '하이퍼파라미터 튜닝':
        case 'HyperparamTune':
            return 'hyperparamTune'
        default:
            return undefined
    }
}

// -------------------- 그래프 내보내기, JSON 직렬화 (Export) --------------------
export function exportGraph(editor: any, area: any): SerializedGraph {
    const nodes = editor.getNodes().map((node: TradeNode) => {
        const view = (area as any).nodeViews.get((node as any).id)
        const position = view && view.position ? view.position : { x: 0, y: 0 }
        const controls: Record<string, any> = {}
        if (node.controls) {
            for (const key of Object.keys(node.controls)) {
                const ctrl = (node.controls as any)[key]
                if (ctrl && Object.prototype.hasOwnProperty.call(ctrl, 'value')) {
                    controls[key] = ctrl.value
                }
            }
        }
        return {
            id: (node as any).id,
            label: node.label,
            kind: (node as TradeNode).kind || labelToKind(node.label),
            position,
            controls
        }
    })

    const connections = editor.getConnections().map((c: any) => ({
        id: c.id,
        source: c.source,
        target: c.target,
        sourceOutput: c.sourceOutput,
        targetInput: c.targetInput
    }))

    let viewport: SerializedGraph['viewport']
    try {
        if (area && area.area && area.area.transform) {
            const { k, x, y } = area.area.transform
            viewport = { k, x, y }
        }
    } catch { /* noop */ }

    return { nodes, connections, viewport }
}

// -------------------- 그래프 불러오기 (Import) --------------------
export async function importGraph(editor: any, area: any, graph: SerializedGraph | undefined | null): Promise<void> {
    if (!graph) return
    await editor.clear()

    const idMap = new Map<string, TradeNode>()

    // 1. 노드 생성 및 값 복원
    for (const n of graph.nodes || []) {
        const kind = n.kind || labelToKind(n.label)
        if (!kind) {
            console.warn('[importGraph] Unknown node kind, skipping:', n)
            continue
        }
        
        let node: TradeNode
        try {
            node = createNodeByKind(kind as NodeKind)
        } catch (err) {
            console.warn('[importGraph] Failed to create node:', n, err)
            continue
        }

        if (n.controls) {
            for (const key of Object.keys(n.controls)) {
                const ctrl = (node.controls as any)[key]
                const val = (n.controls as any)[key]
                if (ctrl && typeof ctrl.setValue === 'function') ctrl.setValue(val)
                else if (ctrl && 'value' in ctrl) ctrl.value = val
            }
        }

        await editor.addNode(node)
        idMap.set(n.id, node)

        const pos = n.position || { x: 0, y: 0 }
        await (area as any).nodeViews.get((node as any).id)?.translate(pos.x, pos.y)
    }

    // 2. 연결 생성
    for (const con of graph.connections || []) {
        const source = idMap.get(con.source)
        const target = idMap.get(con.target)

        if (source && target) {
            await editor.addConnection(new ClassicPreset.Connection(source, con.sourceOutput, target, con.targetInput))
        }
    }

    // 3. 뷰포트(줌/팬) 복원
    if (graph.viewport && area && area.area && typeof area.area.translate === 'function') {
        try {
            const { k, x, y } = graph.viewport
            if (typeof k === 'number') area.area.transform.k = k
            if (typeof x === 'number') area.area.transform.x = x
            if (typeof y === 'number') area.area.transform.y = y
            if (typeof area.area.update === 'function') area.area.update()
        } catch { /* noop */ }
    }

    if (typeof (editor as any).reteUiEnhance === 'function') {
        requestAnimationFrame(() => {
            try {
                ; (editor as any).reteUiEnhance()
            } catch { /* noop */ }
        })
    }
}

// -------------------- 개별 노드 제거 (Delete) --------------------
export async function removeNodeWithConnections(editor: any, nodeId: string): Promise<void> {
    const cons = editor.getConnections().filter((c: any) => c.source === nodeId || c.target === nodeId)
    for (const c of cons) {
        try {
            await (editor as any).removeConnection(c.id)
        } catch { /* noop */ }
    }
    try {
        await (editor as any).removeNode(nodeId)
    } catch { /* noop */ }
}

