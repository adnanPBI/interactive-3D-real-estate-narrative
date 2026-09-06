"use client";

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { chapters } from "@/content/site";
import { experienceTwin } from "@/content/experienceAccessibility";

export function AccessibilityTwin({ activeChapter, onJump }: { activeChapter: number; onJump: (index: number) => void }) {
  const liveRef = useRef<HTMLDivElement>(null);
  const previous = useRef(activeChapter);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (previous.current === activeChapter) return;
    const accessible = experienceTwin[activeChapter] ?? experienceTwin[0];
    const visible = chapters[activeChapter] ?? chapters[0];
    if (liveRef.current) {
      liveRef.current.textContent = `Now viewing chapter ${activeChapter + 1} of ${experienceTwin.length}: ${visible.kicker}. ${accessible.title}. ${accessible.summary}`;
    }
    previous.current = activeChapter;
  }, [activeChapter]);

  const moveFocus = (index: number) => {
    const bounded = Math.max(0, Math.min(experienceTwin.length - 1, index));
    onJump(bounded);
    window.requestAnimationFrame(() => buttons.current[bounded]?.focus());
  };

  const onChapterKey = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      moveFocus(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      moveFocus(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFocus(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus(experienceTwin.length - 1);
    }
  };

  return (
    <>
      <div ref={liveRef} className="sr-only" aria-live="polite" aria-atomic="true" />
      <section
        className="accessibility-twin"
        id="accessibility-host"
        aria-labelledby="accessibility-story-title"
        aria-describedby="accessibility-story-instructions"
      >
        <h2 id="accessibility-story-title">Accessible equivalent of the interactive 3D story</h2>
        <p id="accessibility-story-instructions">
          Use the chapter buttons with Enter or Space. When focus is inside this chapter list, Arrow keys, Page Up/Down, Home and End move through the same six story positions as the 3D stage.
        </p>
        <ol>
          {experienceTwin.map((chapter, index) => {
            const descriptionId = `chapter-desc-${chapter.id}`;
            const objectsId = `chapter-objects-${chapter.id}`;
            return (
              <li key={chapter.id} data-active={index === activeChapter}>
                <button
                  ref={(node) => { buttons.current[index] = node; }}
                  type="button"
                  onClick={() => onJump(index)}
                  onKeyDown={(event) => onChapterKey(event, index)}
                  aria-current={index === activeChapter ? "step" : undefined}
                  aria-describedby={`${descriptionId} ${objectsId}`}
                  aria-keyshortcuts="ArrowRight ArrowLeft ArrowDown ArrowUp PageDown PageUp Home End"
                >
                  <span className="chapter-index">{String(index + 1).padStart(2, "0")}</span>
                  <strong>{chapter.title}</strong>
                  <small id={descriptionId}>{chapter.summary}</small>
                </button>
                <ul id={objectsId} aria-label={`${chapter.title} key objects`}>
                  {chapter.objects.map((object) => <li key={object}>{object}</li>)}
                </ul>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
