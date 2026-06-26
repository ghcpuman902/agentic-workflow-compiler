Multiagents Hackathon Project Context

Working Title

Agentic Workflow Compiler

Alternative names:

* CompileFlow
* Intent2Workflow
* AgentForge
* EveFlow
* Workflow Foundry

One-Line Description

An autonomous agent that converts a real-world web objective into a tested, sandboxed, reusable TypeScript workflow, then executes that workflow deterministically without requiring an LLM on every run.

Core Thesis

Most online AI workflow platforms treat the agent as the automation itself:

Input
→ Agent reasons
→ Agent calls tools
→ Agent reasons again
→ Agent produces output

This is flexible, but it creates several problems:

* repeated LLM cost;
* non-deterministic output;
* slower execution;
* difficult debugging;
* poor reproducibility;
* limited local execution;
* excessive dependence on model availability.

Local developer tools take a different approach. Tools such as Cursor help the user write the automation, but the resulting code is normally disconnected from visual workflow tools and from the agent that created it.

Our project bridges these models:

User goal
→ Agent designs workflow
→ Specialist agents write TypeScript nodes
→ Tests are generated
→ Nodes run in a sandbox
→ Failed nodes are repaired
→ Workflow is validated
→ Workflow is frozen as a reusable artefact
→ Future runs execute without model supervision

The main principle is:

Agentic at build time, deterministic at run time, and agentic again only when the environment changes.

Hackathon Challenge Alignment

The challenge asks participants to build autonomous agents that:

* act on the open web;
* use real-time information;
* perform real work;
* publish, monitor, orchestrate or transact;
* operate without constant manual intervention;
* use at least three sponsor tools;
* demonstrate the result in three minutes.

The project addresses this by making the autonomous agent responsible for:

1. understanding a live-web objective;
2. discovering relevant sources;
3. designing an execution graph;
4. generating sandboxed TypeScript tools;
5. creating and running tests;
6. repairing failed implementations;
7. verifying results against live sources;
8. publishing the output;
9. storing the resulting workflow for future deterministic runs.

The generated workflow is not the agent itself. The autonomous system that designs, tests, deploys and monitors the workflow is the agent.

⸻

Problem

Current Online Agent Platforms

Modern online workflow platforms increasingly support AI agents, but generally use AI as the runtime worker.

Typical pattern:

Trigger
→ LLM
→ Tool call
→ LLM
→ API
→ LLM
→ Final result

This is appropriate for ambiguous one-off tasks, but inefficient for repeated operations with stable logic.

Examples include:

* repeatedly extracting the same fields;
* normalising known data structures;
* classifying known states;
* converting formats;
* validating schemas;
* running media-processing commands;
* monitoring predictable pages;
* applying deterministic business rules.

These operations should not require an expensive reasoning model during every execution.

Current Local Automation

Local tools can run:

* TypeScript;
* Python;
* FFmpeg;
* ImageMagick;
* local GPU models;
* filesystem operations;
* browser automation;
* long-running compute;
* high-volume I/O.

However, these workflows require engineering effort and are usually not represented through an accessible visual interface.

AI coding tools help create the code, but they do not usually retain the full workflow as an inspectable, reusable execution graph.

Missing Layer

There is no clear unified interface where:

* an agent can design the automation;
* code becomes reusable typed nodes;
* nodes can run locally or remotely;
* the agent tests and repairs the implementation;
* intermediate state remains inspectable;
* humans can intervene when needed;
* successful workflows stop requiring repeated agent reasoning.

⸻

Product Vision

The long-term product is a visual workflow environment inspired by:

* Blender node graphs for visual composition;
* Vercel Eve for agents building software;
* Next.js for composable code modules;
* Jupyter notebooks for persistent, inspectable state;
* Cursor for AI-assisted code generation;
* n8n/Zapier for workflow execution;
* local runtimes for heavy compute and high-I/O workloads.

Each node represents a typed capability.

A node may be:

* a generated TypeScript function;
* a trusted platform adapter;
* an AI model call;
* a local command;
* a cloud service;
* a browser action;
* a database query;
* a human approval step.

For the hackathon, only a narrow vertical slice will be implemented.

⸻

Hackathon Scope

What We Are Building

A small workflow compiler that can:

1. accept a natural-language web objective;
2. create a sequential workflow plan;
3. generate one or two TypeScript workflow nodes;
4. generate unit tests for each node;
5. run nodes in a constrained sandbox;
6. detect a failed test;
7. repair the failed implementation;
8. execute the completed workflow on live web data;
9. verify the output;
10. publish the result;
11. store execution traces and workflow versions.

