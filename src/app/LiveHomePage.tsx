"use client";

import { FormEvent, useMemo, useState } from "react";

import { createRouteCandidatesClient } from "../api/routeCandidates";
import type {
  LiveApiError,
  RouteCandidateTransport,
} from "../api/routeCandidates";
import { AppShell } from "../components/AppShell";
import { BusSplitDiagram } from "../components/BusSplitDiagram";
import { Button } from "../components/Button";
import { StickyActions } from "../components/StickyActions";

import styles from "../screens/OnboardingFlowScreen.module.css";

type LiveHomePageProps = {
  apiBaseUrl?: string;
};

type LiveMode =
  | "idle"
  | "manual"
  | "loading"
  | "results"
  | "empty"
  | "error"
  | "selectedUnsupported";

type LiveState = {
  mode: LiveMode;
  candidates: RouteCandidateTransport[];
  errorMessage?: string;
  selectedRoute?: RouteCandidateTransport;
};

const initialState: LiveState = {
  mode: "idle",
  candidates: [],
};

export function LiveHomePage({ apiBaseUrl }: LiveHomePageProps) {
  const normalizedApiBaseUrl = apiBaseUrl?.trim();
  const [state, setState] = useState<LiveState>(initialState);
  const [manualQuery, setManualQuery] = useState("");

  const client = useMemo(() => {
    if (
      normalizedApiBaseUrl === undefined ||
      normalizedApiBaseUrl.length === 0
    ) {
      return undefined;
    }

    return createRouteCandidatesClient({ baseUrl: normalizedApiBaseUrl });
  }, [normalizedApiBaseUrl]);

  if (client === undefined) {
    return (
      <AppShell>
        <div className={styles.screen}>
          <section className={styles.stack} aria-labelledby="screen-title">
            <h1 id="screen-title" className={styles.titleCompact}>
              Configuração da API ausente
            </h1>
            <p className={styles.body}>
              O Sombreado Floripa precisa de NEXT_PUBLIC_API_URL para carregar
              dados ao vivo. Configure a URL pública do sombreado-service e
              recarregue a página.
            </p>
            <p className={styles.metaText}>
              As informações das linhas não estão disponíveis neste ambiente.
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  const routeCandidatesClient = client;

  async function searchManually(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = manualQuery.trim();
    if (query.length === 0) {
      return;
    }

    setState({ mode: "loading", candidates: [] });

    try {
      const response = await routeCandidatesClient.searchRouteCandidates({
        query,
        limit: 8,
      });
      setState(
        response.routes.length === 0
          ? { mode: "empty", candidates: [] }
          : { mode: "results", candidates: response.routes }
      );
    } catch (error) {
      setState({
        mode: "error",
        candidates: [],
        errorMessage: liveErrorMessage(error),
      });
    }
  }

  async function requestLocation() {
    setState({ mode: "loading", candidates: [] });

    try {
      const position = await getCurrentPosition();
      const response = await routeCandidatesClient.listNearbyRouteCandidates({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        radiusMeters: 1200,
        limit: 5,
      });
      setState(
        response.routes.length === 0
          ? { mode: "empty", candidates: [] }
          : { mode: "results", candidates: response.routes }
      );
    } catch (error) {
      setState({
        mode: "error",
        candidates: [],
        errorMessage: liveErrorMessage(error),
      });
    }
  }

  function openManualSearch() {
    setState({ mode: "manual", candidates: [] });
  }

  function selectRoute(route: RouteCandidateTransport) {
    setState({
      mode: "selectedUnsupported",
      candidates: state.candidates,
      selectedRoute: route,
    });
  }

  let content;
  let stickyPrimary = null;
  let stickySecondary = null;

  if (state.mode === "idle") {
    content = (
      <>
        <p className={styles.brand}>Sombreado Floripa</p>
        <section className={styles.hero} aria-labelledby="screen-title">
          <div className={styles.copyBlock}>
            <h1 id="screen-title" className={styles.title}>
              De que lado sentar?
            </h1>
            <p className={styles.body}>
              Encontre a melhor lateral do ônibus pelo sol direto.
            </p>
          </div>
          <BusSplitDiagram />
        </section>
        <p className={styles.metaText}>
          A localização só é usada para encontrar linhas perto de você.
        </p>
      </>
    );
    stickyPrimary = (
      <Button onClick={() => void requestLocation()}>
        Usar minha localização
      </Button>
    );
    stickySecondary = (
      <Button onClick={openManualSearch} variant="secondary">
        Procurar linha manualmente
      </Button>
    );
  } else if (state.mode === "manual") {
    content = (
      <section className={styles.stack} aria-labelledby="screen-title">
        <h1 id="screen-title" className={styles.titleCompact}>
          Procurar linha
        </h1>
        <p className={styles.body}>Digite o número ou nome da linha.</p>
        <form
          className={styles.stack}
          onSubmit={(event) => void searchManually(event)}
        >
          <label className={styles.searchField}>
            <span className={styles.searchLabel}>Linha</span>
            <input
              aria-label="Linha"
              className={styles.searchInput}
              onChange={(event) => setManualQuery(event.target.value)}
              placeholder="124 ou Lagoa"
              type="search"
              value={manualQuery}
            />
          </label>
          <div className={styles.inlineActions}>
            <Button type="submit">Buscar linha</Button>
          </div>
        </form>
      </section>
    );
    stickySecondary = (
      <Button onClick={() => void requestLocation()} variant="secondary">
        Usar minha localização
      </Button>
    );
  } else if (state.mode === "loading") {
    content = (
      <section className={styles.hero} aria-labelledby="screen-title">
        <div className={styles.copyBlock}>
          <h1 id="screen-title" className={styles.titleCompact}>
            Buscando linhas ao vivo...
          </h1>
          <p className={styles.body}>
            Estou carregando as linhas pelo sombreado-service.
          </p>
        </div>
      </section>
    );
  } else if (state.mode === "results") {
    content = (
      <section className={styles.stack} aria-labelledby="screen-title">
        <h1 id="screen-title" className={styles.titleCompact}>
          Escolha sua linha
        </h1>
        <p className={styles.body}>
          Linhas carregadas ao vivo. O sentido entra na próxima etapa da
          integração.
        </p>
        <div className={styles.list}>
          {state.candidates.map((route) => (
            <LiveRouteCard
              key={route.routeId}
              route={route}
              onSelect={() => selectRoute(route)}
            />
          ))}
        </div>
      </section>
    );
    stickySecondary = (
      <Button onClick={openManualSearch} variant="secondary">
        Procurar outra linha
      </Button>
    );
  } else if (state.mode === "empty") {
    content = (
      <section className={styles.stack} aria-labelledby="screen-title">
        <h1 id="screen-title" className={styles.titleCompact}>
          Nenhuma linha encontrada
        </h1>
        <p className={styles.body}>
          Tente buscar pelo número, terminal ou destino da linha.
        </p>
      </section>
    );
    stickyPrimary = (
      <Button onClick={openManualSearch}>Procurar linha manualmente</Button>
    );
    stickySecondary = (
      <Button onClick={() => void requestLocation()} variant="secondary">
        Usar minha localização
      </Button>
    );
  } else if (state.mode === "error") {
    content = (
      <section className={styles.stack} aria-labelledby="screen-title">
        <h1 id="screen-title" className={styles.titleCompact}>
          Algo deu errado
        </h1>
        <p className={styles.body}>
          {state.errorMessage ?? "Não consegui carregar as linhas agora."}
        </p>
      </section>
    );
    stickyPrimary = (
      <Button onClick={openManualSearch}>Procurar linha manualmente</Button>
    );
    stickySecondary = (
      <Button onClick={() => void requestLocation()} variant="secondary">
        Tentar localização de novo
      </Button>
    );
  } else if (state.mode === "selectedUnsupported") {
    const routeLabel =
      state.selectedRoute === undefined
        ? undefined
        : `${state.selectedRoute.routeCode} ${state.selectedRoute.routeName}`;

    content = (
      <section className={styles.stack} aria-labelledby="screen-title">
        <h1 id="screen-title" className={styles.titleCompact}>
          Linha carregada ao vivo
        </h1>
        <p className={styles.body}>
          Ainda não é possível continuar com dados ao vivo neste ambiente. A
          próxima etapa vai conectar sentido, confirmação e conselho.
        </p>
        {routeLabel === undefined ? null : (
          <div className={styles.summaryPanel}>
            <p className={styles.summaryLabel}>Linha</p>
            <strong>{routeLabel}</strong>
          </div>
        )}
      </section>
    );
    stickyPrimary = (
      <Button
        onClick={() =>
          setState({ mode: "results", candidates: state.candidates })
        }
      >
        Voltar para linhas
      </Button>
    );
    stickySecondary = (
      <Button onClick={openManualSearch} variant="secondary">
        Procurar outra linha
      </Button>
    );
  }

  return (
    <AppShell>
      <div className={styles.screen}>{content}</div>
      <StickyActions>
        {stickyPrimary}
        {stickySecondary}
      </StickyActions>
    </AppShell>
  );
}

function LiveRouteCard({
  onSelect,
  route,
}: {
  onSelect(): void;
  route: RouteCandidateTransport;
}) {
  return (
    <button
      aria-label={`Selecionar linha ${route.routeCode} ${route.routeName}`}
      className={styles.choiceCard}
      onClick={onSelect}
      type="button"
    >
      <strong>
        {route.routeCode} {route.routeName}
      </strong>
      <span>{liveRouteMeta(route)}</span>
    </button>
  );
}

function liveRouteMeta(route: RouteCandidateTransport): string {
  if (route.distanceMeters !== undefined) {
    return route.distanceMeters < 1000
      ? `${route.distanceMeters} m de você`
      : `${(route.distanceMeters / 1000).toFixed(1)} km de você`;
  }

  if (route.directionHints !== undefined && route.directionHints.length > 0) {
    return route.directionHints.join(" · ");
  }

  return "linha ao vivo";
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation === undefined) {
      reject(new Error("Geolocalização indisponível neste navegador."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 30_000,
      timeout: 10_000,
    });
  });
}

function liveErrorMessage(error: unknown): string {
  if (isLiveApiError(error)) {
    return error.message;
  }

  if (
    (typeof GeolocationPositionError !== "undefined" &&
      error instanceof GeolocationPositionError) ||
    (typeof error === "object" && error !== null && "code" in error)
  ) {
    return "Não consegui acessar sua localização agora. Você ainda pode procurar a linha manualmente.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Não consegui carregar as linhas agora.";
}

function isLiveApiError(error: unknown): error is LiveApiError {
  return error instanceof Error && error.name === "LiveApiError";
}
