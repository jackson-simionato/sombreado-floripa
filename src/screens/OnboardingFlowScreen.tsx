import { useRef } from "react";
import type { ReactNode } from "react";

import { AdviceBusDiagram } from "../components/AdviceBusDiagram";
import { AppShell } from "../components/AppShell";
import { BusSplitDiagram } from "../components/BusSplitDiagram";
import { Button } from "../components/Button";
import { StickyActions } from "../components/StickyActions";
import type {
  AdvisoryReasonCode,
  DirectionChoice,
  RouteCandidate,
  UiAdviceState,
} from "../domain/types";
import type { OnboardingFlowController } from "../hooks/useOnboardingFlow";

import styles from "./OnboardingFlowScreen.module.css";

type OnboardingFlowScreenProps = {
  controller: OnboardingFlowController;
};

export function OnboardingFlowScreen({
  controller,
}: OnboardingFlowScreenProps) {
  const { actions, manualQueryDraft, state } = controller;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedRouteLabel =
    state.selectedRoute === undefined
      ? undefined
      : `${state.selectedRoute.code} ${state.selectedRoute.name}`;

  const mapPoints = state.geometry?.polyline ?? [];

  let content: ReactNode;
  let stickyPrimary: ReactNode = null;
  let stickySecondary: ReactNode = null;

  switch (state.screen) {
    case "locationRequest":
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
        <Button onClick={actions.useLocation}>Usar minha localização</Button>
      );
      stickySecondary = (
        <Button onClick={actions.openManualSearch} variant="secondary">
          Procurar linha manualmente
        </Button>
      );
      break;

    case "findingNearbyRoutes":
    case "slowLoadingNotice":
      content = renderLoadingScreen(state, selectedRouteLabel);
      stickyPrimary =
        state.screen === "slowLoadingNotice" ? (
          <Button onClick={actions.continueWaiting}>
            Continuar aguardando
          </Button>
        ) : null;
      stickySecondary =
        state.selectedRoute === undefined ? (
          <Button onClick={actions.openManualSearch} variant="secondary">
            Procurar linha manualmente
          </Button>
        ) : null;
      break;

    case "locationDeniedRecovery":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <h1 id="screen-title" className={styles.title}>
            Localização desativada
          </h1>
          <p className={styles.body}>
            Você ainda pode escolher sua linha manualmente.
          </p>
          <p className={styles.metaText}>
            {locationIssueLabel(state.locationIssue)}
          </p>
        </section>
      );
      stickyPrimary = (
        <Button onClick={actions.openManualSearch}>
          Procurar linha manualmente
        </Button>
      );
      stickySecondary = (
        <Button onClick={actions.useLocation} variant="secondary">
          Tentar localização de novo
        </Button>
      );
      break;

    case "routeCandidateSelection":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <p className={styles.progress}>1 de 4</p>
          <h1 id="screen-title" className={styles.titleCompact}>
            Escolha sua linha
          </h1>
          <p className={styles.body}>
            Mostramos linhas perto de você. O sentido vem no próximo passo.
          </p>
          {state.routeRefreshNotice === "routeVersionStale" ? (
            <div className={styles.noticePanel} role="status">
              <p>
                As opções desta linha foram atualizadas. Escolha a linha e o
                sentido novamente.
              </p>
            </div>
          ) : null}
          <div className={styles.list}>
            {state.nearbyCandidates.map((route) => (
              <RouteCard
                key={route.routeId}
                route={route}
                meta={nearbyRouteMeta(route)}
                onSelect={() => actions.selectRoute(route, "nearby")}
              />
            ))}
          </div>
        </section>
      );
      stickySecondary = (
        <Button onClick={actions.openManualSearch} variant="secondary">
          Procurar outra linha
        </Button>
      );
      break;

    case "noNearbyRoutes":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <h1 id="screen-title" className={styles.titleCompact}>
            Não encontrei linhas perto de você
          </h1>
          <p className={styles.body}>
            Use a seleção manual para escolher pelo número ou nome da linha.
          </p>
        </section>
      );
      stickyPrimary = (
        <Button onClick={actions.openManualSearch}>
          Procurar linha manualmente
        </Button>
      );
      stickySecondary = (
        <Button onClick={actions.useLocation} variant="secondary">
          Tentar localização de novo
        </Button>
      );
      break;

    case "manualRouteSearch":
    case "noManualResults":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <h1 id="screen-title" className={styles.titleCompact}>
            {state.screen === "noManualResults"
              ? "Nenhuma linha encontrada"
              : "Procurar linha"}
          </h1>
          <p className={styles.body}>
            {state.screen === "noManualResults"
              ? "Confira o número ou tente um destino."
              : "Digite o número ou nome da linha."}
          </p>
          <label className={styles.searchField}>
            <span className={styles.searchLabel}>Linha</span>
            <input
              ref={searchInputRef}
              aria-label="Linha"
              className={styles.searchInput}
              onChange={(event) => actions.searchManually(event.target.value)}
              placeholder="124 ou Lagoa"
              type="search"
              value={manualQueryDraft}
            />
          </label>
          {state.routeRefreshNotice === "routeVersionStale" ? (
            <div className={styles.noticePanel} role="status">
              <p>
                As opções desta linha foram atualizadas. Escolha a linha e o
                sentido novamente.
              </p>
            </div>
          ) : null}
          {manualQueryDraft.trim().length === 0 ? (
            <p className={styles.metaText}>
              Busque pelo número, terminal ou destino.
            </p>
          ) : state.requestStatus === "loading" ? (
            <p className={styles.metaText} role="status">
              Buscando linhas...
            </p>
          ) : state.manualCandidates.length > 0 ? (
            <div
              aria-label="Resultados da busca de linhas"
              className={styles.list}
              role="list"
            >
              {state.manualCandidates.map((route) => (
                <RouteCard
                  key={route.routeId}
                  route={route}
                  meta="linha"
                  onSelect={() => actions.selectRoute(route, "manual")}
                />
              ))}
            </div>
          ) : state.screen === "noManualResults" ? (
            <div className={styles.inlineActions}>
              <Button
                onClick={() => {
                  searchInputRef.current?.focus();
                  searchInputRef.current?.select();
                }}
              >
                Buscar de novo
              </Button>
            </div>
          ) : null}
        </section>
      );
      stickySecondary = (
        <Button onClick={actions.useLocation} variant="secondary">
          Usar minha localização
        </Button>
      );
      break;

    case "loadingDirectionChoices":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <p className={styles.progress}>2 de 4</p>
          <h1 id="screen-title" className={styles.titleCompact}>
            Carregando sentidos desta linha...
          </h1>
          <RouteSummary
            label="Linha escolhida"
            routeLabel={selectedRouteLabel}
          />
        </section>
      );
      break;

    case "directionChoice":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <p className={styles.progress}>2 de 4</p>
          <h1 id="screen-title" className={styles.titleCompact}>
            Escolha o sentido
          </h1>
          <p className={styles.body}>
            Use o destino ou bairro para confirmar para onde o ônibus vai.
          </p>
          <RouteSummary
            label="Linha escolhida"
            routeLabel={selectedRouteLabel}
          />
          <div className={styles.list}>
            {state.directionChoices.map((direction) => (
              <DirectionCard
                key={direction.routeDirectionId}
                direction={direction}
                onSelect={() => actions.selectDirection(direction)}
              />
            ))}
          </div>
        </section>
      );
      stickySecondary = (
        <Button onClick={actions.changeRoute} variant="secondary">
          Trocar linha
        </Button>
      );
      break;

    case "liveRouteConfirmedUnsupported":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <h1 id="screen-title" className={styles.titleCompact}>
            Linha confirmada
          </h1>
          <p className={styles.body}>
            A linha e o sentido estão prontos para calcular a recomendação.
          </p>
          <RouteSummary
            directionLabel={state.selectedDirection?.name}
            routeLabel={selectedRouteLabel}
          />
        </section>
      );
      stickyPrimary = (
        <Button onClick={actions.changeDirection}>Trocar sentido</Button>
      );
      stickySecondary = (
        <Button onClick={actions.changeRoute} variant="secondary">
          Trocar linha
        </Button>
      );
      break;

    case "routeWithoutDirections":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <h1 id="screen-title" className={styles.titleCompact}>
            Não é possível confirmar o sentido
          </h1>
          <p className={styles.body}>
            Essa linha ainda não tem sentidos disponíveis.
          </p>
          <RouteSummary label="Linha" routeLabel={selectedRouteLabel} />
        </section>
      );
      stickyPrimary = (
        <Button onClick={actions.changeRoute}>Trocar linha</Button>
      );
      stickySecondary = (
        <Button onClick={actions.openManualSearch} variant="secondary">
          Procurar linha manualmente
        </Button>
      );
      break;

    case "routeConfirmation":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <p className={styles.progress}>3 de 4</p>
          <h1 id="screen-title" className={styles.titleCompact}>
            Confirme sua linha
          </h1>
          <p className={styles.body}>
            Confira se a linha e o sentido combinam com o ônibus.
          </p>
          <RouteSummary
            directionLabel={state.selectedDirection?.name}
            routeLabel={selectedRouteLabel}
          />
          <SchematicRouteMap points={mapPoints} />
          <p className={styles.metaText}>
            Se você não estiver nessa linha agora, posso mostrar uma prévia com
            aviso.
          </p>
        </section>
      );
      stickyPrimary = (
        <Button onClick={actions.confirmRoute}>Confirmar esta linha</Button>
      );
      stickySecondary = (
        <Button onClick={actions.changeDirection} variant="secondary">
          Trocar sentido
        </Button>
      );
      break;

    case "routeConfirmationFallback":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <p className={styles.progress}>3 de 4</p>
          <h1 id="screen-title" className={styles.titleCompact}>
            Confirme sua linha
          </h1>
          <div className={styles.noticePanel}>
            <strong>Mapa indisponível</strong>
            <p>Ainda é possível confirmar pela linha e pelo sentido.</p>
          </div>
          <RouteSummary
            directionLabel={state.selectedDirection?.name}
            routeLabel={selectedRouteLabel}
          />
          <div className={styles.summaryPanel}>
            <p className={styles.summaryLabel}>Confirmação compacta</p>
            <p className={styles.metaText}>
              {state.mapAvailability === "unavailable"
                ? "O mapa foi desativado neste cenário de teste."
                : "Essa linha não trouxe geometria suficiente para desenhar o trajeto."}
            </p>
          </div>
        </section>
      );
      stickyPrimary = (
        <Button onClick={actions.confirmRoute}>Confirmar mesmo assim</Button>
      );
      stickySecondary = (
        <Button onClick={actions.changeDirection} variant="secondary">
          Trocar sentido
        </Button>
      );
      break;

    case "computingAdvice":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <p className={styles.progress}>4 de 4</p>
          <h1 id="screen-title" className={styles.titleCompact}>
            Calculando pelo sol direto...
          </h1>
          <p className={styles.body}>
            Vamos comparar esquerda e direita no sentido escolhido.
          </p>
          <RouteSummary
            directionLabel={state.selectedDirection?.name}
            routeLabel={selectedRouteLabel}
          />
        </section>
      );
      stickySecondary = (
        <Button onClick={actions.changeRoute} variant="secondary">
          Trocar linha
        </Button>
      );
      break;

    case "onboardAdviceResult":
    case "routePreviewAdviceResult":
      if (state.advice !== undefined && state.advice.mode !== "withheld") {
        content = renderAdviceResult({
          advice: state.advice,
          directionLabel: state.selectedDirection?.name,
          routeLabel: selectedRouteLabel,
        });
      } else {
        content = null;
      }
      stickyPrimary = (
        <Button onClick={actions.refreshAdvice}>Atualizar localização</Button>
      );
      stickySecondary = (
        <Button onClick={actions.changeRoute} variant="secondary">
          Trocar linha
        </Button>
      );
      break;

    case "trueWithheld":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <p className={styles.resultEyebrow}>Sem recomendação útil</p>
          <h1 id="screen-title" className={styles.titleCompact}>
            Não é possível recomendar agora
          </h1>
          <p className={styles.body}>
            {withheldReasonCopy(
              state.advice?.mode === "withheld"
                ? state.advice.reasonCode
                : undefined
            )}
          </p>
          <RouteSummary
            directionLabel={state.selectedDirection?.name}
            routeLabel={selectedRouteLabel}
          />
        </section>
      );
      stickyPrimary = (
        <Button onClick={actions.changeRoute}>Trocar linha</Button>
      );
      stickySecondary = (
        <Button onClick={actions.retry} variant="secondary">
          Tentar de novo
        </Button>
      );
      break;

    case "apiError":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <h1 id="screen-title" className={styles.titleCompact}>
            Algo deu errado
          </h1>
          <p className={styles.body}>
            Não consegui carregar as informações agora.
          </p>
          {selectedRouteLabel !== undefined ? (
            <RouteSummary
              directionLabel={state.selectedDirection?.name}
              routeLabel={selectedRouteLabel}
            />
          ) : null}
        </section>
      );
      stickyPrimary = <Button onClick={actions.retry}>Tentar de novo</Button>;
      stickySecondary = renderApiErrorFallbackAction(state, actions);
      break;

    default:
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <h1 id="screen-title" className={styles.titleCompact}>
            Tela reservada para o próximo passo
          </h1>
        </section>
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

