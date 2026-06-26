# Overall Context

## Working Title
Agentic Workflow Compiler
Alternative names:
* CompileFlow
* Intent2Workflow
* AgentForge
* EveFlow
* Workflow Foundry

## One-Line Description
An autonomous agent that converts a real-world web objective into a tested, sandboxed, reusable TypeScript workflow, then executes that workflow deterministically without requiring an LLM on every run.

## Final Definition
**What the Project Is:** An autonomous workflow-engineering agent that converts live-web goals into tested, sandboxed and reusable TypeScript execution graphs.
**What the Project Is Not:** It is not another agent that reasons through every operation forever.
**Fundamental Principle:** Use agents to create durable automation, not to replace deterministic automation where code is sufficient.

## Core Thesis
Most online AI workflow platforms treat the agent as the automation itself (Input -> Agent reasons -> Tool call -> Agent reasons...). This is flexible, but causes repeated LLM cost, non-deterministic output, slower execution, difficult debugging, poor reproducibility, limited local execution, and excessive dependence on models.

Our project bridges this by having the Agent *design* the workflow and generate tested TypeScript nodes. The workflow is validated, frozen, and future runs execute deterministically without model supervision.

**Agentic at build time, deterministic at run time, and agentic again only when the environment changes.**

## Problem
**Current Online Agent Platforms:** Trigger -> LLM -> Tool -> LLM -> API -> Result. Inefficient for repeated operations with stable logic (extracting fields, format conversion, schema validation, predictable page monitoring).
**Current Local Automation:** Powerful local tools (TS, Python, local GPU, FFmpeg, browser automation) lack an accessible visual interface and persistent execution graph.
**Missing Layer:** There is no clear unified interface where an agent designs the automation, code becomes reusable typed nodes, nodes can run locally/remotely, and intermediate state remains inspectable.

## Product Vision
The long-term product is a visual workflow environment inspired by Blender node graphs, Vercel Eve, Next.js, Jupyter notebooks, Cursor, and n8n/Zapier.
Each node represents a typed capability (generated TS, trusted adapter, AI model call, cloud service, browser action, human approval).

## Longer-Term Roadmap (Post-Hackathon)
* Local worker registration & cloud worker execution
* FFmpeg, ImageMagick, and local GPU inference nodes
* Filesystem and browser nodes
* Branching, loops, retries
* Persistent notebook-like outputs
* Reusable node packages & generated visual interfaces
* Human approval nodes, secrets management, scheduling
* Collaborative editing & workflow marketplaces
* Automatic re-compilation when sources change
