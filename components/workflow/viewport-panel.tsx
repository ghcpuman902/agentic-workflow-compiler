"use client"

import { Bot, Cpu, FlaskConical, Globe, Zap } from "lucide-react"

const pipelineSteps = [
  {
    icon: Globe,
    title: "Live Web Objective",
    description: "Discover sources and define the execution goal",
  },
  {
    icon: Bot,
    title: "Agent Designs Graph",
    description: "Specialist agents assign typed node contracts",
  },
  {
    icon: Cpu,
    title: "TypeScript Nodes",
    description: "Generated, sandboxed, and unit-tested capabilities",
  },
  {
    icon: FlaskConical,
    title: "Validate & Repair",
    description: "Failed nodes are repaired until the graph passes",
  },
  {
    icon: Zap,
    title: "Deterministic Run",
    description: "Frozen workflow executes without LLM supervision",
  },
]

export const ViewportPanel = () => {
  return (
    <section className="flex h-full flex-col bg-zinc-900 text-zinc-200">
      <header className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Compiler Viewport
        </h2>
        <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] text-emerald-400">
          Build Mode
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-zinc-100">
            Agentic Workflow Compiler
          </h1>
          <p className="mt-1 max-w-md text-[11px] text-zinc-500">
            Convert a real-world web objective into a tested, sandboxed,
            reusable TypeScript workflow — then execute it deterministically.
          </p>
        </div>

        <ol className="grid w-full max-w-2xl gap-2 sm:grid-cols-5">
          {pipelineSteps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-center"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-500">
                {index + 1}
              </span>
              <step.icon className="size-4 text-zinc-400" aria-hidden />
              <p className="text-[10px] font-medium text-zinc-300">{step.title}</p>
              <p className="text-[9px] leading-snug text-zinc-600">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