function renderLoadingScreen(
  state: OnboardingFlowController["state"],
  selectedRouteLabel: string | undefined
): ReactNode {
  let heading = "Buscando linhas perto de você...";
  let body = "Isso deve levar poucos segundos.";

  if (
    state.selectedRoute !== undefined &&
    state.selectedDirection === undefined
  ) {
    heading = "Carregando sentidos...";
    body = "Estou buscando os sentidos disponíveis para essa linha.";
  } else if (state.selectedDirection !== undefined) {
    heading = "Preparando confirmação...";
    body = "Estou montando o resumo da linha e do sentido.";
  } else if (state.screen === "slowLoadingNotice") {
    heading = "Ainda buscando...";
    body =
      "A conexão pode estar lenta. Você pode continuar ou procurar a linha manualmente.";
  }

  return (
    <section className={styles.hero} aria-labelledby="screen-title">
      <div className={styles.copyBlock}>
        <h1 id="screen-title" className={styles.titleCompact}>
          {heading}
        </h1>
        <p className={styles.body}>{body}</p>
        {selectedRouteLabel !== undefined ? (
          <RouteSummary routeLabel={selectedRouteLabel} />
        ) : null}
      </div>
    </section>
  );
}

function renderAdviceResult({
  advice,
  directionLabel,
  routeLabel,
}: {
  advice: Exclude<UiAdviceState, { mode: "withheld" }>;
  directionLabel?: string;
  routeLabel?: string;
}) {
  const variant = adviceVariantCopy(advice);

  return (
    <section className={styles.stack} aria-labelledby="screen-title">
      <p className={styles.progress}>4 de 4</p>
      <div className={styles.resultCard}>
        <div className={styles.resultHeader}>
          <p className={styles.resultEyebrow}>{variant.eyebrow}</p>
          {variant.badge !== undefined ? (
            <span className={styles.resultBadge}>{variant.badge}</span>
          ) : null}
        </div>
        <h1 id="screen-title" className={styles.titleCompact}>
          {variant.title}
        </h1>
        <p className={styles.body}>{variant.body}</p>
        <RouteSummary
          directionLabel={directionLabel}
          label="Linha confirmada"
          routeLabel={routeLabel}
        />
        {advice.mode !== "preview" &&
        advice.freshnessNotice === "recentFallback" ? (
          <div className={styles.noticePanel} role="status">
            <p>
              Usando sua última localização conhecida. Atualize quando estiver
              no ônibus.
            </p>
          </div>
        ) : null}
        {variant.previewNote !== undefined ? (
          <p className={styles.metaText}>{variant.previewNote}</p>
        ) : null}
        <AdviceBusDiagram advice={advice} summary={variant.accessibleSummary} />
        <p className={styles.estimateNotice}>{ESTIMATE_NOTICE}</p>
      </div>
    </section>
  );
}