What We Are Not Building

Do not build:

* a general-purpose visual programming environment;
* a full drag-and-drop node editor;
* arbitrary graph branching;
* loops;
* distributed execution;
* local GPU workers;
* FFmpeg integration;
* ImageMagick integration;
* multi-language code execution;
* arbitrary package installation;
* user accounts;
* collaboration;
* full notebook semantics;
* recurring production scheduling;
* payment infrastructure;
* a complete plugin marketplace.

These belong to the long-term roadmap, not the hackathon MVP.

⸻

Demonstration Use Case

Autonomous London AI Event Monitor

Example user objective:

Find upcoming London AI events that are still accepting registrations, verify their details, and publish a cited shortlist.

The agent should:

1. search the live web for relevant events;
2. identify candidate event pages;
3. define a typed event schema;
4. generate a TypeScript extraction or normalisation node;
5. generate a registration-status classifier;
6. write tests;
7. run the workflow;
8. detect an intentionally unsupported phrase or malformed input;
9. repair the relevant node;
10. rerun the tests;
11. process live event data;
12. verify claims against source pages;
13. publish the shortlist;
14. save the workflow for reuse.

Target Output Schema

type EventRecord = {
  title: string;
  organiser?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  registrationStatus:
    | "open"
    | "request_to_join"
    | "waitlist"
    | "closed"
    | "unknown";
  registrationDeadline?: string;
  sourceUrl: string;
  evidence?: string[];
  confidence: number;
};

Example Generated Workflow

Discover Sources
→ Extract Event Records
→ Normalise Fields
→ Classify Registration Status
→ Validate Against Sources
→ Publish Cited Shortlist

The fixed adapters are:

* Tavily discovery;
* web-content retrieval;
* publishing;
* ClickHouse trace storage.

The generated nodes are:

* event normalisation;
* registration-status classification.

This keeps the code-generation claim real without making every component dynamic.

⸻

Multi-Agent Architecture

1. Orchestrator Agent

The orchestrator retains global task context.

Responsibilities:

* interpret the user’s objective;
* define acceptance criteria;
* create the workflow graph;
* assign node contracts;
* select trusted adapters;
* delegate implementation work;
* track test and execution results;
* decide whether repair is required;
* verify that the final workflow satisfies the original goal;
* initiate publishing.

The orchestrator should not directly write all code.

It should output structured plans.

Example:

{
  "goal": "Publish verified London AI events with open registration",
  "acceptanceCriteria": [
    "At least three valid events",
    "Every record has a source URL",
    "Registration status is supported by evidence",
    "No records with missing titles",
    "Output is published successfully"
  ],
  "nodes": [
    {
      "id": "discover",
      "type": "trusted-adapter",
      "adapter": "tavily-search"
    },
    {
      "id": "normalise-event",
      "type": "generated-typescript"
    },
    {
      "id": "classify-registration",
      "type": "generated-typescript"
    },
    {
      "id": "verify",
      "type": "trusted-adapter",
      "adapter": "source-verifier"
    },
    {
      "id": "publish",
      "type": "trusted-adapter",
      "adapter": "cited-md-publisher"
    }
  ]
}

2. Builder Agent

The builder receives only:

* one node contract;
* input schema;
* output schema;
* implementation constraints;
* allowed dependencies;
* relevant fixture data.

Responsibilities:

* write the TypeScript function;
* avoid network access unless explicitly allowed;
* return source code in a strict format;
* preserve typed inputs and outputs;
* handle predictable malformed input.

3. Tester Agent

Responsibilities:

* create happy-path tests;
* create malformed-input tests;
* identify edge cases;
* define expected outputs;
* detect schema violations;
* avoid simply approving the builder’s implementation.

The tester should use the node contract rather than the generated implementation as its main source of truth.

4. Repair Agent

Inputs:

* failing source code;
* failing test;
* runtime error;
* input fixture;
* expected result;
* node contract.

Responsibilities:

* produce a minimal patch;
* explain the failure briefly;
* preserve the node contract;
* avoid rewriting unrelated code.

The builder and repair agents may use the same underlying model with different prompts.

5. Verifier Agent

Responsibilities:

* compare final records against current source content;
* identify unsupported claims;
* assign confidence;
* reject records with weak evidence;
* confirm that acceptance criteria are satisfied.

