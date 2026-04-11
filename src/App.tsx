import { useEffect, useRef, useState } from "react";

import dashboardIcon from "../images/icon-dashboard.svg";
import startButtonImage from "../images/button-start-3.png";
import lightningIcon from "../images/green-lightning.svg";
import mapImage from "../images/map.png";

type ActiveTab = "main" | "kran" | "lapa" | "servo" | "telemetry";

const tabs = [
  { id: "main", label: "Main", implemented: true },
  { id: "kran", label: "Kran", implemented: true },
  { id: "lapa", label: "Lapa", implemented: true },
  { id: "servo", label: "Servo", implemented: true },
  { id: "telemetry", label: "Telemetry", implemented: true },
  { id: "label-2", label: "Label", implemented: false },
] as const;

const systemStatuses = [
  "Подключение с роботом",
  "Предварительная проверка",
  "Подключение с контроллером",
  "Состояние батареи",
] as const;

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));
const clampUnit = (value: number) => Math.max(0, Math.min(1, value));

const robotChargeLevel = 38;
const batteryRadius = 46;
const lapaGuideTravel = 272;
const servoOptions = ["Сервопривод №1"] as const;
const telemetryOptions = ["Общая информация", "Колесная база", "Подъемник"] as const;

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("main");
  const [kranMode, setKranMode] = useState<"auto" | "manual">("manual");
  const [kranAction, setKranAction] = useState<"home" | "throw">("throw");
  const [selectedLapa, setSelectedLapa] = useState<1 | 2 | 3>(1);
  const [selectedServoOption, setSelectedServoOption] = useState<(typeof servoOptions)[number]>("Сервопривод №1");
  const [isServoDropdownOpen, setIsServoDropdownOpen] = useState(false);
  const [selectedTelemetryOption, setSelectedTelemetryOption] = useState<(typeof telemetryOptions)[number]>(
    "Общая информация",
  );
  const [isTelemetryDropdownOpen, setIsTelemetryDropdownOpen] = useState(false);
  const [lapaScrollRatio, setLapaScrollRatio] = useState(0);
  const [isLapaGuideDragging, setIsLapaGuideDragging] = useState(false);
  const lapaPreviewRef = useRef<HTMLDivElement>(null);
  const lapaGuideRef = useRef<HTMLDivElement>(null);
  const servoDropdownRef = useRef<HTMLDivElement>(null);
  const telemetryDropdownRef = useRef<HTMLDivElement>(null);

  const scrollLapaPreviewToRatio = (nextRatio: number) => {
    const preview = lapaPreviewRef.current;
    const clampedRatio = clampUnit(nextRatio);

    setLapaScrollRatio(clampedRatio);

    if (!preview) {
      return;
    }

    const maxScrollTop = preview.scrollHeight - preview.clientHeight;

    preview.scrollTop = maxScrollTop > 0 ? maxScrollTop * clampedRatio : 0;
  };

  const syncLapaPreviewFromGuide = (clientY: number) => {
    const guide = lapaGuideRef.current;

    if (!guide) {
      return;
    }

    const guideRect = guide.getBoundingClientRect();
    const nextRatio = (clientY - guideRect.top - 8) / lapaGuideTravel;

    scrollLapaPreviewToRatio(nextRatio);
  };

  const handleLapaPreviewScroll = (element: HTMLDivElement) => {
    const maxScrollTop = element.scrollHeight - element.clientHeight;

    setLapaScrollRatio(maxScrollTop > 0 ? element.scrollTop / maxScrollTop : 0);
  };

  useEffect(() => {
    if (!isServoDropdownOpen && !isTelemetryDropdownOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (servoDropdownRef.current?.contains(event.target as Node)) {
        return;
      }

      if (telemetryDropdownRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsServoDropdownOpen(false);
      setIsTelemetryDropdownOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isServoDropdownOpen, isTelemetryDropdownOpen]);

  return (
    <main className="main-screen">
      <nav className="top-tabs glass-panel" aria-label="Основные вкладки">
        <div className="top-tabs__icon-shell">
          <img className="top-tabs__icon" src={dashboardIcon} alt="" aria-hidden="true" />
        </div>

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`top-tabs__button ${isActive ? "is-active" : ""}`.trim()}
              aria-current={isActive ? "page" : undefined}
              disabled={!tab.implemented}
              onClick={() => {
                if (
                  tab.id === "main" ||
                  tab.id === "kran" ||
                  tab.id === "lapa" ||
                  tab.id === "servo" ||
                  tab.id === "telemetry"
                ) {
                  setActiveTab(tab.id);
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="main-layout">
        <div className="left-column">
          <div className="clock-card glass-panel" aria-label="Таймер миссии">
            <time dateTime="PT0H0M0S">00:00:00</time>
          </div>

          {activeTab === "main" ? (
            <div className="start-panel__card glass-panel">
              <p className="start-panel__label">Запуск автономного режима</p>

              <button type="button" className="start-panel__button" aria-label="Запуск">
                <img className="start-panel__image" src={startButtonImage} alt="" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <div className="battery-widget">
            <div
              className="battery-widget__card glass-panel"
              aria-label={`Заряд робота ${clampPercentage(robotChargeLevel)} процентов`}
            >
              <svg className="battery-widget__ring" viewBox="0 0 120 120" aria-hidden="true">
                <circle className="battery-widget__track" cx="60" cy="60" r={batteryRadius} />
                <circle
                  className="battery-widget__progress"
                  cx="60"
                  cy="60"
                  r={batteryRadius}
                  pathLength="100"
                  style={{ strokeDashoffset: 100 - clampPercentage(robotChargeLevel) }}
                />
              </svg>

              <img className="battery-widget__icon" src={lightningIcon} alt="" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="status-panel glass-panel">
          {activeTab === "main" ? (
            <div className="status-panel__main">
              <div className="status-card glass-panel" aria-label="Состояние системы">
                <h1 className="status-card__title">Состояние системы</h1>

                <ul className="status-card__list">
                  {systemStatuses.map((item) => (
                    <li key={item} className="status-card__item">
                      <span className="status-card__dot" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="map-card glass-panel" aria-label="Карта площадки">
                <img className="map-card__image" src={mapImage} alt="Карта площадки" />
              </div>
            </div>
          ) : activeTab === "kran" ? (
            <div className="kran-panel" aria-label="Вкладка крана">
              <div className="kran-preview glass-panel" aria-label="Просмотр крана"></div>

              <div className="kran-controls">
                <section className="kran-mode-card glass-panel" aria-label="Текущий режим">
                  <div className="kran-mode-card__header">
                    <h1 className="kran-mode-card__title">Текущий режим</h1>
                    <div className="kran-mode-card__panel glass-panel">
                      <div className="kran-mode-card__switch">
                        <button
                          type="button"
                          className={`kran-mode-card__mode ${kranMode === "auto" ? "is-active" : ""}`.trim()}
                          aria-pressed={kranMode === "auto"}
                          onClick={() => setKranMode("auto")}
                        >
                          Авто
                        </button>
                        <button
                          type="button"
                          className={`kran-mode-card__mode ${kranMode === "manual" ? "is-active" : ""}`.trim()}
                          aria-pressed={kranMode === "manual"}
                          onClick={() => setKranMode("manual")}
                        >
                          Ручной
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="kran-mode-card__selector">
                    <span className="kran-mode-card__selector-label">Текущая позиция</span>

                    <div className="kran-mode-card__selector-controls" aria-hidden="true">
                      <button className="kran-mode-card__arrow">⌃</button>
                      <button className="kran-mode-card__arrow">⌄</button>
                    </div>
                  </div>
                </section>

                <section className="kran-actions glass-panel" aria-label="Действия крана">
                  <button
                    type="button"
                    className={`kran-actions__secondary ${kranAction === "home" ? "is-active" : ""}`.trim()}
                    aria-pressed={kranAction === "home"}
                    onClick={() => setKranAction("home")}
                  >
                    Исходное
                  </button>
                  <button
                    type="button"
                    className={`kran-actions__primary ${kranAction === "throw" ? "is-active" : ""}`.trim()}
                    aria-pressed={kranAction === "throw"}
                    onClick={() => setKranAction("throw")}
                  >
                    Выбросить
                  </button>
                </section>
              </div>
            </div>
          ) : activeTab === "lapa" ? (
            <div className="lapa-panel" aria-label="Вкладка лапы">
              <div className="lapa-choosing">
                <h1 className="lapa-panel__title">Выбор лапы</h1>

                <div className="lapa-panel__tabs" aria-label="Выбор лапы">
                  {[1, 2, 3].map((lapa) => (
                    <button
                      key={lapa}
                      type="button"
                      className={`lapa-panel__tab ${selectedLapa === lapa ? "is-active" : ""}`.trim()}
                      onClick={() => setSelectedLapa(lapa as 1 | 2 | 3)}
                    >
                      {`Лапа ${lapa}`}
                    </button>
                  ))}
                </div>

                <div className="lapa-panel__actions" aria-label="Команды лапы">
                  <button type="button" className="lapa-panel__action">
                    Захватить
                  </button>
                  <button type="button" className="lapa-panel__action">
                    Отпустить
                  </button>
                </div>
              </div>
              <div className="lapa-preview lapa-preview--side glass-panel" aria-label="Боковой просмотр лапы">
                <div
                  ref={lapaGuideRef}
                  className={`lapa-preview__guide ${isLapaGuideDragging ? "is-dragging" : ""}`.trim()}
                  role="scrollbar"
                  aria-label="Прокрутка бокового просмотра лапы"
                  aria-controls="lapa-preview-scroll"
                  aria-orientation="vertical"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(lapaScrollRatio * 100)}
                  tabIndex={0}
                  onPointerDown={(event) => {
                    setIsLapaGuideDragging(true);
                    event.currentTarget.setPointerCapture(event.pointerId);
                    syncLapaPreviewFromGuide(event.clientY);
                  }}
                  onPointerMove={(event) => {
                    if (!isLapaGuideDragging) {
                      return;
                    }

                    syncLapaPreviewFromGuide(event.clientY);
                  }}
                  onPointerUp={(event) => {
                    setIsLapaGuideDragging(false);
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                  onPointerCancel={(event) => {
                    setIsLapaGuideDragging(false);
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      scrollLapaPreviewToRatio(lapaScrollRatio + 0.06);
                    }

                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      scrollLapaPreviewToRatio(lapaScrollRatio - 0.06);
                    }

                    if (event.key === "Home") {
                      event.preventDefault();
                      scrollLapaPreviewToRatio(0);
                    }

                    if (event.key === "End") {
                      event.preventDefault();
                      scrollLapaPreviewToRatio(1);
                    }
                  }}
                >
                  <span className="lapa-preview__guide-line" />
                  <span
                    className="lapa-preview__guide-knob"
                    style={{ top: `${lapaScrollRatio * lapaGuideTravel}px` }}
                  />
                </div>

                <div
                  id="lapa-preview-scroll"
                  ref={lapaPreviewRef}
                  className="lapa-preview__scroll"
                  onScroll={(event) => handleLapaPreviewScroll(event.currentTarget)}
                >
                </div>
              </div>
            </div>
          ) : activeTab === "servo" ? (
            <div className="lapa-panel" aria-label="Вкладка сервопривода">
              <div className="lapa-choosing servo-choosing">
                <h1 className="servo-choosing__title">Выбор сервопривода</h1>

                <div ref={servoDropdownRef} className="telemetry-dropdown servo-dropdown">
                  <button
                    type="button"
                    className={`telemetry-dropdown__trigger servo-choosing__selector glass-panel ${
                      isServoDropdownOpen ? "is-open" : ""
                    }`.trim()}
                    aria-expanded={isServoDropdownOpen}
                    aria-haspopup="listbox"
                    onClick={() => setIsServoDropdownOpen((open) => !open)}
                  >
                    <span>{selectedServoOption}</span>
                    <span className="telemetry-dropdown__arrow servo-choosing__selector-arrow" aria-hidden="true">
                      ⌄
                    </span>
                  </button>

                  {isServoDropdownOpen ? (
                    <div className="telemetry-dropdown__menu glass-panel" role="listbox" aria-label="Список сервоприводов">
                      {servoOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`telemetry-dropdown__option ${selectedServoOption === option ? "is-selected" : ""}`.trim()}
                          role="option"
                          aria-selected={selectedServoOption === option}
                          onClick={() => {
                            setSelectedServoOption(option);
                            setIsServoDropdownOpen(false);
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="servo-choosing__split-row">
                  <button type="button" className="servo-choosing__half-button glass-panel">
                    A-
                  </button>
                  <button type="button" className="servo-choosing__half-button glass-panel">
                    A+
                  </button>
                </div>

                <button type="button" className="servo-choosing__wide-button glass-panel">
                  Возврат в 0
                </button>

                <button type="button" className="servo-choosing__wide-button glass-panel">
                  Задать 0 с текущего положения
                </button>

                <button
                  type="button"
                  className="servo-choosing__wide-button servo-choosing__wide-button--multiline glass-panel"
                >
                  Задать конечную позицию с текущего положения
                </button>

                <div className="servo-choosing__readings">
                  <div className="servo-choosing__reading">
                    <span className="servo-choosing__reading-label">Установленная начальная позиция</span>
                    <span className="servo-choosing__reading-value glass-panel">0°</span>
                  </div>

                  <div className="servo-choosing__reading">
                    <span className="servo-choosing__reading-label">Установленная конечная позиция</span>
                    <span className="servo-choosing__reading-value glass-panel">0°</span>
                  </div>
                </div>

                <div className="servo-choosing__footer">
                  <div className="servo-choosing__footer-value glass-panel">0°</div>
                  <button type="button" className="servo-choosing__send glass-panel">
                    Отправить
                  </button>
                </div>
              </div>

              <div className="lapa-preview lapa-preview--side glass-panel servo-preview" aria-label="Просмотр сервопривода">
                <div className="lapa-preview__scroll servo-preview__scroll">
                  <div className="servo-preview__footer glass-panel">
                    <span className="servo-preview__footer-value">0°</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lapa-panel" aria-label="Вкладка телеметрии">
              <div className="lapa-choosing telemetry-choosing">
                <h1 className="telemetry-choosing__title">Выбор узла для телеметрии</h1>

                <div ref={telemetryDropdownRef} className="telemetry-dropdown">
                  <button
                    type="button"
                    className={`telemetry-dropdown__trigger glass-panel ${isTelemetryDropdownOpen ? "is-open" : ""}`.trim()}
                    aria-expanded={isTelemetryDropdownOpen}
                    aria-haspopup="listbox"
                    onClick={() => setIsTelemetryDropdownOpen((open) => !open)}
                  >
                    <span>{selectedTelemetryOption}</span>
                    <span className="telemetry-dropdown__arrow" aria-hidden="true">
                      ⌄
                    </span>
                  </button>

                  {isTelemetryDropdownOpen ? (
                    <div className="telemetry-dropdown__menu glass-panel" role="listbox" aria-label="Список узлов телеметрии">
                      {telemetryOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`telemetry-dropdown__option ${
                            selectedTelemetryOption === option ? "is-selected" : ""
                          }`.trim()}
                          role="option"
                          aria-selected={selectedTelemetryOption === option}
                          onClick={() => {
                            setSelectedTelemetryOption(option);
                            setIsTelemetryDropdownOpen(false);
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="telemetry-choosing__metric-row">
                  <span className="telemetry-choosing__metric-label">Потребляемый ток узла</span>
                  <span className="telemetry-choosing__metric-value glass-panel">0 ma</span>
                </div>

                <div className="telemetry-choosing__footer">
                  <div className="telemetry-choosing__footer-value glass-panel">0°</div>
                </div>
              </div>

              <div className="lapa-preview lapa-preview--side glass-panel telemetry-preview" aria-label="Просмотр телеметрии">
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
