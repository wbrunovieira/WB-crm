"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useState, useRef } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Connection, type Edge, type Node,
  Handle, Position, NodeProps, EdgeProps, getBezierPath, BaseEdge, EdgeLabelRenderer,
  Panel,
} from "@xyflow/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Play, Square, MessageSquare, Clock, GitBranch,
  Tag, Zap, ZapOff, Save, ArrowLeft, X, Trash2, Type,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type NodeType = "START" | "SEND_MESSAGE" | "TYPING" | "WAIT_RESPONSE" | "CONDITION" | "TAG_LEAD" | "END";
type ConditionType = "contains" | "exact" | "regex" | "number_range" | "default";

interface NodeData {
  nodeType: NodeType;
  config: Record<string, unknown>;
  label?: string;
  [key: string]: unknown;
}

interface EdgeData {
  conditionType?: string;
  conditionValue?: string;
  label?: string;
  [key: string]: unknown;
}

interface BotFlowData {
  id: string;
  name: string;
  description?: string;
  instanceName: string;
  isActive: boolean;
  triggerType: string;
  triggerValue?: string;
  nodes: { id: string; nodeType: NodeType; posX: number; posY: number; config: Record<string, unknown> }[];
  edges: { id: string; sourceNodeId: string; targetNodeId: string; conditionType?: string; conditionValue?: string; label?: string }[];
}

// ── Node color map ────────────────────────────────────────────────────────────

const NODE_COLORS: Record<NodeType, string> = {
  START:         "border-green-500 bg-green-950/60",
  SEND_MESSAGE:  "border-blue-500 bg-blue-950/60",
  TYPING:        "border-teal-500 bg-teal-950/60",
  WAIT_RESPONSE: "border-yellow-500 bg-yellow-950/60",
  CONDITION:     "border-orange-500 bg-orange-950/60",
  TAG_LEAD:      "border-purple-500 bg-purple-950/60",
  END:           "border-red-500 bg-red-950/60",
};

const NODE_ICONS: Record<NodeType, React.ReactNode> = {
  START:         <Play size={14} />,
  SEND_MESSAGE:  <MessageSquare size={14} />,
  TYPING:        <Type size={14} />,
  WAIT_RESPONSE: <Clock size={14} />,
  CONDITION:     <GitBranch size={14} />,
  TAG_LEAD:      <Tag size={14} />,
  END:           <Square size={14} />,
};

const NODE_LABELS: Record<NodeType, string> = {
  START:         "Início",
  SEND_MESSAGE:  "Enviar Mensagem",
  TYPING:        "Digitando...",
  WAIT_RESPONSE: "Aguardar Resposta",
  CONDITION:     "Condição",
  TAG_LEAD:      "Marcar Lead",
  END:           "Fim",
};

// ── Custom Node component ─────────────────────────────────────────────────────

function FlowNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  const nt = d.nodeType;
  const colorClass = NODE_COLORS[nt] ?? "border-gray-500 bg-gray-900/60";
  const hasInput  = nt !== "START";
  const hasOutput = nt !== "END";

  const summary = (() => {
    const cfg = d.config;
    if (nt === "SEND_MESSAGE") return cfg.text as string ?? cfg.mediaUrl as string ?? "...";
    if (nt === "TYPING")       return `${cfg.seconds ?? 2}s`;
    if (nt === "WAIT_RESPONSE") return `timeout: ${cfg.timeoutMinutes ?? 30}min`;
    if (nt === "CONDITION")    return "Avaliar condições";
    if (nt === "TAG_LEAD")     return cfg.labelName as string ?? "...";
    return "";
  })();

  return (
    <div className={`rounded-xl border-2 ${colorClass} ${selected ? "ring-2 ring-white/40" : ""} min-w-[170px] max-w-[220px] shadow-lg`}>
      {hasInput && <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-300 !border-gray-600" />}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 text-white text-xs font-semibold">
          <span className="opacity-70">{NODE_ICONS[nt]}</span>
          {NODE_LABELS[nt]}
        </div>
        {summary && (
          <p className="text-gray-300 text-xs mt-1 line-clamp-2 opacity-80">{summary}</p>
        )}
      </div>
      {hasOutput && <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-purple-400 !border-purple-700" />}
    </div>
  );
}

// ── Custom Edge with label ────────────────────────────────────────────────────

function LabeledEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, style }: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const label = (data as EdgeData | undefined)?.label;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: "all" }}
            className="absolute bg-gray-800 border border-gray-600 text-gray-300 text-[10px] px-2 py-0.5 rounded-full nodrag nopan">
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { flowNode: FlowNode };
const edgeTypes = { labeled: LabeledEdge };

