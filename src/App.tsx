import { useEffect, useRef, useState, type ReactNode } from "react";
import logoImage from "../Название_Лого_слоган.svg";
import {
  roundToTenth,
  useControlStationStore,
type ServoDirection,
  type StationTab,
} from "./store/useControlStationStore";

type ServoArrowState = "closed" | "middle" | "open";

const tabs: Array<{ id: StationTab; label: string }> = [
  { id: "main", label: "Гл. меню" },
  { id: "crane", label: "Кран" },
  { id: "paws", label: "Лапы" },
  { id: "servo", label: "Сервопривод" },
  { id: "debug", label: "Debug mode" },
  { id: "settings", label: "Настройки" },
];

const formatNumber = (value: number) => (Number.isInteger(value) ? `${value}` : value.toFixed(1));

const parseNumericDraft = (draft: string, fallback: number) => {
  const parsed = Number(draft.replace(",", "."));

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return roundToTenth(parsed);
};

function EditableNumber({
  ariaLabel,
  value,
  onCommit,
}: {
  ariaLabel: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(formatNumber(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(formatNumber(value));
    }
  }, [isEditing, value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitValue = () => {
    onCommit(parseNumericDraft(draft, value));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="editable-number editable-number--input"
        aria-label={ariaLabel}
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitValue}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitValue();
          }

          if (event.key === "Escape") {
            setDraft(formatNumber(value));
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="editable-number"
      aria-label={ariaLabel}
      onClick={() => setIsEditing(true)}
    >
      {formatNumber(value)}
    </button>
  );
}

function PhotoPlaceholder({
  label,
  className = "",
  variant = "default",
  children,
}: {
  label: string;
  className?: string;
  variant?: "default" | "map-grid";
  children?: ReactNode;
}) {
  return (
    <div
      className={`photo-placeholder ${
        variant === "map-grid" ? "photo-placeholder--map-grid" : ""
      } ${className}`.trim()}
    >
      {variant === "map-grid" && (
        <div className="photo-placeholder__grid" aria-hidden="true">
          {Array.from({ length: 36 }, (_, index) => (
            <span key={index} className="photo-placeholder__cell" />
          ))}
        </div>
      )}
      {children}
      {label ? <span>{label}</span> : null}
    </div>
  );
}

function RobotMapMarker({ heading }: { heading: number }) {
  return (
    <div className="map-robot-marker">
      <svg className="map-robot-marker__icon" viewBox="0 0 32 32" aria-hidden="true">
        <g transform={`rotate(${heading} 16 16)`}>
          <path className="map-robot-marker__shape" d="M16 7 L23.5 23.5 L16.8 19.8 L10 25 L16 7 Z" />
        </g>
      </svg>
    </div>
  );
}

function LogPlaceholder() {
  return <div className="empty-box">Логи</div>;
}

function DirectionButton({
  direction,
  currentDirection,
  icon,
  accentClass,
  ariaLabel,
  onClick,
}: {
  direction: ServoDirection;
  currentDirection: ServoDirection;
  icon: string;
  accentClass: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rotation-panel__button ${currentDirection === direction ? "is-active" : ""}`.trim()}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <span className={`rotation-panel__icon ${accentClass}`.trim()}>{icon}</span>
    </button>
  );
}

function SelectorArrow({ state }: { state: ServoArrowState }) {
  return (
    <svg
      className={`selector-arrow selector-arrow--${state}`.trim()}
      viewBox="0 0 36 18"
      aria-hidden="true"
    >
      <g className="selector-arrow__shape selector-arrow__shape--closed">
        <path d="M9 6 L18 12 L27 6" />
      </g>
      <g className="selector-arrow__shape selector-arrow__shape--middle">
        <path d="M9 9 L27 9" />
      </g>
      <g className="selector-arrow__shape selector-arrow__shape--open">
        <path d="M9 12 L18 6 L27 12" />
      </g>
    </svg>
  );
}

function App() {
  const store = useControlStationStore();
  const servoMenuRef = useRef<HTMLDivElement>(null);
  const arrowTimeoutRef = useRef<number | null>(null);
  const hasArrowAnimatedRef = useRef(false);
  const [servoArrowState, setServoArrowState] = useState<ServoArrowState>(
    store.isServoMenuOpen ? "open" : "closed",
  );
  const selectedPaw = store.paws.find((paw) => paw.id === store.selectedPawId) ?? store.paws[0];
  const selectedServo =
    store.servos.find((servo) => servo.id === store.selectedServoId) ?? store.servos[0];

  useEffect(() => {
    const timers = new Map<HTMLButtonElement, number>();

    const flashButton = (button: HTMLButtonElement) => {
      const previousTimer = timers.get(button);

      if (previousTimer) {
        window.clearTimeout(previousTimer);
      }

      button.classList.remove("is-pressed");
      void button.offsetWidth;
      button.classList.add("is-pressed");

      const timerId = window.setTimeout(() => {
        button.classList.remove("is-pressed");
        timers.delete(button);
      }, 180);

      timers.set(button, timerId);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const button = target.closest("button");

      if (!(button instanceof HTMLButtonElement) || button.disabled) {
        return;
      }

      flashButton(button);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);

      timers.forEach((timerId, button) => {
        window.clearTimeout(timerId);
        button.classList.remove("is-pressed");
      });

      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!hasArrowAnimatedRef.current) {
      hasArrowAnimatedRef.current = true;
      setServoArrowState(store.isServoMenuOpen ? "open" : "closed");
      return;
    }

    if (arrowTimeoutRef.current !== null) {
      window.clearTimeout(arrowTimeoutRef.current);
    }

    setServoArrowState("middle");

    arrowTimeoutRef.current = window.setTimeout(() => {
      setServoArrowState(store.isServoMenuOpen ? "open" : "closed");
      arrowTimeoutRef.current = null;
    }, 110);

    return () => {
      if (arrowTimeoutRef.current !== null) {
        window.clearTimeout(arrowTimeoutRef.current);
        arrowTimeoutRef.current = null;
      }
    };
  }, [store.isServoMenuOpen]);

  useEffect(() => {
    if (!store.isServoMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (servoMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      store.closeServoMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [store]);

  return (
    <div className="station-shell">
      <header className="tabs-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${store.activeTab === tab.id ? "is-active" : ""}`.trim()}
            onClick={() => store.setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </header>

      <main className="panel-frame">
        {store.activeTab === "main" && (
          <section className="layout-main">
            <div className="ux-panel ux-panel--photo layout-main__map">
              <PhotoPlaceholder label="" variant="map-grid">
                <div className="map-robot-layer" aria-hidden="true">
                  <div
                    className="map-robot-layer__marker"
                    style={{
                      left: `${store.mapRobot.x}%`,
                      top: `${store.mapRobot.y}%`,
                    }}
                  >
                    <RobotMapMarker heading={store.mapRobot.heading} />
                  </div>
                </div>
              </PhotoPlaceholder>
            </div>

            <div className="ux-panel ux-panel--photo layout-main__sticker">
              <PhotoPlaceholder label={store.stickerPhotoLabel} />
            </div>

            <div className="ux-panel layout-main__logs">
              <LogPlaceholder />
            </div>
          </section>
        )}

        {store.activeTab === "crane" && (
          <section className="layout-crane">
            <div className="ux-panel ux-panel--photo layout-crane__visual">
              <PhotoPlaceholder label={store.cranePhotoLabel} />
              <div className="position-badge">{store.cranePosition}</div>
            </div>

            <button type="button" className="ux-button layout-crane__extend" onClick={store.extendCrane}>
              Выдвинуть
            </button>

            <button
              type="button"
              className="ux-button ux-button--danger layout-crane__release"
              onClick={store.releaseCranePayload}
            >
              Выброс
            </button>

            <button type="button" className="ux-button layout-crane__retract" onClick={store.retractCrane}>
              Задвинуть
            </button>

            <div className="ux-panel layout-crane__logo">
              <img src={logoImage} alt="AIX" className="logo-image" />
            </div>

            <div className="slider-strip layout-crane__slider">
              <div className="slider-strip__control">
                <div className="slider-strip__track" aria-hidden="true" />
                <div
                  className="slider-strip__thumb"
                  aria-hidden="true"
                  style={{ left: `${((store.cranePosition - 1) / 9) * 100}%` }}
                />
                <input
                  className="slider-strip__input"
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={store.cranePosition}
                  onChange={(event) => store.setCranePosition(Number(event.target.value))}
                />
              </div>
              <div className="slider-scale" aria-hidden="true">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((position) => (
                  <span
                    key={position}
                    className={`slider-scale__label ${position === store.cranePosition ? "is-current" : ""}`.trim()}
                    style={{ left: `${((position - 1) / 9) * 100}%` }}
                  >
                    {position}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {store.activeTab === "paws" && selectedPaw && (
          <section className="layout-paws">
            <div className="layout-paws__top">
              <div className="paw-list">
                {store.paws.map((paw) => (
                  <button
                    key={paw.id}
                    type="button"
                    className={`ux-button paw-list__button ${store.selectedPawId === paw.id ? "is-active" : ""}`.trim()}
                    onClick={() => store.selectPaw(paw.id)}
                  >
                    {paw.name}
                  </button>
                ))}
              </div>

              <div
                className={`ux-panel ux-panel--photo layout-paws__preview ${
                  selectedPaw.id !== 1 ? "layout-paws__preview--wide" : ""
                }`.trim()}
              >
                <PhotoPlaceholder label={selectedPaw.photoLabel} />
              </div>

              {selectedPaw.id === 1 && (
                <div className="paw-side-actions">
                  <button
                    type="button"
                    className="ux-button"
                    onClick={() => store.setPawCaptured(true)}
                  >
                    Захватить
                  </button>

                  <button
                    type="button"
                    className="ux-button"
                    onClick={() => store.setPawCaptured(false)}
                  >
                    Отпустить
                  </button>
                </div>
              )}
            </div>

            <div className="layout-paws__bottom">
              <button
                type="button"
                className="ux-button"
                onClick={() => store.setPawExtended(true)}
              >
                Выдвинуть
              </button>

              <button
                type="button"
                className="ux-button"
                onClick={() => store.setPawExtended(false)}
              >
                Задвинуть
              </button>
            </div>
          </section>
        )}

        {store.activeTab === "servo" && selectedServo && (
          <section className="layout-servo">
            <div className="ux-panel layout-servo__rotation">
              <div className="rotation-panel">
                <div className="rotation-panel__label">Установить поворот</div>
                <DirectionButton
                  direction="counterclockwise"
                  currentDirection={selectedServo.direction}
                  icon="↺"
                  accentClass="rotation-panel__icon--blue"
                  ariaLabel="Поворот против часовой стрелки"
                  onClick={() => store.setServoDirection("counterclockwise")}
                />
                <DirectionButton
                  direction="clockwise"
                  currentDirection={selectedServo.direction}
                  icon="↻"
                  accentClass="rotation-panel__icon--amber"
                  ariaLabel="Поворот по часовой стрелке"
                  onClick={() => store.setServoDirection("clockwise")}
                />
              </div>
            </div>

            <div className="ux-panel layout-servo__selector" ref={servoMenuRef}>
                <button
                  type="button"
                  className={`selector-button ${store.isServoMenuOpen ? "is-open" : ""}`.trim()}
                  onClick={store.toggleServoMenu}
                >
                  <span>{selectedServo.name}</span>
                  <span className="selector-button__arrow">
                    <SelectorArrow state={servoArrowState} />
                  </span>
                </button>

                <div
                  className={`selector-menu-shell ${store.isServoMenuOpen ? "is-open" : ""}`.trim()}
                  aria-hidden={!store.isServoMenuOpen}
                >
                  <div className="selector-menu">
                    {store.servos.map((servo) => (
                      <button
                        key={servo.id}
                        type="button"
                        className={`selector-menu__item ${servo.id === selectedServo.id ? "is-active" : ""}`.trim()}
                        onClick={() => store.selectServo(servo.id)}
                        tabIndex={store.isServoMenuOpen ? 0 : -1}
                      >
                        {servo.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            <div className="ux-panel layout-servo__position">
              <div className="position-panel__title">Текущая позиция</div>
              <PhotoPlaceholder label={selectedServo.photoLabel} className="position-panel__photo" />
              <div className="position-panel__value">{formatNumber(selectedServo.currentPosition)}</div>
            </div>

            <div className="value-card layout-servo__target">
              <button
                type="button"
                className="value-card__label"
                onClick={() => store.applyServoTarget("targetPosition")}
              >
                Вывести в
              </button>
              <div className="value-card__value value-card__value--static">0</div>
            </div>

            <div className="value-card layout-servo__step">
              <div className="value-card__label value-card__label--static">Шаг</div>
              <EditableNumber
                ariaLabel="Шаг сервопривода"
                value={selectedServo.step}
                onCommit={(value) => store.setServoValue("step", value)}
              />
            </div>

            <button
              type="button"
              className="ux-button layout-servo__zero"
              onClick={store.setServoZeroFromCurrent}
            >
              Установить новый 0
            </button>

            <button
              type="button"
              className="ux-button ux-button--arrow layout-servo__back"
              onClick={() => store.moveServoByStep("backward")}
              aria-label="Сместить сервопривод назад"
            >
              <span className="arrow arrow--blue">←</span>
            </button>

            <div className="value-card layout-servo__quick">
              <button
                type="button"
                className="value-card__label"
                onClick={() => store.applyServoTarget("quickPosition")}
              >
                Вывести в
              </button>
              <EditableNumber
                ariaLabel="Быстрое положение сервопривода"
                value={selectedServo.quickPosition}
                onCommit={(value) => store.setServoValue("quickPosition", value)}
              />
            </div>

            <button
              type="button"
              className="ux-button ux-button--arrow layout-servo__forward"
              onClick={() => store.moveServoByStep("forward")}
              aria-label="Сместить сервопривод вперёд"
            >
              <span className="arrow arrow--green">→</span>
            </button>
          </section>
        )}

        {store.activeTab === "debug" && (
          <section className="single-panel">
            <div className="ux-panel ux-panel--full">
              <LogPlaceholder />
            </div>
          </section>
        )}

        {store.activeTab === "settings" && (
          <section className="single-panel">
            <div className="ux-panel ux-panel--full">
              <div className="empty-box empty-box--blank" />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