⸻

Execution Model

Build Phase

The build phase is agentic.

User objective
→ Orchestrator defines graph
→ Builder writes node
→ Tester creates tests
→ Sandbox runs tests
→ Repair agent patches failures
→ Tests pass
→ Orchestrator validates full workflow
→ Workflow version is frozen

Run Phase

The run phase is deterministic wherever possible.

Input
→ Trusted adapter
→ Generated TypeScript node
→ Generated TypeScript node
→ Trusted verifier adapter
→ Publisher adapter
→ Output

No LLM should be required for deterministic nodes after compilation.

An LLM may still be used where semantic judgement remains necessary, but the demo should clearly distinguish:

* compiled deterministic steps;
* live agentic steps;
* trusted platform adapters.

Recovery Phase

The agent returns when:

* a test fails;
* an output schema is violated;
* a source structure changes;
* confidence falls below a threshold;
* a deterministic node throws an error;
* the user asks for a modification.

Runtime failure
→ Capture trace
→ Orchestrator identifies failed node
→ Repair agent patches node
→ Tests rerun
→ New workflow version published

⸻

Workflow Node Model

type WorkflowNodeKind =
  | "generated-typescript"
  | "trusted-adapter"
  | "llm"
  | "human";
type WorkflowNode = {
  id: string;
  name: string;
  description: string;
  kind: WorkflowNodeKind;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  source?: string;
  tests?: WorkflowNodeTest[];
  status:
    | "planned"
    | "building"
    | "testing"
    | "failed"
    | "repairing"
    | "approved"
    | "running"
    | "completed";
  version: number;
  dependencies: string[];
};
type WorkflowNodeTest = {
  id: string;
  name: string;
  input: unknown;
  expected?: unknown;
  expectedError?: string;
};

Workflow Model

type CompiledWorkflow = {
  id: string;
  name: string;
  goal: string;
  version: number;
  nodes: WorkflowNode[];
  edges: Array<{
    from: string;
    to: string;
  }>;
  acceptanceCriteria: string[];
  buildStatus:
    | "planning"
    | "building"
    | "testing"
    | "approved"
    | "failed";
  createdAt: string;
  updatedAt: string;
};

⸻

Sandbox Requirements

For the MVP, sandboxing may be lightweight, but the interface should clearly establish boundaries.

Each generated node should receive:

* JSON-serialisable input;
* a timeout;
* captured console output;
* a limited dependency set;
* no unrestricted filesystem access;
* no unrestricted environment variables;
* schema-validated output.

Possible implementation approaches:

* isolated Node.js worker;
* child process with timeout;
* Vercel Sandbox if available;
* Modal container;
* another sponsor-provided runtime;
* vm-style execution for the prototype, with an explicit note that it is not production-grade isolation.

The implementation must not falsely claim strong security if using only Node’s built-in VM.

Use terminology such as:

constrained execution environment

unless the sandbox is genuinely isolated.

⸻

Sponsor Tool Strategy

The live challenge requires effective use of at least three sponsor tools.

Tavily

Primary role:

* discover live event pages;
* search the open web;
* retrieve grounded source content;
* provide current URLs;
* support verification.

Tavily must be visibly present in the runtime path.

Example:

User objective
→ Tavily discovers sources
→ workflow processes sources

ClickHouse

Primary role:

* store workflow traces;
* store node executions;
* record errors;
* record test results;
* store repair attempts;
* preserve workflow versions;
* compare agentic build cost with deterministic run cost.

Suggested tables:

workflow_runs
node_executions
test_results
repair_attempts
source_snapshots
published_outputs

The UI can expose a simple trace panel backed by ClickHouse.

Tessl

Potential role:

* provide structured context to coding agents;
* store TypeScript node specifications;
* define implementation constraints;
* package reusable development context;
* support specification-driven generation.

If Tessl integration cannot be completed reliably, replace it with a more practical sponsor tool rather than using it decoratively.

Cursor

Use Cursor to build the project.

Potential evidence:

* repository history;
* generated or modified code;
* Cursor rules;
* documented prompts;
* development workflow.

Do not rely on Cursor as one of the three runtime integrations unless organisers confirm that development usage qualifies.

Alternative Third Tool

If Tessl is difficult to integrate quickly, evaluate:

* Senso for context retrieval;
* Gensyn for model execution;
* Prometheux for structured entity relationships;
* Modal if recognised as part of the challenge environment;
* Twilio for publishing a notification;
* ElevenLabs for a voice summary.

