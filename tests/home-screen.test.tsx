import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import HomePage from "../app/page";
import PrototypePage from "../app/prototype/page";
import { HomePageApp } from "../src/app/HomePageApp";

describe("home screen flow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("renders missing API configuration before the live rider flow", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Configuração da API ausente" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/precisa de NEXT_PUBLIC_API_URL/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "As informações das linhas não estão disponíveis neste ambiente."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Protótipo" })
    ).not.toBeInTheDocument();
  });

  test("keeps the live home route separate from the prototype scenario switcher", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/v1");

    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "De que lado sentar?" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Protótipo" })
    ).not.toBeInTheDocument();
  });

  test("loads manual route candidates and version-pinned directions live", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            url.includes("/directions?")
              ? {
                  directions: [
                    {
                      routeDirectionId: "direction-124-inbound",
                      sequence: 2,
                      name: "Lagoa para TICEN",
                      departureLabels: ["Lagoa", "TICEN"],
                    },
                    {
                      routeDirectionId: "direction-124-outbound",
                      sequence: 1,
                      name: "TICEN para Lagoa",
                      departureLabels: ["TICEN", "Lagoa"],
                    },
                  ],
                }
              : {
                  routes: [
                    {
                      routeId: "route-124",
                      routeVersionId: "version-124",
                      routeCode: "124",
                      routeName: "TICEN - Lagoa",
                      directionHints: ["TICEN", "Lagoa"],
                    },
                  ],
                }
          ),
          { headers: { "content-type": "application/json" }, status: 200 }
        )
      )
    );
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/v1");
    vi.stubGlobal("fetch", fetchMock);

    render(<HomePage />);

    await user.click(
      screen.getByRole("button", { name: "Procurar linha manualmente" })
    );
    await user.type(
      await screen.findByRole("searchbox", { name: "Linha" }),
      "TICEN Lagoa"
    );

    const routeButton = await screen.findByRole("button", {
      name: "Selecionar linha 124 TICEN - Lagoa",
    });
    expect(
      screen.getByRole("heading", { name: "Procurar linha" })
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/route-candidates/search?query=TICEN+Lagoa&limit=8",
      {
        credentials: "omit",
        method: "GET",
        signal: expect.any(AbortSignal),
      }
    );

    await user.click(routeButton);

    expect(
      await screen.findByRole("heading", { name: "Escolha o sentido" })
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button", { name: /Selecionar sentido/i })
        .map((button) => button.textContent)
    ).toEqual([
      "Lagoa para TICENLagoa · TICEN",
      "TICEN para LagoaTICEN · Lagoa",
    ]);
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          url ===
          "http://localhost:8000/v1/routes/route-124/directions?routeVersionId=version-124"
      )
    ).toBe(true);

    await user.click(
      screen.getByRole("button", {
        name: "Selecionar sentido Lagoa para TICEN",
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Sentido escolhido" })
    ).toBeInTheDocument();
    expect(screen.getByText("124 TICEN - Lagoa")).toBeInTheDocument();
    expect(screen.getByText("Lagoa para TICEN")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Trocar sentido" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Trocar linha" })
    ).toBeInTheDocument();
  });

  test("loads nearby route candidates live after rider location action", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          routes: [
            {
              routeId: "route-330",
              routeVersionId: "version-330",
              routeCode: "330",
              routeName: "TILAG - Centro",
              distanceMeters: 900,
            },
            {
              routeId: "route-124",
              routeVersionId: "version-124",
              routeCode: "124",
              routeName: "TICEN - Lagoa",
              distanceMeters: 100,
            },
          ],
        }),
        { headers: { "content-type": "application/json" }, status: 200 }
      )
    );
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          accuracy: 25,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: -27.5969,
          longitude: -48.5488,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/v1");
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        clearWatch: vi.fn(),
        getCurrentPosition,
        watchPosition: vi.fn(),
      },
    });

    render(<HomePage />);

    await user.click(
      screen.getByRole("button", { name: "Usar minha localização" })
    );

    expect(
      await screen.findByRole("heading", { name: "Escolha sua linha" })
    ).toBeInTheDocument();
    expect(screen.getByText("1 de 4")).toBeInTheDocument();
    const routeButtons = await screen.findAllByRole("button", {
      name: /Selecionar linha/i,
    });
    expect(routeButtons.map((button) => button.textContent)).toEqual([
      "330 TILAG - Centro900 m de você",
      "124 TICEN - Lagoa100 m de você",
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/route-candidates/nearby?lat=-27.5969&lng=-48.5488&radiusMeters=1200&limit=5",
      { credentials: "omit", method: "GET" }
    );
  });

  test("silently aborts manual search when the query is cleared", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        })
    );
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/v1");
    vi.stubGlobal("fetch", fetchMock);

    render(<HomePage />);
    await user.click(
      screen.getByRole("button", { name: "Procurar linha manualmente" })
    );
    const searchInput = await screen.findByRole("searchbox", { name: "Linha" });
    await user.type(searchInput, "124");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    await user.clear(searchInput);

    await waitFor(() => expect(signal?.aborted).toBe(true));
    expect(
      screen.getByRole("heading", { name: "Procurar linha" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Algo deu errado")).not.toBeInTheDocument();
  });

  test("refreshes manual candidates after a stale route version without reselection", async () => {
    const user = userEvent.setup();
    let searchRequests = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/route-candidates/search")) {
        searchRequests += 1;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              routes: [
                {
                  routeId: "route-124",
                  routeVersionId:
                    searchRequests === 1 ? "version-old" : "version-current",
                  routeCode: "124",
                  routeName: "TICEN - Lagoa",
                },
              ],
            }),
            { headers: { "content-type": "application/json" }, status: 200 }
          )
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              code: "routeVersionStale",
              message: "internal diagnostic",
            },
          }),
          { headers: { "content-type": "application/json" }, status: 409 }
        )
      );
    });
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/v1");
    vi.stubGlobal("fetch", fetchMock);

    render(<HomePage />);
    await user.click(
      screen.getByRole("button", { name: "Procurar linha manualmente" })
    );
    await user.type(
      await screen.findByRole("searchbox", { name: "Linha" }),
      "124"
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Selecionar linha 124 TICEN - Lagoa",
      })
    );

    await waitFor(() => expect(searchRequests).toBe(2));
    expect(
      await screen.findByRole("button", {
        name: "Selecionar linha 124 TICEN - Lagoa",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "As opções desta linha foram atualizadas. Escolha a linha e o sentido novamente."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Escolha o sentido" })
    ).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("routeVersionId=version-old")
      )
    ).toBe(true);
  });

  test("prototype route renders the default location screen without calling browser geolocation before rider action", async () => {
    const user = userEvent.setup();
    const geolocationSpy = vi.fn();
    const originalGeolocation = navigator.geolocation;

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: geolocationSpy,
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
    });

    render(<PrototypePage />);

    expect(
      screen.getByRole("heading", { name: "De que lado sentar?" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Usar minha localização" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Procurar linha manualmente" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Diagrama do ônibus visto de cima/i)
    ).toBeInTheDocument();
    expect(geolocationSpy).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Procurar linha manualmente" })
    );

    expect(
      await screen.findByRole("heading", { name: "Procurar linha" })
    ).toBeInTheDocument();
    expect(geolocationSpy).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: originalGeolocation,
    });
  });

  test("runs the nearby route flow through final onboard advice", async () => {
    const user = userEvent.setup();

    render(<PrototypePage />);

    await user.click(
      screen.getByRole("button", { name: "Usar minha localização" })
    );

    expect(
      await screen.findByRole("heading", { name: "Escolha sua linha" })
    ).toBeInTheDocument();
    expect(screen.getByText("1 de 4")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Selecionar sentido/i })
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Selecionar linha 124 TICEN - Lagoa" })
    );

    expect(
      await screen.findByRole("heading", { name: "Escolha o sentido" })
    ).toBeInTheDocument();
    expect(screen.getByText("2 de 4")).toBeInTheDocument();
    expect(screen.getByText("124 TICEN - Lagoa")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Selecionar sentido TICEN para Lagoa",
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Confirme sua linha" })
    ).toBeInTheDocument();
    expect(screen.getByText("3 de 4")).toBeInTheDocument();
    expect(
      screen.getByText("Confira se a linha e o sentido combinam com o ônibus.")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Trajeto esquemático da linha selecionada")
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Confirmar esta linha" })
    );

    expect(
      await screen.findByRole("heading", { name: "Sente à esquerda" })
    ).toBeInTheDocument();
    expect(screen.getByText("4 de 4")).toBeInTheDocument();
    expect(screen.getByText("Agora no ônibus")).toBeInTheDocument();
    expect(
      screen.getByText("Estimativa pelo sol direto. Pode variar no caminho.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Atualizar localização" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Recomendação: sente à esquerda/i)
    ).toBeInTheDocument();
  });

  test("shows computing state before advice when advisory mock is delayed", async () => {
    const user = userEvent.setup();

    render(<HomePageApp scenarioId="computing-advice" />);

    await completeNearbyFlow(user);
    await user.click(
      screen.getByRole("button", { name: "Confirmar esta linha" })
    );

    expect(
      await screen.findByRole("heading", {
        name: "Calculando pelo sol direto...",
      })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Sente à esquerda" })
    ).toBeInTheDocument();
  });

  test("runs manual flow through missing-geometry fallback into final advice", async () => {
    const user = userEvent.setup();

    render(<PrototypePage />);

    await user.click(
      screen.getByRole("button", { name: "Procurar linha manualmente" })
    );

    expect(
      await screen.findByRole("heading", { name: "Procurar linha" })
    ).toBeInTheDocument();

    const searchInput = screen.getByRole("searchbox", { name: "Linha" });
    await user.type(searchInput, "888");

    const results = await screen.findByRole("list", {
      name: "Resultados da busca de linhas",
    });
    expect(
      within(results).getByRole("button", {
        name: "Selecionar linha 888 Lagoa - Trindade",
      })
    ).toBeInTheDocument();

    await user.click(
      within(results).getByRole("button", {
        name: "Selecionar linha 888 Lagoa - Trindade",
      })
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Selecionar sentido Lagoa para Trindade",
      })
    );

    expect(await screen.findByText("Mapa indisponível")).toBeInTheDocument();
    expect(
      screen.getByText("Ainda é possível confirmar pela linha e pelo sentido.")
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Confirmar mesmo assim" })
    );

    expect(
      await screen.findByRole("heading", { name: "Sente à esquerda" })
    ).toBeInTheDocument();
  });

  test("returns to the correct source when changing route", async () => {
    const user = userEvent.setup();

    render(<PrototypePage />);

    await user.click(
      screen.getByRole("button", { name: "Procurar linha manualmente" })
    );
    await user.type(
      await screen.findByRole("searchbox", { name: "Linha" }),
      "lagoa"
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Selecionar linha 124 TICEN - Lagoa",
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Escolha o sentido" })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Trocar linha" }));

    expect(
      await screen.findByRole("heading", { name: "Procurar linha" })
    ).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Linha" })).toHaveValue(
      "lagoa"
    );
    expect(
      screen.getByRole("button", { name: "Selecionar linha 124 TICEN - Lagoa" })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Usar minha localização" })
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Selecionar linha 124 TICEN - Lagoa",
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Escolha o sentido" })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Trocar linha" }));

    expect(
      await screen.findByRole("heading", { name: "Escolha sua linha" })
    ).toBeInTheDocument();
  });

  test("keeps the selected route when changing direction from confirmation", async () => {
    const user = userEvent.setup();

    render(<PrototypePage />);

    await user.click(
      screen.getByRole("button", { name: "Usar minha localização" })
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Selecionar linha 124 TICEN - Lagoa",
      })
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Selecionar sentido TICEN para Lagoa",
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Confirme sua linha" })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Trocar sentido" }));

    expect(
      await screen.findByRole("heading", { name: "Escolha o sentido" })
    ).toBeInTheDocument();
    expect(screen.getByText("124 TICEN - Lagoa")).toBeInTheDocument();
  });

  test("uses the fallback confirmation when map availability is disabled by test options", async () => {
    const user = userEvent.setup();

    render(<HomePageApp scenarioId="confirmation-fallback-map-unavailable" />);

    await user.click(
      screen.getByRole("button", { name: "Usar minha localização" })
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Selecionar linha 124 TICEN - Lagoa",
      })
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Selecionar sentido TICEN para Lagoa",
      })
    );

    expect(await screen.findByText("Mapa indisponível")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar mesmo assim" })
    ).toBeInTheDocument();
  });

  test("renders preview advice as lightweight distinct result", async () => {
    const user = userEvent.setup();

    render(<HomePageApp scenarioId="advice-preview-left" />);

    await completeNearbyFlow(user);
    await user.click(
      screen.getByRole("button", { name: "Confirmar esta linha" })
    );

    expect(await screen.findByText("Prévia da linha")).toBeInTheDocument();
    expect(screen.getByText("Prévia")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Melhor sentar à direita" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Prévia estimada para linha confirmada/i)
    ).toBeInTheDocument();
  });

  test.each([
    [
      "advice-exposure-front-recommends-back",
      "Prefira sentar mais atrás",
      /sente mais atrás/i,
    ],
    [
      "advice-exposure-back-recommends-front",
      "Prefira sentar mais à frente",
      /sente mais à frente/i,
    ],
  ] as const)(
    "renders %s without left-right seat copy",
    async (scenarioId, heading, summaryLabel) => {
      const user = userEvent.setup();

      render(<HomePageApp scenarioId={scenarioId} />);

      await completeNearbyFlow(user);
      await user.click(
        screen.getByRole("button", { name: "Confirmar esta linha" })
      );

      expect(
        await screen.findByRole("heading", { name: heading })
      ).toBeInTheDocument();
      expect(screen.queryByText("Sente à esquerda")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Melhor sentar à direita")
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText(summaryLabel)).toBeInTheDocument();
    }
  );

  test.each([
    ["advice-neutral-overhead", "Sem lado melhor agora"],
    ["advice-neutral-none", "Sem sol direto relevante agora"],
  ] as const)(
    "renders %s as neutral result without claiming best side",
    async (scenarioId, heading) => {
      const user = userEvent.setup();

      render(<HomePageApp scenarioId={scenarioId} />);

      await completeNearbyFlow(user);
      await user.click(
        screen.getByRole("button", { name: "Confirmar esta linha" })
      );

      expect(
        await screen.findByRole("heading", { name: heading })
      ).toBeInTheDocument();
      expect(screen.queryByText("Sente à esquerda")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Melhor sentar à direita")
      ).not.toBeInTheDocument();
      expect(
        screen.getByLabelText(/Diagrama neutro do ônibus/i)
      ).toBeInTheDocument();
    }
  );

  test("renders withheld state without progress and with retry actions", async () => {
    const user = userEvent.setup();

    render(<HomePageApp scenarioId="advice-withheld" />);

    await completeNearbyFlow(user);
    await user.click(
      screen.getByRole("button", { name: "Confirmar esta linha" })
    );

    expect(
      await screen.findByRole("heading", {
        name: "Não é possível recomendar agora",
      })
    ).toBeInTheDocument();
    expect(screen.queryByText("4 de 4")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Trocar linha" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tentar de novo" })
    ).toBeInTheDocument();
  });

  test("shows the prototype scenario switcher on the page and can jump to the slow loading state", async () => {
    const user = userEvent.setup();

    render(<PrototypePage />);

    const scenarioSelect = screen.getByRole("combobox", { name: "Protótipo" });
    await user.selectOptions(scenarioSelect, "location-slow-loading");

    expect(
      await screen.findByRole("heading", { name: "Ainda buscando..." })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continuar aguardando" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Procurar linha manualmente" })
    ).toBeInTheDocument();
  });

  test("uses location as the fallback action for manual-search API errors", async () => {
    const user = userEvent.setup();

    render(<PrototypePage />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Protótipo" }),
      "error-manual-search"
    );

    expect(
      await screen.findByRole("heading", { name: "Algo deu errado" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tentar de novo" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Usar minha localização" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Procurar linha manualmente" })
    ).not.toBeInTheDocument();
  });

  test("exposes route cards and direction rows as accessible buttons before confirmation", async () => {
    const user = userEvent.setup();

    render(<PrototypePage />);

    await user.click(
      screen.getByRole("button", { name: "Usar minha localização" })
    );

    const routeButton = await screen.findByRole("button", {
      name: "Selecionar linha 124 TICEN - Lagoa",
    });
    expect(routeButton).toBeInTheDocument();

    await user.click(routeButton);

    const directionButton = await screen.findByRole("button", {
      name: "Selecionar sentido TICEN para Lagoa",
    });
    expect(directionButton).toBeInTheDocument();
    expect(screen.queryByText(/sentido escolhido/i)).not.toBeInTheDocument();
  });

  test("keeps onboard advice text-distinct with an accessible diagram summary", async () => {
    const user = userEvent.setup();

    render(<HomePageApp scenarioId="advice-exposure-right-recommends-left" />);

    await completeNearbyFlow(user);
    await user.click(
      screen.getByRole("button", { name: "Confirmar esta linha" })
    );

    expect(await screen.findByText("Agora no ônibus")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sente à esquerda" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Recomendação: sente à esquerda/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("Prévia")).not.toBeInTheDocument();
  });

  test("keeps preview advice text-distinct with an accessible diagram summary", async () => {
    const user = userEvent.setup();

    render(<HomePageApp scenarioId="advice-preview-left" />);

    await completeNearbyFlow(user);
    await user.click(
      screen.getByRole("button", { name: "Confirmar esta linha" })
    );

    expect(await screen.findByText("Prévia da linha")).toBeInTheDocument();
    expect(screen.getByText("Prévia")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Recomendação: sente à direita/i)
    ).toBeInTheDocument();
  });
});

async function completeNearbyFlow(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Usar minha localização" })
  );
  await user.click(
    await screen.findByRole("button", {
      name: "Selecionar linha 124 TICEN - Lagoa",
    })
  );
  await user.click(
    await screen.findByRole("button", {
      name: "Selecionar sentido TICEN para Lagoa",
    })
  );
  await screen.findByRole("heading", { name: "Confirme sua linha" });
}
