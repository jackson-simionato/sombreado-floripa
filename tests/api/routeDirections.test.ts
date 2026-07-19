import { describe, expect, test, vi } from "vitest";

import { LiveApiError } from "../../src/api/browserApi";
import { createRouteDirectionsClient } from "../../src/api/routeDirections";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
    ...init,
  });
}

describe("route directions browser API client", () => {
  test("loads version-pinned directions in service order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        directions: [
          {
            routeDirectionId: "direction-second",
            sequence: 2,
            name: "Lagoa para TICEN",
            directionKind: "volta",
            departureLabels: ["Lagoa", "TICEN"],
          },
          {
            routeDirectionId: "direction-first",
            sequence: 1,
            name: "TICEN para Lagoa",
            directionKind: "ida",
            departureLabels: ["TICEN", "Lagoa"],
          },
        ],
      })
    );
    const controller = new AbortController();
    const client = createRouteDirectionsClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: fetchMock,
    });

    const response = await client.listRouteDirections(
      { routeId: "route/124", routeVersionId: "version current" },
      { signal: controller.signal }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/routes/route%2F124/directions?routeVersionId=version+current",
      { credentials: "omit", method: "GET", signal: controller.signal }
    );
    expect(response.directions.map((item) => item.routeDirectionId)).toEqual([
      "direction-second",
      "direction-first",
    ]);
    expect(response.directions.map((item) => item.directionKind)).toEqual([
      "volta",
      "ida",
    ]);
  });

  test("accepts a null Route Direction Kind", async () => {
    const client = createRouteDirectionsClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: vi.fn().mockResolvedValue(
        jsonResponse({
          directions: [
            {
              routeDirectionId: "direction-unclassified",
              sequence: 1,
              name: "Circular Centro",
              directionKind: null,
              departureLabels: ["Centro"],
            },
          ],
        })
      ),
    });

    await expect(
      client.listRouteDirections({
        routeId: "route-circular",
        routeVersionId: "version-current",
      })
    ).resolves.toMatchObject({
      directions: [{ directionKind: null }],
    });
  });

  test.each([
    ["omitted", undefined],
    ["unknown", "circular"],
  ])(
    "rejects %s Route Direction Kind values",
    async (_label, directionKind) => {
      const direction = {
        routeDirectionId: "direction-invalid",
        sequence: 1,
        name: "Circular Centro",
        departureLabels: ["Centro"],
        ...(directionKind === undefined ? {} : { directionKind }),
      };
      const client = createRouteDirectionsClient({
        baseUrl: "http://localhost:8000/v1",
        fetchImpl: vi
          .fn()
          .mockResolvedValue(jsonResponse({ directions: [direction] })),
      });

      await expect(
        client.listRouteDirections({
          routeId: "route-circular",
          routeVersionId: "version-current",
        })
      ).rejects.toMatchObject({
        kind: "malformedResponse",
      } satisfies Partial<LiveApiError>);
    }
  );

  test("rejects malformed direction responses", async () => {
    const client = createRouteDirectionsClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ directions: [{}] })),
    });

    await expect(
      client.listRouteDirections({
        routeId: "route-124",
        routeVersionId: "version-124",
      })
    ).rejects.toMatchObject({
      kind: "malformedResponse",
    } satisfies Partial<LiveApiError>);
  });

  test("retains typed stale route-version errors", async () => {
    const client = createRouteDirectionsClient({
      baseUrl: "http://localhost:8000/v1",
      fetchImpl: vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "routeVersionStale",
              message: "Selected route version is no longer current.",
            },
          },
          { status: 409 }
        )
      ),
    });

    await expect(
      client.listRouteDirections({
        routeId: "route-124",
        routeVersionId: "version-124",
      })
    ).rejects.toMatchObject({
      kind: "http",
      status: 409,
      code: "routeVersionStale",
    } satisfies Partial<LiveApiError>);
  });
});
