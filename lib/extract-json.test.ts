import { describe, expect, it } from "vitest";
import { extractJson } from "./extract-json";

describe("extractJson", () => {
  it("parses a bare JSON object", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown fences and prose", () => {
    const raw = 'Here you go:\n```json\n{"providers":["vercel"]}\n```\nEnjoy!';
    expect(extractJson(raw)).toEqual({ providers: ["vercel"] });
  });

  it("handles nested objects and braces inside strings", () => {
    const raw = '{"cmd":"echo {hi}","nested":{"b":2}} trailing';
    expect(extractJson(raw)).toEqual({ cmd: "echo {hi}", nested: { b: 2 } });
  });

  it("throws when no JSON present", () => {
    expect(() => extractJson("no json here")).toThrow();
  });

  it("throws on unbalanced JSON", () => {
    expect(() => extractJson('{"a": {"b": 1}')).toThrow();
  });
});
