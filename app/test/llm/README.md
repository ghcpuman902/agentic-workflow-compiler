# Gemini LLM

Orchestration model for planning workflows and drafting TypeScript node code.

## Env var

- `GOOGLE_GENERATIVE_AI_API_KEY`

## Wrapper

- `lib/integrations/llm.ts` → `askLLM()`

## What it can do

- Generate short orchestration responses
- Draft node specifications and repair suggestions during build time
- Leave the execution path once workflows are compiled (deterministic reruns)

## Test ideas

- "Say hello in exactly 3 words."
- "List 3 fields needed to normalise an event record."
- "Return a one-sentence workflow plan for finding London AI events."

## API route

`POST /api/test/llm`

```json
{
  "prompt": "Say hello in exactly 3 words."
}
```

Model: `gemini-2.5-flash`