function RouteCard({
  meta,
  onSelect,
  route,
}: {
  meta: string;
  onSelect(): void;
  route: RouteCandidate;
}) {
  return (
    <button
      aria-label={`Selecionar linha ${route.code} ${route.name}`}
      className={styles.choiceCard}
      onClick={onSelect}
      type="button"
    >
      <strong>
        {route.code} {route.name}
      </strong>
      <span>{meta}</span>
    </button>
  );
}

function DirectionCard({
  direction,
  onSelect,
}: {
  direction: DirectionChoice;
  onSelect(): void;
}) {
  return (
    <button
      aria-label={`Selecionar sentido ${direction.name}`}
      className={styles.choiceCard}
      onClick={onSelect}
      type="button"
    >
      <strong>{direction.name}</strong>
      <span>{direction.departureLabels.join(" · ")}</span>
    </button>
  );
}

function RouteSummary({
  directionLabel,
  label,
  routeLabel,
}: {
  directionLabel?: string;
  label?: string;
  routeLabel?: string;
}) {
  if (routeLabel === undefined) {
    return null;
  }

  return (
    <div className={styles.summaryPanel}>
      {label !== undefined ? (
        <p className={styles.summaryLabel}>{label}</p>
      ) : null}
      <strong>{routeLabel}</strong>
      {directionLabel !== undefined ? <span>{directionLabel}</span> : null}
    </div>
  );
}