// ── Config panel ──────────────────────────────────────────────────────────────

function ConfigPanel({
  node, edges, onUpdate, onDelete, onUpdateEdge, onDeleteEdge, allNodes,
}: {
  node: Node<NodeData>;
  edges: Edge[];
  onUpdate: (id: string, data: Partial<NodeData>) => void;
  onDelete: (id: string) => void;
  onUpdateEdge: (id: string, data: Partial<Record<string, unknown>>) => void;
  onDeleteEdge: (id: string) => void;
  allNodes: Node<NodeData>[];
}) {
  const d = node.data;
  const nt = d.nodeType;
  const outEdges = edges.filter((e) => e.source === node.id);

  const CONDITION_LABELS: Record<ConditionType, string> = {
    contains: "Contém", exact: "Igual", regex: "Regex",
    number_range: "Número entre (ex: 1-5)", default: "Padrão (fallback)",
  };

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-700 h-full overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          {NODE_ICONS[nt]} {NODE_LABELS[nt]}
        </div>
        <button onClick={() => onDelete(node.id)} className="text-gray-500 hover:text-red-400 transition-colors">
          <Trash2 size={15} />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">

        {/* SEND_MESSAGE */}
        {nt === "SEND_MESSAGE" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
              <select value={(d.config.type as string) ?? "text"}
                onChange={(e) => onUpdate(node.id, { config: { ...d.config, type: e.target.value } })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500">
                <option value="text">Texto</option>
                <option value="media">Mídia (imagem/vídeo)</option>
                <option value="audio">Áudio</option>
              </select>
            </div>
            {(!d.config.type || d.config.type === "text") && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Mensagem</label>
                <p className="text-xs text-gray-500 mb-1">Vars: <code className="text-purple-300">{"{{nome}}"}</code> <code className="text-purple-300">{"{{phone}}"}</code></p>
                <textarea value={(d.config.text as string) ?? ""} rows={4}
                  onChange={(e) => onUpdate(node.id, { config: { ...d.config, text: e.target.value } })}
                  placeholder="Olá {{nome}}! Como posso ajudar?"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm resize-none focus:outline-none focus:border-purple-500" />
              </div>
            )}
            {(d.config.type === "media" || d.config.type === "audio") && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400 block">URL do arquivo</label>
                <input value={(d.config.mediaUrl as string) ?? ""}
                  onChange={(e) => onUpdate(node.id, { config: { ...d.config, mediaUrl: e.target.value } })}
                  placeholder="https://..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                {d.config.type === "media" && (
                  <>
                    <input value={(d.config.caption as string) ?? ""}
                      onChange={(e) => onUpdate(node.id, { config: { ...d.config, caption: e.target.value } })}
                      placeholder="Legenda (opcional)"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                    <select value={(d.config.mediaType as string) ?? "image"}
                      onChange={(e) => onUpdate(node.id, { config: { ...d.config, mediaType: e.target.value } })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500">
                      <option value="image">Imagem</option>
                      <option value="video">Vídeo</option>
                      <option value="document">Documento</option>
                    </select>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* TYPING */}
        {nt === "TYPING" && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Segundos digitando</label>
            <input type="number" min={1} max={30} value={(d.config.seconds as number) ?? 2}
              onChange={(e) => onUpdate(node.id, { config: { ...d.config, seconds: parseInt(e.target.value) || 2 } })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500" />
          </div>
        )}

        {/* WAIT_RESPONSE */}
        {nt === "WAIT_RESPONSE" && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Timeout (minutos)</label>
            <input type="number" min={1} value={(d.config.timeoutMinutes as number) ?? 30}
              onChange={(e) => onUpdate(node.id, { config: { ...d.config, timeoutMinutes: parseInt(e.target.value) || 30 } })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500" />
            <p className="text-xs text-gray-500 mt-1">Após o timeout a sessão expira.</p>
          </div>
        )}

        {/* TAG_LEAD */}
        {nt === "TAG_LEAD" && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nome do label</label>
            <input value={(d.config.labelName as string) ?? ""}
              onChange={(e) => onUpdate(node.id, { config: { ...d.config, labelName: e.target.value } })}
              placeholder="Ex: interessado, qualificado"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500" />
          </div>
        )}

        {/* Edges / connections */}
        {nt !== "END" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400 font-medium">Saídas (conexões)</label>
            </div>
            {outEdges.length === 0 && (
              <p className="text-xs text-gray-600">Arraste a saída (ponto roxo) para conectar a outro nó.</p>
            )}
            <div className="space-y-2">
              {outEdges.map((edge) => {
                const targetNode = allNodes.find((n) => n.id === edge.target);
                const targetLabel = targetNode ? NODE_LABELS[(targetNode.data as NodeData).nodeType] : edge.target;
                const condType = (edge.data?.conditionType as ConditionType) ?? "default";
                const condVal = (edge.data?.conditionValue as string) ?? "";
                const edgeLabel = (edge.data?.label as string) ?? "";

                return (
                  <div key={edge.id} className="bg-gray-800 border border-gray-700 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300 truncate">→ {targetLabel}</span>
                      <button onClick={() => onDeleteEdge(edge.id)} className="text-gray-600 hover:text-red-400">
                        <X size={12} />
                      </button>
                    </div>
                    <select value={condType}
                      onChange={(e) => onUpdateEdge(edge.id, { conditionType: e.target.value, conditionValue: condVal, label: edgeLabel })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none">
                      {(Object.entries(CONDITION_LABELS) as [ConditionType, string][]).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    {condType !== "default" && (
                      <input value={condVal}
                        onChange={(e) => onUpdateEdge(edge.id, { conditionType: condType, conditionValue: e.target.value, label: e.target.value || edgeLabel })}
                        placeholder={condType === "number_range" ? "1-5" : condType === "regex" ? "^sim$" : "valor..."}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none" />
                    )}
                    <input value={edgeLabel}
                      onChange={(e) => onUpdateEdge(edge.id, { conditionType: condType, conditionValue: condVal, label: e.target.value })}
                      placeholder="Rótulo da seta (opcional)"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Node palette ──────────────────────────────────────────────────────────────

function NodePalette({ onAdd }: { onAdd: (type: NodeType) => void }) {
  const types: NodeType[] = ["SEND_MESSAGE", "TYPING", "WAIT_RESPONSE", "CONDITION", "TAG_LEAD", "END"];
  return (
    <div className="flex flex-col gap-1 bg-gray-900/95 border border-gray-700 rounded-xl p-2 shadow-lg">
      <p className="text-xs text-gray-500 px-2 pb-1 font-medium">Adicionar nó</p>
      {types.map((t) => (
        <button key={t} onClick={() => onAdd(t)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors hover:opacity-90 ${NODE_COLORS[t]} text-white border`}>
          {NODE_ICONS[t]} {NODE_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

// ── Main Editor ───────────────────────────────────────────────────────────────

export function BotFlowEditor({ flow: initial }: { flow: BotFlowData }) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [flow, setFlow] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const nodeIdCounter = useRef(100);

  // Convert backend format to React Flow format
  const toRFNodes = (f: BotFlowData): Node<NodeData>[] =>
    f.nodes.map((n) => ({
      id: n.id,
      type: "flowNode",
      position: { x: n.posX, y: n.posY },
      data: { nodeType: n.nodeType, config: n.config },
    }));

  const toRFEdges = (f: BotFlowData): Edge[] =>
    f.edges.map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: "labeled",
      animated: true,
      style: { stroke: "#7c3aed", strokeWidth: 2 },
      data: { conditionType: e.conditionType, conditionValue: e.conditionValue, label: e.label },
    }));

  const [nodes, setNodes, onNodesChange] = useNodesState(toRFNodes(initial));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toRFEdges(initial));

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({
      ...params,
      id: `e-${Date.now()}`,
      type: "labeled",
      animated: true,
      style: { stroke: "#7c3aed", strokeWidth: 2 },
      data: { conditionType: "default", conditionValue: "", label: "" },
    }, eds));
  }, [setEdges]);

  const addNode = (type: NodeType) => {
    const id = `node-${++nodeIdCounter.current}`;
    const defaultConfig: Record<NodeType, Record<string, unknown>> = {
      START:         {},
      SEND_MESSAGE:  { type: "text", text: "" },
      TYPING:        { seconds: 2 },
      WAIT_RESPONSE: { timeoutMinutes: 30 },
      CONDITION:     {},
      TAG_LEAD:      { labelName: "" },
      END:           {},
    };
    setNodes((nds) => [...nds, {
      id,
      type: "flowNode",
      position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { nodeType: type, config: defaultConfig[type] },
    }]);
    setSelectedNodeId(id);
  };

  const updateNodeData = (id: string, data: Partial<NodeData>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
  };

  const deleteNode = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  };

  const updateEdgeData = (id: string, data: Partial<Record<string, unknown>>) => {
    setEdges((eds) => eds.map((e) => e.id === id ? { ...e, data: { ...e.data, ...data } } : e));
  };

  const deleteEdge = (id: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        nodes: nodes.map((n) => ({
          id: n.id,
          nodeType: (n.data as NodeData).nodeType,
          posX: n.position.x,
          posY: n.position.y,
          config: (n.data as NodeData).config,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          sourceNodeId: e.source,
          targetNodeId: e.target,
          conditionType: (e.data as EdgeData | undefined)?.conditionType || undefined,
          conditionValue: (e.data as EdgeData | undefined)?.conditionValue || undefined,
          label: (e.data as EdgeData | undefined)?.label || undefined,
        })),
        name: flow.name,
        description: flow.description,
        triggerType: flow.triggerType,
        triggerValue: flow.triggerValue,
      };
      await apiFetch(`/bot-flows/${flow.id}/flow`, token, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success("Flow salvo!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    try {
      const res = await apiFetch<{ isActive: boolean }>(`/bot-flows/${flow.id}/toggle`, token, { method: "POST" });
      setFlow((p) => ({ ...p, isActive: res.isActive }));
      toast.success(res.isActive ? "Flow ativado!" : "Flow desativado");
    } catch { toast.error("Erro ao alterar status"); }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) as Node<NodeData> | undefined;

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-700 shrink-0">
        <button onClick={() => router.push("/bot-flows")} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <input value={flow.name}
            onChange={(e) => setFlow((p) => ({ ...p, name: e.target.value }))}
            className="bg-transparent text-white font-semibold text-sm focus:outline-none w-full" />
          <p className="text-xs text-gray-500 mt-0.5">
            {flow.instanceName} ·{" "}
            {flow.triggerType === "KEYWORD" ? `Keyword: "${flow.triggerValue}"` : "Qualquer mensagem"}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${flow.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
          {flow.isActive ? "Ativo" : "Inativo"}
        </span>
        <button onClick={handleToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            flow.isActive ? "border-yellow-700/50 text-yellow-400 hover:bg-yellow-900/20" : "border-green-700/50 text-green-400 hover:bg-green-900/20"
          }`}>
          {flow.isActive ? <><ZapOff size={13} /> Desativar</> : <><Zap size={13} /> Ativar</>}
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
          <Save size={14} /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      {/* Canvas + side panel */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            colorMode="dark"
            className="bg-gray-950"
          >
            <Background color="#374151" gap={20} size={1} />
            <Controls className="[&>button]:bg-gray-800 [&>button]:border-gray-700 [&>button]:text-white" />
            <MiniMap nodeColor={(n) => {
              const nt = (n.data as NodeData)?.nodeType;
              const colorMap: Record<NodeType, string> = { START: "#22c55e", SEND_MESSAGE: "#3b82f6", TYPING: "#14b8a6", WAIT_RESPONSE: "#eab308", CONDITION: "#f97316", TAG_LEAD: "#a855f7", END: "#ef4444" };
              return colorMap[nt] ?? "#6b7280";
            }} className="!bg-gray-900 !border-gray-700" />
            <Panel position="top-left">
              <NodePalette onAdd={addNode} />
            </Panel>
            <Panel position="top-right" className="text-xs text-gray-500">
              <p>Arraste nós • Conecte pelas setas roxas</p>
            </Panel>
          </ReactFlow>
        </div>

        {/* Config panel */}
        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            edges={edges}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
            onUpdateEdge={updateEdgeData}
            onDeleteEdge={deleteEdge}
            allNodes={nodes as Node<NodeData>[]}
          />
        )}
      </div>
    </div>
  );
}
