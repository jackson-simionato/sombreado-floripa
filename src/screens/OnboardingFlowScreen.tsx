import { useRef } from "react";
import type { ReactNode } from "react";

import { AdviceResultSurface } from "../components/AdviceResultSurface";
import { AppShell } from "../components/AppShell";
import { BrandHeader } from "../components/BrandHeader";
import { BusSplitDiagram } from "../components/BusSplitDiagram";
import { Button } from "../components/Button";
import { ChoiceCard } from "../components/ChoiceCard";
import { Notice } from "../components/Notice";
import { Panel } from "../components/Panel";
import { RouteSummaryCard } from "../components/RouteSummaryCard";
import { RouteCodeBadge } from "../components/RouteCodeBadge";
import { ScreenHeader } from "../components/ScreenHeader";
import { StickyActions } from "../components/StickyActions";
import { TextField } from "../components/TextField";
import type {
  AdvisoryReasonCode,
  DirectionChoice,
  RouteCandidate,
  RouteDirectionKind,
} from "../domain/types";
import type { OnboardingFlowController } from "../hooks/useOnboardingFlow";
import type { AdviceRecent } from "../recents/adviceRecents";
import { copy } from "../content/copy";

import {
  formatNearbyRouteDistance,
  formatNearbyRouteMeta,
} from "./nearbyRouteMeta";

import styles from "./OnboardingFlowScreen.module.css";

type OnboardingFlowScreenProps = {
  controller: OnboardingFlowController;
};

