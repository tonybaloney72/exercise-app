import { describe, expect, it } from "vitest";
import {
  buildOAuthSignatureBaseString,
  percentEncode,
  signOAuthBaseString,
} from "@/lib/fatsecret/oauth1";
import { parseFoodsSearchResponse } from "@/lib/fatsecret/foodsSearch";

describe("percentEncode", () => {
  it("encodes reserved characters for OAuth", () => {
    expect(percentEncode("a=b&c")).toBe("a%3Db%26c");
  });
});

describe("buildOAuthSignatureBaseString", () => {
  it("matches FatSecret OAuth 1.0 doc example shape", () => {
    const base = buildOAuthSignatureBaseString({
      httpMethod: "POST",
      requestUrl: "https://platform.fatsecret.com/rest/server.api",
      params: {
        a: "foo",
        oauth_consumer_key: "demo",
        oauth_nonce: "abc",
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: "12345678",
        oauth_version: "1.0",
        z: "bar",
      },
    });

    expect(base).toBe(
      "POST&https%3A%2F%2Fplatform.fatsecret.com%2Frest%2Fserver.api&a%3Dfoo%26oauth_consumer_key%3Ddemo%26oauth_nonce%3Dabc%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D12345678%26oauth_version%3D1.0%26z%3Dbar",
    );
  });
});

describe("signOAuthBaseString", () => {
  it("produces a percent-encoded base64 HMAC-SHA1 signature", () => {
    const base = buildOAuthSignatureBaseString({
      httpMethod: "POST",
      requestUrl: "https://platform.fatsecret.com/rest/server.api",
      params: {
        oauth_consumer_key: "demo",
        oauth_nonce: "abc",
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: "12345678",
        oauth_version: "1.0",
      },
    });

    const signature = signOAuthBaseString(base, "secret", "");
    expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});

describe("parseFoodsSearchResponse", () => {
  it("normalizes single and multiple food rows", () => {
    const single = parseFoodsSearchResponse({
      foods: {
        max_results: "1",
        total_results: "2",
        page_number: "0",
        food: {
          food_id: "1",
          food_name: "Banana",
          food_type: "Generic",
          food_description: "Per 100g - Calories: 89kcal",
        },
      },
    });
    expect(single.foods).toHaveLength(1);
    expect(single.foods[0]?.name).toBe("Banana");

    const multiple = parseFoodsSearchResponse({
      foods: {
        max_results: "2",
        total_results: "2",
        page_number: "0",
        food: [
          { food_id: "1", food_name: "Banana" },
          { food_id: "2", food_name: "Apple" },
        ],
      },
    });
    expect(multiple.foods).toHaveLength(2);
  });
});
