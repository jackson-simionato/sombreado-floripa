import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import HomePage from "../app/page";

describe("home screen", () => {
  test("renders the location request copy and actions", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "De que lado sentar?" })).toBeInTheDocument();
    expect(screen.getByText("Encontre a melhor lateral do ônibus pelo sol direto.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Usar minha localização" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Procurar linha manualmente" })).toBeInTheDocument();
    expect(screen.getByText("A localização só é usada para encontrar linhas perto de você.")).toBeInTheDocument();
  });

  test("does not call browser geolocation when requesting the temporary loading state", async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: {
        getCurrentPosition
      }
    });

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Usar minha localização" }));

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Buscando linhas perto de você..." })).toBeInTheDocument();
    expect(screen.getByText("Isso deve levar poucos segundos.")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  test("shows a temporary message for manual search before that flow exists", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Procurar linha manualmente" }));

    expect(screen.getByText("A busca manual entra no próximo passo do protótipo.")).toBeInTheDocument();
  });
});