export function OnboardingFlowScreen({
  controller,
}: OnboardingFlowScreenProps) {
  const { actions, manualQueryDraft, recents, state } = controller;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedRouteLabel =
    state.selectedRoute === undefined
      ? undefined
      : `${state.selectedRoute.code} ${state.selectedRoute.name}`;
  const selectedDirectionContext =
    state.selectedDirection === undefined
      ? undefined
      : formatDirectionContext(state.selectedDirection);

  const mapPoints = state.geometry?.polyline ?? [];

  let content: ReactNode;
  let stickyPrimary: ReactNode = null;
  let stickySecondary: ReactNode = null;

  switch (state.screen) {
    case "locationRequest":
      content = (
        <>
          <BrandHeader />
          <section className={styles.hero} aria-labelledby="screen-title">
            <ScreenHeader
              body={recents.length > 0 ? undefined : copy.locationRequest.body}
              title={
                recents.length > 0 ? (
                  <>
                    Viaje na <span className={styles.heroAccent}>sombra.</span>
                  </>
                ) : (
                  <>
                    Viaje na
                    <br />
                    <span className={styles.heroAccent}>sombra.</span>
                  </>
                )
              }
              variant={recents.length > 0 ? "compact" : "hero"}
            />
            <BusSplitDiagram />
          </section>
          <p className={styles.metaText}>
            {copy.locationRequest.locationNotice}
          </p>
          {state.routeRefreshNotice === "routeVersionStale" ? (
            <Notice tone="warning">
              As opções desta linha foram atualizadas. Escolha a linha e o
              sentido novamente.
            </Notice>
          ) : null}
          {recents.length > 0 ? (
            <div className={styles.recents} data-testid="advice-recents">
              <p className={styles.summaryLabel}>
                {copy.locationRequest.recents}
              </p>
              <div
                aria-label={copy.locationRequest.recents}
                className={styles.carousel}
                data-recents-count={recents.length}
                data-testid="advice-recents-carousel"
                role="list"
              >
                {recents.map((recent) => (
                  <div
                    className={styles.slide}
                    key={`${recent.routeId}:${recent.routeDirectionId}`}
                    role="listitem"
                  >
                    <RecentCard
                      onSelect={() => actions.selectRecent(recent)}
                      recent={recent}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
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
          <ScreenHeader
            body="Você ainda pode escolher sua linha manualmente."
            title="Localização desativada"
            variant="hero"
          />
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
          <ScreenHeader
            body="Mostramos linhas perto de você. O sentido vem no próximo passo."
            eyebrow="1 de 4"
            title="Escolha sua linha"
          />
          {state.routeRefreshNotice === "routeVersionStale" ? (
            <Notice tone="warning">
              As opções desta linha foram atualizadas. Escolha a linha e o
              sentido novamente.
            </Notice>
          ) : null}
          <div className={styles.list}>
            {state.nearbyCandidates.map((route) => (
              <RouteCard
                key={route.routeId}
                route={route}
                meta={formatNearbyRouteMeta(route.distanceMeters)}
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
          <ScreenHeader
            body="Use a seleção manual para escolher pelo número ou nome da linha."
            title="Não encontrei linhas perto de você"
          />
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
          <ScreenHeader
            body={
              state.screen === "noManualResults"
                ? "Confira o número ou tente um destino."
                : "Digite o número ou nome da linha."
            }
            title={
              state.screen === "noManualResults"
                ? "Nenhuma linha encontrada"
                : "Procurar linha"
            }
          />
          <TextField
            ref={searchInputRef}
            aria-label="Linha"
            label="Linha"
            onChange={(event) => actions.searchManually(event.target.value)}
            placeholder="124 ou Lagoa"
            type="search"
            value={manualQueryDraft}
          />
          {state.routeRefreshNotice === "routeVersionStale" ? (
            <Notice tone="warning">
              As opções desta linha foram atualizadas. Escolha a linha e o
              sentido novamente.
            </Notice>
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
                  meta={
                    route.distanceMeters === undefined
                      ? "linha"
                      : formatNearbyRouteDistance(route.distanceMeters)
                  }
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
          <ScreenHeader
            eyebrow="2 de 4"
            title="Carregando sentidos desta linha..."
          />
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
          <ScreenHeader
            body="Use o destino ou bairro para confirmar para onde o ônibus vai."
            eyebrow="2 de 4"
            title="Escolha o sentido"
          />
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
          <ScreenHeader
            body="A linha e o sentido estão prontos para calcular a recomendação."
            title="Linha confirmada"
          />
          <RouteSummary
            directionLabel={selectedDirectionContext}
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
          <ScreenHeader
            body="Essa linha ainda não tem sentidos disponíveis."
            title="Não é possível confirmar o sentido"
          />
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
          <ScreenHeader
            body="Confira se a linha e o sentido combinam com o ônibus."
            eyebrow="3 de 4"
            title="Confirme sua linha"
          />
          <RouteSummary
            directionLabel={selectedDirectionContext}
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
          <ScreenHeader eyebrow="3 de 4" title="Confirme sua linha" />
          <Notice title="Mapa indisponível" tone="warning">
            Ainda é possível confirmar pela linha e pelo sentido.
          </Notice>
          <RouteSummary
            directionLabel={selectedDirectionContext}
            routeLabel={selectedRouteLabel}
          />
          <Panel>
            <p className={styles.summaryLabel}>Confirmação compacta</p>
            <p className={styles.metaText}>
              {state.mapAvailability === "unavailable"
                ? "O mapa foi desativado neste cenário de teste."
                : "Essa linha não trouxe geometria suficiente para desenhar o trajeto."}
            </p>
          </Panel>
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
          <ScreenHeader
            body="Vamos comparar esquerda e direita no sentido escolhido."
            eyebrow="4 de 4"
            title="Calculando pelo sol direto..."
          />
          <RouteSummary
            directionLabel={selectedDirectionContext}
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
        content = (
          <AdviceResultSurface
            advice={state.advice}
            context={
              state.screen === "routePreviewAdviceResult"
                ? "preview"
                : "freshnessNotice" in state.advice &&
                    state.advice.freshnessNotice === "recentFallback"
                  ? "recent"
                  : "onboard"
            }
            directionLabel={selectedDirectionContext}
            onChangeDirection={actions.changeDirection}
            onChangeRoute={actions.changeRoute}
            onRefresh={actions.refreshAdvice}
            route={state.selectedRoute}
          />
        );
      } else {
        content = null;
      }
      break;

    case "trueWithheld":
      content = (
        <section className={styles.stack} aria-labelledby="screen-title">
          <ScreenHeader
            body={withheldReasonCopy(
              state.advice?.mode === "withheld"
                ? state.advice.reasonCode
                : undefined
            )}
            eyebrow="Sem recomendação útil"
            title="Não é possível recomendar agora"
          />
          <RouteSummary
            directionLabel={selectedDirectionContext}
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
          <ScreenHeader
            body="Não consegui carregar as informações agora."
            title="Algo deu errado"
          />
          {selectedRouteLabel !== undefined ? (
            <RouteSummary
              directionLabel={selectedDirectionContext}
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
          <ScreenHeader title="Tela reservada para o próximo passo" />
        </section>
      );
  }

  return (
    <AppShell>
      <div className={styles.screen}>{content}</div>
      {stickyPrimary !== null || stickySecondary !== null ? (
        <StickyActions>
          {stickyPrimary}
          {stickySecondary}
        </StickyActions>
      ) : null}
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
      <ScreenHeader body={body} title={heading} />
      {selectedRouteLabel !== undefined ? (
        <RouteSummary routeLabel={selectedRouteLabel} />
      ) : null}
    </section>
  );
}

function RecentCard({
  onSelect,
  recent,
}: {
  onSelect(): void;
  recent: AdviceRecent;
}) {
  return (
    <ChoiceCard
      ariaLabel={`Selecionar linha ${recent.routeCode} ${recent.routeName}, ${recent.directionLabel}`}
      badge={<RouteCodeBadge code={recent.routeCode} />}
      className={styles.recentCard}
      compact
      label={recent.routeName}
      meta={recent.directionLabel}
      onSelect={onSelect}
    />
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
    <ChoiceCard
      ariaLabel={`Selecionar linha ${route.code} ${route.name}`}
      badge={<RouteCodeBadge code={route.code} />}
      label={route.name}
      meta={meta}
      onSelect={onSelect}
    />
  );
}

function DirectionCard({
  direction,
  onSelect,
}: {
  direction: DirectionChoice;
  onSelect(): void;
}) {
  const directionKindLabel = formatRouteDirectionKind(direction.directionKind);

  return (
    <ChoiceCard
      ariaLabel={`Selecionar sentido ${direction.name}${
        directionKindLabel === undefined ? "" : `, ${directionKindLabel}`
      }`}
      eyebrow={directionKindLabel}
      label={direction.name}
      meta={direction.departureLabels.join(" · ")}
      onSelect={onSelect}
    />
  );
}

function formatDirectionContext(
  direction: Pick<DirectionChoice, "directionKind" | "name">
): string {
  const directionKindLabel = formatRouteDirectionKind(direction.directionKind);
  if (directionKindLabel === undefined) {
    return direction.name;
  }

  return `${direction.name} · ${directionKindLabel}`;
}

function formatRouteDirectionKind(
  directionKind: RouteDirectionKind | null
): string | undefined {
  if (directionKind === null) {
    return undefined;
  }

  return directionKind === "ida" ? "Ida" : "Volta";
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

  const routeParts = splitRouteLabel(routeLabel);

  return (
    <RouteSummaryCard
      directionLabel={directionLabel}
      label={label}
      routeCode={routeParts.routeCode}
      routeName={routeParts.routeName}
    />
  );
}

function splitRouteLabel(routeLabel: string): {
  routeCode?: string;
  routeName: string;
} {
  const [routeCode, ...nameParts] = routeLabel.split(" ");

  return {
    routeCode,
    routeName: nameParts.length > 0 ? nameParts.join(" ") : routeLabel,
  };
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
