import { DiscoverFactoryNode } from "@/components/xyflow/canvas/discover-factory-node"
import { PreviewNode } from "@/components/xyflow/canvas/preview-node"
import { SpiderNode } from "@/components/xyflow/canvas/spider-node"
import { UrlNode } from "@/components/xyflow/canvas/url-node"
import { LlmNode } from "@/components/xyflow/canvas/llm-node"

export const canvasNodeTypes = {
  url: UrlNode,
  "discover-factory": DiscoverFactoryNode,
  spider: SpiderNode,
  preview: PreviewNode,
  llm: LlmNode,
}