function SchematicRouteMap({
  points,
}: {
  points: Array<{ lat: number; lng: number }>;
}) {
  const normalized = normalizeMapPoints(points);

  return (
    <div
      aria-label="Trajeto esquemático da linha selecionada"
      className={styles.mapShell}
      role="img"
    >
      <svg className={styles.mapSvg} viewBox="0 0 100 100" aria-hidden="true">
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="12"
          className={styles.mapBackdrop}
        />
        <polyline
          className={styles.mapLine}
          fill="none"
          points={normalized.join(" ")}
        />
        <circle
          className={styles.mapStart}
          cx={normalized[0]?.split(",")[0] ?? "12"}
          cy={normalized[0]?.split(",")[1] ?? "50"}
          r="4"
        />
        <circle
          className={styles.mapEnd}
          cx={normalized[normalized.length - 1]?.split(",")[0] ?? "88"}
          cy={normalized[normalized.length - 1]?.split(",")[1] ?? "50"}
          r="4"
        />
      </svg>
    </div>
  );
}

function normalizeMapPoints(
  points: Array<{ lat: number; lng: number }>
): string[] {
  if (points.length === 0) {
    return ["12,50", "88,50"];
  }

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.001);
  const lngSpan = Math.max(maxLng - minLng, 0.001);

  return points.map((point) => {
    const x = 12 + ((point.lng - minLng) / lngSpan) * 76;
    const y = 88 - ((point.lat - minLat) / latSpan) * 76;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
}

function nearbyRouteMeta(route: RouteCandidate): string {
  if (route.distanceMeters === undefined) {
    return "perto de você";
  }

  if (route.distanceMeters < 1000) {
    return `${route.distanceMeters} m de você`;
  }

  return `${(route.distanceMeters / 1000).toFixed(1)} km de você`;
}

function locationIssueLabel(
  issue: OnboardingFlowController["state"]["locationIssue"]
): string {
  switch (issue) {
    case "timeout":
      return "A tentativa de localização expirou antes de trazer as linhas próximas.";
    case "unavailable":
      return "Seu dispositivo não disponibilizou a localização agora.";
    case "denied":
    default:
      return "Você pode seguir sem localização e escolher a linha manualmente.";
  }
}

const ESTIMATE_NOTICE = "Estimativa pelo sol direto. Pode variar no caminho.";

function adviceVariantCopy(
  advice: Exclude<UiAdviceState, { mode: "withheld" }>
): {
  eyebrow: string;
  title: string;
  body: string;
  accessibleSummary: string;
  badge?: string;
  previewNote?: string;
} {
  if (advice.mode === "preview") {
    return {
      ...directionalAdviceCopy(advice.recommendedSeatArea),
      eyebrow: "Prévia da linha",
      badge: "Prévia",
      previewNote: previewDistanceCopy(advice.distanceFromRouteMeters),
    };
  }

  if (advice.mode === "neutralComputed") {
    if (advice.directSunExposure === "overhead") {
      return {
        eyebrow: "Resultado calculado",
        title: "Sem lado melhor agora",
        body: "Sol alto demais para uma lateral se destacar neste trecho.",
        accessibleSummary:
          "Diagrama neutro do ônibus. Nenhum lado do ônibus aparece como melhor área agora.",
      };
    }

    return {
      eyebrow: "Resultado calculado",
      title: "Sem sol direto relevante agora",
      body: "Não há sol direto suficiente para recomendar uma lateral neste trecho.",
      accessibleSummary:
        "Diagrama neutro do ônibus. Nenhum lado do ônibus aparece como melhor área agora.",
    };
  }

  return {
    ...directionalAdviceCopy(advice.recommendedSeatArea),
    eyebrow: "Agora no ônibus",
  };
}

function directionalAdviceCopy(
  recommendedSeatArea: "left" | "right" | "front" | "back"
) {
  switch (recommendedSeatArea) {
    case "left":
      return {
        title: "Sente à esquerda",
        body: "Esse lado deve pegar menos sol direto neste sentido.",
        accessibleSummary:
          "Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus.",
      };
    case "right":
      return {
        title: "Melhor sentar à direita",
        body: "Esse lado deve pegar menos sol direto neste sentido.",
        accessibleSummary:
          "Recomendação: sente à direita. O sol direto aparece do lado esquerdo do ônibus.",
      };
    case "front":
      return {
        title: "Prefira sentar mais à frente",
        body: "Parte da frente deve pegar menos sol direto neste sentido.",
        accessibleSummary:
          "Recomendação: sente mais à frente. O sol direto aparece mais forte na parte de trás do ônibus.",
      };
    case "back":
      return {
        title: "Prefira sentar mais atrás",
        body: "Parte de trás deve pegar menos sol direto neste sentido.",
        accessibleSummary:
          "Recomendação: sente mais atrás. O sol direto aparece mais forte na parte da frente do ônibus.",
      };
  }
}

function previewDistanceCopy(distanceFromRouteMeters?: number): string {
  if (distanceFromRouteMeters === undefined) {
    return "Prévia estimada para linha confirmada.";
  }

  return `Prévia estimada para linha confirmada, cerca de ${Math.round(distanceFromRouteMeters)} m fora da rota.`;
}

function withheldReasonCopy(reasonCode?: AdvisoryReasonCode): string {
  switch (reasonCode) {
    case "direction_unconfirmed":
      return "Ainda não consegui confirmar esse sentido com segurança.";
    case "missing_route_geometry":
      return "Essa linha não trouxe trajeto suficiente para calcular recomendação.";
    case "off_route_no_preview_point":
      return "Você parece estar fora da linha confirmada e não encontrei ponto confiável para prévia.";
    case "insufficient_sun_signal":
      return "Sinal de sol direto fraco demais para recomendar parte do ônibus agora.";
    case "service_unavailable":
      return "Serviço de recomendação não respondeu agora.";
    case "off_route_preview_available":
      return "Há indício de prévia possível, mas resultado útil não ficou pronto agora.";
    default:
      return "Não consegui calcular recomendação útil para essa linha neste momento.";
  }
}

function renderApiErrorFallbackAction(
  state: OnboardingFlowController["state"],
  actions: OnboardingFlowController["actions"]
) {
  if (state.error?.retryTarget?.kind === "geometry") {
    return (
      <Button onClick={actions.changeDirection} variant="secondary">
        Trocar sentido
      </Button>
    );
  }

  if (state.error?.retryTarget?.kind === "manualSearch") {
    return (
      <Button onClick={actions.useLocation} variant="secondary">
        Usar minha localização
      </Button>
    );
  }

  return (
    <Button onClick={actions.openManualSearch} variant="secondary">
      Procurar linha manualmente
    </Button>
  );
}
