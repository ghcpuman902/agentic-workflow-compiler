import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { searchEventsWithTavily } from "../lib/integrations/tavily";
import { testClickHouseConnection } from "../lib/integrations/clickhouse";
import { askLLM } from "../lib/integrations/llm";
import { publishCitedMd } from "../lib/integrations/publish";

async function runTests() {
  console.log("=== Testing Integrations ===\n");

  // 1. Tavily
  console.log("1. Testing Tavily...");
  try {
    const result = await searchEventsWithTavily("London AI hackathons next week");
    console.log(`✅ Tavily search successful: found ${result.results.length} results.`);
  } catch (error: any) {
    console.log(`❌ Tavily search failed: ${error.message}`);
  }
  console.log("");

  // 2. ClickHouse
  console.log("2. Testing ClickHouse...");
  try {
    const ok = await testClickHouseConnection();
    if (ok) {
      console.log("✅ ClickHouse connection successful.");
    } else {
      console.log("❌ ClickHouse connection failed.");
    }
  } catch (error: any) {
    console.log(`❌ ClickHouse error: ${error.message}`);
  }
  console.log("");

  // 3. LLM (Gemini AI Studio)
  console.log("3. Testing LLM (Gemini)...");
  try {
    const response = await askLLM("Say hello in exactly 3 words.");
    console.log(`✅ LLM response: "${response.trim()}"`);
  } catch (error: any) {
    console.log(`❌ LLM test failed: ${error.message}`);
  }
  console.log("");

  // 4. Publishing
  console.log("4. Testing Publishing (cited.md)...");
  try {
    const mockEvents = [
      {
        title: "Agentic Hackathon 2026",
        url: "https://example.com/hackathon",
        date: "2026-07-01",
        location: "London",
        registrationStatus: "Open",
      },
    ];
    const path = await publishCitedMd(mockEvents, "output/test-cited.md");
    console.log(`✅ Published dummy output to: ${path}`);
  } catch (error: any) {
    console.log(`❌ Publishing failed: ${error.message}`);
  }

  console.log("\n=== Done ===");
}

runTests().catch(console.error);