The third tool must have a real purpose.

Do not force tools into the architecture merely to satisfy the count.

⸻

User Interface

Recommended Layout

Left Panel: Workflow Graph

Display a read-only execution graph.

Discover
→ Normalise
→ Classify
→ Verify
→ Publish

Each node has a status:

* planned;
* building;
* testing;
* failed;
* repairing;
* approved;
* running;
* completed.

A full drag-and-drop editor is not required.

Centre Panel: Selected Node

Display:

* TypeScript source;
* node description;
* input schema;
* output schema;
* generated tests;
* test results;
* execution logs;
* current version.

Right Panel: Orchestration Timeline

Example:

10:42:03  Orchestrator created a five-node workflow
10:42:08  Tavily returned eight candidate pages
10:42:17  Builder generated classifyRegistration()
10:42:20  Tester generated four test cases
10:42:22  Test failed: “Request to join” classified as unknown
10:42:29  Repair agent updated phrase mapping
10:42:31  All tests passed
10:42:40  Workflow version 1 approved
10:42:51  Published five verified events

Bottom or Header Metrics

Show:

* agent calls during build;
* deterministic node executions;
* workflow version;
* tests passed;
* repair count;
* total run time;
* model calls during rerun;
* approximate recurring cost.

The strongest metric is:

Build run: 8 model calls
Compiled rerun: 0 model calls for deterministic nodes

Only make a zero-call claim if it is technically true.

⸻

Human Intervention Model

The system should support human involvement without depending on it during the main demo.

Policy:

Confidence above threshold
→ continue automatically
Confidence below threshold
→ retry using another strategy
Retry budget exhausted
→ request human intervention

Possible human actions:

* edit generated TypeScript;
* approve a node;
* alter acceptance criteria;
* correct an output;
* provide an example;
* restart from a selected node.

The project can describe this as:

Autonomous by default, interruptible by design.

⸻

Minimum Acceptance Criteria

The project is complete when:

1. A natural-language objective creates a workflow plan.
2. The workflow contains at least three nodes.
3. At least one node is generated as TypeScript.
4. Generated nodes have typed input and output contracts.
5. At least one unit test is generated.
6. At least one first attempt fails.
7. The system repairs the failed implementation.
8. The repaired node passes its tests.
9. The workflow processes live web data.
10. The workflow performs a visible action, such as publishing.
11. Three sponsor tools are materially used.
12. A second execution uses the compiled workflow.
13. Execution traces are inspectable.
14. The public repository contains setup instructions.
15. A three-minute demonstration video is complete.

⸻

Priority Order

P0: Must Work

* public repository;
* live objective input;
* Tavily source discovery;
* structured workflow plan;
* one generated TypeScript node;
* constrained execution;
* test generation;
* repair loop;
* final structured result;
* visible publication or action;
* three sponsor integrations;
* demo video.

P1: Strongly Preferred

* second generated TypeScript node;
* ClickHouse trace view;
* workflow versioning;
* visible cost or call-count comparison;
* node code viewer;
* second deterministic run.

P2: Only If Time Remains

* editable graph;
* human override;
* local-runner badge;
* scheduler UI;
* additional export formats;
* parallel execution;
* multiple use cases.

⸻

Recommended Build Sequence

Stage 1: Verify Integrations

Before building the product:

1. create the public repository;
2. create a Devpost draft;
3. obtain sponsor credentials;
4. test Tavily;
5. test ClickHouse;
6. test the selected third sponsor tool;
7. confirm publishing requirements;
8. confirm cited.md workflow;
9. create a minimal Next.js application.

Do not proceed until the external APIs work.

Stage 2: Fixed End-to-End Path

Build a hard-coded workflow first:

Goal
→ Tavily
→ fixed TypeScript transform
→ verify
→ publish

This gives a working fallback.

Stage 3: Dynamic Node Generation

Replace one fixed transform with generated TypeScript.

Stage 4: Tests

Generate tests from the node contract.

Stage 5: Repair

Deliberately include an input that fails the first implementation.

Run:

generate
→ test
→ fail
→ repair
→ pass

Stage 6: Trace and UI

Expose the workflow and execution history.

Stage 7: Freeze

Do not add new capabilities after the feature-freeze time.

Record the demo and complete the submission.

⸻

Time Plan

Assuming approximately five productive hours:

Time	Goal
First 30 minutes	Repository, APIs, credentials and Devpost
Next 60 minutes	Fixed end-to-end live workflow
Next 60 minutes	Generated TypeScript node and runner
Next 45 minutes	Test and repair loop
Next 40 minutes	Third sponsor tool and ClickHouse trace
Next 30 minutes	UI polish and deterministic rerun
Final 60 minutes	Freeze, record, upload and submit

The practical feature-freeze deadline should be at least one hour before submission.

⸻

Three-Minute Demo Script Structure

0:00–0:25: Problem

Most agent platforms keep the LLM inside every repeated execution.

This makes workflows expensive, slow and difficult to reproduce.

0:25–0:45: Solution

Our agent converts a real-world objective into tested TypeScript tools and compiles them into a reusable workflow.

The agent designs and repairs the workflow, but stable steps subsequently run without model supervision.

0:45–1:10: Input and Discovery

Enter:

Find upcoming London AI events that still accept registration and publish a cited shortlist.

Show Tavily discovering live sources.

1:10–1:35: Planning and Generation

Show the orchestrator creating the workflow.

Show a generated TypeScript node and its schemas.

1:35–1:55: Failure and Repair

Show a test failing on an unusual registration phrase.

Show the repair agent modify the node.

Show the test suite pass.

1:55–2:25: Execution and Action

Run the compiled workflow.

Show verified event records.

Publish the result.

2:25–2:45: Deterministic Rerun

Run another input or rerun the current source set.

Show that deterministic steps require no additional model calls.

2:45–3:00: Closing

Agentic at build time, deterministic at run time, and agentic again only when the web changes.

⸻

Key Presentation Claims

Use:

* “The agent compiles intent into reusable workflows.”
* “Generated tools are typed, tested and inspectable.”
* “The model leaves the execution path once the workflow is stable.”
* “The agent returns when assumptions fail.”
* “Autonomous by default, interruptible by design.”
* “The workflow can eventually span local and cloud execution.”
* “Successful reasoning becomes durable software.”

Avoid:

* “This is a universal workflow platform.”
* “The sandbox is completely secure,” unless it truly is.
* “It works on every website.”
* “It requires no AI,” if semantic verification still uses a model.
* “It replaces developers.”
* “It supports arbitrary local GPU tasks,” unless demonstrated.

⸻

Main Risks

Risk 1: Too Much Platform Work

Mitigation:

* no editable node graph;
* sequential execution only;
* one use case;
* one or two generated nodes.

Risk 2: Sponsor Tool Integration Failure

Mitigation:

* test all credentials first;
* keep a fixed adapter boundary;
* select tools based on available documentation and working examples.

Risk 3: Live Web Instability

Mitigation:

* use several public sources;
* save source snapshots;
* keep a clearly labelled fallback fixture;
* do not depend on CAPTCHA-protected websites.

Risk 4: Code Execution Failure

Mitigation:

* allow only simple pure TypeScript functions;
* use a restricted dependency set;
* validate output with JSON Schema;
* enforce timeouts.

Risk 5: Demo Is Hard to Understand

Mitigation:

The demonstration must visibly show:

Goal
→ Agent builds code
→ Test fails
→ Agent repairs
→ Workflow runs
→ Result is published
→ Workflow reruns without model supervision

Risk 6: Multi-Agent System Feels Artificial

Mitigation:

Each agent has a distinct responsibility and a limited context:

* orchestrator plans;
* builder writes;
* tester challenges;
* repair agent patches;
* verifier grounds.

Avoid multiple agents producing interchangeable prose.

⸻

Longer-Term Roadmap

After the hackathon, the system could support:

* local worker registration;
* cloud worker execution;
* FFmpeg and ImageMagick nodes;
* local GPU inference;
* filesystem and browser nodes;
* branching;
* loops;
* retries;
* persistent notebook-like outputs;
* reusable node packages;
* generated visual interfaces;
* human approval nodes;
* secrets management;
* scheduling;
* collaborative editing;
* workflow marketplaces;
* automatic re-compilation when sources change.

The broader product vision is:

A Blender-style visual environment where agents, TypeScript functions, local programs, cloud APIs and humans collaborate in the same stateful execution graph.

⸻

Final Definition

What the Project Is

An autonomous workflow-engineering agent that converts live-web goals into tested, sandboxed and reusable TypeScript execution graphs.

What the Project Is Not

It is not another agent that reasons through every operation forever.

Fundamental Principle

Use agents to create durable automation, not to replace deterministic automation where code is sufficient.