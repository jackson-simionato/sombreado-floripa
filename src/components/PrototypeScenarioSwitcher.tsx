"use client";

import type { PrototypeScenarioId } from "../domain/types";
import { prototypeScenarios } from "../mocks/scenarioStates";

import styles from "./PrototypeScenarioSwitcher.module.css";

type PrototypeScenarioSwitcherProps = {
  selectedScenarioId: PrototypeScenarioId;
  onChange(nextScenarioId: PrototypeScenarioId): void;
};

export function PrototypeScenarioSwitcher({ onChange, selectedScenarioId }: PrototypeScenarioSwitcherProps) {
  return (
    <aside className={styles.tray} aria-label="Controles de protótipo">
      <label className={styles.field}>
        <span className={styles.label}>Protótipo</span>
        <select
          aria-label="Protótipo"
          className={styles.select}
          onChange={(event) => onChange(event.target.value as PrototypeScenarioId)}
          value={selectedScenarioId}
        >
          {prototypeScenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.label}
            </option>
          ))}
        </select>
      </label>
    </aside>
  );
}
